import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";

// ─── Column Definitions ──────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: "companyName", label: "Company Name" },
  { key: "contactPerson", label: "Contact Person" },
  { key: "designation", label: "Designation" },
  { key: "city", label: "City" },
  { key: "mobile1", label: "Mobile No" },
  { key: "segment", label: "Segment" },
  { key: "typeOfBusiness", label: "Type of Business" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "email1", label: "Email" },
  { key: "source", label: "Source" },
  { key: "productDetails", label: "Product Details" },
];

const fmt = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function LeadReuse() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState([]);
  const [expos, setExpos] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [fromExpoId, setFromExpoId] = useState("");
  const [toExpoId, setToExpoId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Entity Selection State (Primary/Secondary per lead)
  const [activeEntityIdx, setActiveEntityIdx] = useState({}); // { leadId: -1 or subIdx }
  
  // Followup History Modal State
  const [showHistory, setShowHistory] = useState(false);
  const [historyLeads, setHistoryLeads] = useState([]);
  const [currentLeadName, setCurrentLeadName] = useState("");

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchExpos();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (fromExpoId) {
      fetchLeads(fromExpoId);
    } else {
      setLeads([]);
    }
  }, [fromExpoId]);

  const fetchExpos = async () => {
    startLoading("Fetching Exhibitions...");
    try {
      const res = await fetch(`${API_BASE_URL}/expos`, { headers: { "ngrok-skip-browser-warning": "69420" } });
      const data = await res.json();
      const exposList = Array.isArray(data) ? data : (data.data || []);
      // Filter for active expos only
      setExpos(exposList.filter(ex => Number(ex.active) === 1));
    } catch (err) {
      showToast("Failed to fetch exhibitions", "error");
    } finally {
      stopLoading();
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/employee`, { headers: { "ngrok-skip-browser-warning": "69420" } });
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
    } catch (err) {}
  };

  const fetchLeads = async (expoId) => {
    startLoading("Fetching Leads...");
    try {
      const res = await fetch(`${API_BASE_URL}/customer-data?all=1&page=1&pageSize=10000`, { 
        headers: { "ngrok-skip-browser-warning": "69420" } 
      });
      const result = await res.json();
      if (result.success) {
        const eIdInt = parseInt(expoId);
        // Filter client-side: records whose expos_id array contains the selected expo
        const filtered = (result.data || []).filter((r) => {
          const expoArr = r.expos_id || [];
          return expoArr.some((e) =>
            typeof e === "object" ? e.id === eIdInt : parseInt(e) === eIdInt
          );
        });
        setLeads(filtered);
      }
    } catch (err) {
      showToast("Failed to fetch leads", "error");
    } finally {
      stopLoading();
    }
  };

  const viewHistory = async (lead) => {
    startLoading("Loading History...");
    try {
      const res = await fetch(`${API_BASE_URL}/customer-followup?recordId=${lead.id}`, {
        headers: { "ngrok-skip-browser-warning": "any" }
      });
      const result = await res.json();
      if (result.success) {
        setHistoryLeads(result.data.map(h => ({ ...h, masterLead: lead })));
        setCurrentLeadName(lead.primary_details.companyName);
        setShowHistory(true);
      }
    } catch (err) {
      showToast("Failed to load history", "error");
    } finally {
      stopLoading();
    }
  };

  const handleAllocate = async () => {
    if (selectedIds.size === 0) {
      showToast("Please select at least one lead", "warning");
      return;
    }
    if (!toExpoId) {
      showToast("Please select a target Exhibition", "warning");
      return;
    }
    if (!targetEmployeeId) {
      showToast("Please select an employee for allocation", "warning");
      return;
    }

    // ─── Duplicate Assignment Check ───
    const targetExpo = expos.find(e => String(e.id) === String(toExpoId));
    const targetExpoName = targetExpo ? `${targetExpo.expo_name} (${targetExpo.year})` : "the selected expo";
    const toIdInt = parseInt(toExpoId);

    const duplicateLead = Array.from(selectedIds).map(id => leads.find(l => String(l.id) === String(id))).find(lead => {
      if (!lead) return false;
      const exposArr = lead.expos_id || [];
      return exposArr.some(e => (typeof e === 'object' ? String(e.id) === String(toIdInt) : String(e) === String(toIdInt)));
    });

    if (duplicateLead) {
      const assignedEmpId = duplicateLead.assignments?.[`expo_${toIdInt}`];
      const assignedEmpName = employees.find(e => String(e.id) === String(assignedEmpId))?.name || duplicateLead.employee_name || "an employee";
      showToast(`Lead "${duplicateLead.primary_details?.companyName}" is already assigned to ${assignedEmpName} in "${targetExpoName}"`, "error");
      return;
    }

    startLoading("Allocating Leads...");
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch(`${API_BASE_URL}/customer-data/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerIds: ids,
          expoId: toIdInt,
          employeeId: parseInt(targetEmployeeId)
        })
      });
      const result = await res.json();
      if (result.success) {
        showToast(`Successfully allocated ${ids.length} leads to the new exhibition!`, "success");
        setSelectedIds(new Set());
        setTargetEmployeeId("");
        setToExpoId("");
        setFromExpoId("");
      } else {
        showToast(result.message || "Allocation failed", "error");
      }
    } catch (err) {
      showToast("Allocation failed", "error");
    } finally {
      stopLoading();
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        String(item.primary_details.companyName || "").toLowerCase().includes(q) ||
        String(item.primary_details.contactPerson || "").toLowerCase().includes(q) ||
        String(item.primary_details.city || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === "all") return true;
      
      const lastStage = item.last_followup?.followup_stage || "Pending";
      
      // Check if registration is confirmed for THIS expo
      let regConfirmed = false;
      try {
        const confs = Array.isArray(item.register_confirmed) ? item.register_confirmed : JSON.parse(item.register_confirmed || "[]");
        regConfirmed = confs.some(c => String(c.expo_id) === String(fromExpoId) && c.register_confirmed == 1);
      } catch(e) {}

      if (statusFilter === "Pending") return lastStage === "Pending" && !regConfirmed;
      if (statusFilter === "In-Progress") return lastStage === "Inprogress";
      if (statusFilter === "Not Interested") return lastStage === "Not Interested";
      if (statusFilter === "Prospective") return lastStage === "Prospective";
      
      if (statusFilter === "Confirmed") {
        return lastStage === "Confirmed" || regConfirmed;
      }
      return true;

      return true;
    });
  }, [leads, searchQuery, statusFilter, fromExpoId]);
  
  const statusCounts = useMemo(() => {
    const counts = {
      all: leads.length,
      Pending: 0,
      "In-Progress": 0,
      Prospective: 0,
      Confirmed: 0,
      "Not Interested": 0
    };
    
    leads.forEach(item => {
      const lastStage = item.last_followup?.followup_stage || "Pending";
      
      let regConfirmed = false;
      try {
        const confs = Array.isArray(item.register_confirmed) ? item.register_confirmed : JSON.parse(item.register_confirmed || "[]");
        regConfirmed = confs.some(c => String(c.expo_id) === String(fromExpoId) && c.register_confirmed == 1);
      } catch(e) {}

      if (lastStage === "Confirmed" || regConfirmed) counts["Confirmed"]++;
      else if (lastStage === "Pending") counts["Pending"]++;
      else if (lastStage === "Inprogress") counts["In-Progress"]++;
      else if (lastStage === "Not Interested") counts["Not Interested"]++;
      else if (lastStage === "Prospective") counts["Prospective"]++;
    });
    return counts;
  }, [leads, fromExpoId]);

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(new Set(filteredLeads.map(i => i.id)));
    else setSelectedIds(new Set());
  };

  const targetExpoEmployees = useMemo(() => {
    const expo = expos.find(e => String(e.id) === String(toExpoId));
    if (!expo || !expo.employees_allocated) return [];
    try {
      const allocatedIds = typeof expo.employees_allocated === 'string' ? JSON.parse(expo.employees_allocated) : expo.employees_allocated;
      const idsArray = Array.isArray(allocatedIds) ? allocatedIds : [];
      return employees.filter(emp => idsArray.map(String).includes(String(emp.id)));
    } catch (e) { return []; }
  }, [toExpoId, expos, employees]);

  return (
    <div className="min-h-screen flex flex-col relative pb-20" style={{ background: "linear-gradient(160deg,#f8f8f8 0%,#f1f1f1 100%)" }}>
      
      {/* Main Content */}
      <div className="w-full px-[3vw] pt-[2vw] relative z-10 flex-1">

        {/* Header Navigation */}
        <div className="flex items-center justify-between gap-4 ">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[#ffeced] flex items-center justify-center text-black hover:bg-red-100 transition-all cursor-pointer shadow-sm"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Master data allocation</h1>
            <button
              onClick={() => { fetchExpos(); fetchEmployees(); }}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 hover:text-[#ff3b3a] transition-all cursor-pointer"
              title="Refresh Data"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

        {/* Intimation / Instruction Banner */}
        {!fromExpoId && (
          <div className="mt-6 mb-2 px-[1vw]">
            <div className="bg-white border-l-4 border-[#ff3b3a] px-6 py-4 rounded-xl shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-[#ff3b3a] shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[14px] font-bold text-gray-700">
                Please select a <span className="text-[#ff3b3a]">"From Expo"</span> to load records, then select a <span className="text-[#ff3b3a]">"To Expo"</span> and an <span className="text-[#ff3b3a]">Employee</span> to re-allocate your selected leads.
              </p>
            </div>
          </div>
        )}

        {/* Global Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 items-end my-5 px-[1vw]">
          <div>
            <label className="block text-[16px] font-bold text-gray-900 mb-2 ">From Expo</label>
            <div className="relative">
              <select 
                value={fromExpoId}
                onChange={(e) => setFromExpoId(e.target.value)}
                className="w-full h-[3rem] px-6 rounded-full bg-white border border-gray-300 outline-none text-gray-900 font-bold focus:ring-2 focus:ring-red-600/10 transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="">Select From Expo</option>
                {expos.map(ex => <option key={ex.id} value={ex.id}>{ex.expo_name} ({ex.year})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[16px] font-bold text-gray-900 mb-2 ">To Expo</label>
            <div className="relative">
              <select 
                disabled={!fromExpoId}
                value={toExpoId}
                onChange={(e) => setToExpoId(e.target.value)}
                className="w-full h-[3rem] px-6 rounded-full bg-white border border-gray-300 outline-none text-gray-900 font-bold focus:ring-2 focus:ring-red-600/10 transition-all appearance-none cursor-pointer shadow-sm disabled:opacity-50"
              >
                <option value="">Select To Expo</option>
                {expos.filter(ex => String(ex.id) !== String(fromExpoId)).map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.expo_name} ({ex.year})</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[16px] font-bold text-gray-900 mb-2 ">Assign To</label>
            <div className="relative">
              <select 
                disabled={!toExpoId}
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                className="w-full h-[3rem] px-6 rounded-full bg-white border border-gray-300 outline-none text-gray-900 font-bold focus:ring-2 focus:ring-red-600/10 transition-all appearance-none cursor-pointer shadow-sm disabled:opacity-50"
              >
                <option value="">Select Employee</option>
                {targetExpoEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <button 
              disabled={!targetEmployeeId || selectedIds.size === 0}
              onClick={handleAllocate}
              className="w-full h-[3rem] rounded-full text-white font-bold transition-all active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer text-sm shadow-md"
              style={(!targetEmployeeId || selectedIds.size === 0) ? {} : { background: "linear-gradient(135deg,#e81c21,#c01519)" }}
            >
              Allocate ({selectedIds.size})
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 lg:gap-6 mb-6 px-[2vw]">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
           
            <div className="bg-gray-200/50 rounded-xl lg:rounded-full p-1.5 shadow-inner flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
              {[
                { label: "All", value: "all" },
                { label: "Pending", value: "Pending" },
                { label: "In-Progress", value: "In-Progress" },
                { label: "Prospective", value: "Prospective" },
                { label: "Confirmed", value: "Confirmed" },
                { label: "Not Interested", value: "Not Interested" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-5 lg:px-7 py-2.5 rounded-lg lg:rounded-full text-[13px] lg:text-[14px] font-bold transition-all cursor-pointer flex items-center gap-3 whitespace-nowrap border-2 ${statusFilter === opt.value ? "bg-[#e81c21] text-white border-[#e81c21] shadow-lg scale-[1.02]" : "text-gray-500 hover:text-gray-700 border-transparent"}`}
                >
                  {opt.label}
                  <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md lg:rounded-full ${statusFilter === opt.value ? "bg-white text-[#e81c21]" : "bg-gray-200/80 text-gray-600"}`}>
                    {statusCounts[opt.value] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto mt-4">

              <div className="relative flex-1 lg:flex-none">
              <input 
                type="text" 
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full lg:w-80 h-[2.6rem] px-6 rounded-full border border-gray-300 bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-red-500/10 transition-all shadow-sm"
              />
            </div>

          <div className="text-[11px] font-bold text-gray-400 bg-white px-6 py-3 rounded-full border border-gray-200 shadow-sm whitespace-nowrap">
            
            Total Results: <span className="text-gray-900">{filteredLeads.length}</span> leads
          </div>

          </div>

         
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-[1.5rem] mx-[2vw] border border-gray-200 overflow-hidden shadow-lg flex flex-col" style={{ height: "70vh" }}>
          <div className="overflow-x-auto flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-sm min-w-fit">
              <thead className="sticky top-0 z-20">
                <tr style={{ background: "#1c1c1c" }}>
                  <th className="pl-8 pr-4 py-4 w-16 text-center border-r border-gray-700">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                      checked={selectedIds.size === filteredLeads.length && filteredLeads.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-white border-r border-gray-700 whitespace-nowrap">S.NO</th>
                  {ALL_COLUMNS.map(col => (
                    <th key={col.key} className="px-4 py-4 text-left text-[13px] font-bold text-white border-r border-gray-700 whitespace-nowrap">{col.label}</th>
                  ))}
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-white border-r border-gray-700 whitespace-nowrap">Final Status in Expo</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-white border-r border-gray-700 whitespace-nowrap">History</th>
                  <th className="px-8 py-4 text-right text-[13px] font-bold text-white whitespace-nowrap">Action</th>
                </tr>
              </thead>
<tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={ALL_COLUMNS.length + 5} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-500">
                        <svg className="w-16 h-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707.293l-2.414-2.414A1 1 0 006.586 13H4" strokeWidth={1.5} /></svg>
                        <span className="text-base font-bold">
                          {!fromExpoId ? "Please select a \"From Expo\" above to load and re-allocate records." : "No records found matching your filters."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, idx) => {
                    const lastFollowup = lead.last_followup;
                    const histIdx = lastFollowup ? parseInt(lastFollowup.entity_idx ?? -1) : -1;
                    const activeIdx = activeEntityIdx[lead.id] !== undefined ? activeEntityIdx[lead.id] : histIdx;
                    const currentData = activeIdx === -1 ? lead.primary_details : lead.sub_entities?.[activeIdx]?.data;
                    const currentType = activeIdx === -1 ? lead.primary_type : lead.sub_entities?.[activeIdx]?.type;
                    const hasSubs = lead.sub_entities && lead.sub_entities.length > 0;
                    const isSelected = selectedIds.has(lead.id);

                    // Final Status logic
                    const lastStage = lead.last_followup?.followup_stage;
                    
                    return (
                      <tr key={lead.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${isSelected ? "bg-red-50" : ""}`}>
                        <td className="pl-8 pr-4 py-4 text-center border-r border-gray-50">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleSelect(lead.id)}
                          />
                        </td>
                        <td className="px-4 py-4 text-gray-800 text-xs font-bold border-r border-gray-50 ">
                          {idx + 1}
                        </td>

                        {/* Dynamic Columns based on ALL_COLUMNS */}
                        {ALL_COLUMNS.map(col => (
                          <td key={col.key} className="px-4 py-4 border-r border-gray-50 text-[13px] text-gray-700 font-bold">
                            {col.key === "companyName" ? (
                              <div className="flex flex-col gap-2 py-1 max-w-[250px]">
                                {hasSubs && (
                                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-nowrap">
                                    <button
                                      onClick={() => setActiveEntityIdx(prev => ({ ...prev, [lead.id]: -1 }))}
                                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border flex-shrink-0 ${
                                        activeIdx === -1 ? "bg-red-600 text-white border-red-600 shadow-sm" : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                                      }`}
                                    >
                                      Primary
                                    </button>
                                    {lead.sub_entities.map((sub, sidx) => (
                                      <button
                                        key={sidx}
                                        onClick={() => setActiveEntityIdx(prev => ({ ...prev, [lead.id]: sidx }))}
                                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border flex-shrink-0 ${
                                          activeIdx === sidx ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                                        }`}
                                      >
                                        Sec {lead.sub_entities.length > 1 ? sidx + 1 : ""}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <div className={`truncate ${activeIdx === -1 ? "text-gray-900" : "text-blue-700"}`} title={currentData?.companyName}>
                                  {currentData?.companyName}
                                </div>
                              </div>
                            ) : col.key === "typeOfBusiness" ? (
                              <span className={`px-2 py-0.5 rounded-full text-[12px] font-black inline-block border ${
                                activeIdx === -1 ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-blue-100 text-blue-600 border-blue-200"
                              }`}>
                                {currentType}
                              </span>
                            ) : (
                              <span className={`truncate block ${activeIdx === -1 ? "text-gray-700" : "text-blue-700"}`}>
                                {currentData?.[col.key] || "—"}
                              </span>
                            )}
                          </td>
                        ))}

                        {/* Final Status Column */}
                        <td className="px-6 py-4 border-r border-gray-50 text-center">
                          {(() => {
                            const lastStage = lead.last_followup?.followup_stage || "Pending";
                            let regConfirmed = false;
                            try {
                              const confs = Array.isArray(lead.register_confirmed) ? lead.register_confirmed : JSON.parse(lead.register_confirmed || "[]");
                              regConfirmed = confs.some(c => String(c.expo_id) === String(fromExpoId) && c.register_confirmed == 1);
                            } catch(e) {}

                            const isConfirmed = lastStage === "Confirmed" || regConfirmed;
                            const isPending = lastStage === "Pending" && !regConfirmed;

                            return (
                              <span className={`px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-wider border shadow-sm ${
                                isConfirmed ? "bg-green-100 text-green-700 border-green-200" :
                                (lastStage === "Inprogress") ? "bg-blue-100 text-blue-700 border-blue-200" :
                                isPending ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}>
                                {isConfirmed ? "Confirmed" : (lastStage || "Pending")}
                              </span>
                            );
                          })()}
                        </td>

                        {/* History Column */}
                        <td className="px-6 py-4 border-r border-gray-50 text-center">
                          <button
                            onClick={() => viewHistory(lead)}
                            className="px-4 py-1.5 rounded-full text-white text-[12px] font-bold transition-all hover:shadow-md active:scale-95 cursor-pointer shadow-sm whitespace-nowrap"
                            style={{ background: "linear-gradient(135deg,#1cb8c8,#0fa3b3)" }}
                          >
                            Timeline
                          </button>
                        </td>

                        {/* Action Column */}
                        <td className="px-8 py-4 text-right">
                          <button 
                             onClick={() => toggleSelect(lead.id)}
                            className={`px-6 py-2 rounded-full text-white text-[11px] font-bold transition-all hover:shadow-lg active:scale-95 cursor-pointer shadow-sm ${isSelected ? 'bg-black' : ''}`}
                            style={isSelected ? {} : { background: "linear-gradient(135deg,#e81c21,#c01519)" }}
                          >
                            {isSelected ? 'Unselect' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* History Modal - Table View */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-auto">
          <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">Followup History — {currentLeadName}</h2>
                <p className="text-xs font-bold text-gray-400 mt-1">Complete Interaction Timeline</p>
              </div>
              <button 
                onClick={() => setShowHistory(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              {historyLeads.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <span className="text-5xl mb-4 block">📁</span>
                  <p className="text-gray-400 text-sm">No follow-up records yet.</p>
                </div>
              ) : (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-full">
                    <thead>
                      <tr style={{ background: "#1cb8c8" }}>
                        <th className="text-left px-4 py-3 font-bold text-white border-r border-cyan-400 whitespace-nowrap text-[12px]">S.No</th>
                        <th className="text-left px-4 py-3 font-bold text-white border-r border-cyan-400 whitespace-nowrap text-[12px]">Followup Date</th>
                        <th className="text-left px-4 py-3 font-bold text-white border-r border-cyan-400 whitespace-nowrap text-[12px]">Company Name</th>
                        <th className="text-left px-4 py-3 font-bold text-white border-r border-cyan-400 whitespace-nowrap text-[12px]">Type</th>
                        <th className="text-left px-4 py-3 font-bold text-white border-r border-cyan-400 whitespace-nowrap text-[12px]">Contact Person</th>
                        <th className="text-left px-4 py-3 font-bold text-white border-r border-cyan-400 whitespace-nowrap text-[12px]">Mobile</th>
                        <th className="text-left px-4 py-3 font-bold text-white border-r border-cyan-400 whitespace-nowrap text-[12px]">Remarks</th>
                        <th className="text-left px-4 py-3 font-bold text-white border-r border-cyan-400 whitespace-nowrap text-[12px]">Next Followup</th>
                        <th className="text-left px-4 py-3 font-bold text-white border-r border-cyan-400 whitespace-nowrap text-[12px]">Status</th>
                        <th className="text-left px-4 py-3 font-bold text-white whitespace-nowrap text-[12px]">F-Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyLeads.map((h, i) => {
                        const m = h.masterLead;
                        const idx = parseInt(h.entity_idx ?? -1);
                        let entityName = "—";
                        if (idx === -1) {
                          entityName = m?.primary_details?.companyName || "—";
                        } else {
                          entityName = m?.sub_entities?.[idx]?.data?.companyName || "—";
                        }

                        return (
                          <tr key={i} className={`transition-colors hover:bg-cyan-50/50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                            <td className="px-4 py-4 border-b border-r border-gray-100 text-center text-gray-400 text-[10px] font-bold">{i + 1}</td>
                            <td className="px-4 py-4 border-b border-r border-gray-100 whitespace-nowrap font-bold text-gray-700 text-[12px]">{fmt(h.submitted_at)}</td>
                            <td className="px-4 py-4 border-b border-r border-gray-100 text-gray-900 font-bold text-[12px]">{entityName}</td>
                            <td className="px-4 py-4 border-b border-r border-gray-100">
                               <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${h.entity_type === "Dealer" ? "bg-blue-500" : h.entity_type === "Distributor" ? "bg-purple-500" : "bg-gray-800"}`}>
                                 {h.entity_type || "Mfr"}
                               </span>
                            </td>
                            <td className="px-4 py-4 border-b border-r border-gray-100 text-gray-700 font-bold text-[12px]">{h.contact_person || "—"}</td>
                            <td className="px-4 py-4 border-b border-r border-gray-100 text-gray-700 font-bold text-[12px]">{h.mobile_no || "—"}</td>
                            <td className="px-4 py-4 border-b border-r border-gray-100 text-gray-600 text-[12px] max-w-xs truncate" title={h.remarks}>{h.remarks || "—"}</td>
                            <td className="px-4 py-4 border-b border-r border-gray-100 whitespace-nowrap font-bold text-red-500 text-[12px]">{(h.followup_stage === "Confirmed") ? "—" : fmt(h.next_followup_date)}</td>
                            <td className="px-4 py-4 border-b border-r border-gray-100 text-[12px]">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase inline-block whitespace-nowrap shadow-sm border ${
                                h.followup_stage === "Confirmed" ? "bg-green-100 text-green-700 border-green-200" :
                                h.followup_stage === "Inprogress" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                h.followup_stage === "Interested" ? "bg-cyan-100 text-cyan-700 border-cyan-200" :
                                h.followup_stage === "Not Interested" ? "bg-red-100 text-red-700 border-red-200" :
                                "bg-amber-100 text-amber-700 border-amber-200"
                              }`}>
                                {h.followup_stage || "Pending"}
                              </span>
                            </td>
                            <td className="px-4 py-4 border-b text-gray-700 font-bold text-[12px]">{h.next_follow_reason || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const style = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;
if (typeof document !== 'undefined') {
  const s = document.createElement('style');
  s.innerHTML = style;
  document.head.appendChild(s);
}

