import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../context/LoadingContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Notifications() {
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();

  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState("missed");
  const [fullData, setFullData] = useState({ missed: [], expos: [], data: [] });
  const [employees, setEmployees] = useState([]);
  const [allExpos, setAllExpos] = useState([]);
  const [currentExpoName, setCurrentExpoName] = useState(localStorage.getItem("utfi_current_expo_name") || "");
  const [redirectingId, setRedirectingId] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("userData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUserData(parsed.user);
    }
  }, []);

  const role = (userData?.role || "").toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin" || role === "super admin";
  const isAdmin = role === "admin";
  const isEmployee = role === "employee";

  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach(emp => { map[emp.id] = (emp.name || emp.employee_name || '—'); });
    return map;
  }, [employees]);

  const expoMap = useMemo(() => {
    const map = {};
    allExpos.forEach(e => { map[e.id] = (e.expo_name || e.name || '—'); });
    return map;
  }, [allExpos]);

  const getRelativeHeaderTime = (dateStr) => {
    if (!dateStr) return "recently";
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return "just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  };

  const fmtStandardDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };

  const fetchAll = useCallback(async (silent = false) => {
    if (!userData) return;
    const expoId = localStorage.getItem("utfi_current_expo_id");
    setCurrentExpoName(localStorage.getItem("utfi_current_expo_name") || "");
    if (!silent) startLoading();
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const fQuery = new URLSearchParams({ pending: 1, all: 1, userRole: userData.role, userId: userData.id });
      if (expoId) fQuery.append("exposId", expoId);
      const promises = [fetch(`${API_BASE}/customer-followup?${fQuery}`, { headers: { "ngrok-skip-browser-warning": "any" }}).then(r => r.json())];
      if (isSuperAdmin || isAdmin) {
        promises.push(fetch(`${API_BASE}/expos?activeOnly=0`, { headers: { "ngrok-skip-browser-warning": "any" }}).then(r => r.json()));
        promises.push(fetch(`${API_BASE}/employee`, { headers: { "ngrok-skip-browser-warning": "any" }}).then(r => r.json()));
      }
      if (isSuperAdmin) {
        promises.push(fetch(`${API_BASE}/customer-data?inactiveOnly=1&userRole=${userData.role}&all=1`, { headers: { "ngrok-skip-browser-warning": "any" }}).then(r => r.json()));
      }
      const results = await Promise.all(promises);
      const newData = { missed: [], expos: [], data: [] };
      if (results[0]?.success) {
        const latestMap = new Map();
        results[0].data.forEach(item => {
          const current = latestMap.get(item.customer_data_id);
          if (!current || new Date(item.submitted_at || 0) > new Date(current.submitted_at || 0)) latestMap.set(item.customer_data_id, item);
        });
        newData.missed = Array.from(latestMap.values()).filter(item => {
          const stage = item.followup_stage;
          if (stage !== "Inprogress" && stage !== "Prospective") return false;
          if (!item.next_followup_date) return false;
          const nextD = new Date(item.next_followup_date);
          nextD.setHours(0, 0, 0, 0);
          return nextD < today;
        });
      }
      if (isSuperAdmin || isAdmin) {
        newData.expos = (Array.isArray(results[1]) ? results[1] : []).filter(e => String(e.active) === "0");
        setEmployees(results[2] || []);
        setAllExpos(Array.isArray(results[1]) ? results[1] : []);
      }
      if (isSuperAdmin) {
        newData.data = (results[3]?.success ? results[3].data : []);
      }
      setFullData(newData);
    } catch (e) { console.error(e); } finally { if (!silent) stopLoading(); }
  }, [userData, isSuperAdmin, isAdmin, startLoading, stopLoading]);

  const handleFollowupClick = async (item) => {
    if (!item.customer_data_id) return;
    setRedirectingId(item.customer_data_id);
    try {
      const res = await fetch(`${API_BASE}/customer-data?id=${item.customer_data_id}`, {
        headers: { "ngrok-skip-browser-warning": "any" }
      });
      const d = await res.json();
      if (d.success && d.data?.length > 0) {
        const fullRec = d.data[0];
        // Create flattened row expected by CustomerFollowup
        const row = {
          _id: fullRec.id,
          _recordId: fullRec.id,
          _raw: fullRec
        };
        navigate("/Employee/followup", {
          state: { 
            row, 
            initialEntityIdx: item.entity_idx !== undefined ? parseInt(item.entity_idx) : -1,
            sourcePage: "/Employee/notifications" 
          }
        });
      } else {
        alert("Could not fetch customer details. Record might be deleted.");
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching customer data.");
    } finally {
      setRedirectingId(null);
    }
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const TABS = useMemo(() => {
    const list = [{ id: 'missed', label: 'Missed Followups', count: fullData.missed.length }];
    if (isSuperAdmin) {
      list.push({ id: 'expos', label: 'Deleted Expo', count: fullData.expos.length });
      list.push({ id: 'data', label: 'Deleted Data', count: fullData.data.length });
    }
    return list;
  }, [isSuperAdmin, fullData]);

  const activeListData = fullData[activeTab] || [];

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <div className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm border-b border-black/5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 rounded-full bg-white text-black hover:scale-110 cursor-pointer shadow-sm transition-all border-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="w-1 h-7 bg-[#e81c21] rounded-full hidden sm:block" />
          <h1 className="text-xl font-black text-black">Notification</h1>
        </div>
        <button onClick={() => fetchAll()} className="px-4 py-2 bg-white text-black border border-black/10 rounded-full text-xs font-bold cursor-pointer hover:bg-black hover:text-white transition-all">REFRESH</button>
      </div>

      {/* Expo name — full-width centered row on all screens */}
      {currentExpoName && (
        <div className="text-center mt-3 px-4">
          <h2 className="text-[#e81c21] font-black text-sm sm:text-base md:text-xl tracking-[0.1em] uppercase drop-shadow-sm">
            {currentExpoName}
          </h2>
        </div>
      )}

      <div className="flex-1 w-full p-4 md:p-8">
        <div className="max-w-[90%] mx-auto rounded-3xl p-6 md:p-10 shadow-sm" style={{ backgroundColor: 'rgb(252, 236, 216)' }}>
          <div className="flex flex-wrap gap-4 mb-10">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-3 rounded-full text-[14px] font-bold transition-all flex items-center gap-2 border-none cursor-pointer shadow-md ${activeTab === tab.id ? "bg-[#d97706] text-white" : "bg-white text-black hover:bg-white/80"}`}>
                {tab.label}
                <span className={`min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm transition-colors ${activeTab === tab.id ? "bg-white text-[#d97706]" : "bg-[#d97706] text-white"}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {activeListData.length === 0 ? (
              <div className="col-span-full py-28 text-center text-2xl text-gray-600 font-bold">No records found</div>
            ) : (
              activeListData.map((item, idx) => {
                const isMissed = activeTab === 'missed';
                const pDetails = item.primary_details ? (typeof item.primary_details === 'string' ? JSON.parse(item.primary_details) : item.primary_details) : {};
                const anchorDate = isMissed ? item.next_followup_date : item.deletedAt || item.deleted_at;

                return (
                  <div key={idx} className="rounded-[1.5rem] p-6 md:p-8 shadow-xl flex flex-col gap-6 transition-all hover:shadow-2xl relative overflow-hidden" style={{ backgroundColor: 'rgb(253, 247, 235)' }}>
                    <div className="flex flex-col gap-3">
                       <div className="flex items-start justify-between w-full">
                          <div className="flex-1" />
                          <div className="text-center font-bold text-black" style={{ fontSize: '15px' }}>
                             {isMissed ? "Missed for " : (activeTab === 'expos' ? "Expo Deleted " : "Deleted ")}
                             {getRelativeHeaderTime(anchorDate)}
                          </div>
                          <div className="flex-1 flex justify-end gap-2">
                             {isMissed && (
                               <>
                                 <div className="bg-[#2563EB] text-white px-4 py-1.5 rounded-full whitespace-nowrap font-bold shadow-sm" style={{ fontSize: '12px' }}>{item.next_follow_reason || item.followup_stage || '—'}</div>
                                 <div className="bg-[#16A34A] text-white px-4 py-1.5 rounded-full whitespace-nowrap font-bold shadow-sm" style={{ fontSize: '12px' }}>{item.followup_stage || '—'}</div>
                               </>
                             )}
                          </div>
                       </div>
                    </div>

                    <div className="flex justify-between items-stretch gap-4">
                       <div className="flex flex-col gap-1.5 flex-1">
                          <div className="flex gap-4 items-baseline">
                             <span className="font-bold text-black shrink-0 w-36" style={{ fontSize: '15px' }}>{activeTab === 'expos' ? "Expo Name:" : "Company Name:"}</span>
                             <span className="text-black" style={{ fontSize: '14px' }}>{(activeTab === 'expos' ? `${item.expo_name || item.name || '—'} ${item.year || ''}` : (pDetails.companyName || '—'))}</span>
                          </div>
                          <div className="flex gap-4 items-baseline">
                             <span className="font-bold text-black shrink-0 w-36" style={{ fontSize: '15px' }}>{isMissed ? "Contact Person:" : "Deleted By:"}</span>
                             <span className="text-black" style={{ fontSize: '14px' }}>{(isMissed ? (item.contact_person || pDetails.contactPerson || '—') : (employeeMap[item.deletedBy] || item.deletedBy || '—'))}</span>
                          </div>
                          {isMissed && (
                            <div className="flex gap-4 items-baseline">
                               <span className="font-bold text-black shrink-0 w-36" style={{ fontSize: '15px' }}>Contact Number:</span>
                               <span className="text-black" style={{ fontSize: '14px' }}>{item.mobile_no || pDetails.mobile1 || '—'}</span>
                            </div>
                          )}
                          {isMissed ? (
                            <>
                              <div className="flex gap-4 items-baseline">
                                <span className="font-bold text-black shrink-0 w-36" style={{ fontSize: '15px' }}>Last Followup:</span>
                                <span className="text-black" style={{ fontSize: '14px' }}>{fmtStandardDate(item.submitted_at)}</span>
                              </div>
                              <div className="flex gap-4 items-baseline text-nowrap">
                                <span className="font-bold text-black shrink-0 w-36" style={{ fontSize: '15px' }}>Next Followup Date:</span>
                                <span className="text-black" style={{ fontSize: '14px' }}>{fmtStandardDate(item.next_followup_date)}</span>
                              </div>
                              <div className="flex gap-4 items-baseline">
                                <span className="font-bold text-black shrink-0 w-36" style={{ fontSize: '15px' }}>Remarks:</span>
                                <span className="text-black" style={{ fontSize: '14px' }}>"{item.remarks || '—'}"</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex gap-4 items-baseline">
                              <span className="font-bold text-black shrink-0 w-36" style={{ fontSize: '15px' }}>Deleted On:</span>
                              <span className="text-black" style={{ fontSize: '14px' }}>{fmtStandardDate(item.deletedAt || item.deleted_at)}</span>
                            </div>
                          )}
                       </div>

                       {/* Centered/Bottom Side Info */}
                       <div className="flex flex-col items-end gap-6 justify-center min-w-[140px]">
                          {(isSuperAdmin || isAdmin) && isMissed && (
                            <div className="text-right">
                               <p className="text-[14px] font-bold text-gray-700 mb-1">Assigned Employee</p>
                               <span className="text-sm font-black text-black block">{item.employee_name || employeeMap[item.employee_id] || '—'}</span>
                            </div>
                          )}
                          <div className={isAdmin || isSuperAdmin ? "" : "mt-auto"}>
                            {isMissed ? (
                               isEmployee && (
                                   <button 
                                      onClick={() => handleFollowupClick(item)} 
                                      disabled={redirectingId === item.customer_data_id}
                                      className="bg-[#e81c21] hover:bg-red-700 text-white font-black py-2.5 px-8 rounded-full text-sm cursor-pointer shadow-lg active:scale-95 transition-all disabled:opacity-50"
                                   >
                                      {redirectingId === item.customer_data_id ? "Loading..." : "Followup"}
                                   </button>
                               )
                            ) : (
                              <button onClick={() => {
                                  const targetPath = isSuperAdmin ? "/SuperAdmin/restoreDelete" : "/Admin/restoreDelete";
                                  if (activeTab === 'expos') navigate(targetPath, { state: { tab: "Expo Delete / Restore", selectedExpo: item.id } });
                                  else navigate(targetPath, { state: { tab: "Data Delete / Restore", selectedLeadId: item.id } });
                                }} className="bg-[#e81c21] hover:bg-red-700 text-white font-black py-2.5 px-8 rounded-full text-sm cursor-pointer shadow-lg active:scale-95 whitespace-nowrap">Check ?</button>
                            )}
                          </div>
                       </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
