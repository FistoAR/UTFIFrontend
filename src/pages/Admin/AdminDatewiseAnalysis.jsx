import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../../context/LoadingContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso.includes("T") ? iso : iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const fetchFollowupHistory = async (recordId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/customer-followup?recordId=${recordId}`, {
      headers: { "ngrok-skip-browser-warning": "any" }
    });
    const result = await res.json();
    return result.success ? result.data.map(h => ({
      entityType: h.entity_type,
      submittedAt: h.submitted_at,
      followupStage: h.followup_stage,
      contactPerson: h.contact_person,
      contactNumber: h.mobile_no,
      remarks: h.remarks,
      nextFollowupDate: h.next_followup_date,
      nextFollowReason: h.next_follow_reason,
      siteVisitLocation: h.site_visit_location,
      productDetails: h.product_details,
      expoName: `${h.expo_name || ""} ${h.expo_year || ""}`.trim() || h.expo_name || "General",
    })) : [];
  } catch { return []; }
};

// ─── History Modal ─────────────────────────────────────────────────────────────
const HistoryModal = ({ record, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowupHistory(record.customer_data_id).then((h) => {
      setHistory(h || []);
      setLoading(false);
    });
  }, [record]);

  const companyTitle =
    record.primary_details?.companyName ||
    record.customerObj?.primary_details?.companyName ||
    "COMPANY";

  const groupedHistory = useMemo(() => {
    const expoGroups = {};
    const sorted = [...history].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    sorted.forEach(h => {
      const eName = h.expoName || "General";
      if (!expoGroups[eName]) expoGroups[eName] = {};
      
      const stage = h.followupStage || "Unspecified Status";
      if (!expoGroups[eName][stage]) expoGroups[eName][stage] = [];
      expoGroups[eName][stage].push(h);
    });

    return Object.entries(expoGroups).map(([expo, stages]) => [
      expo,
      Object.entries(stages)
    ]);
  }, [history]);

  return (
    <div className="fixed inset-0 z-50 mt-[3vw] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-20">
          <div>
            <h2 className="text-xl text-black font-bold">{companyTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-black hover:bg-black hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-8 bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-[5px] border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[14px] font-bold text-gray-800 ">Fetching history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-md font-bold ">No history records found.</p>
            </div>
          ) : (
            <div className="space-y-12 pb-10">
              {groupedHistory.map(([expo, statusGroups], expoIdx) => (
                <div key={expo} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <div className="bg-white border-2 border-black px-6 py-2 rounded-full shadow-sm">
                      <span className="text-sm font-black uppercase tracking-[0.1em] text-black">{expo}</span>
                    </div>
                    {expoIdx === 0 && (
                      <div className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">Latest Expo</div>
                    )}
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {statusGroups.map(([stage, items], stageIdx) => (
                      <div key={stage} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 flex flex-col overflow-hidden h-fit">
                        <div className="bg-black text-white px-8 py-3 flex items-center justify-center gap-[1vw]">
                          <span className="text-[14px] font-black">{stage}</span>
                          {expoIdx === 0 && stageIdx === 0 && (
                            <span className="bg-red-600 text-[12px] px-2 py-0.5 rounded font-black">Current Status</span>
                          )}
                        </div>

                        <div className="flex flex-col">
                          {items.map((h, i) => (
                            <div key={i} className="p-8 border-b border-gray-100 last:border-0 relative hover:bg-gray-50/30 transition-colors">
                              <div className="flex flex-col gap-2 mb-4 border-b border-gray-100 pb-3">
                                <h4 className="text-[17px] font-bold text-black leading-tight">Type of business : {h.entityType || "RECORD"}</h4>
                                <span className="text-sm text-black font-semibold">
                                  Followup Taken : <span className="font-normal">{new Date(h.submittedAt).toLocaleString("en-IN")}</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-4 text-black">
                                <div className="space-y-1">
                                  <span className="text-sm font-semibold block leading-tight">Contact Person</span>
                                  <p className="font-normal text-sm truncate">{h.contactPerson || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-sm font-semibold block leading-tight">Contact No</span>
                                  <p className="font-normal text-sm tabular-nums">{h.contactNumber || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-sm font-semibold block leading-tight">Next Follow-up</span>
                                  <p className="font-normal text-sm">{h.nextFollowupDate ? fmtDate(h.nextFollowupDate) : "—"}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-sm font-semibold block leading-tight">Status</span>
                                  <p className="font-normal text-sm">{h.followupStage || "—"}</p>
                                </div>
                              </div>

                              <div className="mt-auto pt-4 border-t border-gray-100 text-black">
                                <span className="text-sm font-semibold block mb-1 leading-tight">Remarks</span>
                                <p className="font-normal text-sm leading-relaxed max-h-[120px] overflow-y-auto">{h.remarks || "No interaction remarks entered."}</p>
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

export default function AdminDatewiseAnalysis() {
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [historyRecord, setHistoryRecord] = useState(null);
  const [data, setData] = useState([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Taken");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [allocatedEmployees, setAllocatedEmployees] = useState([]);

  const loadData = async () => {
    startLoading();
    try {
      const selectedExpoId = localStorage.getItem("utfi_current_expo_id");
      const queryParams = { datewise: 1, userRole: "Admin", date: selectedDate };
      if (selectedExpoId) queryParams.exposId = selectedExpoId;
      if (employeeFilter) queryParams.userId = employeeFilter;

      const query = new URLSearchParams(queryParams).toString();
      const res = await fetch(`${API_BASE_URL}/customer-followup?${query}`, {
        headers: { "ngrok-skip-browser-warning": "any" }
      });
      const result = await res.json();
      setData(result.success ? result.data : []);

      // Fetch allocated employees for the current expo
      if (selectedExpoId) {
        const [exposRes, empRes] = await Promise.all([
          fetch(`${API_BASE_URL}/expos`, { headers: { "ngrok-skip-browser-warning": "any" } }),
          fetch(`${API_BASE_URL}/employee`, { headers: { "ngrok-skip-browser-warning": "any" } })
        ]);
        
        if (exposRes.ok && empRes.ok) {
          const exposData = await exposRes.json();
          const empData = await empRes.json();
          const currentExpo = exposData.find(ex => String(ex.id) === String(selectedExpoId));
          
          if (currentExpo) {
            const allocatedIds = typeof currentExpo.employees_allocated === "string" 
              ? JSON.parse(currentExpo.employees_allocated || "[]") 
              : (currentExpo.employees_allocated || []);
            
            const filteredEmps = empData.filter(emp => allocatedIds.includes(String(emp.id)) || allocatedIds.includes(Number(emp.id)));
            setAllocatedEmployees(filteredEmps);
          }
        }
      }
    } catch {
      setData([]);
    } finally {
      stopLoading();
    }
  };

  const fetchCount = async () => {
    setCountLoading(true);
    try {
      const selectedExpoId = localStorage.getItem("utfi_current_expo_id");
      const leadParams = {
        all: 1,
        userRole: "Admin",
        fromDate: selectedDate,
        toDate: selectedDate,
        page: 1,
        pageSize: 1,
      };
      if (selectedExpoId) leadParams.expos_id = selectedExpoId;

      const leadQuery = new URLSearchParams(leadParams).toString();
      const res = await fetch(`${API_BASE_URL}/customer-data?${leadQuery}`, {
        headers: { "ngrok-skip-browser-warning": "any" },
      });
      const d = await res.json();
      setLeadsCount(d.success ? (d.total || 0) : 0);
    } catch {
      setLeadsCount(0);
    } finally {
      setCountLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedDate, employeeFilter]);
  useEffect(() => { fetchCount(); }, [selectedDate]);

  // Filtered employee list based on allocation (already fetched in loadData)
  const employeeList = useMemo(() => {
    return (allocatedEmployees || []).map(e => ({ id: e.id, name: e.name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allocatedEmployees]);

  // Filter by employee selection
  const filteredData = useMemo(() => {
    if (!employeeFilter) return data;
    return data.filter(item => String(item.employee_id) === String(employeeFilter));
  }, [data, employeeFilter]);

  // Aggregate into unique cards
  const { consolidated, stats } = useMemo(() => {
    const map = new Map();
    filteredData.forEach(item => {
      const id = item.customer_data_id;
      if (!map.has(id)) map.set(id, { rows: [] });
      map.get(id).rows.push(item);
    });

    const items = [];
    const counts = { teleTaken: 0, teleMissed: 0, siteTaken: 0, siteMissed: 0, confirmed: 0 };

    map.forEach(customerInfo => {
      const takenRow = customerInfo.rows.find(r => r.submitted_at?.slice(0, 10) === selectedDate);
      const scheduledRow = customerInfo.rows.find(r => r.next_followup_date === selectedDate);
      
      const isTaken = !!takenRow;
      if (isTaken && takenRow.followup_stage === "Confirmed") {
        counts.confirmed++;
      }

      const effectiveRow = isTaken ? takenRow : scheduledRow;
      if (!effectiveRow) return;

      const reason = effectiveRow.next_follow_reason || "";
      const isTelecall = reason === "Tele Call";
      const isSiteVisit = reason === "Site Visit";

      items.push({ ...effectiveRow, customerObj: customerInfo.rows[0], isTaken, isTelecall, isSiteVisit });

      if (isTaken) {
        if (isTelecall) counts.teleTaken++;
        if (isSiteVisit) counts.siteTaken++;
      } else if (selectedDate < todayStr()) {
        if (isTelecall) counts.teleMissed++;
        if (isSiteVisit) counts.siteMissed++;
      }
    });

    return { consolidated: items, stats: counts };
  }, [filteredData, selectedDate]);

  const displayedRecords = useMemo(() => {
    if (activeTab === "Taken") return consolidated.filter(item => item.isTaken);
    return consolidated.filter(item => !item.isTaken);
  }, [consolidated, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col ">
      {/* Header */}
      <div className="bg-white px-6 pt-5 pb-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100 transition-all cursor-pointer shrink-0"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl text-gray-900 whitespace-nowrap">Date - wise Analysis</h1>
          <button
            onClick={loadData}
            title="Refresh"
            className="text-gray-900 hover:scale-110 transition-transform cursor-pointer ml-1"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Tab Switcher in Header */}
        <div className="w-full max-w-[320px] flex justify-center">
          <div className="flex bg-gray-100 rounded-xl p-1 w-full shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab("Taken")}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "Taken" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Day Followups
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md text-[9px]">
                {consolidated.filter((item) => item.isTaken).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("Upcoming")}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "Upcoming" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {selectedDate < todayStr() ? "Missed" : "Upcoming"}
              <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md text-[9px]">
                {consolidated.filter((item) => !item.isTaken).length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Action / Legend Bar */}
      <div className="bg-white px-4 sm:px-6 py-4 border-b border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-y-6 lg:gap-x-6">
          {/* Left Section: Date & Info Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-4 sm:gap-6 w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <label className="text-[14px] font-bold text-gray-900 whitespace-nowrap">Date :</label>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-full border-2 border-gray-100 bg-gray-50/50 px-4 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer w-full sm:w-40 shadow-sm transition-all hover:bg-white hover:border-red-200"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[14px] font-bold text-gray-900 whitespace-nowrap">Employee :</label>
              <div className="relative flex-1">
                <select
                   value={employeeFilter}
                   onChange={(e) => setEmployeeFilter(e.target.value)}
                   className="rounded-full border-2 border-gray-100 bg-gray-50/50 px-4 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer w-full sm:w-44 shadow-sm appearance-none transition-all hover:bg-white hover:border-red-200"
                >
                   <option value="">All Employees</option>
                   {employeeList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Center Section: Primary Metrics */}
          <div className="grid grid-cols-3 sm:flex sm:items-center justify-around sm:justify-center gap-4 sm:gap-16 px-2 md:px-10 flex-1 w-full lg:w-auto border-y sm:border-none py-4 sm:py-0">
            {activeTab === "Taken" ? (
              <>
                <div className="flex flex-col items-center">
                  <span className="text-[18px] sm:text-[20px] font-black text-red-600 leading-none drop-shadow-sm">{leadsCount}</span>
                  <span className="text-[11px] sm:text-[14px] font-semibold text-gray-700 mt-1 text-center leading-tight">Customer Data</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[18px] sm:text-[20px] font-black text-[#10b981] leading-none drop-shadow-sm">{stats.teleTaken + stats.siteTaken}</span>
                  <span className="text-[11px] sm:text-[14px] font-semibold text-gray-700 mt-1 text-center leading-tight">Followup Taken</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[18px] sm:text-[20px] font-black text-[#2563eb] leading-none drop-shadow-sm">{stats.confirmed}</span>
                  <span className="text-[11px] sm:text-[14px] font-semibold text-gray-700 mt-1 text-center leading-tight">Customer Reg</span>
                </div>
              </>
            ) : (
               <div className="col-span-3 flex flex-col items-center py-2">
                 <span className="text-[14px] font-black text-gray-400 uppercase tracking-widest ">Viewing {selectedDate < todayStr() ? "Missed" : "Upcoming"} Tasks</span>
               </div>
            )}
          </div>

          {/* Right Section: Color Legend */}
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-end w-full lg:w-auto">
            {activeTab === "Taken" && (
              <>
                <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 whitespace-nowrap">
                  <span className="text-[13px] sm:text-[14px] font-semibold text-gray-600">Tele call : {stats.teleTaken}</span>
                  <div className="w-5 h-4 bg-[#9637e6] text-white rounded-[4px] flex items-center justify-center text-[10px] font-black shadow-sm">T</div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 whitespace-nowrap">
                  <span className="text-[13px] sm:text-[14px] font-semibold text-gray-600">Site visit : {stats.siteTaken}</span>
                  <div className="w-5 h-4 bg-[#2563eb] text-white rounded-[4px] flex items-center justify-center text-[10px] font-black shadow-sm">S</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 px-6 py-8">
        {displayedRecords.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-black font-bold text-lg tabular-nums">
              No {activeTab === "Taken" ? "taken" : "upcoming/missed"} followups
              for {fmtDate(selectedDate)}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {displayedRecords.map((item, idx) => {
              const mfr =
                item.primary_details || item.customerObj?.primary_details || {};
              const isMissed = !item.isTaken && selectedDate <= todayStr();
              const isConfirmed = item.followup_stage === "Confirmed";

              const bgClass =
                item.isTaken || isConfirmed
                  ? "bg-[#dcfce7] border-green-200"
                  : isMissed
                    ? "bg-yellow-100 border-yellow-300" // Yellow for Missed/Today
                    : "bg-gray-50 border-gray-200"; // Gray for Future

              const businessType = item.entityType || "Manufacturer";
              const entityIdx = parseInt(item.entity_idx ?? -1);
              const isSecondary = entityIdx !== -1;
              const subEntities = item.customerObj?.sub_entities || [];
              const followedEntity = isSecondary ? subEntities[entityIdx] : null;

              return (
                <div
                  key={`${item.id}-${idx}`}
                  className={`rounded-2xl p-6 sm:p-9 shadow-sm border transition-shadow relative overflow-hidden flex flex-col ${bgClass}`}
                >
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-10 scale-90 sm:scale-100 origin-right">
                    {item.isTelecall ? (
                      <div className="w-7 h-6 bg-[#9637e6] text-white rounded flex items-center justify-center text-sm font-bold shadow-sm">
                        T
                      </div>
                    ) : item.isSiteVisit ? (
                      <div className="w-7 h-6 bg-[#0a18e3] text-white rounded flex items-center justify-center text-sm font-bold shadow-sm">
                        S
                      </div>
                    ) : null}
                    <span
                      className={`px-4 py-2 rounded-full text-[14px] font-bold text-white shadow-sm ${
                        businessType === "Manufacturer"
                          ? "bg-black"
                          : businessType === "Dealer"
                            ? "bg-blue-600"
                            : "bg-purple-600"
                      }`}
                    >
                      {businessType}
                    </span>
                  </div>

                  {/* Employee badge for Admin */}
                  <div className="mb-4 absolute top-4 left-4 sm:left-7">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 text-[11px] sm:text-[13px] font-bold text-gray-700 border border-white shadow-sm max-w-[120px] sm:max-w-none truncate">
                      <svg className="w-3 h-3 sm:w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      <span className="truncate">{item.employee_name || "Unknown"}</span>
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col gap-1 min-h-[160px] relative z-0 mt-8 sm:mt-6">
                    {/* Card Title: Prioritize the entity followed up */}
                    <h3 className="font-semibold text-black text-[16px] sm:text-[18px] mb-2 sm:pr-40 ">
                      Company: {isSecondary 
                        ? (followedEntity?.data?.companyName || mfr.companyName || "—") 
                        : (mfr.companyName || "—")}
                    </h3>

                    <div className="space-y-2 text-[14px] sm:text-[16px] font-semibold text-gray-800 ">
                      <p>
                        {activeTab === "Taken"
                          ? "Follow-up Date"
                          : "Next Follow-up Date"}
                        :{" "}
                        <span className="font-medium text-gray-900">
                          {fmtDate(selectedDate)}
                        </span>
                      </p>
                      <p>
                        Contact Person:{" "}
                        <span className="font-medium text-gray-900">
                          {item.contact_person || mfr.contactPerson || "—"}
                        </span>
                      </p>
                      <p>
                        Remarks:{" "}
                        <span className="font-medium text-gray-900 ">
                          {item.remarks || "—"}
                        </span>
                      </p>
                      <p>
                        Status:{" "}
                        <span className="font-medium text-gray-900">
                          {item.followup_stage || "—"}
                        </span>
                      </p>
                    </div>

                      {/* ASSOCIATIONS SECTION */}
                      <div className="mt-5 pt-4 border-t border-gray-400/30">
                        {isSecondary ? (
                          // If we followed a Secondary Business, show the Primary as Associated
                          <div className="flex flex-col gap-[0.7vw] text-[15px] text-gray-800">
                            <p className="font-bold">
                              Associated Primary :{" "}
                              <span className="mb-1 text-[18px] font-semibold">
                                Primary Business
                              </span>
                            </p>
                            <p className="font-bold">
                              Company:{" "}
                              <span className="font-medium text-gray-900">
                                {mfr.companyName || "—"}
                              </span>
                            </p>
                            <p className="font-bold">
                              Contact:{" "}
                              <span className="font-medium text-gray-900">
                                {mfr.contactPerson || "—"}{" "}
                                {mfr.mobile1 ? `(${mfr.mobile1})` : ""}
                              </span>
                            </p>
                            <p className="font-bold">
                              Location:{" "}
                              <span className="font-medium text-gray-900">
                                {mfr.city || "—"}{mfr.state ? `, ${mfr.state}` : ""}
                              </span>
                            </p>
                          </div>
                        ) : (
                          // If we followed the Primary, show all sub-entities as Associated
                          subEntities.length > 0 && (
                            <div className="flex flex-col gap-2">
                              {subEntities.map((se, i) => (
                                <div
                                  key={i}
                                  className="flex flex-col gap-[0.7vw] text-[15px] text-gray-800"
                                >
                                  <p className="font-bold">
                                    Associated business :{" "}
                                    <span className="mb-1 text-[18px] font-semibold">
                                      {se.type || "—"}
                                    </span>
                                  </p>
                                  <p className="font-bold">
                                    Company:{" "}
                                    <span className="font-medium text-gray-900">
                                      {se.data?.companyName || "—"}
                                    </span>
                                  </p>
                                  <p className="font-bold">
                                    Contact:{" "}
                                    <span className="font-medium text-gray-900">
                                      {se.data?.contactPerson || "—"}{" "}
                                      {se.data?.mobile1
                                        ? `(${se.data.mobile1})`
                                        : ""}
                                    </span>
                                  </p>
                                  <p className="font-bold">
                                    Location:{" "}
                                    <span className="font-medium text-gray-900">
                                      {se.data?.city || "—"}
                                      {se.data?.state ? `, ${se.data.state}` : ""}
                                    </span>
                                  </p>
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </div>

                    <div className="mt-auto pt-1 flex items-center justify-end">
                      <button
                        onClick={() => setHistoryRecord(item)}
                        className="flex items-center gap-2 text-[16px] font-bold text-[#e11d48] hover:text-[#be123c] cursor-pointer transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        View History
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {historyRecord && <HistoryModal record={historyRecord} onClose={() => setHistoryRecord(null)} />}
    </div>
  );
}
