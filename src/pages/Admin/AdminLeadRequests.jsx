import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";
import logoImg from "../../assets/images/logo.png";

// Assets
import PdfIcon from "../../assets/icons/pdfIcon.svg"
import ExcelIcon from "../../assets/icons/excelIcon.svg"

// ─── constants ────────────────────────────────────────────────────────────────
const BUSINESS_TYPES = ["Manufacturer", "Dealer", "Distributor"];

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const fmtTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const checkFollowupStatus = (exposArr, targetId) => {
  if (!exposArr || !Array.isArray(exposArr)) return false;
  const tId = String(targetId);
  return exposArr.some(entry => {
    if (entry[tId] === 1 || entry[tId] === "1") return true;
    if (String(entry.expo_id) === tId && (parseInt(entry.status) === 1)) return true;
    return false;
  });
};

const TABLE_COLS = [
  { key: "companyName", label: "Company Name" },
  { key: "contactPerson", label: "Contact Person" },
  { key: "designation", label: "Designation" },
  { key: "mobile1", label: "Mobile" },
  { key: "email1", label: "Email" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "segment", label: "Segment" },
  { key: "source", label: "Source" },
  { key: "remarks", label: "Remarks" },
];

const RecordRow = ({ rec, index, page, pageSize, selectedExpoId, onView }) => {
  const [activeIdx, setActiveIdx] = useState(-1);
  const mfr = rec.primary_details || {};
  const subs = rec.sub_entities || [];
  const currentData = activeIdx === -1 ? mfr : (subs[activeIdx]?.data || {});
  const currentType = activeIdx === -1 ? (rec.primary_type || "Manufacturer") : (subs[activeIdx]?.type || "—");

  const followTaken = checkFollowupStatus(rec.followup_taken_expos, selectedExpoId);
  const eIdInt = parseInt(selectedExpoId);

  // Use reused timestamp if available
  const effectiveDate = useMemo(() => {
    const expos = rec.expos_id || [];
    const found = expos.find(e => (typeof e === 'object' ? String(e.id) === String(selectedExpoId) : String(e) === String(selectedExpoId)));
    return (found && typeof found === 'object' && found.timestamp) ? found.timestamp : rec.created_at;
  }, [rec.created_at, rec.expos_id, eIdInt]);

  return (
    <tr className={`border-b border-gray-100 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-red-50/10 font-sans font-sans`}>
      <td className="px-4 py-4 text-xs text-gray-400 font-mono border-r border-gray-100 italic font-sans font-sans">{(page - 1) * pageSize + index + 1}</td>
      <td className="px-4 py-3 border-r border-gray-100 text-center font-sans font-sans">
        <button onClick={() => onView(rec)} className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-full hover:bg-black transition-all cursor-pointer shadow-sm font-sans font-sans">View</button>
      </td>
      <td className="px-4 py-4 text-[13px] text-gray-500 whitespace-nowrap border-r border-gray-100 font-sans font-medium text-center font-sans">{fmt(effectiveDate)}</td>
      <td className="px-5 py-4 text-[14px] font-bold text-gray-900 border-r border-gray-100 whitespace-nowrap font-sans font-sans">{rec.employee_name || "—"}</td>
      <td className="px-5 py-4 border-r border-gray-100 min-w-[200px] font-sans font-sans">
        <div className="flex flex-col gap-2 font-sans font-sans">
            {subs.length > 0 && (
              <div className="flex flex-wrap gap-1 font-sans font-sans">
                  <button onClick={() => setActiveIdx(-1)} className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all font-sans font-sans ${activeIdx === -1 ? "bg-red-600 text-white border-red-600 font-sans font-sans" : "bg-gray-100 text-gray-500 border-gray-200"}`}>Primary</button>
                  {subs.map((_, sIdx) => (
                    <button key={sIdx} onClick={() => setActiveIdx(sIdx)} className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all font-sans font-sans ${activeIdx === sIdx ? "bg-blue-600 text-white border-blue-600 font-sans" : "bg-gray-100 text-gray-500 border-gray-200"}`}>Sec</button>
                  ))}
              </div>
            )}
            <span className={`text-[15px] font-bold font-sans ${activeIdx === -1 ? "text-gray-900" : "text-blue-700"} truncate max-w-[220px] font-sans`} title={currentData.companyName}>
              {currentData.companyName || "—"}
            </span>
        </div>
      </td>
      <td className="px-4 py-4 border-r border-gray-100 text-center font-sans font-sans">
        <span className="text-[13px] font-bold text-black font-sans">
            {currentType}
        </span>
      </td>
      <td className="px-4 py-4 border-r border-gray-100 text-center font-sans font-sans">
        <span className={`text-[12px] font-bold font-sans ${followTaken ? "text-green-600 font-sans" : "text-red-500"}`}>
          {followTaken ? "Followup Taken" : "Followup Pending"}
        </span>
      </td>
      {TABLE_COLS.slice(1).map((c) => (
        <td key={c.key} className={`px-4 py-4 text-[14.5px] border-r border-gray-100 transition-colors font-sans ${activeIdx === -1 ? "text-gray-700 font-medium font-sans" : "text-blue-600 font-semibold font-sans font-sans"}`}>
          {currentData[c.key] || "—"}
        </td>
      ))}
    </tr>
  );
};

