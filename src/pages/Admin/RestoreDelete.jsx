import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";
import { useConfirm } from "../../context/ConfirmContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const TABS = {
  EXPO: "Expo Delete / Restore",
  DATA: "Data Delete / Restore",
};

const PAGE_SIZE = 50;

const fmt = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const LeadRow = ({
  lead,
  isSelected,
  onToggle,
  onHistory,
  onView,
  formatDateTime,
  employeeMap,
  expos,
}) => {
  const [activeIdx, setActiveIdx] = useState(-1);
  const mfr = lead.primary_details || {};
  const subs = lead.sub_entities || [];

  const currentData = activeIdx === -1 ? mfr : subs[activeIdx]?.data || {};
  const currentType =
    activeIdx === -1
      ? lead.primary_type || "Manufacturer"
      : subs[activeIdx]?.type || "—";

  const statusArr = Array.isArray(lead.status) ? lead.status : [];
  const inactiveExpos = statusArr
    .filter((s) => s.status === "inactive")
    .map((s) => {
      const e = expos.find((ex) => Number(ex.id) === Number(s.expo_id));
      return e ? `${e.expo_name} ${e.year}` : `Expo ID: ${s.expo_id}`;
    });

  return (
    <tr
      className={`transition-colors ${isSelected ? "bg-blue-50/40" : "hover:bg-gray-50/60"}`}
    >
      <td className="px-5 py-4 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-4 h-4 accent-black cursor-pointer"
        />
      </td>
      <td className="px-4 py-4 border-l border-gray-200 text-center ">
        <div className="flex flex-col gap-1.5 items-center">
          <button
            onClick={() => onHistory(lead)}
            className="px-3 py-1 bg-black text-white text-[10px] font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer shadow-sm w-full"
          >
            History
          </button>
          <button
            onClick={() => onView(lead)}
            className="px-3 py-1 bg-red-600 text-white text-[10px] font-semibold rounded-full hover:bg-black transition-all cursor-pointer shadow-sm w-full"
          >
            View
          </button>
        </div>
      </td>

      <td className="px-4 py-4 border-l border-gray-200 min-w-[220px]">
        <div className="flex flex-col gap-2">
          {subs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveIdx(-1)}
                className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border transition-all ${activeIdx === -1 ? "bg-red-600 text-white border-red-600" : "bg-gray-100 text-black border-gray-200"}`}
              >
                Primary
              </button>
              {subs.map((_, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => setActiveIdx(sIdx)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border transition-all ${activeIdx === sIdx ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-black border-gray-200"}`}
                >
                  Sec
                </button>
              ))}
            </div>
          )}
          <span
            className={`font-semibold text-[14px] ${activeIdx === -1 ? "text-gray-900" : "text-blue-700"} truncate max-w-[200px]`}
            title={currentData.companyName}
          >
            {currentData.companyName || "—"}
          </span>
        </div>
      </td>
      <td className="px-4 py-4 border-l border-gray-200 min-w-[150px]">
        <div className="flex flex-wrap gap-1">
          {inactiveExpos.length > 0 ? (
            inactiveExpos.map((name, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[13px] font-bold uppercase tracking-wider"
              >
                {name}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-[10px]">No Expo</span>
          )}
        </div>
      </td>
      <td className="px-5 py-4 text-center border-l border-gray-200">
        <span
          className={`px-3 py-1 bg-gray-100 rounded-full text-[13px] font-medium  text-black`}
        >
          {currentType}
        </span>
      </td>
      <td className="px-5 py-4 text-sm font-medium text-black border-l border-gray-200">
        {currentData.contactPerson || "—"}
      </td>
      <td className="px-5 py-4 text-xs font-medium text-black border-l border-gray-200">
        {currentData.designation || "—"}
      </td>
      <td className="px-5 py-4 text-sm font-medium text-black border-l border-gray-200 tabular-nums">
        {currentData.mobile1 || "—"}
      </td>
      <td className="px-5 py-4 text-sm font-medium text-black border-l border-gray-200">
        {currentData.email1 || "—"}
      </td>
      <td className="px-5 py-4 text-sm font-medium text-black border-l border-gray-200">
        {currentData.city || "—"}
      </td>
      <td className="px-5 py-4 text-sm font-medium text-black border-l border-gray-200">
        {currentData.state || "—"}
      </td>
      <td className="px-5 py-4 text-sm font-medium text-black border-l border-gray-200">
        {currentData.segment || "—"}
      </td>
      <td className="px-5 py-4 text-sm font-medium text-black border-l border-gray-200">
        {currentData.source || "—"}
      </td>
      <td className="px-5 py-4 text-sm font-medium text-black border-l border-gray-200">
        {currentData.remarks || "—"}
      </td>
      <td className="px-5 py-4 text-center text-xs font-semibold text-gray-900 border-l border-gray-200">
        {employeeMap[lead.deletedBy] || lead.deletedBy || "—"}
      </td>
      <td className="px-5 py-4 text-center text-xs font-medium text-black border-l border-gray-200 whitespace-nowrap">
        {formatDateTime(lead.deletedAt)}
      </td>
    </tr>
  );
};

