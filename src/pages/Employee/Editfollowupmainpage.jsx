import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useLoading } from "../../context/LoadingContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const fetchFollowupHistory = async (recordId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/customer-followup?recordId=${recordId}`, {
      headers: { "ngrok-skip-browser-warning": "any" }
    });
    const result = await res.json();
    // Normalize backend columns to frontend history keys
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
      expoName: `${h.expo_name || ''} ${h.expo_year || ''}`.trim() || "General",
    })) : [];
  } catch { return []; }
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso.includes("T") ? iso : iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const EDIT_TABS = ["Tele Call", "Site Visit", "Prospective", "Confirmed"];
const SEARCH_FIELDS = [
  { key: "companyName", label: "Company Name" },
  { key: "exhibitorName", label: "Exhibitor Name" },
  { key: "contactPerson", label: "Contact Person" },
  { key: "mobileNo", label: "Mobile Number" },
  { key: "city", label: "Location" },
];

// ─── History Modal ─────────────────────────────────────────────────────────────
const HistoryModal = ({ record, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowupHistory(record.id || record.customer_data_id).then(data => {
      setHistory(data);
      setLoading(false);
    });
  }, [record]);

  const companyName = (record.manufacturer?.companyName || record.primary_details?.companyName || "Company");

  const groupedHistory = useMemo(() => {
    const groups = {};
    // Chronological sorting latest to oldest
    const sorted = [...history].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    sorted.forEach((h) => {
      const expo = h.expoName || "General";
      const stage = h.followupStage || "Unspecified Status";
      if (!groups[expo]) groups[expo] = {};
      if (!groups[expo][stage]) groups[expo][stage] = [];
      groups[expo][stage].push(h);
    });

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
            <h2 className="text-xl text-black font-bold">{companyName}</h2>
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
                          <span className="text-[14px] font-black">{stage}</span>
                          {expoIdx === 0 && stageIdx === 0 && (
                            <span className="bg-red-600 text-[12px] px-2 py-0.5 rounded font-black">Current Status</span>
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

// ─── Card (standard followup tabs) ───────────────────────────────────────────
const FollowupCard = ({ record, isConfirmed, onFollowup, onViewHistory }) => {
  const entityIdx = parseInt(record._raw?.entity_idx ?? -1);
  const isSecondary = entityIdx >= 0;

  const mfr = record.manufacturer || {};
  const subs = record.subEntities || [];
  const currentSub = isSecondary ? (subs[entityIdx]?.data || {}) : null;
  const currentEntityLabel = isSecondary ? subs[entityIdx]?.type : (record._raw?.primary_type || "Manufacturer");

  const [hist, setHist] = useState([]);

  useEffect(() => {
    fetchFollowupHistory(record.id || record.customer_data_id).then(setHist);
  }, [record]);

  const latestHist = hist.length > 0 ? hist[0] : null; 
  const nextDate = latestHist?.nextFollowupDate;
  
  const topCompany = isSecondary ? currentSub.companyName : mfr.companyName;
  const topContact = isSecondary ? currentSub.contactPerson : (latestHist?.contactPerson || mfr.contactPerson);
  const topMobile = isSecondary ? currentSub.mobile1 : (latestHist?.contactNumber || mfr.mobile1);
  const topLocation = isSecondary ? currentSub.city : (latestHist?.siteVisitLocation || mfr.city);
  const remarksDisplay = latestHist?.remarks;

  return (
    <div className={`rounded-2xl p-6 sm:p-9 shadow-sm border transition-all hover:shadow-md flex flex-col overflow-hidden ${isConfirmed ? "bg-green-50 border-green-200" : "bg-[#f2f2f2] border-gray-200/50"}`}>
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex flex-col">
          <h3 className="font-bold text-black text-[18px] leading-snug">Company: {topCompany || "—"}</h3>
        </div>
        <span className={`shrink-0 px-4 py-1.5 rounded-2xl text-[12px] sm:text-[14px] font-bold text-white shadow-md ${
          currentEntityLabel === "Manufacturer" ? "bg-black" :
          currentEntityLabel === "Dealer" ? "bg-blue-600" : "bg-purple-600"
        }`}>
          {currentEntityLabel}
        </span>
      </div>

      <div className="flex flex-col gap-1 min-h-[160px]">
        
        <div className="space-y-2 text-[16px] font-semibold text-gray-800">
          <p>Contact Person: <span className="font-normal">{topContact || "—"} {topMobile ? `(${topMobile})` : ""}</span></p>
          <p>Location: <span className="font-normal">{topLocation || "—"}</span></p>
          {nextDate && <p>Next Follow-up Date: <span className="font-normal">{fmtDate(nextDate)}</span></p>}
          <p>Status: <span className="font-normal">{record.followup?.status || "—"}</span></p>
          {remarksDisplay && <p>Remarks: <span className="font-normal">{remarksDisplay}</span></p>}
        </div>

        {/* Association Block */}
        <div className="mt-5 pt-4 border-t border-gray-400/30">
          <div className="flex flex-col gap-4">
             {isSecondary ? (
                <div className="flex flex-col gap-[0.7vw] text-[15px] text-gray-800">
                  <p className="font-bold"> Associated business : <span className="mb-1 text-[18px] font-semibold">{record._raw?.primary_type || "—"}</span></p>
                  <p className="font-bold">Company: <span className="font-medium text-gray-900">{mfr.companyName || "—"}</span></p>
                  <p className="font-bold">Contact: <span className="font-medium text-gray-900">{mfr.contactPerson || "—"} {mfr.mobile1 ? `(${mfr.mobile1})` : ""}</span></p>
                  <p className="font-bold">Location: <span className="font-normal text-gray-900">{mfr.city || "—"}{mfr.state ? `, ${mfr.state}` : ""}</span></p>
                </div>
             ) : (
                subs && subs.length > 0 && (
                  <div className="flex flex-col gap-5">
                    {subs.map((se, i) => (
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
          <button onClick={onViewHistory} className="flex items-center justify-center sm:justify-start gap-2 text-[16px] font-bold text-[#e11d48] hover:text-[#be123c] cursor-pointer transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            View History
          </button>
          <button onClick={onFollowup}
            className="w-full sm:w-auto px-8 py-2.5 rounded-xl text-white text-[16px] font-bold shadow-lg hover:brightness-90 transition-all cursor-pointer bg-[#e11d48]">
            Follow up
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Card (Confirmed / Payment Pending tab) — shows CustomerRegister data ────
const ConfirmedPendingCard = ({ record, onFollowup, onViewHistory, paymentFilter }) => {
  const entityIdx = parseInt(record._raw?.entity_idx ?? -1);
  const isSecondary = entityIdx >= 0;

  const mfr = record.manufacturer || {};
  const subs = record.subEntities || [];
  const currentSub = isSecondary ? (subs[entityIdx]?.data || {}) : null;
  const currentEntityLabel = isSecondary ? subs[entityIdx]?.type : (record._raw?.primary_type || "Manufacturer");

  const [hist, setHist] = useState([]);
  const pStatus = record.paymentStatus || "Not received";
  
  useEffect(() => {
    fetchFollowupHistory(record.id || record.customer_data_id).then(setHist);
  }, [record]);

  const latestHist = hist.length > 0 ? hist[0] : null;
  const regData = record.registerData || {};
  const topCompany = isSecondary ? currentSub.companyName : (regData.exhibitorName || mfr.companyName);
  const topContact = isSecondary ? currentSub.contactPerson : (regData.contactPerson || latestHist?.contactPerson || mfr.contactPerson);
  const mobileNo = isSecondary ? currentSub.mobile1 : (regData.contactNumber || regData.mobile_no || latestHist?.contactNumber || mfr.mobile1);
  const topLocation = isSecondary ? currentSub.city : (regData.city || mfr.city);
  const remarks = latestHist?.remarks || regData.remarks || "—";

  return (
    <div className="bg-[#f2f2f2] rounded-2xl p-6 sm:p-9 shadow-sm border border-gray-200/50 hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4 gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-black text-[18px] leading-tight flex flex-wrap items-baseline gap-2">
            Company: <span className="font-medium">{topCompany || "—"}</span>
            {regData.exhibitorName && regData.exhibitorName !== topCompany && (
              <span className="text-gray-500 font-normal text-[16px]">({regData.exhibitorName})</span>
            )}
          </h3>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap justify-start sm:justify-end gap-2 shrink-0">
        {paymentFilter === "All" && (
          <span className={`px-4 py-1.5 rounded-2xl text-[12px] sm:text-[14px] font-bold shadow-md whitespace-nowrap ${
            pStatus === "Full amount received" ? "bg-green-600 text-white" :
            pStatus === "Partially received" ? "bg-blue-500 text-white" :
            "bg-red-600 text-white"
          }`}>
            {pStatus}
          </span>
        )}
        <span className={`px-4 py-1.5 rounded-2xl text-[12px] sm:text-[14px] font-bold text-white shadow-md ${
          currentEntityLabel === "Manufacturer" ? "bg-black" :
          currentEntityLabel === "Dealer" ? "bg-blue-600" : "bg-purple-600"
        }`}>
          {currentEntityLabel}
        </span>
        </div>
      </div>
      
      <div className="flex flex-col flex-1">
        
        <div className="space-y-2 text-[16px] font-semibold text-gray-800">
          {regData.exhibitorName && (
             <p>Exhibitor Name: <span className="font-normal">{regData.exhibitorName}</span></p>
          )}
          <p>Contact Person: <span className="font-normal">{topContact || "—"} {mobileNo ? `(${mobileNo})` : ""}</span></p>
          <p>Location: <span className="font-normal">{topLocation || "—"}</span></p>
          <p>Facia Name: <span className="font-normal">{regData.faciaName || "—"}</span></p>
          <div className="grid grid-cols-2 gap-4">
            <p>Stall No: <span className="font-normal">{regData.stallNo || "—"}</span></p>
            <p>Stall Size: <span className="font-normal">{regData.stallSize || "—"}</span></p>
          </div>
          <p>Remarks: <span className="font-normal">{remarks}</span></p>
        </div>

        {/* Association Block */}
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
                subs && subs.length > 0 && (
                  <div className="flex flex-col gap-5">
                    {subs.map((se, i) => (
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
           <button onClick={onViewHistory} className="flex items-center justify-center sm:justify-start gap-2 text-[16px] font-bold text-[#e11d48] hover:text-[#be123c] cursor-pointer transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            View History
          </button>
          <button onClick={onFollowup}
            className="w-full sm:w-auto px-8 py-2.5 rounded-xl text-white text-[16px] font-bold shadow-lg hover:brightness-90 transition-all cursor-pointer bg-[#e11d48]">
            Edit Follow up
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EditFollowupMainPage() {
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState("Tele Call");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [searchField, setSearchField] = useState("companyName");
  const [searchVal, setSearchVal] = useState("");
  const [historyRecord, setHistoryRecord] = useState(null);

  const load = async () => {
    startLoading();
    try {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      const role = userData.user?.role || "";
      const id = userData.user?.id || null;
      const selectedExpoId = localStorage.getItem("utfi_current_expo_id");

      const query = new URLSearchParams({ pending: 1, all: 1, userRole: role, userId: id });
      if (selectedExpoId) query.append("exposId", selectedExpoId);
      
      const res = await fetch(`${API_BASE_URL}/customer-followup?${query.toString()}`, {
        headers: { "ngrok-skip-browser-warning": "any" }
      });
      const data = await res.json();
      if (data.success) {
        // Map backend flat format to the nested React structure
        const mapped = data.data.map(r => {
          let regObj = {};
          try {
            if (r.register_data) {
              regObj = typeof r.register_data === "string" ? JSON.parse(r.register_data) : r.register_data;
            }
            // If the joined register_data is empty, check legacy_reg_data (which might be an array)
            if (!regObj.exhibitorName && !regObj.exhibitor_name && r.legacy_reg_data) {
              const legacy = typeof r.legacy_reg_data === "string" ? JSON.parse(r.legacy_reg_data) : r.legacy_reg_data;
              if (Array.isArray(legacy)) {
                const match = legacy.find(m => m.expo_id == r.expos_id);
                if (match) regObj = match.register_data || {};
              } else {
                regObj = legacy || {};
              }
            }
          } catch (e) { regObj = {}; }

          const regFinal = {
            ...regObj,
            exhibitorName: regObj.exhibitorName || regObj.exhibitor_name || r.exhibitor_name || r.reg_exhibitor_name || r.reg_exhibitor || "",
            faciaName: regObj.faciaName || regObj.facia_name || r.facia_name || r.reg_facia_name || r.reg_facia || "",
            stallNo: regObj.stallNo || regObj.stall_no || r.stall_no || r.reg_stall_no || r.reg_stall || "",
            stallSize: regObj.stallSize || regObj.stall_size || r.stall_size || r.reg_stall_size || r.reg_size || "",
            contactPerson: regObj.contactPerson || regObj.contact_person || r.contact_person || r.reg_cp || r.reg_contact_person || "",
            contactNumber: regObj.contactNumber || regObj.contact_number || r.contact_number || r.reg_mob || r.reg_contact_number || r.mobile_no || r.mobile1 || "",
            city: regObj.city || regObj.city_name || r.city || r.reg_city || "",
            remarks: regObj.remarks || regObj.reg_rem || r.remarks || r.reg_rem || r.reg_remarks || ""
          };

          const raw = { ...r, id: r.customer_data_id };
          return {
            _raw: raw,
            expos_id: r.expos_id,
            followup_id: r.id, // original cf.id
            id: r.customer_data_id,
            manufacturer: r.primary_details || {},
            subEntities: r.sub_entities || [],
            followup: {
              status: r.followup_stage,
              reason: r.next_follow_reason,
              nextDate: r.next_followup_date,
              note: r.remarks
            },
            registerData: regFinal,
            paymentStatus: r.reg_ps || r.reg_payment_status || regFinal.paymentStatus || regFinal.payment_status || "Not received",
            status: r.cd_status,
            registerConfirmed: r.register_confirmed == 1,
            // For filtering
            contactPerson: r.contact_person || regFinal.contactPerson,
            mobileNo: r.mobile_no || regFinal.contactNumber || r.mobile1,
            siteVisitLocation: r.site_visit_location
          };
        });
        
        // Remove duplicates if the same customer returned multiple times
        const unique = Array.from(new Map(mapped.map(m => [m.id, m])).values());
        
        // Sort by followup_id DESC to show latest activity on top
        unique.sort((a, b) => b.followup_id - a.followup_id);
        
        setRecords(unique);
      }
    } catch (err) {
      console.error(err);
    } finally {
      stopLoading();
    }
  };

  useEffect(() => { load(); }, []);

  const isConfirmedTab = activeTab === "Confirmed";

  const PAYMENT_OPTIONS = ["All", "Not received", "Partially received", "Full amount received"];

  const counts = useMemo(() => {
    let c = {
      "Tele Call": 0, "Site Visit": 0, "Prospective": 0, "Confirmed": 0,
      "pay_All": 0, "pay_Not received": 0, "pay_Partially received": 0, "pay_Full amount received": 0
    };
    records.forEach(rec => {
      const f = rec.followup;
      if (!f) return;
      const isOfflineStatus = rec.status === "offline" || rec.status === "closed";
      const isNotInterested = f.status === "Not Interested";
      const isConfirmed = f.status === "Confirmed";
      
      // If offline but not 'Not Interested' and not 'Confirmed', skip
      if (isOfflineStatus && !isNotInterested && !isConfirmed) return;

      if (isConfirmed) {
        c["Confirmed"]++;
        c["pay_All"]++;
        const pStatus = rec.paymentStatus || "Not received";
        if (c[`pay_${pStatus}`] !== undefined) {
          c[`pay_${pStatus}`]++;
        }
      } else if (f.status === "Prospective") {
        c["Prospective"]++;
      } else {
        if (f.reason === "Tele Call") c["Tele Call"]++;
        else if (f.reason === "Site Visit") c["Site Visit"]++;
      }
    });
    return c;
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((rec) => {
      // Common check: ignore offline/closed unless they are Not Interested or Confirmed
      if ((rec.status === "offline" || rec.status === "closed") && rec.followup?.status !== "Not Interested" && rec.followup?.status !== "Confirmed") return false;
      
      const f = rec.followup;
      if (!f) return false;

      // Tab Specific Filtering
      if (isConfirmedTab) {
        if (f.status !== "Confirmed") return false;
        // Filter by payment sub-tab
        if (paymentFilter !== "All") {
          const pStatus = rec.paymentStatus || "Not received";
          if (pStatus !== paymentFilter) return false;
        }
      } else {
        if (activeTab === "Prospective") {
          if (f.status !== "Prospective") return false;
        } else {
          // Exclude Prospective and Confirmed from Tele Call / Site Visit
          if (f.status === "Prospective" || f.status === "Confirmed") return false;
          if (f.reason !== activeTab) return false;
        }
      }

      // Global Search Filter
      if (searchVal.trim()) {
        const q = searchVal.toLowerCase();
        let target = "";
        
        if (searchField === "companyName") {
          const mfrName = rec.manufacturer?.companyName || "";
          const exhName = rec.registerData?.exhibitorName || "";
          const subNames = (rec.subEntities || []).map(s => s.data?.companyName || "").join(" ");
          target = `${mfrName} ${exhName} ${subNames}`;
        } else if (searchField === "exhibitorName") {
          target = rec.registerData?.exhibitorName || rec.manufacturer?.companyName || "";
        } else if (searchField === "contactPerson") {
          const mfrCp = rec.manufacturer?.contactPerson || "";
          const regCp = rec.registerData?.contactPerson || "";
          const histCp = (rec.contactPerson || "") + " " + (f.contactPerson || "");
          const subCps = (rec.subEntities || []).map(s => s.data?.contactPerson || "").join(" ");
          target = `${mfrCp} ${regCp} ${histCp} ${subCps}`;
        } else if (searchField === "mobileNo") {
          const mfrMob = rec.manufacturer?.mobile1 || "";
          const regMob = rec.registerData?.contactNumber || "";
          const histMob = rec.mobileNo || "";
          const subMobs = (rec.subEntities || []).map(s => s.data?.mobile1 || "").join(" ");
          target = `${mfrMob} ${regMob} ${histMob} ${subMobs}`;
        } else if (searchField === "city") {
          const mfrCity = rec.manufacturer?.city || "";
          const regCity = rec.registerData?.city || "";
          const siteLoc = rec.siteVisitLocation || "";
          target = `${mfrCity} ${regCity} ${siteLoc}`;
        } else {
          target = f[searchField] || rec.manufacturer?.[searchField] || rec.registerData?.[searchField] || "";
        }

        if (!String(target).toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [records, activeTab, searchField, searchVal, paymentFilter]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-2 flex flex-wrap items-center  gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/Employee/followupMainPage")}
            className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-gray-600 hover:bg-red-100 transition-all cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Edit Follow Up Page</h1>
        </div>
        <button onClick={load} title="Refresh"
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-800 hover:bg-gray-100 transition-all cursor-pointer">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="px-6 pb-10 max-w-[100%] mx-auto">
        
        {/* Navigation & Search Dashboard */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mt-8 mb-4">
          
          {/* Left: Search Bar & Result Count Grouped Together */}
          <div className="flex items-center gap-4 justify-start w-full lg:w-[400px]">
             <div className="flex items-center border border-gray-200 rounded-full bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-red-300 transition-all shadow-sm">
              <select value={searchField} onChange={(e) => setSearchField(e.target.value)}
                className="bg-transparent border-r border-gray-200 text-xs text-gray-600 px-4 py-2.5 focus:outline-none cursor-pointer appearance-none font-bold"
                style={{ minWidth: "120px" }}>
                {SEARCH_FIELDS.filter(f => isConfirmedTab || f.key !== "exhibitorName").map((f) => 
                  <option key={f.key} value={f.key}>{f.label}</option>
                )}
              </select>
              <input value={searchVal} onChange={(e) => setSearchVal(e.target.value)}
                placeholder={`Search…`}
                className="bg-transparent text-sm px-4 py-2.5 focus:outline-none w-52 cursor-text font-semibold" />
              {searchVal && (
                <button onClick={() => setSearchVal("")} className="pr-4 text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
              )}
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-4 py-2 rounded-full font-bold shadow-sm whitespace-nowrap">
              {filtered.length} results
            </span>
          </div>

          {/* Center: Status Buttons (Pinned at True Center) */}
          <div className="flex flex-wrap gap-2.5 justify-center flex-1">
            {EDIT_TABS.map((tab) => (
              <button key={tab} onClick={() => { 
                setActiveTab(tab); 
                setSearchVal(""); 
                setPaymentFilter("All");
                if (tab !== "Confirmed" && searchField === "exhibitorName") {
                  setSearchField("companyName");
                }
              }}
                className={`px-5 py-2 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab ? "bg-black text-white border-black shadow-lg" : "bg-white text-gray-600 border-gray-200 hover:border-gray-500"
                }`}>
                {tab}
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"}`}>
                  {counts[tab] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Right: Balanced Spacer to keep Center at Center */}
          <div className="hidden lg:block lg:w-[400px]"></div>
        </div>

          {/* Sub-tabs Row (If activeTab is Confirmed) centered below buttons */}
          {activeTab === "Confirmed" && (
            <div className="flex justify-center w-full">
              <div className="flex flex-wrap gap-2 justify-center p-2 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => setPaymentFilter(opt)}
                    className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      paymentFilter === opt ? "bg-red-100 text-red-700 border border-red-200 shadow-sm" : "bg-white text-gray-500 border border-transparent hover:bg-gray-200"
                    }`}>
                    {opt}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${paymentFilter === opt ? "bg-white/60 text-red-800" : "bg-gray-100 text-gray-400"}`}>
                      {counts[`pay_${opt}`] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xl text-center font-bold text-gray-800 mt-10 mb-8">Total results found: {filtered.length}</p>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">No records found for the selected filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((rec) =>
              isConfirmedTab ? (
                <ConfirmedPendingCard key={rec.id} record={rec}
                  paymentFilter={paymentFilter}
                  onFollowup={() => navigate("/Employee/ConfirmedFollowup", { state: { record: rec, initialEntityIdx: rec._raw?.entity_idx, sourcePage: "/Employee/followupEditPage" } })}
                  onViewHistory={() => setHistoryRecord(rec)}
                />
              ) : (
                <FollowupCard key={rec.id} record={rec} isConfirmed={false}
                  onFollowup={() => navigate("/Employee/followup", { state: { row: { _raw: rec._raw, _isEditMode: true, _followupId: rec.followup_id }, initialEntityIdx: rec._raw?.entity_idx, sourcePage: "/Employee/followupEditPage" } })}
                  onViewHistory={() => setHistoryRecord(rec)}
                />
              )
            )}
          </div>
        )}
      </div>

      {historyRecord && <HistoryModal record={historyRecord} onClose={() => setHistoryRecord(null)} />}
    </div>
  );
}