export default function AdminLeadRequests() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [allExpoRecords, setAllExpoRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchVal, setSearchVal] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [allocatedEmployees, setAllocatedEmployees] = useState([]);
  const [showFilters, setShowFilters] = useState(true);
  const [editRecord, setEditRecord] = useState(null);
  const [segmentList, setSegmentList] = useState([]);
  const [currentExpoName, setCurrentExpoName] = useState("");
  const [selectedExpoId, setSelectedExpoId] = useState(localStorage.getItem("utfi_current_expo_id") || "");

  const loadData = async () => {
    startLoading();
    try {
      setCurrentExpoName(localStorage.getItem("utfi_current_expo_name") || "");
      // Fetch all records (backend does not support expos_id filter on /customer-data)
      const params = new URLSearchParams({ newLead: 1, all: 1, page: 1, pageSize: 10000 });
      if (searchVal) params.append("searchVal", searchVal);
      if (filterStartDate) params.append("fromDate", filterStartDate);
      if (filterEndDate) params.append("toDate", filterEndDate);
      if (filterEmployeeId) params.append("employeeFilterId", filterEmployeeId);

      const res = await fetch(`${API_BASE}/customer-data?${params.toString()}`, {
        headers: { 'ngrok-skip-browser-warning': 'any' }
      });
      const result = await res.json();
      if (result.success) {
        const eIdInt = parseInt(selectedExpoId);
        // Filter client-side: only records belonging to the selected expo
        const expoFiltered = (result.data || []).filter((r) => {
          if (!selectedExpoId || selectedExpoId === "null" || selectedExpoId === "undefined") return true;
          const expoArr = r.expos_id || [];
          return expoArr.some((e) =>
            typeof e === "object" ? e.id === eIdInt : parseInt(e) === eIdInt
          );
        });
        // Cache all expo records — tab filtering is done in useMemo
        setAllExpoRecords(expoFiltered);
      }
      if (allocatedEmployees.length === 0) {
        const empRes = await fetch(`${API_BASE}/employee`, { headers: { 'ngrok-skip-browser-warning': 'any' } });
        if (empRes.ok) {
          const empData = await empRes.json();
          setAllocatedEmployees(empData.sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
      if (segmentList.length === 0) {
        const curExpoId = localStorage.getItem("utfi_current_expo_id");
        const segRes = await fetch(`${API_BASE}/segments?expos_id=${curExpoId || ""}`, { headers: { "ngrok-skip-browser-warning": "any" } });
        if (segRes.ok) {
          const segData = await segRes.json();
          if (Array.isArray(segData)) setSegmentList(segData.map(s => s.segment));
        }
      }
    } catch (e) { showToast("Load failed", "error"); } finally { stopLoading(); }
  };

  // ─── Derived state (no re-fetch on tab switch or page change) ────────────
  const { counts, records, total } = useMemo(() => {
    const tCount = allExpoRecords.filter(r => checkFollowupStatus(r.followup_taken_expos, selectedExpoId)).length;
    const counts = { all: allExpoRecords.length, taken: tCount, pending: allExpoRecords.length - tCount };

    let filtered = allExpoRecords;
    if (activeTab === "taken") {
      filtered = allExpoRecords.filter(r => checkFollowupStatus(r.followup_taken_expos, selectedExpoId));
    } else if (activeTab === "not_taken") {
      filtered = allExpoRecords.filter(r => !checkFollowupStatus(r.followup_taken_expos, selectedExpoId));
    }
    return { counts, records: filtered, total: filtered.length };
  }, [allExpoRecords, activeTab, selectedExpoId]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, page, pageSize]);

  useEffect(() => {
    const handleExpoChange = () => {
      setSelectedExpoId(localStorage.getItem("utfi_current_expo_id") || "");
      setCurrentExpoName(localStorage.getItem("utfi_current_expo_name") || "");
      setPage(1);
    };
    window.addEventListener("utfi_expo_changed", handleExpoChange);
    return () => window.removeEventListener("utfi_expo_changed", handleExpoChange);
  }, []);

  useEffect(() => { loadData(); }, [filterStartDate, filterEndDate, searchVal, filterEmployeeId, selectedExpoId]);

  useEffect(() => {
    setPage(1);
  }, [filterStartDate, filterEndDate, searchVal, filterEmployeeId, activeTab, selectedExpoId]);

  const handleUpdate = async (updatedRec) => {
    startLoading();
    try {
      const resp = await fetch(`${API_BASE}/customer-data`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: updatedRec.id, primary_type: updatedRec.primary_type, primary_details: updatedRec.primary_details, sub_entities: updatedRec.sub_entities })
      });
      const data = await resp.json();
      if (data.success) { 
        showToast("Lead updated successfully!"); 
        setEditRecord(null); 
        // Update local state instantly instead of refetching
        setRecords(prev => prev.map(r => r.id === updatedRec.id ? { ...r, ...updatedRec } : r));
      }
    } catch (e) { showToast("Update failed", "error"); } finally { stopLoading(); }
  };

  const prepareExportData = () => {
    let rows = []; let sNo = 1;
    const selectedExpoId = localStorage.getItem("utfi_current_expo_id");
    records.forEach((rec) => {
       const subs = rec.sub_entities || [];
       const prim = rec.primary_details || {}; 
       const ft = checkFollowupStatus(rec.followup_taken_expos, selectedExpoId);
       
       rows.push({
          "S.No": sNo++,
          "Entry Date": fmt(rec.created_at),
          "Added By": rec.employee_name || "—",
          "Followup Status": ft ? "Followup Taken" : "Followup Pending",
          "Company Name": prim.companyName || "—", 
          "Entity Type": "Primary", 
          "Business Type": rec.primary_type || "Manufacturer",
          "Contact Person": prim.contactPerson || "—", 
          "Designation": prim.designation || "—",
          "Mobile": prim.mobile1 || "—", 
          "Email": prim.email1 || "—", 
          "City": prim.city || "—",
          "State": prim.state || "—", 
          "Segment": prim.segment || "—", 
          "Source": prim.source || "—", 
          "Remarks": prim.remarks || "—",
          isPrimary: true,
          spanCount: 1 + subs.length
       });
       subs.forEach(sub => {
          const sd = sub.data || {};
          rows.push({ 
            "S.No": "", 
            "Entry Date": "", 
            "Added By": "", 
            "Followup Status": "", 
            "Company Name": sd.companyName || prim.companyName || "—", 
            "Entity Type": "Secondary", 
            "Business Type": sub.type || "—", 
            "Contact Person": sd.contactPerson || "—", 
            "Designation": sd.designation || "—", 
            "Mobile": sd.mobile1 || "—", 
            "Email": sd.email1 || "—", 
            "City": sd.city || "—", 
            "State": sd.state || "—", 
            "Segment": sd.segment || "—", 
            "Source": sd.source || "—", 
            "Remarks": sd.remarks || "—",
            isPrimary: false
          });
       });
    });
    return rows;
  };

  const handleExportExcel = () => {
    const rawData = prepareExportData();
    if (rawData.length === 0) return showToast("No data", "info");
    const exportRows = rawData.map(r => {
      const { isPrimary, spanCount, ...rest } = r;
      return rest;
    });
    const ws = XLSX.utils.json_to_sheet(exportRows); 
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "New Leads"); 
    XLSX.writeFile(wb, `Leads_${Date.now()}.xlsx`);
  };

  const handleExportPDF = async () => {
    const rawData = prepareExportData();
    if (rawData.length === 0) return showToast("No data", "info");
    
    const doc = new jsPDF("l", "pt", "a2");
    
    // Header Logic
    const loadImg = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      });
    };

    const logo = await loadImg(logoImg);
    if (logo) doc.addImage(logo, "PNG", 40, 20, 0, 50);

    const pageWidth = doc.internal.pageSize.getWidth();

    // Main Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(30, 30, 30); // Darker for the main title
    doc.text("UTFI Trade Fair - New Leads", pageWidth / 2, 45, { align: "center" });

    // Exhibition Name (Subtitle)
    if (currentExpoName) {
      doc.setFontSize(22);
      doc.setTextColor(220, 38, 38); // Bright red for expo name
      doc.text(currentExpoName, pageWidth / 2, 80, { align: "center" });
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Generated At: ${new Date().toLocaleString("en-IN")}`, pageWidth - 40, 45, { align: "right" });

    const headerKeys = Object.keys(rawData[0]).filter(k => k !== "isPrimary" && k !== "spanCount");
    const body = rawData.map(r => r.isPrimary ? headerKeys.map(k => r[k]) : headerKeys.slice(4).map(k => r[k]));

    let bIdx = 0;
    rawData.forEach(r => {
      if (r.isPrimary && r.spanCount > 1) {
        for (let c = 0; c <= 3; c++) {
          body[bIdx][c] = { content: body[bIdx][c], rowSpan: r.spanCount };
        }
      }
      bIdx++;
    });

    autoTable(doc, { 
      head: [headerKeys], 
      body: body, 
      startY: currentExpoName ? 110 : 90,
      theme: 'grid', 
      styles: { fontSize: 11, cellPadding: 8, halign: 'center' },
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold', lineWidth: 0.1, lineColor: [255, 255, 255] },
      bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] }
    });

    doc.save(`Leads_${Date.now()}.pdf`);
  };

  const totalPages = Math.ceil(total / pageSize);
  const renderPageNumbers = () => {
    const pages = []; let start = Math.max(1, page - 2); let end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) {
       pages.push(<button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold font-sans ${page === i ? "bg-red-600 text-white shadow-md shadow-red-200" : "bg-white text-gray-500 border border-gray-200"}`}>{i}</button>);
    }
    return pages;
  };

  const currentExpoId = selectedExpoId;

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans font-sans">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 md:px-6 py-4 shadow-sm font-sans font-sans">
        <div className="flex flex-col md:flex-row md:items-center gap-4 font-sans font-sans">
          <div className="flex items-center gap-3">
           <button onClick={() => navigate(-1)} className="p-2.5 rounded-full text-black bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer shadow-sm border border-gray-200">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="w-1 h-7 rounded-full bg-[#e81c21]" />
            <h1 className="text-xl font-black text-gray-900 font-sans">New Leads</h1>
            <button
              onClick={loadData}
              title="Refresh Data"
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-[#e81c21] transition-all cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:ml-auto font-sans font-sans">
             <button onClick={() => setShowFilters(!showFilters)} className="md:hidden flex items-center gap-2 px-4 py-2.5 rounded-full bg-black text-white text-xs font-black uppercase tracking-widest font-sans font-sans">
                {showFilters ? "Hide Filters" : "Show Filters"}
                <svg className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor font-sans"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
             </button>
             <div className="hidden md:flex items-center gap-2 font-sans font-sans">
                <button onClick={handleExportExcel} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-all font-bold text-sm cursor-pointer shadow-sm font-sans">
                   <span>Export as Excel</span>
                   <img src={ExcelIcon} alt="Excel" className="w-5 h-5 font-sans" />
                </button>
                <button onClick={handleExportPDF} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all font-bold text-sm cursor-pointer shadow-sm font-sans font-sans">
                   <span>Export as PDF</span>
                   <img src={PdfIcon} alt="PDF" className="w-5 h-5 font-sans" />
                </button>
             </div>
             <div className="flex-1 md:w-64 relative font-sans font-sans">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-sans font-sans">🔍</span>
                <input value={searchVal} onChange={(e) => setSearchVal(e.target.value)} placeholder="Search..." className="w-full bg-gray-50 border border-gray-200 rounded-full pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100 font-sans" />
             </div>
          </div>
        </div>

        {/* Expo name — full-width centered row on all screens */}
        {currentExpoName && (
          <div className="text-center mt-2">
            <span className="text-[16px] md:text-[22px] text-[#ff3b3a] tracking-[0.12em] uppercase font-bold drop-shadow-sm">
              {currentExpoName}
            </span>
          </div>
        )}

        <div className={`mt-5 transition-all duration-300 overflow-hidden font-sans font-sans ${showFilters ? "max-h-[1000px] opacity-100 p-1" : "max-h-0 opacity-0 md:max-h-[1000px] md:opacity-100 font-sans"}`}>
           <div className="flex flex-wrap items-end gap-5 font-sans font-sans">
              <div className="md:hidden w-full flex items-center gap-2 mb-2 font-sans font-sans">
                 <button onClick={handleExportExcel} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-600 border border-green-200 font-bold text-xs font-sans"><img src={ExcelIcon} className="w-4 h-4 font-sans" /> <span>Excel</span></button>
                 <button onClick={handleExportPDF} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 font-bold text-xs font-sans font-sans"><img src={PdfIcon} className="w-4 h-4" /> <span>PDF</span></button>
              </div>

              <div className="flex flex-col gap-1.5 font-sans font-sans">
                 <span className="text-[13px] font-bold text-gray-800 ml-1 font-sans font-sans font-sans">Employee</span>
                 <select value={filterEmployeeId} onChange={(e) => setFilterEmployeeId(e.target.value)} className="min-w-[160px] px-4 py-2.5 rounded-full border border-gray-200 bg-white text-xs font-bold outline-none cursor-pointer hover:border-red-400 transition-colors font-sans font-sans">
                   <option value="" className="font-sans">Select employee</option>
                   {allocatedEmployees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                 </select>
              </div>
              <div className="flex items-center gap-3 font-sans font-sans">
                 <div className="flex flex-col gap-1.5 font-sans">
                   <span className="text-[13px] font-bold text-gray-800 ml-1 font-sans">From date</span>
                   <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold outline-none font-sans font-sans" />
                 </div>
                 <div className="flex flex-col gap-1.5 font-sans">
                   <span className={`text-[13px] font-bold ml-1 font-sans ${!filterStartDate ? "text-gray-300" : "text-gray-800"}`}>To date</span>
                   <input disabled={!filterStartDate} type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className={`px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold outline-none font-sans ${!filterStartDate ? "bg-gray-50 opacity-50 cursor-not-allowed" : ""}`} />
                 </div>
              </div>
              <div className="flex flex-col gap-1.5 font-sans font-sans">
                 <span className="text-[13px] font-bold text-gray-800 ml-1 font-sans font-sans">Per page count</span>
                 <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }} className="min-w-[100px] px-4 py-2.5 rounded-full border border-gray-200 bg-white text-xs font-bold font-sans">
                   {[10, 25, 50, 100, 250].map(v=><option key={v} value={v}>{v} Rows</option>)}
                 </select>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 md:ml-auto mt-2 md:mt-0 font-sans">
                 {[
                   {id:"all", label:"All", count: counts.all},
                   {id:"taken", label:"Followup Taken", count: counts.taken},
                   {id:"not_taken", label:"Followup Pending", count: counts.pending}
                 ].map(t => (
                   <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-all shadow-sm font-sans ${activeTab===t.id ? "bg-black text-white" : "bg-white text-gray-400 border border-gray-200 hover:border-gray-400 cursor-pointer"}`}>
                     {t.label} ({t.count})
                   </button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="p-4 md:p-6 pb-24 font-sans font-sans font-sans">
        <div className="bg-white rounded-xl md:rounded-3xl shadow-sm border border-gray-200 flex flex-col min-h-[50vh] overflow-hidden font-sans font-sans font-sans">
          <div className="flex-1 overflow-x-auto font-sans font-sans">
            <table className="w-full text-sm border-collapse text-left font-sans font-sans">
              <thead className="bg-[#111111] text-white font-sans font-sans">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold border-r border-white/5 font-sans font-sans">S.No</th>
                  <th className="px-5 py-4 text-xs font-bold border-r border-white/5 font-sans">Action</th>
                  <th className="px-5 py-4 text-xs font-bold border-r border-white/5 font-sans text-center whitespace-nowrap">Entry Date</th>
                  <th className="px-5 py-4 text-xs font-bold border-r border-white/5 font-sans">Added By</th>
                  <th className="px-5 py-4 text-xs font-bold border-r border-white/5 font-sans">Company</th>
                  <th className="px-5 py-4 text-xs font-bold text-center border-r border-white/5 font-sans">Type</th>
                  <th className="px-5 py-4 text-xs font-bold text-center border-r border-white/5 font-sans">Status</th>
                  {TABLE_COLS.slice(1).map(c=><th key={c.key} className="px-5 py-4 border-r border-white/5 text-xs font-bold whitespace-nowrap px-4 font-sans font-sans">{c.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans font-sans font-sans">
                {paginatedData.length === 0 ? <tr><td colSpan={20} className="p-20 text-center text-gray-300 italic font-sans font-sans">No leads found.</td></tr> : paginatedData.map((rec, i) => (<RecordRow key={rec.id} rec={rec} page={page} pageSize={pageSize} index={i} selectedExpoId={currentExpoId} onView={(r) => setEditRecord(JSON.parse(JSON.stringify(r)))} />))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 bg-white font-sans mt-auto">
             <div className="text-center md:text-left font-sans font-sans font-sans">
                <span className="text-[13px] font-bold text-gray-900 block font-sans">Total: {total}</span>
                <p className="text-[10px] font-medium text-gray-400 font-sans">Page {page} of {totalPages}</p>
             </div>
             <div className="flex items-center gap-1.5 font-sans font-sans">
               <button disabled={page === 1} onClick={() => setPage(page-1)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center font-sans font-sans"><svg className="w-5 h-5 text-gray-500 font-sans" fill="none" viewBox="0 0 24 24" stroke="currentColor font-sans font-sans font-sans"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
               <div className="flex items-center gap-1 font-sans">{renderPageNumbers()}</div>
               <button disabled={page >= totalPages} onClick={() => setPage(page+1)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center font-sans font-sans font-sans"><svg className="w-5 h-5 text-gray-500 font-sans" fill="none" viewBox="0 0 24 24" stroke="currentColor font-sans font-sans font-sans"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></button>
             </div>
          </div>
        </div>
      </div>

      {editRecord && <DetailModal row={editRecord} segmentList={segmentList} onClose={() => setEditRecord(null)} onSave={handleUpdate} />}
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .font-sans { font-family: 'Inter', sans-serif; } `}</style>
    </div>
  );
}