export default function RestoreDelete() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState(TABS.EXPO);
  const [expos, setExpos] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());

  const [selectedExposId, setSelectedExposId] = useState("");
  const [expoStats, setExpoStats] = useState({ count: 0 });
  const [expoDetails, setExpoDetails] = useState(null);

  const [viewRecord, setViewRecord] = useState(null);
  const [historyRecord, setHistoryRecord] = useState(null);
  const [pendingLeadId, setPendingLeadId] = useState(null);

  const [employees, setEmployees] = useState([]);
  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach((emp) => {
      map[emp.id] = emp.name;
    });
    return map;
  }, [employees]);

  // Filters for Data Tab
  const [filterExpoId, setFilterExpoId] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [selectionScope, setSelectionScope] = useState("page");
  const [currentPage, setCurrentPage] = useState(1);

  // ─── Data Fetching ───────────────────────────────────────────────────────────
  const fetchExpos = async (silent = false) => {
    if (!silent) startLoading();
    try {
      const [eRes, empRes] = await Promise.all([
        fetch(`${API_BASE}/expos?activeOnly=0`, {
          headers: { "ngrok-skip-browser-warning": "69420" },
        }),
        fetch(`${API_BASE}/employee`, {
          headers: { "ngrok-skip-browser-warning": "69420" },
        }),
      ]);
      const eData = await eRes.json();
      const empData = await empRes.json();

      setExpos(Array.isArray(eData) ? eData : []);
      if (Array.isArray(empData)) setEmployees(empData);
    } catch {
      showToast("Failed to fetch exhibitions", "error");
    } finally {
      if (!silent) stopLoading();
    }
  };

  const fetchExpoStats = async (id, silent = false) => {
    if (!silent) startLoading();
    try {
      const res = await fetch(`${API_BASE}/expos/stats?id=${id}`, {
        headers: { "ngrok-skip-browser-warning": "69420" },
      });
      const data = await res.json();
      setExpoStats(data);
    } catch {
      setExpoStats({ count: 0 });
    } finally {
      if (!silent) stopLoading();
    }
  };

  const fetchInactiveLeads = async (silent = false) => {
    if (!silent) startLoading();
    try {
      // Load ALL inactive records across all expos — expo filter is applied locally
      const query = new URLSearchParams({
        inactiveOnly: 1,
        userRole: "Admin",
        all: 1,
      });
      const res = await fetch(`${API_BASE}/customer-data?${query}`, {
        headers: { "ngrok-skip-browser-warning": "69420" },
      });
      const data = await res.json();
      setLeads(data.success ? data.data : []);
    } catch {
      showToast("Failed to fetch records", "error");
    } finally {
      if (!silent) stopLoading();
    }
  };

  useEffect(() => {
    fetchExpos();
  }, []);

  // Expo tab: react to selectedExposId changes
  useEffect(() => {
    if (activeTab !== TABS.EXPO) return;
    if (selectedExposId) {
      const expo = expos.find((e) => String(e.id) === String(selectedExposId));
      setExpoDetails(expo || null);
      fetchExpoStats(selectedExposId);
    } else {
      setExpoDetails(null);
      setExpoStats({ count: 0 });
    }
  }, [selectedExposId, activeTab, expos]);

  // Data tab: fetch all inactive leads whenever Data tab is active
  useEffect(() => {
    if (activeTab === TABS.DATA) {
      setCurrentPage(1);
      setSelectedLeadIds(new Set());
      fetchInactiveLeads();
    }
  }, [activeTab]);

  // Handle incoming navigation state (e.g. from Notifications)
  useEffect(() => {
    const s = location.state;
    if (!s) return;

    if (s.tab) setActiveTab(s.tab);

    if (s.selectedExpo) {
      setSelectedExposId(String(s.selectedExpo));
    }

    if (s.selectedLeadId) {
      setPendingLeadId(Number(s.selectedLeadId));
      startLoading(); // Keep spinner until leads load and selection happens
    }

    window.history.replaceState({}, document.title);
  }, [location.state]);

  // Once leads load, handle the pending selection
  useEffect(() => {
    if (pendingLeadId && leads.length > 0) {
      const targetLead = leads.find((l) => l.id === pendingLeadId);
      if (targetLead) {
        // Find which expo this lead is inactive in
        const statusArr = Array.isArray(targetLead.status)
          ? targetLead.status
          : [];
        const inactiveStatus = statusArr.find((s) => s.status === "inactive");
        if (inactiveStatus) {
          setFilterExpoId(String(inactiveStatus.expo_id));
        }
        setSelectedLeadIds(new Set([pendingLeadId]));
      }
      setPendingLeadId(null);
      stopLoading();
    }
  }, [leads, pendingLeadId, stopLoading]);

  // ─── Filters ─────────────────────────────────────────────────────────────────

  // Distinct expo options derived from the loaded inactive leads
  const distinctExpoOptions = useMemo(() => {
    const idSet = new Set();
    leads.forEach((lead) => {
      const statusArr = Array.isArray(lead.status) ? lead.status : [];
      statusArr.forEach((s) => {
        if (s.status === "inactive") idSet.add(Number(s.expo_id));
      });
    });
    return Array.from(idSet)
      .map((id) => expos.find((e) => Number(e.id) === id))
      .filter(Boolean);
  }, [leads, expos]);

  const filteredLeads = useMemo(() => {
    let result = leads;
    // Filter by expo
    if (filterExpoId) {
      result = result.filter((l) => {
        const statusArr = Array.isArray(l.status) ? l.status : [];
        return statusArr.some(
          (s) =>
            Number(s.expo_id) === Number(filterExpoId) &&
            s.status === "inactive",
        );
      });
    }
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      result = result.filter((l) => {
        const p = l.primary_details || {};
        return (
          p.companyName?.toLowerCase().includes(q) ||
          p.contactPerson?.toLowerCase().includes(q) ||
          p.mobile1?.includes(q)
        );
      });
    }
    if (filterStartDate) {
      result = result.filter((l) => l.deletedAt >= filterStartDate);
    }
    if (filterEndDate) {
      const endDateTime = filterEndDate + "T23:59:59";
      result = result.filter((l) => l.deletedAt <= endDateTime);
    }
    // 2. Sort selected leads to top
    return [...result].sort((a, b) => {
      const aSel = selectedLeadIds.has(a.id);
      const bSel = selectedLeadIds.has(b.id);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return 0;
    });
  }, [
    leads,
    filterExpoId,
    filterSearch,
    filterStartDate,
    filterEndDate,
    selectedLeadIds,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const getIdsForScope = (targetScope = selectionScope) => {
    if (targetScope === "page") return paginatedLeads.map((l) => l.id);
    if (targetScope === "first50")
      return filteredLeads.slice(0, 50).map((l) => l.id);
    if (targetScope === "all") return filteredLeads.map((l) => l.id);
    return [];
  };

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleExpoAction = async (id, action, permanent = false) => {
    const isRestore = action === "restore";
    const ok = await confirm({
      title: isRestore
        ? "Restore Exhibition?"
        : permanent
          ? "Permanent Delete?"
          : "Delete Exhibition?",
      message: isRestore
        ? "This will restore the exhibition and make it visible again."
        : permanent
          ? "THIS ACTION CANNOT BE UNDONE. ALL RECORDS WILL BE PERMANENTLY DELETED."
          : "Are you sure you want to delete this exhibition?",
      type: isRestore ? "info" : "danger",
      isPermanent: permanent,
      confirmText: isRestore
        ? "RESTORE"
        : permanent
          ? "DELETE PERMANENTLY"
          : "DELETE",
    });

    if (!ok) return;

    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const adminId = userData.user?.id || "Admin";
    startLoading();
    try {
      let res;
      if (isRestore) {
        res = await fetch(`${API_BASE}/expos/restore?id=${id}`, {
          method: "PUT",
        });
      } else {
        res = await fetch(
          `${API_BASE}/expos/delete?id=${id}&permanent=${permanent ? 1 : 0}&deletedBy=${adminId}`,
          { method: "DELETE" },
        );
      }
      const data = await res.json();
      if (!data.error) {
        showToast(
          data.message ||
            `Record ${action === "restore" ? "restored" : "deleted"} successfully`,
          "success",
        );
        fetchExpos(true); // Silent refresh
        setSelectedExposId("");
      } else {
        showToast(data.error || "Action failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      stopLoading();
    }
  };

  const handleLeadAction = async (ids, action, permanent = false) => {
    const isRestore = action === "restore";
    const ok = await confirm({
      title: isRestore
        ? "Restore Records?"
        : permanent
          ? "Permanent Delete?"
          : "Delete Records?",
      message: isRestore
        ? `Are you sure you want to restore ${ids.split(",").length} record(s)?`
        : permanent
          ? "This action cannot be undone. The data will be gone forever."
          : `Are you sure you want to delete ${ids.split(",").length} record(s)?`,
      type: isRestore ? "info" : "danger",
      isPermanent: permanent,
      confirmText: isRestore
        ? "Restore"
        : permanent
          ? "Delete Permanently"
          : "Delete",
    });

    if (!ok) return;

    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const adminId = userData.user?.id || "Admin";
    startLoading();
    try {
      if (isRestore) {
        const idList = ids.split(",");
        let success = true;
        for (const id of idList) {
          const leadObj = leads.find((l) => String(l.id) === String(id));
          let restoreExpoId = filterExpoId;

          if (!restoreExpoId && leadObj) {
            const sArr = Array.isArray(leadObj.status) ? leadObj.status : [];
            const inact = sArr.find((s) => s.status === "inactive");
            if (inact) restoreExpoId = inact.expo_id;
          }

          const r = await fetch(`${API_BASE}/customer-data`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              action: "restore",
              expo_id: restoreExpoId,
            }),
          });
          const d = await r.json();
          if (!d.success) success = false;
        }
        if (success) showToast("Records restored successfully");
        else showToast("Some restorations failed", "warning");
      } else {
        const res = await fetch(
          `${API_BASE}/customer-data?ids=${ids}&permanent=1&expo_id=${filterExpoId}&deletedBy=${adminId}`,
          { method: "DELETE" },
        );
        const data = await res.json();
        showToast(data.message);
      }
      fetchInactiveLeads(true); // Silent Refresh
    } catch {
      showToast("Action failed", "error");
    } finally {
      setSelectedLeadIds(new Set());
      stopLoading();
    }
  };

  const toggleLead = (id) => {
    const next = new Set(selectedLeadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeadIds(next);
  };

  const formatDateTime = (dt) => {
    if (!dt) return "—";
    try {
      return new Date(dt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dt;
    }
  };

  return (
    <div className="min-h-screen bg-white  relative pb-[100px]">
      {/* ── Header ── */}
      <div className="px-8 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-[#ffeced] flex items-center justify-center text-black hover:bg-red-100 transition-all cursor-pointer shadow-sm"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">
              Restore & Delete
            </h1>
            <button
              onClick={() => {
                fetchExpos();
                if (activeTab === TABS.EXPO && selectedExposId)
                  fetchExpoStats(selectedExposId);
                if (activeTab === TABS.DATA) fetchInactiveLeads();
              }}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-black hover:rotate-180 transition-all duration-700"
              title="Refresh"
            >
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          <div className="flex gap-3">
            {Object.values(TABS).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedExposId("");
                  setSelectedLeadIds(new Set());
                  setFilterExpoId("");
                  setFilterSearch("");
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setCurrentPage(1);
                }}
                className={`px-8 py-3 rounded-xl text-sm font-medium   transition-all ${
                  activeTab === tab
                    ? "bg-black text-white shadow-xl"
                    : "bg-white text-gray-400 border border-gray-200 hover:text-black hover:border-gray-400"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="p-10">
        {/* ══════════════ EXPO TAB ══════════════ */}
        {activeTab === TABS.EXPO ? (
          <div className="max-w-7xl mx-auto animate-fadeIn">
            <div className="bg-white rounded-[2rem] border border-gray-300 p-10 flex flex-col min-h-[420px] shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 border-l-4 border-[#ff3b3a] pl-4 mb-10">
                Expo Restore & Delete
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
                <div className="space-y-3">
                  <label className="text-[15px] ml-1 block">
                    Select Exhibition <span className="text-[#ff3b3a]">*</span>
                  </label>
                  <select
                    value={selectedExposId}
                    onChange={(e) => setSelectedExposId(e.target.value)}
                    className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-500 outline-none appearance-none cursor-pointer text-sm font-medium text-gray-800 focus:ring-2 focus:ring-[#ff3b3a]/10"
                    disabled={
                      expos.filter((e) => Number(e.active) === 0).length === 0
                    }
                  >
                    <option value="">
                      {expos.filter((e) => Number(e.active) === 0).length === 0
                        ? "No expo have been deleted"
                        : "Select Expo"}
                    </option>
                    {expos
                      .filter((e) => Number(e.active) === 0)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.expo_name} {e.year}
                        </option>
                      ))}
                  </select>
                </div>

                {expoDetails && (
                  <>
                    <div className="space-y-3">
                      <label className="text-[15px] ml-1 block">
                        Exhibition Name
                      </label>
                      <div className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-300 flex items-center text-sm font-medium text-black">
                        {expoDetails.expo_name} {expoDetails.year}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[15px] ml-1 block">Location</label>
                      <div className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-300 flex items-center text-sm font-medium text-black ">
                        {expoDetails.location}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[15px] ml-1 block">
                        Event Dates
                      </label>
                      <div className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-300 flex items-center text-sm font-medium text-gray-600">
                        {expoDetails.dates || "Not Specified"}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[15px] text-red-600 ml-1 block">
                        Records
                      </label>
                      <div className="w-full h-12 px-6 rounded-2xl bg-red-50 border border-red-200 flex items-center text-xl font-medium text-red-600 tabular-nums">
                        {expoStats.count}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[15px] ml-1 block">
                        Deleted By
                      </label>
                      <div className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-300 flex items-center text-sm font-semibold text-black ">
                        {employeeMap[expoDetails.deletedBy] ||
                          expoDetails.deletedBy ||
                          "System"}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[15px] ml-1 block">
                        Deleted At
                      </label>
                      <div className="w-full h-12 px-6 rounded-2xl bg-gray-100 border border-gray-300 flex items-center text-sm font-medium text-black">
                        {formatDateTime(expoDetails.deletedAt)}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {selectedExposId && (
                <div className="flex gap-6 mt-16">
                  <button
                    onClick={() => handleExpoAction(selectedExposId, "restore")}
                    className="flex-1 h-14 rounded-2xl bg-[#4A90B3] text-white text-lg font-semibold hover:brightness-110 shadow-lg active:scale-95 transition-all"
                  >
                    Restore Exhibition
                  </button>
                  <button
                    onClick={() =>
                      handleExpoAction(selectedExposId, "delete", true)
                    }
                    className="flex-1 h-14 rounded-2xl bg-[#FF4136] text-white text-lg font-semibold hover:brightness-110 shadow-lg active:scale-95 transition-all"
                  >
                    Permanent Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ══════════════ DATA TAB ══════════════ */
          <div className="space-y-8 animate-fadeIn max-w-[1800px] mx-auto">
            {/* Controls Card */}
            <div className="bg-white rounded-[2rem] border border-gray-300 p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 border-l-4 border-[#ff3b3a] pl-4 mb-8">
                Data Restore & Delete
              </h2>

              {/* Filter Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-6 mb-8">
                <div className="space-y-3">
                  <label className="text-[15px] font-semibold text-black ml-1 block">
                    Filter by Expo
                  </label>
                  <select
                    value={filterExpoId}
                    onChange={(e) => {
                      setFilterExpoId(e.target.value);
                      setCurrentPage(1);
                      setSelectedLeadIds(new Set());
                    }}
                    className="w-full h-12 px-5 rounded-2xl bg-gray-100 border border-gray-300 outline-none appearance-none cursor-pointer text-sm font-medium text-black focus:ring-2 focus:ring-[#ff3b3a]/10"
                  >
                    <option value="">All Expo</option>
                    {distinctExpoOptions.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.expo_name} {e.year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 lg:col-span-2">
                  <label className="text-[15px] font-semibold text-black ml-1 block">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Company, contact person, mobile..."
                    value={filterSearch}
                    onChange={(e) => {
                      setFilterSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-12 px-5 rounded-2xl bg-gray-100 border border-gray-300 outline-none focus:border-black transition-all text-sm font-medium text-black"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[15px] font-semibold text-black ml-1 block">
                    Deleted From
                  </label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => {
                      setFilterStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-12 px-5 rounded-2xl bg-gray-100 border border-gray-300 outline-none focus:border-black transition-all text-sm font-medium text-black"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[15px] font-semibold text-black ml-1 block">
                    To
                  </label>
                  <input
                    type="date"
                    value={filterEndDate}
                    disabled={!filterStartDate}
                    min={filterStartDate}
                    onChange={(e) => {
                      setFilterEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-12 px-5 rounded-2xl bg-gray-100 border border-gray-300 outline-none focus:border-black transition-all text-sm font-medium text-black disabled:opacity-40 disabled:bg-gray-50"
                  />
                </div>
              </div>

              {/* Bulk Action Row */}
              <div className="flex flex-wrap items-center gap-6 pt-5 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-black whitespace-nowrap">
                    Select All :
                  </label>
                  <div className="flex  p-1 rounded-2xl border border-gray-200">
                    <button
                      onClick={() => {
                        setSelectionScope("page");
                        setSelectedLeadIds(new Set(getIdsForScope("page")));
                      }}
                      className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        selectionScope === "page"
                          ? "bg-black text-white shadow-md"
                          : "text-black hover:bg-gray-200"
                      }`}
                    >
                      PAGE ({paginatedLeads.length})
                    </button>
                    <button
                      onClick={() => {
                        setSelectionScope("first50");
                        setSelectedLeadIds(new Set(getIdsForScope("first50")));
                      }}
                      className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        selectionScope === "first50"
                          ? "bg-black text-white shadow-md"
                          : "text-black hover:bg-gray-200"
                      }`}
                    >
                      FIRST 50
                    </button>
                    <button
                      onClick={() => {
                        setSelectionScope("all");
                        setSelectedLeadIds(new Set(getIdsForScope("all")));
                      }}
                      className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        selectionScope === "all"
                          ? "bg-black text-white shadow-md"
                          : "text-black hover:bg-gray-200"
                      }`}
                    >
                      ALL ({filteredLeads.length})
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLeadIds(new Set())}
                  className="h-10 px-6 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-black hover:border-black transition-all shadow-sm active:scale-95"
                >
                  Clear Selection
                </button>

                <div className="flex-1" />

                <span className="text-sm font-medium text-black">
                  Selected:{" "}
                  <span className="text-red-600 font-semibold ml-1">
                    {selectedLeadIds.size}
                  </span>
                </span>
                <span className="text-sm font-medium text-black">
                  Total:{" "}
                  <span className="text-black font-semibold ml-1">
                    {filteredLeads.length}
                  </span>
                </span>

                <button
                  onClick={() =>
                    handleLeadAction(
                      Array.from(selectedLeadIds).join(","),
                      "restore",
                    )
                  }
                  disabled={selectedLeadIds.size === 0}
                  className="h-11 px-8 rounded-2xl bg-[#4A90B3] text-white text-sm font-semibold hover:brightness-110 shadow-lg active:scale-95 transition-all disabled:opacity-40"
                >
                  Restore Selected
                </button>
                <button
                  onClick={() =>
                    handleLeadAction(
                      Array.from(selectedLeadIds).join(","),
                      "delete",
                      true,
                    )
                  }
                  disabled={selectedLeadIds.size === 0}
                  className="h-11 px-8 rounded-2xl bg-[#FF4136] text-white text-sm font-semibold hover:brightness-110 shadow-lg active:scale-95 transition-all disabled:opacity-40"
                >
                  Delete Selected
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 overflow-x-auto rounded-3xl shadow-sm">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-900 text-white  border-b border-gray-100">
                    <th className="px-5 py-3 text-[14px] font-medium  text-center w-12">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedLeadIds(
                              new Set(paginatedLeads.map((l) => l.id)),
                            );
                          else setSelectedLeadIds(new Set());
                        }}
                        checked={
                          paginatedLeads.length > 0 &&
                          paginatedLeads.every((l) => selectedLeadIds.has(l.id))
                        }
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  text-center border-l border-gray-100">
                      Actions
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100 min-w-[200px]">
                      Company Name
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100 min-w-[150px]">
                      Expo Name
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100 text-center">
                      Type
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100">
                      Contact Person
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100">
                      Designation
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100">
                      Mobile
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100">
                      Email
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100">
                      City
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100">
                      State
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100">
                      Segment
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100">
                      Source
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100">
                      Remarks
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100 text-center">
                      Deleted By
                    </th>
                    <th className="px-5 py-3 text-[14px] font-medium  border-l border-gray-100 text-center">
                      Deleted At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedLeads.length === 0 ? (
                    <tr>
                      <td
                        colSpan="15"
                        className="py-24 text-center text-gray-400 font-medium text-sm"
                      >
                        {leads.length === 0
                          ? "No deleted records found"
                          : "No records match the current filters"}
                      </td>
                    </tr>
                  ) : (
                    paginatedLeads.map((lead) => (
                      <LeadRow
                        key={lead.id}
                        lead={lead}
                        isSelected={selectedLeadIds.has(lead.id)}
                        onToggle={() => toggleLead(lead.id)}
                        onHistory={setHistoryRecord}
                        onView={setViewRecord}
                        formatDateTime={formatDateTime}
                        employeeMap={employeeMap}
                        expos={expos}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Premium Pagination Footer */}
            <div className="mt-10 px-8 py-5 bg-white rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
              <div className="text-[11px] font-semibold text-black  tracking-[0.2em] leading-none">
                Page {currentPage} of {totalPages}{" "}
                <span className="mx-2 opacity-20">|</span>{" "}
                {filteredLeads.length} total records
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-black hover:border-black hover:bg-black hover:text-white disabled:opacity-20 disabled:hover:bg-white disabled:hover:text-black disabled:hover:border-gray-100 transition-all cursor-pointer shadow-sm active:scale-90"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                <div className="flex items-center gap-2">
                  {[...Array(totalPages)].map((_, i) => {
                    const p = i + 1;
                    // Show current, first, last, and neighbors
                    if (
                      totalPages > 7 &&
                      Math.abs(p - currentPage) > 1 &&
                      p !== 1 &&
                      p !== totalPages
                    ) {
                      if (Math.abs(p - currentPage) === 2)
                        return (
                          <span key={p} className="text-gray-300 font-semibold">
                            ...
                          </span>
                        );
                      return null;
                    }

                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-10 h-10 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                          p === currentPage
                            ? "bg-[#e81c21] text-white shadow-lg shadow-red-200 scale-110"
                            : "bg-white text-gray-400 border border-gray-100 hover:border-black hover:text-black"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-black hover:border-black hover:bg-black hover:text-white disabled:opacity-20 disabled:hover:bg-white disabled:hover:text-black disabled:hover:border-gray-100 transition-all cursor-pointer shadow-sm active:scale-90"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .scale-in { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {viewRecord && (
        <ViewOnlyModal row={viewRecord} onClose={() => setViewRecord(null)} />
      )}
      {historyRecord && (
        <HistoryModal
          record={historyRecord}
          onClose={() => setHistoryRecord(null)}
        />
      )}
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────────────────────────────

const fetchHistoryById = async (recordId) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/customer-followup?recordId=${recordId}`,
      {
        headers: { "ngrok-skip-browser-warning": "69420" },
      },
    );
    const result = await res.json();
    return result.success
      ? result.data.map((h) => ({
          entityType: h.entity_type,
          submittedAt: h.submitted_at,
          followupStage: h.followup_stage,
          contactPerson: h.contact_person,
          contactNumber: h.contact_number || h.mobile_no,
          remarks: h.remarks,
          nextFollowupDate: h.next_followup_date,
          nextFollowReason: h.next_follow_reason,
          expoName:
            `${h.expo_name || ""} ${h.expo_year || ""}`.trim() || "General",
        }))
      : [];
  } catch {
    return [];
  }
};

const HistoryModal = ({ record, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistoryById(record.customer_data_id || record.id).then((h) => {
      setHistory(h || []);
      setLoading(false);
    });
  }, [record]);

  const companyTitle = record.primary_details?.companyName || "COMPANY";

  const groupedHistory = useMemo(() => {
    const groups = {};
    const sorted = [...history].sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
    );
    sorted.forEach((h) => {
      const expo = h.expoName || "General";
      const stage = h.followupStage || "Unspecified Status";
      if (!groups[expo]) groups[expo] = {};
      if (!groups[expo][stage]) groups[expo][stage] = [];
      groups[expo][stage].push(h);
    });
    return Object.entries(groups).map(([expo, stages]) => [
      expo,
      Object.entries(stages),
    ]);
  }, [history]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white">
          <div>
            <h2 className="text-2xl text-bold ">{companyTitle} History</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-black hover:bg-black hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 text-lg"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-8 py-8 bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-[5px] border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[14px]  text-black ">FETCHING HISTORY...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
              <p className=" text-sm font-semibold ">
                No history records found.
              </p>
            </div>
          ) : (
            <div className="space-y-12 pb-10">
              {groupedHistory.map(([expo, statusGroups], expoIdx) => (
                <div key={expo} className="space-y-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <div className="bg-white border-2 border-black px-6 py-2 rounded-full shadow-sm shrink-0">
                      <span className="text-[14px]  whitespace-nowrap">
                        {expo}
                      </span>
                    </div>
                    {expoIdx === 0 && (
                      <div className="bg-red-600 text-white text-[12px]  px-3 py-1.5 rounded-full  shadow-md shrink-0">
                        Latest Expo
                      </div>
                    )}
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {statusGroups.map(([stage, items], stageIdx) => (
                      <div
                        key={stage}
                        className="bg-white rounded-[2rem] shadow-lg border border-gray-100 flex flex-col overflow-hidden h-fit"
                      >
                        <div className="bg-black text-white px-8 py-3.5 flex items-center justify-center gap-3">
                          <span className="text-[15px] font-semibold">
                            {stage}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          {items.map((h, i) => (
                            <div
                              key={i}
                              className="p-8 border-b border-gray-100 last:border-0 hover:bg-gray-50/30 transition-colors"
                            >
                              <div className="flex flex-col gap-2 mb-4 border-b border-gray-100 pb-3">
                                <h4 className="text-[15px] font-semibold text-black leading-tight">
                                  Business Type : {h.entityType || "RECORD"}
                                </h4>
                                <span className="text-[13px] text-black  ">
                                  Taken On :{" "}
                                  <span className="text-black">
                                    {new Date(h.submittedAt).toLocaleString(
                                      "en-IN",
                                    )}
                                  </span>
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-black mb-4">
                                <div>
                                  <span className="text-[15px]  text-black  block mb-0.5">
                                    Contact
                                  </span>
                                  <p className="text-sm  truncate">
                                    {h.contactPerson || "—"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[15px]  text-black  block mb-0.5">
                                    Phone
                                  </span>
                                  <p className="text-sm  tabular-nums">
                                    {h.contactNumber || h.mobile_no || "—"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[15px]  text-black  block mb-0.5">
                                    Next Follow-up
                                  </span>
                                  <p className="text-sm ">
                                    {h.nextFollowupDate
                                      ? fmt(h.nextFollowupDate)
                                      : "—"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[15px]  text-black  block mb-0.5">
                                    Reason
                                  </span>
                                  <p className="text-sm ">
                                    {h.nextFollowReason || "—"}
                                  </p>
                                </div>
                              </div>
                              <div className="pt-4 border-t border-gray-100">
                                <span className="text-[15px]  text-black  block mb-2">
                                  Remarks
                                </span>
                                <p className="text-sm font-medium leading-relaxed text-black">
                                  {h.remarks || "No interaction remarks."}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ViewOnlyModal = ({ row, onClose }) => {
  const [activeTab, setActiveTab] = useState(-1); // -1 for primary
  const data = row;

  const field = (label, key, isSub = false, index = 0) => {
    const val = isSub
      ? data.sub_entities?.[index]?.data?.[key]
      : data.primary_details?.[key];

    return (
      <div key={key} className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-gray-800 ml-1">
          {label}
        </label>
        <input
          value={val || ""}
          readOnly
          className="w-full rounded-xl px-4 py-2.5 bg-gray-100 border border-transparent text-sm font-semibold text-gray-900 outline-none select-all"
        />
      </div>
    );
  };

  const currentEntityName =
    activeTab === -1
      ? data.primary_details?.companyName
      : data.sub_entities?.[activeTab]?.data?.companyName;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-6">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-[#111111]">
          <div className="flex flex-col gap-2">
            <h2 className="text-white text-[15px] font-semibold tracking-wide">
              {currentEntityName || "View Lead"}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab(-1)}
                className={`px-5 py-2 rounded-full text-[10px] font-semibold tracking-widest transition-all ${activeTab === -1 ? "bg-red-600 text-white shadow-lg shadow-red-500/30" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}
              >
                {data.primary_type || "Primary"}
              </button>
              {data.sub_entities?.map((sub, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => setActiveTab(sIdx)}
                  className={`px-5 py-2 rounded-full text-[10px] font-semibold tracking-widest transition-all ${activeTab === sIdx ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}
                >
                  {sub.type || "Secondary"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-gray-50/50">
          <div className="space-y-10">
            <div className="flex items-center justify-between border-b border-gray-200 pb-6">
              <div className="flex items-center gap-3">
                <span
                  className={`w-1.5 h-6 rounded-full ${activeTab === -1 ? "bg-red-600" : "bg-blue-600"}`}
                />
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentEntityName || "Lead Details"}
                </h3>
              </div>
              <div className="px-6 py-2.5 rounded-full border border-gray-500 text-[13px] font-semibold bg-white">
                {activeTab === -1
                  ? data.primary_type
                  : data.sub_entities?.[activeTab]?.type}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {field(
                "Company Name",
                "companyName",
                activeTab !== -1,
                activeTab,
              )}
              {field("Remarks", "remarks", activeTab !== -1, activeTab)}
              {field(
                "Contact Person",
                "contactPerson",
                activeTab !== -1,
                activeTab,
              )}
              {field("Designation", "designation", activeTab !== -1, activeTab)}
              {field("Mobile No 1", "mobile1", activeTab !== -1, activeTab)}
              {field("Mobile No 2", "mobile2", activeTab !== -1, activeTab)}
              {field("Land Line No", "landline", activeTab !== -1, activeTab)}
              {field("Email Id 1", "email1", activeTab !== -1, activeTab)}
              {field("Email Id 2", "email2", activeTab !== -1, activeTab)}
              {field("Address 1", "address1", activeTab !== -1, activeTab)}
              {field("Address 2", "address2", activeTab !== -1, activeTab)}
              {field("Address 3", "address3", activeTab !== -1, activeTab)}
              {field("City", "city", activeTab !== -1, activeTab)}
              {field("Pin Code", "pincode", activeTab !== -1, activeTab)}
              {field("State", "state", activeTab !== -1, activeTab)}
              {field("Country", "country", activeTab !== -1, activeTab)}
              {field("Website", "website", activeTab !== -1, activeTab)}
              {field("Source", "source", activeTab !== -1, activeTab)}
              {field(
                "Product Details",
                "productDetails",
                activeTab !== -1,
                activeTab,
              )}
              {field("Segment", "segment", activeTab !== -1, activeTab)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-white border-t border-gray-100 flex items-center justify-between">
          <div className="hidden sm:block">
            <p className="text-[10px] font-medium text-black">
              Database Entry:{" "}
              {data.created_at
                ? new Date(data.created_at).toLocaleString("en-IN")
                : "—"}
            </p>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={onClose}
              className="px-10 py-3.5 rounded-full bg-black text-white font-semibold text-[11px]  tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
