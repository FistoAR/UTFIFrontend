import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";
import ConfirmModal from "../../components/ConfirmModal";

/**
 * Custom Multi-Date Picker Component
 */
function MultiDatePicker({ selectedDates, onToggleDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = (e) => {
    e.preventDefault();
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };
  const nextMonth = (e) => {
    e.preventDefault();
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const renderDays = () => {
    const totalDays = daysInMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
    );
    const startOffset = firstDayOfMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
    );
    const days = [];

    // Empty cells for offset
    for (let i = 0; i < startOffset; i++) {
      days.push(
        <div key={`empty-${i}`} className="w-8 h-8 md:w-9 md:h-9"></div>,
      );
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        d,
      ).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const isSelected = selectedDates.includes(dateStr);

      days.push(
        <button
          key={d}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleDate(dateStr);
          }}
          className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full text-xs transition-all cursor-pointer ${
            isSelected
              ? "bg-[#ff3b3a] text-white font-bold shadow-md scale-105"
              : "hover:bg-red-50 text-gray-700 font-medium"
          }`}
        >
          {d}
        </button>,
      );
    }
    return days;
  };

  return (
    <div className="absolute top-full left-0 z-[100] mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl p-4 w-64 md:w-72 animate-in fade-in zoom-in duration-150">
      <div className="flex justify-between items-center mb-4 px-1">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <span className="font-bold text-gray-900 text-sm">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span
            key={day}
            className="text-[10px] font-bold tracking-wider text-gray-400 p-0.5"
          >
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
    </div>
  );
}

export default function ExpoCreation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const calendarRef = useRef(null);
  const formRef = useRef(null);
  const [hoveredDates, setHoveredDates] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const NAMES_API = `${API_BASE}/expo-names`;
  const EXPOS_API = `${API_BASE}/expos`;

  const [formData, setFormData] = useState({
    expo_name_id: "",
    year: new Date().getFullYear().toString(),
    dates: [],
    location: "",
    notes: "",
    employees_allocated: "",
  });

  const [expos, setExpos] = useState([]);
  const [expoNames, setExpoNames] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Name Management States
  const [newName, setNewName] = useState("");
  const [editingNameId, setEditingNameId] = useState(null);
  const [isAddingName, setIsAddingName] = useState(false);

  // Separate submitting states so spinners don't bleed across sections
  const [isNameSubmitting, setIsNameSubmitting] = useState(false);
  const [isExpoSubmitting, setIsExpoSubmitting] = useState(false);
  const [newExpoId, setNewExpoId] = useState(null);

  // Delete Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ type: "", id: null });
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleDateHover = (e, dates) => {
    if (!dates || dates.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      top: rect.bottom + window.scrollY,
      left: rect.left + rect.width / 2,
    });
    setHoveredDates(dates);
  };

  // Initial load uses global loader; background refetches are silent
  const fetchExpoNames = async (silent = false) => {
    if (!silent) startLoading();
    try {
      const res = await fetch(NAMES_API, {
        headers: { "ngrok-skip-browser-warning": "any" },
      });
      const data = await res.json();
      if (res.ok) setExpoNames(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) stopLoading();
    }
  };

  const fetchExpos = async (silent = false) => {
    if (!silent) startLoading();
    try {
      const res = await fetch(EXPOS_API, {
        headers: { "ngrok-skip-browser-warning": "any" },
      });
      let data = await res.json();
      if (res.ok) {
        // Filter out inactive expos
        data = data.filter((expo) => expo.active !== 0 && expo.active !== "0");
        const parsed = data.map((ex) => ({
          ...ex,
          dates:
            typeof ex.dates === "string"
              ? JSON.parse(ex.dates || "[]")
              : ex.dates || [],
        }));
        setExpos(parsed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) stopLoading();
    }
  };

  useEffect(() => {
    fetchExpoNames();
    fetchExpos();

    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleDate = (dateStr) => {
    setFormData((prev) => {
      const newDates = prev.dates.includes(dateStr)
        ? prev.dates.filter((d) => d !== dateStr)
        : [...prev.dates, dateStr].sort((a, b) => new Date(a) - new Date(b));
      return { ...prev, dates: newDates };
    });
  };

  // Name CRUD
  const handleSaveName = async () => {
    if (!newName.trim() || isNameSubmitting) return;
    setIsNameSubmitting(true);
    try {
      const isEditing = editingNameId !== null;
      const url = isEditing ? `${NAMES_API}/update` : NAMES_API;
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing
        ? { id: editingNameId, name: newName.trim() }
        : { name: newName.trim() };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "any",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          isEditing ? "Expo name updated!" : "Expo name created!",
          "success",
        );
        setExpoNames((prev) =>
          isEditing
            ? prev.map((n) =>
                n.id === editingNameId ? { ...n, name: newName.trim() } : n,
              )
            : [...prev, { id: data.id || Date.now(), name: newName.trim() }],
        );
        setNewName("");
        setEditingNameId(null);
        setIsAddingName(false);
        fetchExpoNames(true); // silent background refresh
      } else {
        showToast(data.error || "Operation failed", "error");
      }
    } catch (e) {
      showToast("Connection error", "error");
    } finally {
      setIsNameSubmitting(false);
    }
  };

  const handleEditName = (nameObj) => {
    setNewName(nameObj.name);
    setEditingNameId(nameObj.id);
    setIsAddingName(true);
  };

  const confirmDeleteName = (id) => {
    setDeleteTarget({ type: "name", id });
    setIsDeleteModalOpen(true);
  };

  // Expo CRUD
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isExpoSubmitting) return;
    if (
      !formData.expo_name_id ||
      !formData.year ||
      formData.dates.length === 0 ||
      !formData.location
    ) {
      showToast(
        "Required fields missing (Expo Name, Year, Dates, Location)",
        "error",
      );
      return;
    }

    setIsExpoSubmitting(true);
    try {
      const isEditing = editingId !== null;
      const url = isEditing ? `${EXPOS_API}/update` : EXPOS_API;
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing ? { ...formData, id: editingId } : formData;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "any",
        },
        body: JSON.stringify(body),
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok) {
        showToast(
          isEditing
            ? "Expo updated successfully!"
            : "Expo created successfully!",
          "success",
        );
        setExpos((prev) =>
          isEditing
            ? prev.map((e) =>
                e.id === editingId
                  ? {
                      ...e,
                      ...formData,
                      expo_name_id: formData.expo_name_id,
                      name: expoNames.find(
                        (n) => String(n.id) === String(formData.expo_name_id),
                      )?.name,
                    }
                  : e,
              )
            : [
                ...prev,
                {
                  id: resData.id || Date.now(),
                  ...formData,
                  expo_name_id: formData.expo_name_id,
                  name: expoNames.find(
                    (n) => String(n.id) === String(formData.expo_name_id),
                  )?.name,
                },
              ],
        );
        if (!isEditing) {
          setIsSuccessModalOpen(true);
          setNewExpoId(resData.id || null);
        }
        setFormData({
          expo_name_id: "",
          year: new Date().getFullYear().toString(),
          dates: [],
          location: "",
          notes: "",
          employees_allocated: "",
        });
        setEditingId(null);
        fetchExpos(true); // silent background refresh
      } else {
        showToast(resData.error || "Operation failed", "error");
      }
    } catch (e) {
      showToast("Connection error", "error");
    } finally {
      setIsExpoSubmitting(false);
    }
  };

  const handleEditExpo = (expo) => {
    setFormData({
      expo_name_id: expo.expo_name_id,
      year: expo.year || "",
      dates: expo.dates,
      location: expo.location,
      notes: expo.notes || "",
      employees_allocated: expo.employees_allocated || "",
    });
    setEditingId(expo.id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const confirmDeleteExpo = (id) => {
    setDeleteTarget({ type: "expo", id });
    setIsDeleteModalOpen(true);
  };

  const handleDelete = () => {
    const { type, id } = deleteTarget;
    setIsDeleteModalOpen(false);

    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const userId = userData.user?.id || "Admin";

    if (type === "expo") {
      const targetExpo = expos.find((e) => e.id === id);
      if (!targetExpo) return;

      startLoading("Deleting Expo...");
      fetch(`${EXPOS_API}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "any",
        },
        body: JSON.stringify({ ...targetExpo, active: 0, deletedBy: userId }),
      })
        .then(async (res) => {
          stopLoading();
          if (res.ok) {
            showToast("Expo deleted successfully!", "success");
            setExpos((prev) => prev.filter((e) => e.id !== targetExpo.id));
            
            // Cleanup localStorage if this was the selected expo
            const storedId = localStorage.getItem("utfi_current_expo_id");
            if (String(storedId) === String(targetExpo.id)) {
              localStorage.removeItem("utfi_current_expo_id");
              localStorage.removeItem("utfi_current_expo_name");
            }
          } else {
            showToast("deletion failed", "error");
          }
        })
        .catch(() => {
          stopLoading();
          showToast("Connection error", "error");
        });
    } else if (type === "name") {
      const url = `${NAMES_API}/delete?id=${id}&deletedBy=${encodeURIComponent(userId)}`;
      startLoading("Deleting Expo Name...");

      fetch(url, {
        method: "DELETE",
        headers: { "ngrok-skip-browser-warning": "any" },
      })
        .then(async (res) => {
          stopLoading();
          if (res.ok) {
            showToast("Expo Name deleted successfully!", "success");
            setExpoNames((prev) => prev.filter((n) => n.id !== id));
          } else {
            const data = await res.json();
            showToast(data.error || "Deletion failed", "error");
          }
        })
        .catch(() => {
          stopLoading();
          showToast("Connection error", "error");
        });
    }
  };

  const filteredExpos = expos.filter(
    (expo) =>
      (expo.expo_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expo.location || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-2 md:p-4 max-w-[98%] mx-auto min-h-screen space-y-6 font-sans pb-24">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title={
          deleteTarget.type === "expo" ? "Delete Expo" : "Delete Expo Name"
        }
        message={
          deleteTarget.type === "expo"
            ? "Are you sure you want to delete this expo? It will be hidden from selections."
            : "Are you sure? This action cannot be undone."
        }
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-[2vw]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[#ffeced] flex items-center justify-center text-black hover:bg-red-100 transition-all cursor-pointer shadow-sm"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Expo Creation</h1>
            <button
              onClick={() => {
                fetchExpoNames();
                fetchExpos();
              }}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 hover:text-[#ff3b3a] transition-all cursor-pointer"
              title="Refresh Data"
            >
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch px-[2vw]">
        <div className="lg:col-span-4 glass-card rounded-[2rem] p-7 border border-gray-300 flex flex-col min-h-[420px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-gray-900 border-l-4 border-[#ff3b3a] pl-4 tracking-tight">
              {editingNameId ? "Edit Expo Name" : "Create Expo Names"}
            </h2>
          </div>

          <div className="space-y-6 flex flex-col flex-1">
            <div className="flex flex-col gap-3">
              <div className="relative group flex items-center">
                <input
                  type="text"
                  placeholder="Ex: Intex, Agri"
                  className={`w-full h-12 rounded-2xl bg-gray-100 border border-gray-500 outline-none focus:ring-2 focus:ring-[#ff3b3a]/20 focus:border-[#ff3b3a] transition-all text-gray-900 text-sm font-bold placeholder:text-gray-400 ${editingNameId ? "pl-6 pr-20" : "px-6"}`}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                {editingNameId && (
                  <button
                    onClick={() => {
                      setEditingNameId(null);
                      setNewName("");
                    }}
                    className="absolute right-4 px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer border border-red-100"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <button
                onClick={handleSaveName}
                disabled={isNameSubmitting}
                className="w-full h-12 rounded-2xl bg-[#ff3b3a] text-white font-black text-sm tracking-wider hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isNameSubmitting ? (
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : editingNameId ? (
                  "Update Name"
                ) : (
                  "Save New Name"
                )}
              </button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 rounded-2xl border border-gray-200">
              <div
                className="overflow-y-auto custom-scrollbar flex-1"
                style={{ maxHeight: "240px" }}
              >
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white/50 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-3.5 text-[15px] font-black text-gray-700">
                        Expo Name
                      </th>
                      <th className="px-5 py-3.5 text-[15px] font-black text-gray-700 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50  text-[14px]">
                    {expoNames.filter((n) => n.id !== editingNameId).length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan="2"
                          className="px-5 py-12 text-center text-gray-400 font-bold italic"
                        >
                          No Records Found
                        </td>
                      </tr>
                    ) : (
                      expoNames
                        .filter((n) => n.id !== editingNameId)
                        .map((name) => (
                          <tr
                            key={name.id}
                            className="hover:bg-white/80 transition-colors group"
                          >
                            <td className="px-5 py-3 text-gray-800 text-[15px]">
                              {name.name}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleEditName(name)}
                                  className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-black hover:text-white transition-all border border-blue-100/50"
                                  title="Edit"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => confirmDeleteName(name.id)}
                                  className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-black hover:text-white transition-all border border-red-100/50"
                                  title="Delete"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
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
        </div>

        <div
          ref={formRef}
          className="lg:col-span-8 glass-card rounded-[2rem] p-7 border border-gray-300 flex flex-col min-h-[420px] relative overflow-visible z-20"
        >
          <h2 className="text-lg font-black text-gray-900 border-l-4 border-[#ff3b3a] pl-4 mb-8 tracking-tight">
            {editingId ? "Update Expo" : "Create New Expo"}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="flex-1 flex flex-col justify-between overflow-visible"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-7">
              <div className="space-y-3">
                <label className="text-[15px]  text-black ml-1 mb-[0.5vw] block">
                  Expo Name <span className="text-[#ff3b3a]">*</span>
                </label>
                <div className="relative">
                  <select
                    className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-500 outline-none appearance-none cursor-pointer text-sm  text-gray-800 focus:ring-2 focus:ring-[#ff3b3a]/10"
                    value={formData.expo_name_id}
                    onChange={(e) =>
                      setFormData({ ...formData, expo_name_id: e.target.value })
                    }
                  >
                    <option value="">Select Expo Name</option>
                    {expoNames.map((name) => (
                      <option key={name.id} value={name.id}>
                        {name.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[15px]  text-black ml-1 mb-[0.5vw] block">
                  Year <span className="text-[#ff3b3a]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: June 2026"
                  className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-500 outline-none text-sm  text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-[#ff3b3a]/10"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: e.target.value })
                  }
                />
              </div>

              <div className="space-y-3 relative" ref={calendarRef}>
                <label className="text-[15px]  text-black ml-1 mb-[0.5vw] block">
                  {" "}
                  Date of Conduct <span className="text-[#ff3b3a]">*</span>
                </label>
                <div
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-500 hover:border-gray-600 flex items-center text-sm  text-gray-500 cursor-pointer transition-all"
                >
                  <span
                    className={`truncate ${formData.dates.length > 0 ? "text-gray-900" : ""}`}
                  >
                    {formData.dates.length > 0
                      ? formData.dates.join(", ")
                      : "Select Dates"}
                  </span>
                </div>
                {showCalendar && (
                  <MultiDatePicker
                    selectedDates={formData.dates}
                    onToggleDate={handleToggleDate}
                  />
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[15px]  text-black ml-1 mb-[0.5vw] block">
                  Location of Event <span className="text-[#ff3b3a]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Event Location"
                  className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-500 outline-none text-sm  text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-[#ff3b3a]/10"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>

              <div className="space-y-3 lg:col-span-2">
                <label className="text-[15px]  text-black ml-1 mb-[0.5vw] block">
                  Notes
                </label>
                <input
                  placeholder="Key highlights or special instructions..."
                  className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-500 outline-none text-sm  text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-[#ff3b3a]/10"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-4 mt-12">
              <button
                type="submit"
                disabled={isExpoSubmitting}
                className="flex-[2] h-14 rounded-2xl bg-[#ff3b3a] hover:bg-black text-white font-black text-base transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isExpoSubmitting ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <>{editingId ? "Update Exhibition" : "Create New Expo"}</>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      expo_name_id: "",
                      year: new Date().getFullYear().toString(),
                      dates: [],
                      location: "",
                      notes: "",
                      employees_allocated: "",
                    });
                  }}
                  className="flex-1 h-14 rounded-2xl bg-white border-2 border-gray-400 text-gray-600 font-bold text-sm hover:bg-gray-50 hover:text-gray-600 transition-all cursor-pointer active:scale-95"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Normal Table: Configured Expos List */}
      <div className="mx-[2vw] glass-card rounded-[2.5rem] md:p-10 border border-gray-300 space-y-8 animate-in slide-in-from-bottom duration-700 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-4">
          <div className="flex items-center gap-3 ">
            <h2 className="text-xl font-black text-gray-900 tracking-tight ">
              Created Expos
            </h2>
            <div className="px-3 py-1 bg-black text-white text-[10px] font-black rounded-full">
              {expos.length} Record{expos.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400 group-focus-within:text-[#ff3b3a] transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Filter by name, location or year..."
              className="w-full h-12 pl-12 pr-6 rounded-2xl bg-gray-100 border border-gray-500 outline-none text-sm font-bold text-gray-900 focus:bg-white focus:border-[#ff3b3a]/30 focus:ring-4 focus:ring-[#ff3b3a]/5 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden border border-gray-300 rounded-[1rem] bg-white">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-[#1a1a1a] text-white">
                <tr>
                  <th className="px-6 py-4 text-[15px]   border-r border-white/10">
                    S.No
                  </th>
                  <th className="px-6 py-4 text-[15px]  border-r border-white/10">
                    Expo Name
                  </th>
                  <th className="px-6 py-4 text-[15px]  border-r border-white/10">
                    Year
                  </th>
                  <th className="px-6 py-4 text-[15px]  border-r border-white/10">
                    Date of Conducting
                  </th>
                  <th className="px-6 py-4 text-[15px]  border-r border-white/10">
                    Location
                  </th>
                  <th className="px-6 py-4 text-[15px]  border-r border-white/10">
                    Notes
                  </th>
                  <th className="px-6 py-4 text-[15px]  text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredExpos.filter((e) => e.id !== editingId).length ===
                0 ? (
                  <tr>
                    <td colSpan="7" className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <svg
                          className="w-16 h-16"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                        <span className="font-black text-sm ">
                          No matching records discovered
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredExpos
                    .filter((e) => e.id !== editingId)
                    .map((expo, index) => (
                      <tr
                        key={expo.id}
                        className="hover:bg-red-50/30 transition-all group"
                      >
                        <td className="px-6 py-5  text-gray-800 group-hover:text-[#ff3b3a] transition-colors text-[15px] border-r border-gray-100">
                          {String(index + 1).padStart(2, "0")}
                        </td>
                        <td className="px-6 py-5 border-r border-gray-100">
                          <div className=" text-gray-900 text-[15px]">
                            {expo.name || expo.expo_name || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-5 border-r border-gray-100">
                          <span className="px-3 py-1 bg-gray-100 rounded-lg text-[15px]  text-gray-600 border border-gray-200">
                            {expo.year}
                          </span>
                        </td>
                        <td
                          className="px-6 py-5 border-r border-gray-100 cursor-help"
                          onMouseEnter={(e) => handleDateHover(e, expo.dates)}
                          onMouseLeave={() => setHoveredDates(null)}
                        >
                          <div className="flex flex-wrap gap-1.5 max-w-[450px]">
                            {expo.dates && Array.isArray(expo.dates)
                              ? expo.dates.slice(0, 5).map((d, i) => (
                                  <span
                                    key={i}
                                    className="text-[13px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100"
                                  >
                                    {d}
                                  </span>
                                ))
                              : "-"}
                            {expo.dates &&
                              Array.isArray(expo.dates) &&
                              expo.dates.length > 5 && (
                                <span className="text-[13px] font-bold text-[#ff3b3a]">
                                  + {expo.dates.length - 5} more
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-6 py-5  text-[15px] border-r border-gray-100">
                          {expo.location}
                        </td>
                        <td className="px-6 py-5 border-r border-gray-100">
                          <p
                            className="text-[15px] truncate max-w-[150px] "
                            title={expo.notes}
                          >
                            {expo.notes || "No notes available"}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => handleEditExpo(expo)}
                              className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-black hover:text-white transition-all border border-blue-100/50"
                              title="Quick Edit"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => confirmDeleteExpo(expo.id)}
                              className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-black hover:text-white transition-all border border-red-100/50"
                              title="Delete Record"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
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

      {/* Floating Tooltip */}
      {hoveredDates && (
        <div
          className="fixed z-[9999] bg-black text-white text-[12px] font-bold py-2 px-4 rounded-xl shadow-2xl whitespace-pre-line min-w-[200px] text-center pointer-events-none animate-in fade-in zoom-in duration-200"
          style={{
            top: `${tooltipPos.top + 10}px`,
            left: `${tooltipPos.left}px`,
            transform: "translate(-50%, 0)",
          }}
        >
          <div className="text-[#ff3b3a] mb-1">Full Schedule</div>
          {hoveredDates.join(" • ")}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-black"></div>
        </div>
      )}

      {/* Creation Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-[100] animate-in fade-in">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-[400px] transform scale-100 animate-in zoom-in text-center border-t-4 border-red-500">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 ">Expo Created !</h2>
            <p className="text-gray-700 font-bold mb-8 ">The expo has been successfully registered. Would you like to allocate employees now?</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => navigate("/Admin/employeeAllocate", { state: { expoId: newExpoId } })} 
                className="w-full bg-red-600 hover:bg-black text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-200 cursor-pointer  text-md"
              >
                Navigate to Allocation Page
              </button>
              <button 
                onClick={() => setIsSuccessModalOpen(false)} 
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-4 rounded-2xl transition-all cursor-pointer  text-md"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
