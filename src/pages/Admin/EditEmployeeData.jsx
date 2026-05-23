import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";
import ConfirmModal from "../../components/ConfirmModal";

const TABS = {
  UPDATE: "Update",
  DELETE: "Delete",
  PASSWORD: "Change Password"
};

const ROLES = [
  { label: "Employee", value: "Employee" },
  { label: "Team Lead", value: "Team Lead" },
  { label: "Admin", value: "Admin" },
  { label: "Super Admin", value: "Super Admin" }
];

export default function EditEmployeeData() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const [activeTab, setActiveTab] = useState(TABS.UPDATE);
  const [users, setUsers] = useState([]);
  const [fetchedDesignations, setFetchedDesignations] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    designation_id: "",
    username: "",
    email: "",
    mobile: "",
    role: "Employee",
    newPassword: "",
    confirmPassword: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState({ show: false, action: "" });

  const fetchUsers = async () => {
    startLoading();
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
      const url = `${baseUrl}/employee`;
      const response = await fetch(url, { headers: { "ngrok-skip-browser-warning": "any" } });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        localStorage.setItem("utfi_users", JSON.stringify(data));
      } else {
        const savedUsers = JSON.parse(localStorage.getItem("utfi_users") || "[]");
        setUsers(savedUsers);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
      const savedUsers = JSON.parse(localStorage.getItem("utfi_users") || "[]");
      setUsers(savedUsers);
    } finally {
      stopLoading();
    }
  };

  const fetchDesignations = async () => {
    startLoading();
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
      const url = `${baseUrl}/designations`;
      const response = await fetch(url, { headers: { "ngrok-skip-browser-warning": "any" } });
      const data = await response.json();
      if (response.ok) {
        setFetchedDesignations(data);
      }
    } catch (err) {
      console.error("Fetch designations error:", err);
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDesignations();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      const user = users.find(u => String(u.id) === String(selectedEmployeeId));
      if (user) {
        setFormData({
          ...formData,
          name: user.name || "",
          designation: user.designation || "",
          designation_id: user.designation_id || "",
          username: user.username || "",
          email: user.email || "",
          mobile: user.phone || user.contact || "",
          role: user.role || "Employee"
        });
      }
    } else {
      setFormData({
        name: "", designation: "", designation_id: "", username: "", email: "", mobile: "", role: "Employee", newPassword: "", confirmPassword: ""
      });
    }
  }, [selectedEmployeeId, users]);

  const handleInputChange = (e) => {
    const { id, value, name } = e.target;
    if (name === "employee-role") {
      setFormData({ ...formData, role: value });
    } else {
      setFormData({ ...formData, [id]: value });
    }
  };

  const handleAction = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId || isSubmitting) {
      if (!isSubmitting) showToast("Please select an employee first", "error");
      return;
    }

    const selectedEmployee = users.find(u => String(u.id) === String(selectedEmployeeId));
    if (!selectedEmployee) return;

    if (activeTab === TABS.UPDATE) {
      setIsSubmitting(true);
      try {
        const payload = {
          id: selectedEmployee.id,
          name: formData.name,
          designation_id: parseInt(formData.designation_id),
          username: formData.username,
          email: formData.email,
          phone: formData.mobile,
          role: formData.role
        };

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/employee/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          showToast("Employee details updated successfully", "success");
          setUsers(prev => {
            const updated = prev.map(u => String(u.id) === String(selectedEmployeeId) ? { 
              ...u, 
              name: payload.name,
              designation_id: payload.designation_id,
              username: payload.username,
              email: payload.email,
              phone: payload.phone,
              contact: payload.phone,
              role: payload.role,
              designation: fetchedDesignations.find(d => String(d.id) === String(payload.designation_id))?.designation || u.designation
            } : u);
            localStorage.setItem("utfi_users", JSON.stringify(updated));
            return updated;
          });
          setSelectedEmployeeId("");
        } else {
          const errData = await response.json();
          showToast(errData.error || "Update failed", "error");
        }
      } catch (err) {
        showToast("Server connection error", "error");
      } finally {
        setIsSubmitting(false);
      }
    } else if (activeTab === TABS.DELETE) {
      setShowConfirmModal({ show: true, action: "delete" });
    } else if (activeTab === TABS.PASSWORD) {
      if (formData.newPassword !== formData.confirmPassword) {
        showToast("Passwords do not match!", "error");
        return;
      }
      if (!formData.newPassword) {
        showToast("New password is required", "error");
        return;
      }
      setShowConfirmModal({ show: true, action: "password" });
    }
  };

  const confirmAction = async () => {
    const selectedEmployee = users.find(u => String(u.id) === String(selectedEmployeeId));
    if (!selectedEmployee) return;

    if (showConfirmModal.action === "delete") {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/employee/delete?id=${selectedEmployee.id}`, {
          method: "DELETE"
        });

        if (response.ok) {
          showToast("Employee deleted successfully", "success");
          setSelectedEmployeeId("");
          setUsers(prev => {
            const updated = prev.filter(u => String(u.id) !== String(selectedEmployeeId));
            localStorage.setItem("utfi_users", JSON.stringify(updated));
            return updated;
          });
        } else {
          const errData = await response.json();
          showToast(errData.error || "Delete failed", "error");
        }
      } catch (err) {
        showToast("Server error during deletion", "error");
      } finally {
        setIsSubmitting(false);
      }
    } else if (showConfirmModal.action === "password") {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const payload = {
          id: selectedEmployee.id,
          password: formData.newPassword
        };

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/employee/change-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          showToast("Password changed successfully", "success");
          setFormData({ ...formData, newPassword: "", confirmPassword: "" });
        } else {
          const errData = await response.json();
          showToast(errData.error || "Password change failed", "error");
        }
      } catch (err) {
        showToast("Server error during password change", "error");
      } finally {
        setIsSubmitting(false);
        setShowConfirmModal({ show: false, action: "" });
      }
      return;
    }
    setShowConfirmModal({ show: false, action: "" });
  };

  return (
    <div className="p-2 md:p-4 max-w-[98%] mx-auto min-h-screen space-y-6 font-sans pb-24">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-[2vw]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[#ffeced] flex items-center justify-center text-black hover:bg-red-100 transition-all cursor-pointer shadow-sm"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Edit Employee Data</h1>
            <button
              onClick={() => Promise.all([fetchUsers(), fetchDesignations()])}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-all cursor-pointer group active:scale-90"
              title="Refresh Data"
            >
              <svg 
                className="w-7 h-7 group-active:rotate-[360deg] transition-transform duration-700 ease-in-out text-black" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="glass-card rounded-[2rem] p-7 border border-gray-300 flex flex-col mx-[2vw]">

        {/* Action Tabs */}
        <div className="flex flex-wrap gap-4 mb-8">
          {Object.values(TABS).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all cursor-pointer border ${
                activeTab === tab
                ? "bg-black text-white  shadow-md shadow-gray-500/20"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Employee Selector */}
        <div className="w-full lg:w-[400px] mb-8">
          <div className="space-y-3">
            <label className="text-[15px] font-bold text-black ml-1 block">
              Select Employee <span className="text-[#ff3b3a]">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-500 outline-none appearance-none focus:ring-2 focus:ring-[#ff3b3a]/20 font-bold text-gray-800 transition-all cursor-pointer text-sm"
              >
                <option value="">Choose Employee</option>
                {users.map(user => (
                  <option key={user.id || user.username} value={user.id || user.username}>
                    {user.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Form Sections */}
        <div className="bg-white space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h2 className="text-lg font-black text-gray-900 border-l-4 border-[#ff3b3a] pl-4 mb-4 tracking-tight">
             {activeTab} Details
          </h2>

          {activeTab === TABS.UPDATE && (
            <form onSubmit={handleAction} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-7 transition-opacity ${!selectedEmployeeId ? 'opacity-50' : ''}`}>
              <fieldset disabled={!selectedEmployeeId} className="contents">
              <div className="space-y-3">
                <label className="text-[15px] font-bold text-black ml-1 block">Full Name <span className="text-[#ff3b3a]">*</span></label>
                <input id="name" type="text" value={formData.name} onChange={handleInputChange} placeholder="Enter Employee Name" className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-500 outline-none focus:ring-2 focus:ring-[#ff3b3a]/20 focus:border-[#ff3b3a] transition-all text-gray-900 text-sm font-bold placeholder:text-gray-400" required />
              </div>
              <div className="space-y-3">
                <label className="text-[15px] font-bold text-black ml-1 block">Designation <span className="text-[#ff3b3a]">*</span></label>
                <div className="relative">
                  <select
                    id="designation_id"
                    value={formData.designation_id}
                    onChange={(e) => {
                      const selected = fetchedDesignations.find(d => String(d.id) === e.target.value);
                      setFormData({ ...formData, designation_id: e.target.value, designation: selected ? selected.designation : "" });
                    }}
                    className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-500 appearance-none outline-none focus:ring-2 focus:ring-[#ff3b3a]/20 focus:border-[#ff3b3a] transition-all text-gray-900 text-sm font-bold placeholder:text-gray-400 cursor-pointer"
                    required
                  >
                    <option value="">Select your designation</option>
                    {fetchedDesignations.map(d => <option key={d.id} value={d.id}>{d.designation}</option>)}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[15px] font-bold text-black ml-1 block">User Name <span className="text-[#ff3b3a]">*</span></label>
                <input id="username" type="text" value={formData.username} onChange={handleInputChange} placeholder="Enter Username" className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-500 outline-none focus:ring-2 focus:ring-[#ff3b3a]/20 focus:border-[#ff3b3a] transition-all text-gray-900 text-sm font-bold placeholder:text-gray-400" required />
              </div>
              <div className="space-y-3">
                <label className="text-[15px] font-bold text-black ml-1 block">Email ID <span className="text-[#ff3b3a]">*</span></label>
                <input id="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Enter Email ID" className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-500 outline-none focus:ring-2 focus:ring-[#ff3b3a]/20 focus:border-[#ff3b3a] transition-all text-gray-900 text-sm font-bold placeholder:text-gray-400" required />
              </div>
              <div className="space-y-3">
                <label className="text-[15px] font-bold text-black ml-1 block">Mobile Number <span className="text-[#ff3b3a]">*</span></label>
                <input id="mobile" type="tel" value={formData.mobile} onChange={handleInputChange} placeholder="Enter Mobile Number" className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-500 outline-none focus:ring-2 focus:ring-[#ff3b3a]/20 focus:border-[#ff3b3a] transition-all text-gray-900 text-sm font-bold placeholder:text-gray-400" required />
              </div>
              <div className="space-y-3">
                <label className="text-[15px] font-bold text-black ml-1 block">Role <span className="text-[#ff3b3a]">*</span></label>
                <div className="flex flex-wrap gap-4 pt-2">
                  {ROLES.map(role => (
                    <label key={role.value} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="employee-role"
                        value={role.value}
                        checked={formData.role === role.value}
                        onChange={handleInputChange}
                        className="w-4 h-4 accent-[#ff3b3a]"
                      />
                      <span className="text-sm font-bold text-gray-600 group-hover:text-black transition-colors">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-3 mt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="h-14 px-10 rounded-2xl md:w-auto w-full bg-[#ff3b3a] hover:bg-black text-white font-black text-base transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isSubmitting && <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                  Update Employee
                </button>
              </div>
              </fieldset>
            </form>
          )}

          {activeTab === TABS.DELETE && (
            <div className={`space-y-6 transition-opacity ${!selectedEmployeeId ? 'opacity-50 pointer-events-none' : ''}`}>
              <p className="text-gray-800 font-bold text-base">
                Are you sure you want to delete <span className="text-red-600 font-black">"{formData.name || 'this employee'}"</span> from the system?
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowConfirmModal({ show: true, action: "delete" })}
                  className="h-14 px-10 rounded-2xl md:w-auto w-full bg-[#ff3b3a] hover:bg-black text-white font-black text-base transition-all active:scale-[0.98] cursor-pointer"
                >
                  Confirm Deletion
                </button>
              </div>
            </div>
          )}

          {activeTab === TABS.PASSWORD && (
            <form onSubmit={handleAction} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-7 transition-opacity ${!selectedEmployeeId ? 'opacity-50' : ''}`}>
              <fieldset disabled={!selectedEmployeeId} className="contents">
              <div className="space-y-3">
                <label className="text-[15px] font-bold text-black ml-1 block">New Password <span className="text-[#ff3b3a]">*</span></label>
                <div className="relative group/pass">
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Enter New Password"
                    className="w-full h-12 px-6 pr-10 rounded-2xl bg-gray-100 border border-gray-500 outline-none focus:ring-2 focus:ring-[#ff3b3a]/20 focus:border-[#ff3b3a] transition-all text-gray-900 text-sm font-bold placeholder:text-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#ff3b3a] transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543-7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[15px] font-bold text-black ml-1 block">Confirm New Password <span className="text-[#ff3b3a]">*</span></label>
                <div className="relative group/pass">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm New Password"
                    className="w-full h-12 px-6 pr-10 rounded-2xl bg-gray-100 border border-gray-500 outline-none focus:ring-2 focus:ring-[#ff3b3a]/20 focus:border-[#ff3b3a] transition-all text-gray-900 text-sm font-bold placeholder:text-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#ff3b3a] transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showConfirmPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543-7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-3 mt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="h-14 px-10 rounded-2xl md:w-auto w-full bg-[#ff3b3a] hover:bg-black text-white font-black text-base transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isSubmitting && <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                  Change Password
                </button>
              </div>
              </fieldset>
            </form>
          )}

        </div>

      </div>

      {/* Confirmation Modals */}
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal.show}
        title={showConfirmModal.action === "delete" ? "Delete Employee" : "Change Password"}
        message={
          showConfirmModal.action === "delete"
            ? `Are you sure you want to delete ${formData.name}? This action cannot be undone.`
            : `Are you sure you want to change the password for ${formData.name}?`
        }
        confirmText={showConfirmModal.action === "delete" ? "Delete" : "Change Password"}
        confirmType={showConfirmModal.action === "delete" ? "danger" : "default"}
        onConfirm={confirmAction}
        onCancel={() => setShowConfirmModal({ show: false, action: "" })}
        isLoading={isSubmitting}
      />

    </div>
  );
}
