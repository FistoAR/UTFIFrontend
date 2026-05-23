import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";
import ConfirmModal from "../../components/ConfirmModal";
import footerImg from "../../assets/images/footer-image.webp";

export default function EmployeeAllocate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [expoNames, setExpoNames] = useState([]);
  const [expos, setExpos] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Custom Searchable Dropdown state
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [focusedEmpIndex, setFocusedEmpIndex] = useState(-1);
  const empDropdownRef = useRef(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAllocationSuccessModalOpen, setIsAllocationSuccessModalOpen] = useState(false);

  const fetchExpoNames = async () => {
    startLoading();
    try {
      const res = await fetch(`${API_BASE}/expo-names`, {
        headers: { "ngrok-skip-browser-warning": "any" }
      });
      if (res.ok) {
        const data = await res.json();
        setExpoNames(data);
      }
    } catch (e) {
      console.error("Fetch names error:", e);
    } finally {
      stopLoading();
    }
  };

  const fetchExpos = async () => {
    startLoading();
    try {
      const res = await fetch(`${API_BASE}/expos`, {
        headers: { "ngrok-skip-browser-warning": "any" }
      });
      if (res.ok) {
        let data = await res.json();
        const parsed = data
          .filter(ex => ex.active !== 0 && ex.active !== '0')
          .map(ex => ({
          ...ex,
          dates: typeof ex.dates === 'string' ? JSON.parse(ex.dates || "[]") : (ex.dates || []),
          employees_allocated: (typeof ex.employees_allocated === 'string' 
            ? JSON.parse(ex.employees_allocated || "[]") 
            : (ex.employees_allocated || [])).map(String)
        }));
        setExpos(parsed);
      }
    } catch (e) {
      console.error("Fetch expos error:", e);
    } finally {
      stopLoading();
    }
  };

  const fetchEmployees = async () => {
    startLoading();
    try {
      const res = await fetch(`${API_BASE}/employee`, {
        headers: { "ngrok-skip-browser-warning": "any" }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (e) {
      console.error("Fetch employees error:", e);
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    fetchExpoNames();
    fetchExpos();
    fetchEmployees();
  }, []);

  // Auto-select the expo passed from ExpoCreation via navigation state
  useEffect(() => {
    const passedId = location.state?.expoId;
    if (passedId && expos.length > 0) {
      setSelectedInstanceId(String(passedId));
    }
  }, [expos, location.state?.expoId]);

  // Map expos to format: Intex_2023
  const formattedExpos = expos.map(ex => {
    const parentNameStr = expoNames.find(n => String(n.id) === String(ex.expo_name_id))?.name || "Unknown";
    return {
      ...ex,
      displayName: `${parentNameStr}_${ex.year}`
    };
  });

  const selectedInstance = formattedExpos.find(e => String(e.id) === selectedInstanceId);
  const allocatedMembers = selectedInstance?.employees_allocated || [];
  const unallocatedEmployees = employees.filter(emp => 
    !allocatedMembers.includes(String(emp.id)) && !selectedUserIds.includes(emp.id)
  );

  // Search filtered employees
  const filteredEmployees = unallocatedEmployees.filter(emp => 
    emp.name.toLowerCase().includes(empSearch.toLowerCase())
  );

  const getEmployeeById = (id) => employees.find(e => String(e.id) === String(id));

  // --- Keyboard Nav Logic ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (empDropdownRef.current && !empDropdownRef.current.contains(event.target)) {
        setIsEmpDropdownOpen(false);
        setFocusedEmpIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmpKeyDown = (e) => {
    if (!isEmpDropdownOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedEmpIndex(prev => (prev < filteredEmployees.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedEmpIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedEmpIndex >= 0 && focusedEmpIndex < filteredEmployees.length) {
        const emp = filteredEmployees[focusedEmpIndex];
        setSelectedUserIds(prev => [...prev, emp.id]);
        setEmpSearch("");
        // Keep dropdown open for more selections
      }
    } else if (e.key === 'Escape') {
      setIsEmpDropdownOpen(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedInstanceId || selectedUserIds.length === 0 || isSubmitting) {
      if (!isSubmitting) showToast("Please select an expo and at least one employee", "error");
      return;
    }

    const updatedEmployees = [...allocatedMembers, ...selectedUserIds.map(String)];

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/expos/update`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "any"
        },
        body: JSON.stringify({
          id: selectedInstance.id,
          employees_allocated: updatedEmployees
        })
      });

      if (res.ok) {
        showToast(`${selectedUserIds.length} employees added successfully!`, "success");
        setSelectedUserIds([]);
        setExpos(prev => prev.map(ex => 
          String(ex.id) === String(selectedInstance.id) ? { ...ex, employees_allocated: updatedEmployees } : ex
        ));
        setIsAllocationSuccessModalOpen(true);
      } else {
        showToast("Failed to add employees", "error");
      }
    } catch (e) {
      showToast("Connection error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (index) => {
    setDeleteIndex(index);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const updatedEmployees = allocatedMembers.filter((_, idx) => idx !== deleteIndex);

    try {
      const res = await fetch(`${API_BASE}/expos/update`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "any"
        },
        body: JSON.stringify({
          id: selectedInstance.id,
          employees_allocated: updatedEmployees
        })
      });

      if (res.ok) {
        showToast("Employee removed successfully!", "success");
        setExpos(prev => prev.map(ex => 
          String(ex.id) === String(selectedInstance.id) ? { ...ex, employees_allocated: updatedEmployees } : ex
        ));
      } else {
        showToast("Failed to remove employee", "error");
      }
    } catch (e) {
      showToast("Connection error", "error");
    } finally {
      setIsSubmitting(false);
      setIsDeleteModalOpen(false);
      setDeleteIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col relative pb-[15vw]">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Remove Member"
        message="Are you sure you want to remove this employee from the selected expo?"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isLoading={isSubmitting}
      />

      {/* Post-Allocation Success Modal */}
      {isAllocationSuccessModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-[100] animate-in fade-in">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-[400px] text-center border-t-4 border-red-500">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Employees Allocated!</h2>
            <p className="text-gray-700 font-bold mb-8">Would you like to set up segments for this expo now?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/Admin/segments", { state: { expoId: selectedInstanceId } })}
                className="w-full bg-red-600 hover:bg-black text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-200 cursor-pointer text-md"
              >
                Navigate to Segment Management
              </button>
              <button
                onClick={() => setIsAllocationSuccessModalOpen(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-4 rounded-2xl transition-all cursor-pointer text-md"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="w-full px-[5vw] pt-[2vw] relative z-10 flex-1">
        <h1 className="text-center font-bold text-3xl mb-8">Expo Allocation</h1>

        {/* Header Navigation */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[#fdf0f0] flex items-center justify-center hover:bg-[#ffeced] transition-colors cursor-pointer text-red-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-black">Add Members</h2>
        </div>

        {/* Three Column Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-12">
          
          {/* Column 1: Select Expo */}
          <div>
            <label className="block text-md font-bold text-black mb-2">Select Expo <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                className="w-full h-[3.5rem] px-4 rounded-full bg-gray-100/80 border border-gray-300 outline-none text-gray-900 focus:ring-2 focus:ring-red-600/10 transition-all appearance-none cursor-pointer"
                value={selectedInstanceId}
                onChange={(e) => {
                  setSelectedInstanceId(e.target.value);
                  setSelectedUserIds([]);
                  setEmpSearch("");
                }}
              >
                <option value="">Select Expo</option>
                {formattedExpos.map(exp => (
                  <option key={exp.id} value={exp.id}>{exp.displayName}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Column 2: Searchable Employee Dropdown & Selection Area */}
          <div className="space-y-4 relative">
            <div ref={empDropdownRef} className="relative">
              <label className="block text-md font-bold text-black mb-2">Select Employees</label>
              <div 
                className={`w-full h-[3.5rem] px-4 rounded-full flex items-center justify-between border ${selectedInstanceId ? "border-blue-500 bg-white cursor-text" : "border-gray-300 bg-gray-100/80 cursor-not-allowed"} transition-all`}
                onClick={() => selectedInstanceId && setIsEmpDropdownOpen(true)}
              >
                <input 
                  type="text" 
                  placeholder={selectedInstanceId ? "Type to search..." : "Select Expo first"}
                  disabled={!selectedInstanceId}
                  className="w-full h-full bg-transparent outline-none text-gray-900"
                  value={empSearch}
                  onChange={(e) => {
                    setEmpSearch(e.target.value);
                    setIsEmpDropdownOpen(true);
                    setFocusedEmpIndex(0);
                  }}
                  onFocus={() => selectedInstanceId && setIsEmpDropdownOpen(true)}
                  onKeyDown={handleEmpKeyDown}
                />
                <div className="text-gray-500 pl-2">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {/* Dropdown Menu */}
              {isEmpDropdownOpen && selectedInstanceId && (
                <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">No employees found</div>
                  ) : (
                    filteredEmployees.map((emp, index) => (
                      <div 
                        key={emp.id}
                        className={`px-4 py-3 cursor-pointer text-sm transition-colors ${focusedEmpIndex === index ? "bg-red-50 text-red-600" : "hover:bg-gray-50 text-gray-700"}`}
                        onMouseEnter={() => setFocusedEmpIndex(index)}
                        onClick={() => {
                          setSelectedUserIds(prev => [...prev, emp.id]);
                          setEmpSearch("");
                          setIsEmpDropdownOpen(false);
                        }}
                      >
                        <div className="font-semibold">{emp.name}</div>
                        <div className="text-xs text-gray-400">{emp.designation}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected Queue */}
            {selectedUserIds.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 absolute top-full left-0 w-full mt-2">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Selected Employees ({selectedUserIds.length})</span>
                  <button onClick={() => setSelectedUserIds([])} className="text-[10px] text-red-500 font-bold hover:underline">Clear All</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedUserIds.map(id => {
                    const emp = getEmployeeById(id);
                    return (
                      <div key={id} className="bg-white border border-gray-200 rounded-full pl-3 pr-1 py-1 flex items-center gap-2 shadow-sm">
                        <span className="text-xs font-bold text-gray-700">{emp?.name}</span>
                        <button 
                          onClick={() => setSelectedUserIds(prev => prev.filter(uid => uid !== id))}
                          className="w-5 h-5 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500"
                        >
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Add Member Button */}
          <div className="self-center">
            <button
              onClick={handleAddMember}
              disabled={selectedUserIds.length === 0 || !selectedInstanceId || isSubmitting}
              className="w-full h-[3.5rem] rounded-full bg-[#ff3b3a] hover:bg-black text-white font-bold text-[1vw] tracking-wide shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting && <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
              Allocate All ({selectedUserIds.length})
            </button>
          </div>

        </div>

        {/* Existing Employees Section */}
        {selectedInstanceId && (
          <div className="mt-8">
            <h3 className="text-[1vw] font-bold text-gray-800 mb-4">Existing Employees</h3>
            <div className="flex flex-wrap gap-4">
              {allocatedMembers.length === 0 ? (
                <div className="px-6 py-3 bg-gray-50 rounded-lg text-sm text-gray-400 w-full max-w-sm">
                  No employees allocated yet.
                </div>
              ) : (
                allocatedMembers.map((memberId, idx) => {
                  const emp = getEmployeeById(memberId);
                  return (
                    <div key={idx} className="flex items-center justify-between bg-gray-100 rounded-lg px-4 py-3 min-w-[250px] shadow-sm transform transition-all hover:translate-y-[-2px]">
                      <div>
                        <div className="font-bold text-sm text-gray-800">{emp?.name || "Unknown"}</div>
                        <div className="text-xs text-gray-500">{emp?.designation || "Staff"}</div>
                      </div>
                      <button 
                        onClick={() => confirmDelete(idx)}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

    

    </div>
  );
}
