import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLoading } from "../../context/LoadingContext";

const todayStr = () => new Date().toISOString().slice(0, 10);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const fetchPendingFollowups = async (userRole, userId, exposId) => {
  try {
    const queryParams = { pending: 1, userRole, userId };
    if (exposId) queryParams.exposId = exposId;
    const query = new URLSearchParams(queryParams).toString();
    const res = await fetch(`${API_BASE_URL}/customer-followup?${query}`, {
      headers: { "ngrok-skip-browser-warning": "69420" }
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch { return []; }
};

const fetchHistoryById = async (recordId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/customer-followup?recordId=${recordId}`, {
      headers: { "ngrok-skip-browser-warning": "69420" }
    });
    const result = await res.json();
    return result.success ? result.data.map(h => ({
      entityType: h.entity_type,
      submittedAt: h.submitted_at,
      followupStage: h.followup_stage,
      contactPerson: h.contact_person,
      contactNumber: h.contact_number || h.mobile_no,
      remarks: h.remarks,
      nextFollowupDate: h.next_followup_date,
      nextFollowReason: h.next_follow_reason,
      expoName: `${h.expo_name || ''} ${h.expo_year || ''}`.trim() || "General",
    })) : [];
  } catch { return []; }
};

const REASON_TABS = ["History Tele Inprogress", "Site Inprogress", "Prospective"];

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso.includes("T") ? iso : iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

// ─── History Modal ─────────────────────────────────────────────────────────────
const HistoryModal = ({ record, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistoryById(record.customer_data_id || record.id).then(h => {
      setHistory(h || []);
      setLoading(false);
    });
  }, [record]);

  const companyTitle = record.primary_details?.companyName || "COMPANY";

  const groupedHistory = useMemo(() => {
    const groups = {};
    // Ensure chronological sorting latest to oldest
    const sorted = [...history].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    sorted.forEach((h) => {
      const expo = h.expoName || "General";
      const stage = h.followupStage || "Unspecified Status";
      if (!groups[expo]) groups[expo] = {};
      if (!groups[expo][stage]) groups[expo][stage] = [];
      groups[expo][stage].push(h);
    });
    
    // Convert to nested array: [ [expo, [ [stage, items], ... ] ], ... ]
    return Object.entries(groups).map(([expo, stages]) => [
      expo,
      Object.entries(stages)
    ]);
  }, [history]);

  return (
    <div className="fixed inset-0 z-50 mt-[3vw] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in duration-300">
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
              <p className="text-[11px] font-black text-gray-500 tracking-widest">
                FETCHING HISTORY...
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
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-3 sm:gap-4">
                    <div className="hidden sm:block h-px flex-1 bg-gray-200"></div>
                    <div className="bg-white border-2 border-black px-5 sm:px-6 py-2 rounded-full shadow-sm shrink-0">
                      <span className="text-sm font-black uppercase tracking-[0.2em] text-black whitespace-nowrap">
                        {expo}
                      </span>
                    </div>
                    {expoIdx === 0 && (
                      <div className="bg-red-600 text-white text-[10px] sm:text-[11px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md animate-pulse shrink-0">
                        Latest Expo
                      </div>
                    )}
                    <div className="hidden sm:block h-px flex-1 bg-gray-200"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {statusGroups.map(([stage, items], stageIdx) => (
                      <div key={stage} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 flex flex-col overflow-hidden h-fit">
                        {/* Status Group Header */}
                        <div className="bg-black text-white px-8 py-3 flex items-center justify-center gap-[1vw]">
                          <span className="text-[14px] font-black text-center">{stage}</span>
                          {expoIdx === 0 && stageIdx === 0 && (
                            <span className="bg-red-600 text-[12px] px-2 py-0.5 rounded font-black ">Current Status</span>
                          )}
                        </div>

                        {/* Vertically Stacked Interactions */}
                        <div className="flex flex-col">
                          {items.map((h, i) => (
                            <div key={i} className="p-8 border-b border-gray-100 last:border-0 relative hover:bg-gray-50/30 transition-colors">
                              {/* Details Block */}
                              <div className="flex flex-col gap-2 mb-4 border-b border-gray-100 pb-3">
                                <h4 className="text-[17px] font-bold text-black leading-tight">
                                  Type of business : {h.entityType || "RECORD"}
                                </h4>
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
                                  <span className="text-sm font-semibold block leading-tight">Reason</span>
                                  <p className="font-normal text-sm">{h.nextFollowReason || "—"}</p>
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

// ─── Card ─────────────────────────────────────────────────────────────────────
const FollowupCard = ({ record, onFollowup, onViewHistory }) => {
  const entityIdx = parseInt(record.entity_idx ?? -1);
  const isSecondary = entityIdx >= 0;

  const mfr = record.primary_details || {};
  const currentSub = isSecondary ? (record.sub_entities?.[entityIdx]?.data || {}) : null;
  const currentEntityLabel = isSecondary ? record.sub_entities?.[entityIdx]?.type : (record.primary_type || "Manufacturer");

  // If follow-up was for secondary, show secondary at top, primary as "Associated" below
  const topCompany = isSecondary ? currentSub.companyName : mfr.companyName;
  const topContact = isSecondary ? currentSub.contactPerson : (record.contact_person || mfr.contactPerson);
  const prevDate = record.next_followup_date;
  const remarksDisplay = record.remarks;
  const statusDisplay = record.followup_stage;

  return (
    <div className="bg-[#f2f2f2] rounded-2xl p-6 sm:p-9 shadow-sm border border-gray-200/50 hover:shadow-md transition-shadow flex flex-col">
      <div className="flex justify-between items-start mb-4 gap-4">
        <h3 className="font-bold text-black text-[18px] leading-snug">
          Company: {topCompany || "—"}
        </h3>
        <span className={`shrink-0 px-4 py-1.5 rounded-2xl text-[12px] sm:text-[14px] font-bold text-white shadow-md ${
          currentEntityLabel === "Manufacturer" ? "bg-black" :
          currentEntityLabel === "Dealer" ? "bg-blue-600" : "bg-purple-600"
        }`}>
          {currentEntityLabel}
        </span>
      </div>

      <div className="flex flex-col gap-1 min-h-[160px]">

        <div className="space-y-2 text-[16px] font-semibold text-gray-800">
          <p>Follow-up Date: {fmtDate(prevDate)}</p>
          <p>Contact Person: {topContact || "—"}</p>
          <p>Remarks: {remarksDisplay || "—"}</p>
          <p>Status: {statusDisplay || "—"}</p>
        </div>

        {/* Association Block: If secondary, show primary here. If primary, show subs here */}
        <div className="mt-5 pt-4 border-t border-gray-400/30">
          <div className="flex flex-col gap-4">
             {isSecondary ? (
                <div className="flex flex-col gap-[0.7vw] text-[15px] text-gray-800">
                  <p className="font-bold"> Associated Primary : <span className="mb-1 text-[18px] font-semibold">Primary</span></p>
                  <p className="font-bold">Company: <span className="font-medium text-gray-900">{mfr.companyName || "—"}</span></p>
                  <p className="font-bold">Contact: <span className="font-medium text-gray-900">{mfr.contactPerson || "—"} {mfr.mobile1 ? `(${mfr.mobile1})` : ""}</span></p>
                  <p className="font-bold">Location: <span className="font-normal text-gray-900">{mfr.city || "—"}{mfr.state ? `, ${mfr.state}` : ""}</span></p>
                </div>
             ) : (
                record.sub_entities && record.sub_entities.length > 0 && (
                  <div className="flex flex-col gap-5">
                    {record.sub_entities.map((se, i) => (
                      <div key={i} className="flex flex-col gap-[0.7vw] text-[15px] text-gray-800">
                        <p className="font-bold"> Associated business : <span className="mb-1 text-[18px] font-semibold">{se.type || "—"}</span></p>
                        <p className="font-bold">Company: <span className="font-medium text-gray-900">{se.data?.companyName || "—"}</span></p>
                        <p className="font-bold">Contact: <span className="font-medium text-gray-900">{se.data?.contactPerson || "—"} {se.data?.mobile1 ? `(${se.data.mobile1})` : ""}</span></p>
                        <p className="font-bold">Location: <span className="font-normal text-gray-900">{se.data?.city || "—"}{se.data?.state ? `, ${se.data.state}` : ""}</span></p>
                      </div>
                    ))}
                  </div>
                )
             )}
          </div>
        </div>

        <div className="mt-auto pt-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            onClick={onViewHistory}
            className="flex items-center justify-center sm:justify-start gap-2 text-[16px] font-bold text-[#e11d48] hover:text-[#be123c] cursor-pointer transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            View History
          </button>

          <button
            onClick={onFollowup}
            className="w-full sm:w-auto px-8 py-2.5 rounded-xl text-white text-[16px] font-bold shadow-lg hover:brightness-90 transition-all cursor-pointer bg-[#e11d48]"
          >
            Follow Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default function FollowupMainPage() {
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState("History Tele Inprogress");
  const [filterDate, setFilterDate] = useState(todayStr());
  const [historyRecord, setHistoryRecord] = useState(null);

  const load = async () => {
    startLoading();
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const role = userData.user?.role || "";
    const id = userData.user?.id || null;
    const exposId = localStorage.getItem("utfi_current_expo_id");
    try {
      const all = await fetchPendingFollowups(role, id, exposId);
      setRecords(all);
    } finally {
      stopLoading();
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return records.filter((rec) => {
      const stage = (rec.followup_stage || "").toLowerCase();
      const reason = (rec.next_follow_reason || "").toLowerCase();

      if (stage === "confirmed" || stage === "not interested") return false;

      if (filterDate) {
        const d = (rec.next_followup_date || "").substring(0, 10);
        if (d !== filterDate) return false;
      }

      if (activeTab === "Prospective") return stage === "prospective";
      if (activeTab === "History Tele Inprogress") return stage === "inprogress" && reason === "tele call";
      if (activeTab === "Site Inprogress") return stage === "inprogress" && reason === "site visit";

      return true;
    });
  }, [records, activeTab, filterDate]);

  const tabLabels = {
    "History Tele Inprogress": "Tele Call",
    "Site Inprogress": "Site Visit",
    "Prospective": "Prospective"
  };

  return (
    <div className="min-h-screen bg-white font-['Montserrat']">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/Employee/home")}
            className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100 transition-all cursor-pointer">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-black">Follow Up Page</h1>
          <button onClick={load} title="Refresh" className="text-black hover:scale-110 transition-transform cursor-pointer">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="text-lg sm:text-xl font-bold text-red-600 w-full sm:w-auto text-center order-last sm:order-none">
          {tabLabels[activeTab]}
        </div>

        <Link to="/Employee/followupEditPage"
          className="bg-[#ffe8d1] text-[#935b2e] py-2 px-6 rounded-xl text-sm font-bold border border-[#f0c49a] transition-all hover:brightness-95 shrink-0">
          Edit Follow Up
        </Link>
      </div>

      <div className="max-w-[95%] mx-auto py-8 px-6">
        {/* Date Row */}
        <div className="flex items-center gap-4 mb-8">
          <span className="text-lg font-medium text-black">Date</span>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-full border border-black bg-white px-6 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-300 cursor-pointer shadow-sm text-center text-black" />
        </div>

        {/* Tabs Row */}
        <div className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto justify-center gap-3 mb-6 scrollbar-none">
          {REASON_TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 rounded-lg text-sm font-medium border-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab ? "bg-black text-white border-black" : "bg-white text-black border-black hover:bg-gray-100"
              }`}>
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {/* Total Count */}
        <div className="text-center mb-8">
          <p className="text-xl font-semibold text-black">Total followups: {filtered.length}</p>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-black">
            <p className="text-5xl mb-4">📋</p>
            <p className="font-medium">No follow-ups found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filtered.map((rec) => (
              <FollowupCard key={rec.id} record={rec}
                onFollowup={() => {
                  const rawRec = {
                    id: rec.customer_data_id,
                    expos_id: rec.expos_id,
                    primary_details: rec.primary_details,
                    sub_entities: rec.sub_entities,
                    primary_type: rec.primary_type
                  };
                  navigate("/Employee/followup", {
                    state: { row: { _raw: rawRec }, initialEntityIdx: rec.entity_idx, sourcePage: "/Employee/followupMainPage" }
                  });
                }}
                onViewHistory={() => setHistoryRecord(rec)}
              />
            ))}
          </div>
        )}
      </div>

      {historyRecord && <HistoryModal record={historyRecord} onClose={() => setHistoryRecord(null)} />}
    </div>
  );
}