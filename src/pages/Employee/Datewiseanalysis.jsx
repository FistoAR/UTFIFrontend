import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../../context/LoadingContext";

// ─── helpers ─────────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(
    iso.includes("T") ? iso : iso + "T00:00:00",
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const fetchFollowupHistory = async (recordId) => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/customer-followup?recordId=${recordId}`,
      {
        headers: { "ngrok-skip-browser-warning": "any" },
      },
    );
    const result = await res.json();
    return result.success
      ? result.data.map((h) => ({
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
          expoName:
            `${h.expo_name || ""} ${h.expo_year || ""}`.trim() ||
            h.expo_name ||
            "General",
        }))
      : [];
  } catch {
    return [];
  }
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
    const sorted = [...history].sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
    );

    sorted.forEach((h) => {
      const eName = h.expoName || "General";
      if (!expoGroups[eName]) expoGroups[eName] = {};

      const stage = h.followupStage || "Unspecified Status";
      if (!expoGroups[eName][stage]) expoGroups[eName][stage] = [];
      expoGroups[eName][stage].push(h);
    });

    return Object.entries(expoGroups).map(([expo, stages]) => [
      expo,
      Object.entries(stages),
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
              <p className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">
                Fetching history...
              </p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">
                No history records found.
              </p>
            </div>
          ) : (
            <div className="space-y-12 pb-10">
              {groupedHistory.map(([expo, statusGroups], expoIdx) => (
                <div key={expo} className="space-y-6">
                  {/* Exhibition Header */}
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <div className="bg-white border-2 border-black px-6 py-2 rounded-full shadow-sm">
                      <span className="text-sm font-black uppercase tracking-[0.2em] text-black">
                        {expo}
                      </span>
                    </div>
                    {expoIdx === 0 && (
                      <div className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">
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
                        {/* Status Group Header */}
                        <div className="bg-black text-white px-8 py-3 flex items-center justify-center gap-[1vw]">
                          <span className="text-[14px] font-black">
                            {stage}
                          </span>
                          {expoIdx === 0 && stageIdx === 0 && (
                            <span className="bg-red-600 text-[12px] px-2 py-0.5 rounded font-black">
                              Current Status
                            </span>
                          )}
                        </div>

                        {/* Vertically Stacked Interactions */}
                        <div className="flex flex-col">
                          {items.map((h, i) => (
                            <div
                              key={i}
                              className="p-8 border-b border-gray-100 last:border-0 relative hover:bg-gray-50/30 transition-colors"
                            >
                              {/* Details Block */}
                              <div className="flex flex-col gap-2 mb-4 border-b border-gray-100 pb-3">
                                <h4 className="text-[17px] font-bold text-black leading-tight">
                                  Type of business : {h.entityType || "RECORD"}
                                </h4>
                                <span className="text-sm text-black font-semibold">
                                  Followup Taken :{" "}
                                  <span className="font-normal">
                                    {new Date(h.submittedAt).toLocaleString(
                                      "en-IN",
                                    )}
                                  </span>
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-4 text-black">
                                <div className="space-y-1">
                                  <span className="text-sm font-semibold block leading-tight">
                                    Contact Person
                                  </span>
                                  <p className="font-normal text-sm truncate">
                                    {h.contactPerson || "—"}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-sm font-semibold block leading-tight">
                                    Contact No
                                  </span>
                                  <p className="font-normal text-sm tabular-nums">
                                    {h.contactNumber || "—"}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-sm font-semibold block leading-tight">
                                    Next Follow-up
                                  </span>
                                  <p className="font-normal text-sm">
                                    {h.nextFollowupDate
                                      ? fmtDate(h.nextFollowupDate)
                                      : "—"}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-sm font-semibold block leading-tight">
                                    Status
                                  </span>
                                  <p className="font-normal text-sm">
                                    {h.followupStage || "—"}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-auto pt-4 border-t border-gray-100 text-black">
                                <span className="text-sm font-semibold block mb-1 leading-tight">
                                  Remarks
                                </span>
                                <p className="font-normal text-sm leading-relaxed max-h-[120px] overflow-y-auto">
                                  {h.remarks ||
                                    "No interaction remarks entered."}
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DateWiseAnalysis() {
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [historyRecord, setHistoryRecord] = useState(null);
  const [data, setData] = useState([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Taken");

  const loadData = async () => {
    startLoading();
    try {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      const role = userData.user?.role || "";
      const id = userData.user?.id || null;
      const selectedExpoId = localStorage.getItem("utfi_current_expo_id");

      const queryParams = {
        datewise: 1,
        userRole: role,
        userId: id,
        date: selectedDate,
      };
      if (selectedExpoId) queryParams.exposId = selectedExpoId;

      const query = new URLSearchParams(queryParams).toString();
      const res = await fetch(`${API_BASE_URL}/customer-followup?${query}`, {
        headers: { "ngrok-skip-browser-warning": "any" },
      });
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        setData([]);
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
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      const role = userData.user?.role || "";
      const id = userData.user?.id || null;
      const selectedExpoId = localStorage.getItem("utfi_current_expo_id");

      const leadParams = {
        all: 1,
        userRole: role,
        userId: id,
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
      const data = await res.json();
      if (data.success) {
        setLeadsCount(data.total || 0);
      } else {
        setLeadsCount(0);
      }
    } catch {
      setLeadsCount(0);
    } finally {
      setCountLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [selectedDate]);

  useEffect(() => {
    fetchCount();
    // eslint-disable-next-line
  }, [selectedDate]);

  // Aggregate into unique cards
  const { consolidated, stats } = useMemo(() => {
    const map = new Map();

    // Group rows by customer_data_id
    data.forEach((item) => {
      const id = item.customer_data_id;
      if (!map.has(id)) {
        map.set(id, { rows: [] });
      }
      map.get(id).rows.push(item);
    });

    const items = [];
    const counts = {
      teleTaken: 0,
      teleMissed: 0,
      siteTaken: 0,
      siteMissed: 0,
      confirmed: 0,
    };

    map.forEach((customerInfo) => {
      // Find if there is a row made exactly on the selectedDate (TAKEN)
      const takenRow = customerInfo.rows.find(
        (r) => r.submitted_at?.slice(0, 10) === selectedDate,
      );
      // Find if there is a row scheduled for the selectedDate (PLANNED)
      const scheduledRow = customerInfo.rows.find(
        (r) => r.next_followup_date === selectedDate,
      );

      const isTaken = !!takenRow;

      // Logic: If TAKEN today, check if it reached Confirmed status
      if (isTaken && takenRow.followup_stage === "Confirmed") {
        counts.confirmed++;
      }

      // When TAKEN, we show the interaction details of the SUBMISSION on that day.
      // When NOT TAKEN, we show what was PLANNED for that day.
      const effectiveRow = isTaken ? takenRow : scheduledRow;
      if (!effectiveRow) return;

      const reason = effectiveRow.next_follow_reason || "";
      const isTelecall = reason === "Tele Call";
      const isSiteVisit = reason === "Site Visit";

      items.push({
        ...effectiveRow,
        customerObj: customerInfo.rows[0], // fallback for details
        isTaken,
        isTelecall,
        isSiteVisit,
      });

      if (isTaken) {
        if (isTelecall) counts.teleTaken++;
        if (isSiteVisit) counts.siteTaken++;
      } else {
        // Only count as 'Missed' if the selectedDate is in the past
        if (selectedDate < todayStr()) {
          if (isTelecall) counts.teleMissed++;
          if (isSiteVisit) counts.siteMissed++;
        }
      }
    });

    return { consolidated: items, stats: counts };
  }, [data, selectedDate]);

  const displayedRecords = useMemo(() => {
    if (activeTab === "Taken") {
      return consolidated.filter((item) => item.isTaken);
    } else {
      return consolidated.filter((item) => !item.isTaken);
    }
  }, [consolidated, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-['Montserrat']">
      {/* Header */}
      <div className="bg-white px-6 pt-5 pb-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100 transition-all cursor-pointer shrink-0"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-xl text-gray-900 whitespace-nowrap">Date - wise Analysis</h1>
          <button
            onClick={loadData}
            title="Refresh"
            className="text-gray-900 hover:scale-110 transition-transform cursor-pointer ml-1"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
        <div className="w-full max-w-[400px] flex justify-center">
            <div className="flex bg-gray-100 rounded-xl p-1 w-full shadow-sm border border-gray-200">
                <button
                    onClick={() => setActiveTab("Taken")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "Taken"
                        ? "bg-white text-gray-900 shadow"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Day Followups
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px]">
                    {consolidated.filter((item) => item.isTaken).length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab("Upcoming")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "Upcoming"
                        ? "bg-white text-gray-900 shadow"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    {selectedDate < todayStr()
                    ? "Missed Followup "
                    : "Upcoming Followup "}
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md text-[10px]">
                    {consolidated.filter((item) => !item.isTaken).length}
                    </span>
                </button>
            </div>
        </div>
      </div>

      {/* Action / Legend Bar */}
      <div className="bg-white px-6 py-4 shadow-sm border-t border-gray-50">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-y-8 gap-x-4">
          {/* Left Section: Date & Info Tags */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 lg:w-1/4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-gray-900 whitespace-nowrap">
                Date :
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-full border border-gray-200 bg-[#f9fafb] px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer w-40 font-bold text-black shadow-sm"
              />
            </div>

            {activeTab === "Taken" && (
              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 bg-[#9637e6] text-white rounded-[4px] flex items-center justify-center text-[10px] font-black ">
                    T
                  </div>
                  <span className="text-[14px] font-bold text-gray-700 whitespace-nowrap">
                    - Tele call - {stats.teleTaken}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 bg-[#2563eb] text-white rounded-[4px] flex items-center justify-center text-[10px] font-black ">
                    S
                  </div>
                  <span className="text-[14px] font-bold text-gray-700 whitespace-nowrap">
                    - Site visit - {stats.siteTaken}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Center Section: Primary Metrics */}
          <div className="flex-1 flex justify-around sm:justify-center items-center gap-4 sm:gap-14 w-full">
            {activeTab === "Taken" && (
              <>
                {/* Customer Data */}
                <div className="flex flex-col items-center">
                  <span className="text-[22px] sm:text-[25px] font-bold text-red-600 ">
                    {leadsCount}
                  </span>
                  <span className="text-[13px] sm:text-[14px] font-semibold text-black mt-1 whitespace-nowrap">
                    Customer Data
                  </span>
                </div>

                {/* Followup Taken */}
                <div className="flex flex-col items-center">
                  <span className="text-[22px] sm:text-[25px] font-bold text-[#10b981] ">
                    {stats.teleTaken + stats.siteTaken}
                  </span>
                  <span className="text-[13px] sm:text-[14px] font-semibold text-black mt-1 whitespace-nowrap">
                    Followup Taken
                  </span>
                </div>

                {/* Customer Reg */}
                <div className="flex flex-col items-center">
                  <span className="text-[22px] sm:text-[25px] font-bold text-[#2563eb] ">
                    {stats.confirmed}
                  </span>
                  <span className="text-[13px] sm:text-[14px] font-semibold text-black mt-1 whitespace-nowrap">
                    Customer Reg
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Right Spacer for alignment matching admin if needed, or just left empty */}
          <div className="hidden lg:block lg:w-1/4"></div>
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
              const isUpcoming = !item.isTaken && selectedDate > todayStr();

              const bgClass = item.isTaken
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
                  className={`rounded-2xl p-9 shadow-sm border transition-shadow relative overflow-hidden flex flex-col ${bgClass}`}
                >
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    {item.isTelecall ? (
                      <div className="w-7 h-6 bg-[#9637e6] text-white rounded flex items-center justify-center text-xs font-bold shadow-sm">
                        T
                      </div>
                    ) : item.isSiteVisit ? (
                      <div className="w-7 h-6 bg-[#0a18e3] text-white rounded flex items-center justify-center text-xs font-bold shadow-sm">
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

                  <div className="flex-1 flex flex-col gap-1 min-h-[160px] relative z-0">
                    {/* Card Title: Prioritize the entity followed up */}
                    <h3 className="font-bold text-black text-[18px] mb-2 pr-40">
                      Company: {isSecondary 
                        ? (followedEntity?.data?.companyName || mfr.companyName || "—") 
                        : (mfr.companyName || "—")}
                    </h3>

                    <div className="space-y-2 text-[16px] font-semibold text-gray-800 ">
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
                        <span className="font-medium text-gray-900">
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

      {historyRecord && (
        <HistoryModal
          record={historyRecord}
          onClose={() => setHistoryRecord(null)}
        />
      )}
    </div>
  );
}
