import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";
import ConfirmModal from "../../components/ConfirmModal";

export default function DesignationManagement() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();

  const [designations, setDesignations] = useState([]);
  const [statuses, setStatuses] = useState(["Active", "Inactive", "Pending"]);

  const [selectedDesignation, setSelectedDesignation] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [editingDesignation, setEditingDesignation] = useState(null);

  const [selectedStatus, setSelectedStatus] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState({ show: false, action: "", target: "", id: null });

  const API_URL = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}/designations`;

  const fetchDesignations = async (showSpinner = true) => {
    if (showSpinner) startLoading();
    try {
      const response = await fetch(API_URL, { headers: { "ngrok-skip-browser-warning": "any" } });
      const data = await response.json();
      if (response.ok) {
        setDesignations(data);
      } else {
        showToast(data.error || "Failed to fetch designations", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Backend connection error", "error");
    } finally {
      if (showSpinner) stopLoading();
    }
  };

  useEffect(() => {
    fetchDesignations();

    const savedStatuses = JSON.parse(localStorage.getItem("utfi_statuses") || '["Active", "Inactive", "Pending"]');
    setStatuses(savedStatuses);
  }, []);

  const handleAddDesignation = async () => {
    if (!newDesignation.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designation: newDesignation.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        showToast("Designation added successfully", "success");
        setDesignations((prev) => [...prev, { id: data.id, designation: data.designation }]);
        setNewDesignation("");
      } else {
        showToast(data.error || "Failed to add designation", "error");
      }
    } catch (err) {
      showToast("Connection error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDesignation = async () => {
    if (!editingDesignation || !newDesignation.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingDesignation.id, designation: newDesignation.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        showToast("Designation updated successfully", "success");
        setDesignations((prev) => prev.map(d => d.id === editingDesignation.id ? { ...d, designation: newDesignation.trim() } : d));
        setNewDesignation("");
        setEditingDesignation(null);
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch (err) {
      showToast("Connection error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDesignation = (id) => {
    setShowConfirmModal({ show: true, action: "delete", target: "designation", id: id });
  };

  const handleAddStatus = () => {
    if (!newStatus.trim()) {
      showToast("Please enter a status name", "error");
      return;
    }
    const updated = [...statuses, newStatus.trim()];
    setStatuses(updated);
    localStorage.setItem("utfi_statuses", JSON.stringify(updated));
    setNewStatus("");
    showToast("Status added successfully", "success");
  };

  const confirmAction = async () => {
    if (showConfirmModal.target === "designation") {
      setIsSubmitting(true);
      try {
        const response = await fetch(`${API_URL}/delete?id=${showConfirmModal.id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          showToast("Designation deleted successfully", "success");
          setDesignations((prev) => prev.filter(d => d.id !== showConfirmModal.id));
        } else {
          const data = await response.json();
          showToast(data.error || "Delete failed", "error");
        }
      } catch (err) {
        showToast("Connection error", "error");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const updated = statuses.filter(s => s !== selectedStatus);
      setStatuses(updated);
      localStorage.setItem("utfi_statuses", JSON.stringify(updated));
      setSelectedStatus("");
      showToast("Status deleted successfully", "success");
    }
    setShowConfirmModal({ show: false, action: "", target: "", id: null });
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
            <h1 className="text-2xl font-bold text-gray-900">Designation Add / Delete</h1>
            <button
              onClick={() => fetchDesignations()}
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

      <div className="mx-[2vw]  rounded-[2rem] md:p-7 space-y-8 animate-in slide-in-from-bottom duration-700">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="w-full lg:w-[450px]">
            <label className="text-[15px] font-bold text-black ml-1 block mb-3">
              {editingDesignation ? "Editing Content" : "Designation Name"} <span className="text-[#ff3b3a]">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Enter designation name"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    editingDesignation ? handleUpdateDesignation() : handleAddDesignation();
                  }
                }}
                className="flex-1 w-full h-14 md:h-12 px-6 py-4 rounded-2xl bg-gray-100 border border-gray-400 outline-none focus:ring-2 focus:ring-[#ff3b3a]/20 focus:border-[#ff3b3a] transition-all text-gray-900 text-sm font-bold placeholder:text-gray-400"
              />
              {editingDesignation ? (
                <div className="flex gap-2">
                  <button 
                    onClick={handleUpdateDesignation} 
                    disabled={isSubmitting}
                    className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-800 text-white font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center shadow-md shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : "Update"}
                  </button>
                  <button 
                    onClick={() => { setEditingDesignation(null); setNewDesignation(""); }} 
                    disabled={isSubmitting}
                    className="h-12 px-6 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-black text-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleAddDesignation} 
                  disabled={isSubmitting}
                  className="h-12 px-8 rounded-2xl bg-[#ff3b3a] hover:bg-black text-white font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center shadow-md shadow-red-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
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

          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 group-focus-within:text-[#ff3b3a] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search designations..."
              className="w-full h-12 pl-12 pr-6 rounded-2xl bg-gray-100 border border-gray-500 outline-none text-sm font-bold text-gray-900 focus:bg-white focus:border-[#ff3b3a]/30 focus:ring-4 focus:ring-[#ff3b3a]/5 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden border border-gray-300 rounded-[1rem] bg-white">
          <div className="overflow-x-auto custom-scrollbar" style={{ maxHeight: "400px" }}>
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-[#1a1a1a] text-white sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-[15px] border-r border-white/10 w-20">S.No</th>
                  <th className="px-6 py-4 text-[15px] border-r border-white/10">Designation</th>
                  <th className="px-6 py-4 text-[15px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {designations.filter(d => d.designation.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        <span className="font-black text-sm">No designations found. Add your first one above.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  designations
                    .filter(d => d.designation.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((d, index) => (
                      <tr key={d.id} className="hover:bg-red-50/30 transition-all">
                        <td className="px-6 py-4 text-gray-500 text-[15px] border-r border-gray-100 font-bold">{index + 1}</td>
                        <td className="px-6 py-4 border-r border-gray-100 text-gray-900 text-[15px] font-bold">{d.designation}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => { setEditingDesignation(d); setNewDesignation(d.designation); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="w-9 h-9 rounded-xl bg-white text-blue-600 flex items-center justify-center hover:bg-black hover:text-white transition-all border border-gray-200 hover:border-black active:scale-90"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteDesignation(d.id)}
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