function DetailModal({ row, segmentList, onClose, onSave }) {
  const [data, setData] = useState({ ...row });
  const [activeTab, setActiveTab] = useState(-1); // -1 for primary

  const updPrimary = (f, v) => {
    setData(prev => ({ ...prev, primary_details: { ...prev.primary_details, [f]: v } }));
  };
  const updSub = (idx, f, v) => {
    const next = [...(data.sub_entities || [])];
    next[idx] = { ...next[idx], data: { ...next[idx].data, [f]: v } };
    setData(prev => ({ ...prev, sub_entities: next }));
  };

  const field = (label, key, isSub = false, index = 0) => {
    const val = isSub ? data.sub_entities[index].data[key] : data.primary_details[key];
    const onChange = (v) => isSub ? updSub(index, key, v) : updPrimary(key, v);

    return (
      <div key={key} className="flex flex-col gap-1.5 font-sans">
        <label className="text-[13px] font-bold text-gray-800 ml-1 font-sans">{label}</label>
        <input
          value={val || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-500 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-600 transition-all font-sans font-sans"
        />
      </div>
    );
  };

  const currentEntityName = activeTab === -1 ? data.primary_details.companyName : data.sub_entities[activeTab].data.companyName;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-6 font-sans font-sans">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl font-sans">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-[#111111] font-sans font-sans">
          <div className="flex flex-col gap-2 font-sans font-sans">
            <h2 className="text-white text-[15px] font-black tracking-wide font-sans">{currentEntityName || "Update Lead"}</h2>
            <div className="flex items-center gap-2 font-sans font-sans">
              <button onClick={() => setActiveTab(-1)} className={`px-5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all font-sans font-sans ${activeTab === -1 ? "bg-red-600 text-white shadow-lg shadow-red-500/30 font-sans" : "bg-white/10 text-gray-400 hover:bg-white/20 font-sans"}`}>
                {data.primary_type || "Primary"}
              </button>
              {data.sub_entities?.map((sub, sIdx) => (
                <button key={sIdx} onClick={() => setActiveTab(sIdx)} className={`px-5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all font-sans font-sans ${activeTab === sIdx ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-sans" : "bg-white/10 text-gray-400 hover:bg-white/20 font-sans"}`}>
                  {sub.type || "Secondary"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all text-xl font-sans font-sans">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-gray-50/50 font-sans font-sans">
          <div className="space-y-10 font-sans">
            <div className="flex items-center justify-between border-b border-gray-200 pb-6 font-sans font-sans font-sans">
              <div className="flex items-center gap-3 font-sans">
                <span className={`w-1.5 h-6 rounded-full font-sans ${activeTab === -1 ? "bg-red-600" : "bg-blue-600 font-sans font-sans font-sans"}`} />
                <h3 className="text-lg font-bold text-gray-900 font-sans font-sans">
                  {currentEntityName || "Lead Details"}
                </h3>
              </div>
              <select 
                value={activeTab === -1 ? data.primary_type : data.sub_entities[activeTab].type} 
                onChange={(e) => {
                  if(activeTab === -1) setData({...data, primary_type: e.target.value});
                  else {
                    const next = [...data.sub_entities];
                    next[activeTab].type = e.target.value;
                    setData({...data, sub_entities: next});
                  }
                }}
                className="px-6 py-2.5 rounded-full border border-gray-500 text-[10px] font-black bg-white outline-none cursor-pointer hover:border-black transition-colors font-sans font-sans"
              >
                {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
              {field("Company Name", "companyName", activeTab !== -1, activeTab)}
              {field("Remarks", "remarks", activeTab !== -1, activeTab)}
              {field("Contact Person", "contactPerson", activeTab !== -1, activeTab)}
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
              {field("Product Details", "productDetails", activeTab !== -1, activeTab)}
              
              <div className="flex flex-col gap-1.5 font-sans font-sans font-sans">
                <label className="text-[13px] font-bold text-gray-800 ml-1 font-sans">Segment</label>
                <select 
                  value={(activeTab === -1 ? data.primary_details.segment : data.sub_entities[activeTab].data.segment) || ""} 
                  onChange={(e) => {
                    if(activeTab === -1) updPrimary("segment", e.target.value);
                    else updSub(activeTab, "segment", e.target.value);
                  }}
                  className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-500 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-600 transition-all font-sans cursor-pointer"
                >
                  <option value="">-- Select --</option>
                  {segmentList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-white border-t border-gray-100 flex items-center justify-between font-sans">
           <div className="hidden sm:block">
              <p className="text-[10px] font-medium text-gray-400 font-sans">Database Entry: {fmtTime(data.created_at)}</p>
           </div>
           <div className="flex items-center gap-4 ml-auto font-sans">
              <button onClick={onClose} className="text-[11px] font-black uppercase text-gray-400 hover:text-red-600 transition-colors tracking-widest font-sans font-sans">Discard</button>
              <button 
                onClick={() => onSave(data)}
                className="px-10 py-3.5 rounded-full bg-black text-white font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all font-sans"
              >
                Update Lead
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}