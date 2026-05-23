import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";
import ConfirmModal from "../../components/ConfirmModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TABLE_COLS = [
    { key: "type_of_business", masterKey: "primary_type", label: "Type of Business" },
  { key: "contact_person", masterKey: "contactPerson", label: "Contact Person" },
  { key: "designation", masterKey: "designation", label: "Designation" },
  { key: "city", masterKey: "city", label: "City" },
  { key: "mobile_no", masterKey: "mobile1", label: "Mobile No" },
  { key: "company_email", masterKey: "email1", label: "Email 1" },
  { key: "website", masterKey: "website", label: "Website" },
  { key: "source", masterKey: "source", label: "Source" },
  { key: "segment", masterKey: "segment", label: "Segment" },
  { key: "product_details", masterKey: "productDetails", label: "Product Details" },
];

const DEFAULT_VISIBLE = ["companyName", "contactPerson", "designation", "city", "mobile1", "segment", "typeOfBusiness"];

export default function DataChanges() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [changes, setChanges] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [expos, setExpos] = useState([]);
  const [expoNames, setExpoNames] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDateFrom, setSelectedDateFrom] = useState("");
  const [selectedDateTo, setSelectedDateTo] = useState("");
  const [filterField, setFilterField] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Modal State
  const [viewRecord, setViewRecord] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Yes, Apply",
    confirmType: "success"
  });

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchEmployees();
    fetchExpoData();
    fetchChanges();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/employee`, { headers: { "ngrok-skip-browser-warning": "any" } });
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
    } catch (err) { console.error(err); }
  };

  const fetchExpoData = async () => {
    try {
      const [expoRes, nameRes] = await Promise.all([
        fetch(`${API_BASE_URL}/expos`, { headers: { "ngrok-skip-browser-warning": "any" } }),
        fetch(`${API_BASE_URL}/expo-names`, { headers: { "ngrok-skip-browser-warning": "any" } }),
      ]);
      const expoData = await expoRes.json();
      const nameData = await nameRes.json();
      if (Array.isArray(expoData)) setExpos(expoData);
      if (Array.isArray(nameData)) setExpoNames(nameData);
    } catch (err) { console.error(err); }
  };

  // Helper: given an expo row, build its display name e.g. "Agri_2025"
  const getExpoLabel = (expoId) => {
    const expo = expos.find(e => String(e.id) === String(expoId));
    if (!expo) return "—";
    const parentName = expoNames.find(n => String(n.id) === String(expo.expo_name_id))?.name || "Expo";
    return `${parentName}_${expo.year}`;
  };

  const fetchChanges = async () => {
    startLoading("Fetching changes...");
    try {
      const currentExpoId = localStorage.getItem("utfi_current_expo_id");
      let url = `${API_BASE_URL}/customer-followup?onlyChanges=1`;
      if (currentExpoId) url += `&expos_id=${currentExpoId}`;
      if (selectedEmployee) url += `&employeeId=${selectedEmployee}`;
      if (selectedDateFrom) url += `&startDate=${selectedDateFrom}`;
      if (selectedDateTo) url += `&endDate=${selectedDateTo}`;

      const res = await fetch(url, { headers: { "ngrok-skip-browser-warning": "any" } });
      const result = await res.json();
      if (result.success) {
        // Also client-side filter to be safe
        const filtered = currentExpoId
          ? result.data.filter(r => String(r.expos_id) === String(currentExpoId))
          : result.data;
        setChanges(filtered);
      } else {
        showToast(result.message || "Failed to fetch changes", "error");
      }
    } catch (err) {
      showToast("Connection error", "error");
    } finally {
      stopLoading();
    }
  };

  const handleApplyChanges = (changeRecord) => {
    setConfirmModal({
      isOpen: true,
      title: "Apply Data Update",
      message: `Are you sure you want to update these changes to the master record for ${changeRecord.primary_details.companyName}? This action cannot be undone.`,
      confirmText: "Update",
      confirmType: "action",
      onConfirm: () => executeApplyChanges(changeRecord)
    });
  };

  const executeApplyChanges = async (changeRecord) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    startLoading("Updating Changes...");
    try {
      const fieldChanges = changeRecord.field_changes;
      const updatedPrimary = { ...changeRecord.primary_details };
      let newPrimaryType = changeRecord.primary_type;
      
      Object.keys(fieldChanges).forEach(field => {
        let targetKey = field;
        if (field === "contactPerson") targetKey = "contactPerson";
        if (field === "designation") targetKey = "designation";
        if (field === "mobileNo") targetKey = "mobile1";
        if (field === "emailId") targetKey = "email1";
        if (field === "city") targetKey = "city";
        if (field === "companyEmail") targetKey = "companyEmail";
        if (field === "website") targetKey = "website";
        if (field === "source") targetKey = "source";
        if (field === "segment") targetKey = "segment";
        if (field === "productDetails") targetKey = "productDetails";
        
        if (field === "typeOfBusiness") {
           newPrimaryType = fieldChanges[field].to;
        } else {
           updatedPrimary[targetKey] = fieldChanges[field].to;
        }
      });

      const res = await fetch(`${API_BASE_URL}/customer-data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: changeRecord.customer_data_id,
          primary_details: updatedPrimary,
          primary_type: newPrimaryType
        })
      });
      const result = await res.json();
      if (result.success) {
        // Success update master data, now clear the field_changes for this followup
        await fetch(`${API_BASE_URL}/customer-followup?clearChanges=1&ids=${changeRecord.id}`, {
          method: 'DELETE'
        });
        showToast("Changes updated successfully!", "success");
        fetchChanges();
        setViewRecord(null);
      } else {
        showToast(result.message || "Failed to update changes", "error");
      }
    } catch (err) {
      showToast("Network error", "error");
    } finally {
      stopLoading();
    }
  };

  const processedData = useMemo(() => {
    return changes.filter(item => {
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      
      const companyName = String(item.primary_details.companyName || "").toLowerCase();
      const employeeName = String(item.employee_name || "").toLowerCase();
      const hasMatchInChanges = Object.values(item.field_changes).some(v => 
          String(v.from).toLowerCase().includes(q) || String(v.to).toLowerCase().includes(q)
      );

      return companyName.includes(q) || employeeName.includes(q) || hasMatchInChanges;
    });
  }, [changes, searchQuery]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize);
  const goPage = (p) => setPage(Math.max(1, Math.min(totalPages, p)));

  useEffect(() => { setPage(1); }, [searchQuery, selectedEmployee, selectedDateFrom, selectedDateTo, pageSize]);

  // ─── Selection ──────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(paginatedData.map(i => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleDeleteEntry = () => {
     if (selectedIds.size === 0) {
       showToast("Please select items to delete", "info");
       return;
     }

     setConfirmModal({
        isOpen: true,
        title: "Discard Pending Changes",
        message: `Are you sure you want to clear change logs for ${selectedIds.size} selected records? This data will be permanently removed from the audit queue.`,
        confirmText: "Discard Logs",
        confirmType: "danger",
        onConfirm: executeDeleteEntry
     });
  };

  const executeDeleteEntry = async () => {
     setConfirmModal(prev => ({ ...prev, isOpen: false }));
     startLoading("Clearing Changes...");
     try {
       const idsStr = Array.from(selectedIds).join(",");
       const res = await fetch(`${API_BASE_URL}/customer-followup?clearChanges=1&ids=${idsStr}`, {
         method: 'DELETE'
       });
       const result = await res.json();
       if (result.success) {
         showToast("Selected changes cleared successfully", "success");
         setSelectedIds(new Set());
         fetchChanges();
       } else {
         showToast(result.message || "Failed to clear changes", "error");
       }
     } catch (err) {
       showToast("Network error", "error");
     } finally {
       stopLoading();
     }
  };

  // ─── Cell Helper ────────────────────────────────────────────────────────────
  const ChangeCell = ({ fieldKey, record }) => {
    let dataChangesKey = fieldKey;
    if (fieldKey === "contact_person") dataChangesKey = "contactPerson";
    if (fieldKey === "designation") dataChangesKey = "designation";
    if (fieldKey === "mobile_no") dataChangesKey = "mobileNo";
    if (fieldKey === "email_id") dataChangesKey = "emailId";
    if (fieldKey === "city") dataChangesKey = "city";
    if (fieldKey === "website") dataChangesKey = "website";
    if (fieldKey === "source") dataChangesKey = "source";
    if (fieldKey === "company_email") dataChangesKey = "companyEmail";
    if (fieldKey === "type_of_business") dataChangesKey = "typeOfBusiness";
    if (fieldKey === "segment") dataChangesKey = "segment";
    if (fieldKey === "product_details") dataChangesKey = "productDetails";

    const change = record.field_changes[dataChangesKey];
    
    // Original value from master record (primary_details OR primary_type)
    const colDef = TABLE_COLS.find(c => c.key === fieldKey);
    let masterVal = "";
    if (colDef) {
       if (colDef.masterKey === "primary_type") masterVal = record.primary_type;
       else masterVal = record.primary_details[colDef.masterKey];
    }
    masterVal = String(masterVal || "").trim();
    const displayMaster = masterVal || "—";

    // Only show red text if target value is DIFFERENT from master value
    const hasActiveChange = change && String(change.to || "").trim() !== masterVal;

    return (
      <div className="flex flex-col min-h-[50px] justify-center text-sm leading-relaxed">
        <span className="text-gray-700">{displayMaster}</span>
        {hasActiveChange && (
          <span className="text-red-600 font-extrabold mt-1 text-[13px] border-t border-red-100 pt-0.5">{String(change.to).trim() || "—"}</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col relative overflow-hidden">
      
      {/* Header Bar */}
      <div className="flex items-center gap-6 px-6 py-4">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-red-50 text-black flex items-center justify-center hover:bg-red-100 transition-all cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-black tracking-tight">Data Changes</h1>
          <button 
            onClick={fetchChanges}
            className="p-1 hover:rotate-180 transition-all duration-500 cursor-pointer"
            title="Refresh"
          >
            <svg className="w-7 h-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Unified Filter & Actions Command Bar */}
      <div className="px-10 py-6 flex flex-wrap items-end gap-x-5 gap-y-5 bg-white">
        {/* Core Data Filters */}
        <div className="flex flex-wrap items-end gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-gray-700 ml-1">Select Employee</span>
            <select 
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-52 h-11 px-4 rounded-xl bg-gray-100 border border-gray-200 text-sm font-semibold focus:outline-none cursor-pointer appearance-none shadow-sm hover:bg-white transition-all"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
            >
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-gray-700 ml-1">Date From</span>
            <input 
              type="date" 
              value={selectedDateFrom}
              onChange={(e) => setSelectedDateFrom(e.target.value)}
              className="h-11 px-4 rounded-xl bg-gray-100 border border-gray-200 text-sm font-semibold focus:outline-none cursor-pointer shadow-sm hover:bg-white transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-gray-700 ml-1">Date To</span>
            <input 
              type="date" 
              value={selectedDateTo}
              onChange={(e) => setSelectedDateTo(e.target.value)}
              className="h-11 px-4 rounded-xl bg-gray-100 border border-gray-200 text-sm font-semibold focus:outline-none cursor-pointer shadow-sm hover:bg-white transition-all"
            />
          </div>

          <button 
            onClick={fetchChanges}
            className="h-11 px-8 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-black transition-all cursor-pointer shadow-md active:scale-95 whitespace-nowrap"
          >
            Submit
          </button>
        </div>

        {/* Global Search Filters */}
        <div className="flex flex-wrap items-end gap-4 border-l border-gray-200 pl-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-gray-700 ml-1">Filter By</span>
            <select 
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="w-44 h-11 px-4 rounded-xl bg-gray-100 border border-gray-200 text-sm font-semibold focus:outline-none cursor-pointer appearance-none shadow-sm hover:bg-white transition-all"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
            >
              <option value="">Select filter</option>
              <option value="companyName">Company Name</option>
              <option value="employeeName">Employee Name</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-gray-700 ml-1">Search</span>
            <input 
              type="text" 
              placeholder="Type here..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 h-11 px-4 rounded-xl bg-gray-100 border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-100 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Management Actions */}
        <div className="ml-auto flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-3 h-11 px-5 border border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:bg-white transition-all shadow-sm">
            <input 
              type="checkbox" 
              checked={selectedIds.size === paginatedData.length && paginatedData.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-5 h-5 accent-red-600" 
            />
            <span className="text-[13px] font-bold text-gray-700">Select All</span>
          </label>

          <button 
            onClick={handleDeleteEntry}
            className="h-11 px-8 rounded-xl bg-white border-2 border-red-600 text-red-600 font-bold text-sm hover:bg-red-600 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="px-10 pb-5 flex items-center justify-between border-t border-gray-100 pt-5">
        <span className="text-base font-bold text-gray-800">Selected Count : <span className="text-red-600">{selectedIds.size}</span></span>
        <span className="text-base font-bold text-gray-800">Total records found : <span className="text-black">{processedData.length}</span></span>
      </div>

      {/* Main Table Content */}
      <div className="px-6 pb-20 flex-1 h-full mb-[180px]">
        <div 
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col h-full"
          style={{ minHeight: "65vh" }}
        >
          <div className="overflow-x-auto flex-1 h-full">
            <table className="w-full text-base border-collapse">
              <thead className="bg-[#111111] text-white">
                <tr>
                  <th className="text-center px-4 py-4 text-[13px] font-bold border-r border-white/5 whitespace-nowrap w-12">S.No</th>
                  <th className="text-center px-4 py-4 text-[13px] font-bold border-r border-white/5 whitespace-nowrap w-12">Select</th>
                  <th className="text-center px-6 py-4 text-[13px] font-bold border-r border-white/5 whitespace-nowrap">View Data</th>
                  <th className="text-center px-6 py-4 text-[13px] font-bold border-r border-white/5 whitespace-nowrap">Update Data</th>
                  <th className="text-center px-6 py-4 text-[13px] font-bold border-r border-white/5 whitespace-nowrap">Date</th>
                  <th className="text-left px-6 py-4 text-[13px] font-bold border-r border-white/5 whitespace-nowrap">Expo Name</th>
                  <th className="text-left px-6 py-4 text-[13px] font-bold border-r border-white/5 whitespace-nowrap">Company Name</th>
                  {TABLE_COLS.map(col => (
                    <th key={col.key} className="text-left px-6 py-4 text-[13px] font-bold border-r border-white/5 whitespace-nowrap">{col.label}</th>
                  ))}
                  <th className="text-left px-6 py-4 text-[13px] font-bold border-white/5 whitespace-nowrap">Emp Name</th>
                </tr>
              </thead>
              <tbody>
                {processedData.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLS.length + 7} className="text-center py-32 text-gray-400">
                      <div className="flex flex-col items-center gap-6">
                        <span className="text-2xl font-bold text-gray-200 tracking-widest">No pending data changes found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => (
                    <tr key={row.id} className={`border-b border-gray-100 hover:bg-cyan-50/50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="px-4 py-4 border-r border-gray-100 text-center text-gray-600 font-bold">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-4 py-4 border-r border-gray-100 text-center">
                         <input 
                            type="checkbox" 
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleSelect(row.id)}
                            className="w-5 h-5 accent-red-600 cursor-pointer"
                         />
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100 text-center whitespace-nowrap">
                        <button 
                          onClick={() => setViewRecord(row)}
                          className="px-4 py-2 rounded-full text-red-600 font-bold hover:bg-red-50 transition-all text-[11px]  border border-red-200"
                        >
                          View Changes
                        </button>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100 text-center whitespace-nowrap">
                        <button 
                          onClick={() => handleApplyChanges(row)}
                          className="px-6 py-3 rounded-lg text-black text-xs font-bold hover:opacity-80 transition-all cursor-pointer shadow-sm"
                          style={{ background: "#f3e0c0" }}
                        >
                          Update
                        </button>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100 text-center text-gray-700 text-sm font-bold whitespace-nowrap">
                        {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : "—"}
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100 text-sm font-bold text-black whitespace-nowrap">
                        {row.expo_name ? `${row.expo_name} ${row.expo_year || ""}`.trim() : getExpoLabel(row.expos_id)}
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100 font-bold text-gray-800 text-sm min-w-[240px] leading-relaxed">{row.primary_details.companyName}</td>
                      
                      {TABLE_COLS.map(col => (
                        <td key={col.key} className="px-6 py-4 border-r border-gray-100 min-w-fit whitespace-nowrap">
                          <ChangeCell fieldKey={col.key} record={row} />
                        </td>
                      ))}

                      <td className="px-6 py-4 text-gray-800 font-bold text-sm whitespace-nowrap">{row.employee_name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-10 py-4 bg-gray-50 border-t border-gray-200">
             <div className="text-sm font-bold text-gray-500">
                Rows per page: 
                <select 
                   value={pageSize} 
                   onChange={(e) => setPageSize(Number(e.target.value))}
                   className="ml-2 rounded-lg border border-gray-300 bg-white px-2 py-1 focus:outline-none cursor-pointer"
                >
                   {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>
             
             <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-gray-500">
                   Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                   <button 
                      onClick={() => goPage(page - 1)}
                      disabled={page === 1}
                      className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                   >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                   </button>
                   <button 
                      onClick={() => goPage(page + 1)}
                      disabled={page === totalPages}
                      className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                   >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>


      {viewRecord && (
        <DetailModal 
          row={viewRecord} 
          onClose={() => setViewRecord(null)} 
          onSave={() => handleApplyChanges(viewRecord)}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmType={confirmModal.confirmType}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

function DetailModal({ row, onClose, onSave }) {
  const [data, setData] = useState({ ...row });
  const [activeTab, setActiveTab] = useState(row.entity_idx || -1); 
  const changes = row.field_changes || {};

  const field = (label, masterKey) => {
    const isSub = activeTab !== -1;
    const baseObj = isSub ? (data.sub_entities?.[activeTab]?.data || {}) : (data.primary_details || {});
    const val = baseObj[masterKey];

    const isTargetEntity = activeTab === (row.entity_idx || -1);
    
    let changeKey = masterKey;
    if (masterKey === "mobile1") changeKey = "mobileNo";
    if (masterKey === "email1") changeKey = "emailId";
    
    const hasChange = isTargetEntity && changes[changeKey] && String(changes[changeKey].to).trim() !== String(changes[changeKey].from).trim();

    return (
      <div key={masterKey} className="flex flex-col gap-1.5 font-sans">
        <label className={`text-[13px] font-bold ml-1 font-sans ${hasChange ? 'text-red-600' : 'text-gray-800'}`}>
          {label} {hasChange && <span className="text-[10px] font-extrabold tracking-tighter leading-none ml-1 bg-red-600 text-white px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">Update</span>}
        </label>
        <div className="relative">
          <input
            readOnly
            value={val || ""}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all font-sans ${hasChange ? 'bg-red-50 border-2 border-red-500 text-red-700 shadow-[inset_0_2px_4px_rgba(220,38,38,0.05)]' : 'bg-gray-50 border border-gray-500 text-gray-900 opacity-60'}`}
          />
          {hasChange && (
            <div className="mt-1 px-1 flex items-center gap-1.5">
               <span className="text-[13px] font-black text-gray-700 ">Was: {String(changes[changeKey].from || "—")}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentEntityName = activeTab === -1 ? data.primary_details?.companyName : data.sub_entities?.[activeTab]?.data?.companyName;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-6 font-sans">
      <div className="bg-white rounded-3xl w-full max-w-6xl h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-[#111111]">
          <div className="flex flex-col gap-2 font-sans">
            <h2 className="text-white text-[15px] font-bold tracking-wide font-sans">{currentEntityName || "Review Update"}</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveTab(-1)} className={`px-5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${activeTab === -1 ? "bg-red-600 text-white shadow-lg shadow-red-500/30" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}>
                {data.primary_type || "Primary"}
              </button>
              {data.sub_entities?.map((sub, sIdx) => (
                <button key={sIdx} onClick={() => setActiveTab(sIdx)} className={`px-5 py-2 rounded-full text-[10px] font-bold tracking-widest transition-all ${activeTab === sIdx ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}>
                  {sub.type || "Secondary"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all text-xl font-sans">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-gray-50/50">
          <div className="space-y-10">
            <div className="flex items-center justify-between border-b border-gray-200 pb-6 font-sans">
              <div className="flex items-center gap-3">
                <span className={`w-1.5 h-6 rounded-full ${activeTab === -1 ? "bg-red-600" : "bg-blue-600"}`} />
                <h3 className="text-lg font-bold text-gray-900 font-sans">
                  {currentEntityName || "Lead Details"}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
              {field("Company Name", "companyName")}
              {field("Remarks", "remarks")}
              {field("Contact Person", "contactPerson")}
              {field("Designation", "designation")}
              {field("Mobile No 1", "mobile1")}
              {field("Mobile No 2", "mobile2")}
              {field("Email Id 1", "email1")}
              {field("Email Id 2", "email2")}
              {field("Address 1", "address1")}
              {field("City", "city")}
              {field("State", "state")}
              {field("Website", "website")}
              {field("Source", "source")}
              {field("Product Details", "productDetails")}
              {field("Segment", "segment")}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-white border-t border-gray-100 flex items-center justify-end gap-5">
            <button onClick={onClose} className="text-[11px] font-bold uppercase text-gray-400 hover:text-red-600 transition-colors tracking-widest font-sans">Discard</button>
            <button 
              onClick={onSave}
              className="px-12 py-3.5 rounded-full bg-black text-white font-bold text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all font-sans flex items-center gap-2"
            >
              Apply Updates
            </button>
        </div>
      </div>
    </div>
  );
}
