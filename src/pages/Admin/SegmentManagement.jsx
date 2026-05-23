import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";
import ConfirmModal from "../../components/ConfirmModal";

export default function SegmentManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();

  const [segments, setSegments] = useState([]);
  const [newSegment, setNewSegment] = useState("");
  const [editingSegment, setEditingSegment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expos, setExpos] = useState([]);
  const [selectedExpoId, setSelectedExpoId] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState({ show: false, action: "", target: "", id: null });

  const API_URL = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}/segments`;
  const EXPOS_API_URL = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}/expos`;

  const fetchExpos = async () => {
    try {
      const response = await fetch(EXPOS_API_URL, { headers: { "ngrok-skip-browser-warning": "any" } });
      const data = await response.json();
      if (response.ok) {
        const activeExpos = data.filter(expo => Number(expo.active) !== 0);
        setExpos(activeExpos);
        if (activeExpos.length > 0) {
          // Default to the current global expo id if exists, or first one
          const currentGlobal = localStorage.getItem("utfi_current_expo_id");
          if (currentGlobal && data.find(e => e.id == currentGlobal)) {
            setSelectedExpoId(currentGlobal);
          } else {
            setSelectedExpoId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Expo fetch error:", err);
    }
  };

  const fetchSegments = async (showSpinner = true, expoId = selectedExpoId) => {
    if (!expoId) return;
    if (showSpinner) startLoading();
    try {
      const response = await fetch(`${API_URL}?expos_id=${expoId}`, { 
        headers: { "ngrok-skip-browser-warning": "any" } 
      });
      const data = await response.json();
      if (response.ok) {
        setSegments(data);
      } else {
        showToast(data.error || "Failed to fetch segments", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Backend connection error", "error");
    } finally {
      if (showSpinner) stopLoading();
    }
  };

  useEffect(() => {
    fetchExpos();
  }, []);

  // Auto-select expo passed from EmployeeAllocate via navigation state
  useEffect(() => {
    const passedId = location.state?.expoId;
    if (passedId && expos.length > 0) {
      setSelectedExpoId(String(passedId));
    }
  }, [expos, location.state?.expoId]);

  useEffect(() => {
    if (selectedExpoId) {
      fetchSegments(true, selectedExpoId);
    }
  }, [selectedExpoId]);

  const handleAddSegment = async () => {
    const trimmedSegment = newSegment.trim();
    if (!trimmedSegment || isSubmitting || !selectedExpoId) return;

    // Duplicate check (Case-insensitive)
    const lowerSegment = trimmedSegment.toLowerCase();
    const isDuplicate = segments.some(s => s.segment.toLowerCase() === lowerSegment);
    if (isDuplicate) {
      showToast("Segment already added in this expo", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          segment: trimmedSegment,
          expos_id: selectedExpoId
        }),
      });
      const data = await response.json();
      if (response.ok) {
        showToast("Segment added successfully", "success");
        setSegments((prev) => [...prev, { id: data.id, segment: trimmedSegment, expos_id: selectedExpoId }]);
        setNewSegment("");
      } else {
        showToast(data.error || "Failed to add segment", "error");
      }
    } catch (err) {
      showToast("Connection error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSegment = async () => {
    const trimmedSegment = newSegment.trim();
    if (!editingSegment || !trimmedSegment || isSubmitting) return;

    // Duplicate check (Case-insensitive, excluding self)
    const lowerSegment = trimmedSegment.toLowerCase();
    const isDuplicate = segments.some(s => s.id !== editingSegment.id && s.segment.toLowerCase() === lowerSegment);
    if (isDuplicate) {
      showToast("Segment already added in this expo", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingSegment.id, segment: trimmedSegment }),
      });
      const data = await response.json();
      if (response.ok) {
        showToast("Segment updated successfully", "success");
        setSegments((prev) => prev.map(s => s.id === editingSegment.id ? { ...s, segment: newSegment.trim() } : s));
        setNewSegment("");
        setEditingSegment(null);
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch (err) {
      showToast("Connection error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSegment = (id) => {
    setShowConfirmModal({ show: true, action: "delete", target: "segment", id: id });
  };

  const confirmAction = async () => {
    if (showConfirmModal.target === "segment") {
      setIsSubmitting(true);
      try {
        const response = await fetch(`${API_URL}/delete?id=${showConfirmModal.id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          showToast("Segment deleted successfully", "success");
          setSegments((prev) => prev.filter(s => s.id !== showConfirmModal.id));
        } else {
          const data = await response.json();
          showToast(data.error || "Delete failed", "error");
        }
      } catch (err) {
        showToast("Connection error", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
    setShowConfirmModal({ show: false, action: "", target: "", id: null });
  };

  return (
    <div className="p-2 md:p-4 max-w-[98%] mx-auto min-h-screen space-y-6 font-sans pb-24">

      {/* Header */}
      <div className="flex items-center  gap-2 px-[2vw]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[#ffeced] flex items-center justify-center text-black hover:bg-red-100 transition-all cursor-pointer shadow-sm flex-shrink-0"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[20px] md:text-2xl font-black text-gray-900 leading-tight">Segment Management</h1>
        </div>
        <button
          onClick={() => fetchSegments()}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-700 hover:text-[#ff3b3a] transition-all cursor-pointer flex-shrink-0"
          title="Refresh Data"
        >
          <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>



      <div className="mx-[2vw] rounded-[2rem] md:p-7 space-y-8 animate-in slide-in-from-bottom duration-700">
        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="w-full md:w-80">
            <label className="text-[15px] font-bold text-black ml-1 block mb-3">Select Expo <span className="text-[#ff3b3a]">*</span></label>
            <select
              value={selectedExpoId}
              onChange={(e) => setSelectedExpoId(e.target.value)}
              className="w-full h-14 md:h-12 px-6 rounded-2xl bg-gray-100 border border-gray-400 outline-none focus:ring-2 focus:ring-[#ff3b3a]/20 focus:border-[#ff3b3a] transition-all text-gray-900 text-sm font-bold cursor-pointer"
            >
              <option value="" disabled>Select Expo</option>
              {expos.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.expo_name} ({ex.year})</option>
              ))}
            </select>
          </div>

          <div className="flex-1 w-full lg:max-w-[500px]">
            <label className="text-[15px] font-bold text-black ml-1 block mb-3">
              {editingSegment ? "Editing Segment Name" : "Segment Name"} <span className="text-[#ff3b3a]">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 group">
                <input
                  type="text"
                  placeholder="Enter segment name"
                  value={newSegment}
                  onChange={(e) => setNewSegment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      editingSegment ? handleUpdateSegment() : handleAddSegment();
                    }
                  }}
                  className="w-full h-14 md:h-12 px-6 pr-12 rounded-2xl bg-gray-100 border border-gray-400 outline-none focus:ring-2 focus:ring-[#ff3b3a]/20 focus:border-[#ff3b3a] transition-all text-gray-900 text-sm font-bold placeholder:text-gray-400"
                />
                {newSegment && (
                  <button 
                    onClick={() => setNewSegment("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
              {editingSegment ? (
                <div className="flex gap-2 h-14 md:h-12">
                  <button 
                    onClick={handleUpdateSegment} 
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none h-full px-6 rounded-2xl bg-blue-600 hover:bg-blue-800 text-white font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center shadow-md shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : "Update"}
                  </button>
                  <button 
                    onClick={() => { setEditingSegment(null); setNewSegment(""); }} 
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none h-full px-6 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-black text-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleAddSegment} 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-14 md:h-12 px-8 rounded-2xl bg-[#ff3b3a] hover:bg-black text-white font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center shadow-md shadow-red-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : "Add"}
                </button>
              )}
            </div>
          </div>

          <div className="relative w-full md:w-96 md:ml-auto group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 group-focus-within:text-[#ff3b3a] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search segments..."
              className="w-full h-14 md:h-12 pl-12 pr-12 rounded-2xl bg-gray-100 border border-gray-400 outline-none text-sm font-bold text-gray-900 focus:bg-white focus:border-[#ff3b3a]/30 focus:ring-4 focus:ring-[#ff3b3a]/5 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden border border-gray-300 rounded-[1rem] bg-white">
          <div className="overflow-x-auto custom-scrollbar" style={{ maxHeight: "400px" }}>
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-[#1a1a1a] text-white sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-[15px] border-r border-white/10 w-20">S.No</th>
                  <th className="px-6 py-4 text-[15px] border-r border-white/10">Segment</th>
                  <th className="px-6 py-4 text-[15px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {segments.filter(s => s.segment.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        <span className="font-black text-sm">No segments found. Add your first one above.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  segments
                    .filter(s => s.segment.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((s, index) => (
                      <tr key={s.id} className="hover:bg-red-50/30 transition-all">
                        <td className="px-6 py-4 text-gray-500 text-[15px] border-r border-gray-100 font-bold">{index + 1}</td>
                        <td className="px-6 py-4 border-r border-gray-100 text-gray-900 text-[15px] font-bold">{s.segment}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => { setEditingSegment(s); setNewSegment(s.segment); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="w-9 h-9 rounded-xl bg-white text-blue-600 flex items-center justify-center hover:bg-black hover:text-white transition-all border border-gray-200 hover:border-black active:scale-90"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteSegment(s.id)}
                              className="w-9 h-9 rounded-xl bg-white text-red-500 flex items-center justify-center hover:bg-[#ff3b3a] hover:text-white transition-all border border-gray-200 hover:border-[#ff3b3a] active:scale-90"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal.show}
        title={`Delete ${showConfirmModal.target}`}
        message={`Are you sure you want to delete this ${showConfirmModal.target}? This action cannot be undone.`}
        confirmText="Delete"
        confirmType="danger"
        onConfirm={confirmAction}
        onCancel={() => setShowConfirmModal({ show: false, action: "", target: "" })}
        isLoading={isSubmitting}
      />

    </div>
  );
}
