import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";
import { useConfirm } from "../../context/ConfirmContext";
import logoImg from "../../assets/images/logo.png";

// Assets
import PdfIcon from "../../assets/icons/pdfIcon.svg";
import ExcelIcon from "../../assets/icons/excelIcon.svg";

// ─── constants ────────────────────────────────────────────────────────────────
const BUSINESS_TYPES = ["Manufacturer", "Dealer", "Distributor"];

// ─── helpers ──────────────────────────────────────────────────────────────────
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

const fetchHistoryById = async (recordId) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
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
    const sorted = [...history].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    sorted.forEach((h) => {
      const expo = h.expoName || "General";
      const stage = h.followupStage || "Unspecified Status";
      if (!groups[expo]) groups[expo] = {};
      if (!groups[expo][stage]) groups[expo][stage] = [];
      groups[expo][stage].push(h);
    });
    return Object.entries(groups).map(([expo, stages]) => [expo, Object.entries(stages)]);
  }, [history]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-20">
          <div>
            <h2 className="text-xl text-black font-bold">{companyTitle}</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-black hover:bg-black hover:text-white transition-all cursor-pointer shadow-sm active:scale-95">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-8 py-8 bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-[5px] border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[14px] font-bold text-gray-800">Fetching history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-md font-bold">No history records found.</p>
            </div>
          ) : (
            <div className="space-y-12 pb-10">
              {groupedHistory.map(([expo, statusGroups], expoIdx) => (
                <div key={expo} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <div className="bg-white border-2 border-black px-6 py-2 rounded-full shadow-sm">
                      <span className="text-sm font-black uppercase tracking-[0.1em] text-black whitespace-nowrap">{expo}</span>
                    </div>
                    {expoIdx === 0 && (
                      <div className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md shrink-0">Latest Expo</div>
                    )}
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {statusGroups.map(([stage, items], stageIdx) => (
                      <div key={stage} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 flex flex-col overflow-hidden h-fit">
                        <div className="bg-black text-white px-8 py-3 flex items-center justify-center gap-3">
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
                                  <p className="font-normal text-sm tabular-nums">{h.contactNumber || h.mobile_no || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-sm font-semibold block leading-tight">Next Follow-up</span>
                                  <p className="font-normal text-sm">{h.nextFollowupDate ? fmt(h.nextFollowupDate) : "—"}</p>
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

const checkFollowupStatus = (exposArr, targetId) => {
  if (!exposArr || !Array.isArray(exposArr)) return false;
  const tId = String(targetId);
  return exposArr.some((entry) => {
    if (entry[tId] === 1 || entry[tId] === "1") return true;
    if (String(entry.expo_id) === tId && parseInt(entry.status) === 1)
      return true;
    return false;
  });
};

const TABLE_COLS = [
  { key: "contactPerson", label: "Contact Person" },
  { key: "designation", label: "Designation" },
  { key: "mobile1", label: "Mobile" },
  { key: "email1", label: "Email" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "segment", label: "Segment" },
  { key: "source", label: "Source" },
  { key: "website", label: "Website" },
  { key: "productDetails", label: "Product Details" },
  { key: "remarks", label: "Remarks" },
];

const RecordRow = ({
  rec,
  index,
  onDetail,
  selectedExpoId,
  isSelected,
  onToggleSelect,
  activeTab,
  startSNo,
  employees,
  onViewHistory,
}) => {
  const [activeIdx, setActiveIdx] = useState(-1);
  const mfr = rec.primary_details || {};
  const subs = rec.sub_entities || [];

  const currentData = activeIdx === -1 ? mfr : subs[activeIdx]?.data || {};
  const currentType =
    activeIdx === -1
      ? rec.primary_type || "Manufacturer"
      : subs[activeIdx]?.type || "—";

  const followTaken = checkFollowupStatus(
    rec.followup_taken_expos,
    selectedExpoId,
  );
  const eIdInt = parseInt(selectedExpoId);
  const assignedId = rec.assignments?.[`expo_${eIdInt}`];
  const assignedName =
    employees.find((e) => e.id == assignedId)?.name || rec.employee_name || "—";

  // Find effective date for this expo
  const effectiveDate = useMemo(() => {
    const expos = rec.expos_id || [];
    const found = expos.find((e) =>
      typeof e === "object" ? e.id === eIdInt : e === eIdInt,
    );
    return found && typeof found === "object" && found.timestamp
      ? found.timestamp
      : rec.created_at;
  }, [rec.created_at, rec.expos_id, eIdInt]);

  return (
    <tr
      className={`border-b border-gray-100 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-red-50/10 `}
    >
      <td className="px-4 py-3 border-r border-gray-100 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 accent-red-600 rounded cursor-pointer "
        />
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 font-mono border-r border-gray-100  ">
        {startSNo + index}
      </td>
      <td className="px-4 py-4 border-r border-gray-100 text-center ">
        <div className="flex flex-col gap-1.5 items-center">
          <button
            onClick={() => onViewHistory(rec)}
            className="px-3 py-1 bg-black text-white text-[9px]  rounded-full hover:bg-gray-800 transition-all cursor-pointer shadow-sm w-full"
          >
            HISTORY
          </button>
          <button
            onClick={() => onDetail(rec)}
            className="px-3 py-1 bg-red-600 text-white text-[9px]  rounded-full hover:bg-black transition-all cursor-pointer shadow-sm w-full"
          >
            VIEW
          </button>
        </div>
      </td>
      <td className="px-4 py-4 text-[13px] text-gray-500 whitespace-nowrap border-r border-gray-100  font-medium text-center">
        {fmt(effectiveDate)}
      </td>
      <td className="px-4 py-4 border-r border-gray-100 min-w-[220px] ">
        <div className="flex flex-col gap-2 ">
          {subs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveIdx(-1)}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all  ${activeIdx === -1 ? "bg-red-600 text-white border-red-600" : "bg-gray-100 text-gray-500 border-gray-200"}`}
              >
                Primary
              </button>
              {subs.map((_, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => setActiveIdx(sIdx)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all  ${activeIdx === sIdx ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                >
                  Sec
                </button>
              ))}
            </div>
          )}
          <span
            className={`font-bold text-[14px]  ${activeIdx === -1 ? "text-gray-900" : "text-blue-700"} truncate max-w-[200px] `}
            title={currentData.companyName}
          >
            {currentData.companyName || "—"}
          </span>
        </div>
      </td>
      <td className="px-4 py-4 border-r border-gray-100 text-center ">
        <span className={`text-[13px] font-bold text-black `}>
          {currentType}
        </span>
      </td>

      {activeTab === "all" && (
        <td className="px-4 py-4 border-r border-gray-100 text-center ">
          <span className={`text-[13px] font-bold text-nowrap `}>
            {followTaken ? "Followup Taken" : "Followup Pending"}
          </span>
        </td>
      )}
      {TABLE_COLS.map((c) => (
        <td
          key={c.key}
          className={`px-4 py-4 text-[14.5px] border-r border-gray-100 transition-colors  ${activeIdx === -1 ? "text-gray-700 font-medium" : "text-blue-600 font-semibold "}`}
        >
          {currentData[c.key] || "—"}
        </td>
      ))}
      <td className="px-5 py-4 border-r border-gray-100 text-center ">
        <span className="text-[14px] font-bold text-gray-900 whitespace-nowrap ">
          {assignedName}
        </span>
      </td>
    </tr>
  );
};

export default function MasterDataManagement() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const { confirm } = useConfirm();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [allRecords, setAllRecords] = useState([]);
  const [allocatedEmployees, setAllocatedEmployees] = useState([]);
  const [currentExpoName, setCurrentExpoName] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isInitializing, setIsInitializing] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchVal, setSearchVal] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [segmentList, setSegmentList] = useState([]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const [historyRecord, setHistoryRecord] = useState(null);
  const [showFilters, setShowFilters] = useState(true);

  const fetchEverything = async () => {
    startLoading();
    setIsInitializing(true);
    try {
      const eId = localStorage.getItem("utfi_current_expo_id");

      // 1. Fetch ALL Records (expo filtering is done client-side)
      const res = await fetch(
        `${API_BASE}/customer-data?all=1&page=1&pageSize=10000`,
        { headers: { "ngrok-skip-browser-warning": "69420" } },
      );
      const result = await res.json();
      if (result.success) setAllRecords(result.data || []);

      // 2. Fetch ALL employees for lookup
      const empRes = await fetch(`${API_BASE}/employee`, {
        headers: { "ngrok-skip-browser-warning": "69420" },
      });
      let allEmps = [];
      if (empRes.ok) {
        allEmps = await empRes.json();
      }

      // 3. Fetch Expo-wise allocations
      const expoRes = await fetch(`${API_BASE}/expos`, {
        headers: { "ngrok-skip-browser-warning": "69420" },
      });
      if (expoRes.ok) {
        const expoData = await expoRes.json();
        const currentExpo = expoData.find(
          (ex) => String(ex.id) === String(eId),
        );
        if (currentExpo) {
          setCurrentExpoName(localStorage.getItem("utfi_current_expo_name"));
          const allocatedIds = (
            typeof currentExpo.employees_allocated === "string"
              ? JSON.parse(currentExpo.employees_allocated || "[]")
              : currentExpo.employees_allocated || []
          ).map(String);

          const filtered = allEmps.filter((e) =>
            allocatedIds.includes(String(e.id)),
          );
          setAllocatedEmployees(
            filtered.sort((a, b) => a.name.localeCompare(b.name)),
          );
        } else {
          setAllocatedEmployees(
            allEmps.sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      } else {
        setAllocatedEmployees(
          allEmps.sort((a, b) => a.name.localeCompare(b.name)),
        );
      }

      // 4. Fetch Segments
      const segRes = await fetch(`${API_BASE}/segments?expos_id=${eId || ""}`, {
        headers: { "ngrok-skip-browser-warning": "69420" },
      });
      if (segRes.ok) {
        const segData = await segRes.json();
        if (Array.isArray(segData))
          setSegmentList(segData.map((s) => s.segment));
      }
    } catch (e) {
      showToast("Failed to load", "error");
    } finally {
      stopLoading();
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    fetchEverything();
  }, []);

  const { filteredData, counts } = useMemo(() => {
    let data = [...allRecords];
    const eId = localStorage.getItem("utfi_current_expo_id");
    const eIdInt = parseInt(eId);

    // Filter to only records belonging to the current expo
    data = data.filter((r) => {
      const expoArr = r.expos_id || [];
      return expoArr.some((e) =>
        typeof e === "object" ? e.id === eIdInt : parseInt(e) === eIdInt
      );
    });

    if (filterEmployeeId)
      data = data.filter(
        (r) =>
          (r.assignments && r.assignments[`expo_${eId}`] == filterEmployeeId) ||
          r.employee_id == filterEmployeeId,
      );
    if (searchVal) {
      const s = searchVal.toLowerCase();
      data = data.filter((r) => {
        const p = r.primary_details || {};
        const ss = (r.sub_entities || [])
          .map((se) => se.data?.companyName || "")
          .join(" ")
          .toLowerCase();
        return (
          (p.companyName || "").toLowerCase().includes(s) ||
          (p.contactPerson || "").toLowerCase().includes(s) ||
          (p.mobile1 || "").toLowerCase().includes(s) ||
          ss.includes(s)
        );
      });
    }
    if (filterStartDate)
      data = data.filter((r) => r.created_at >= filterStartDate);
    if (filterEndDate)
      data = data.filter((r) => r.created_at <= filterEndDate + "T23:59:59");

    const takenCount = data.filter((r) =>
      checkFollowupStatus(r.followup_taken_expos, eId),
    ).length;
    const pendingCount = data.length - takenCount;

    let finalData = data;
    if (activeTab === "taken")
      finalData = data.filter((r) =>
        checkFollowupStatus(r.followup_taken_expos, eId),
      );
    else if (activeTab === "not_taken")
      finalData = data.filter(
        (r) => !checkFollowupStatus(r.followup_taken_expos, eId),
      );

    return {
      filteredData: finalData,
      counts: { all: data.length, taken: takenCount, pending: pendingCount },
    };
  }, [
    allRecords,
    activeTab,
    searchVal,
    filterEmployeeId,
    filterStartDate,
    filterEndDate,
  ]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchVal, filterEmployeeId, filterStartDate, filterEndDate]);

  const handleSmartSelect = (type) => {
    if (type === "page") setSelectedIds(paginatedData.map((r) => r.id));
    else if (type === "50")
      setSelectedIds(filteredData.slice(0, 50).map((r) => r.id));
    else if (type === "all") setSelectedIds(filteredData.map((r) => r.id));
    else setSelectedIds([]);
  };

  const handleUpdate = async (updatedRec) => {
    startLoading();
    try {
      const resp = await fetch(`${API_BASE}/customer-data`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: updatedRec.id,
          primary_type: updatedRec.primary_type,
          primary_details: updatedRec.primary_details,
          sub_entities: updatedRec.sub_entities,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        showToast("Updated successfully!");
        setEditRecord(null);
        // Update local state instead of refetching
        setAllRecords((prev) =>
          prev.map((r) =>
            r.id === updatedRec.id ? { ...r, ...updatedRec } : r,
          ),
        );
      }
    } catch (e) {
      showToast("Update failed", "error");
    } finally {
      stopLoading();
    }
  };

  const handleBulkDeactivate = async (idList = selectedIds) => {
    // If idList is an event object (e.g. from onClick={handleBulkDeactivate}), use selectedIds instead
    const finalIds = Array.isArray(idList) ? idList : selectedIds;
    if (finalIds.length === 0) return;
    
    const isConfirmed = await confirm({
      title: "Delete Records",
      message: `Are you sure you want to delete ${finalIds.length} selected record(s) for this exhibition?`,
      type: "danger",
      confirmText: "Delete",
    });

    if (!isConfirmed) return;

    startLoading();
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const userId = userData.user?.id || "Admin";

    try {
      const eId = localStorage.getItem("utfi_current_expo_id") || "";
      const res = await fetch(
        `${API_BASE}/customer-data?ids=${finalIds.join(",")}&expo_id=${eId}&deletedBy=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Records deleted successfully");
        fetchEverything();
        setSelectedIds([]); // Clear selection
        if (finalIds.length === 1) setEditRecord(null);
      } else {
        showToast(data.message || "Failed to delete records", "error");
      }
    } catch (e) {
      showToast("An error occurred during deletion", "error");
    } finally {
      stopLoading();
    }
  };

  const prepareExportData = () => {
    const eId = localStorage.getItem("utfi_current_expo_id");
    let rows = [];
    let sNo = 1;
    filteredData.forEach((rec) => {
      const subs = rec.sub_entities || [];
      const ft = checkFollowupStatus(rec.followup_taken_expos, eId);
      const aid = rec.assignments?.[`expo_${eId}`];
      const anm =
        allocatedEmployees.find((e) => e.id == aid)?.name ||
        rec.employee_name ||
        "—";
      const prim = rec.primary_details || {};
      const curSNo = sNo++;
      const curEmp = anm;
      const curFol = ft ? "Followup Taken" : "Followup Pending";
      rows.push({
        "S.No": curSNo,
        "Employee Name": curEmp,
        "Followup Status": curFol,
        "Company Name": prim.companyName || "—",
        "Entity Type": "Primary",
        "Business Type": rec.primary_type || "Manufacturer",
        "Contact Person": prim.contactPerson || "—",
        Designation: prim.designation || "—",
        Mobile: prim.mobile1 || "—",
        Email: prim.email1 || "—",
        City: prim.city || "—",
        State: prim.state || "—",
        Segment: prim.segment || "—",
        Source: prim.source || "—",
        Remarks: prim.remarks || "—",
        isPrimary: true,
        spanCount: 1 + subs.length,
      });
      subs.forEach((sub) => {
        const sd = sub.data || {};
        rows.push({
          "S.No": "",
          "Employee Name": "",
          "Followup Status": "",
          "Company Name": sd.companyName || prim.companyName || "—",
          "Entity Type": "Secondary",
          "Business Type": sub.type || "—",
          "Contact Person": sd.contactPerson || "—",
          Designation: sd.designation || "—",
          Mobile: sd.mobile1 || "—",
          Email: sd.email1 || "—",
          City: sd.city || "—",
          State: sd.state || "—",
          Segment: sd.segment || "—",
          Source: sd.source || "—",
          Remarks: sd.remarks || "—",
          isPrimary: false,
        });
      });
    });
    return rows;
  };

  const handleExportExcel = () => {
    const rawData = prepareExportData();
    if (rawData.length === 0) return showToast("No data", "info");
    const exportRows = [];
    let lastSpanned = {};
    rawData.forEach((row) => {
      const flat = {};
      Object.entries(row).forEach(([k, v]) => {
        if (v && typeof v === "object" && "content" in v) {
          flat[k] = v.content;
          lastSpanned[k] = v.content;
        } else if (v === "" && lastSpanned[k] !== undefined) {
          flat[k] = lastSpanned[k];
        } else {
          flat[k] = v;
        }
      });
      delete flat.isPrimary;
      delete flat.spanCount;
      exportRows.push(flat);
    });
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    const merges = [];
    let excelIdx = 1;
    rawData.forEach((r) => {
      if (r.isPrimary && r.spanCount > 1) {
        for (let c = 0; c <= 2; c++)
          merges.push({
            s: { r: excelIdx, c: c },
            e: { r: excelIdx + r.spanCount - 1, c: c },
          });
      }
      excelIdx++;
    });
    ws["!merges"] = merges;
    XLSX.utils.book_append_sheet(wb, ws, "Export");
    const safeExpoName = (currentExpoName || "Export").replace(
      /[^a-z0-9]/gi,
      "_",
    );
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `${safeExpoName}_${dateStr}.xlsx`);
  };

  const handleExportPDF = async () => {
    const rawData = prepareExportData();
    if (rawData.length === 0) return showToast("No data", "info");
    const doc = new jsPDF("l", "pt", "a2");

    // Helper to load image as base64 or image object
    const loadImg = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      });
    };

    const logo = await loadImg(logoImg);
    if (logo) {
      doc.addImage(logo, "PNG", 40, 20, 0, 50);
    }

    // Add Expo Name / Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.setTextColor(232, 28, 33); // Brand Red
    doc.text(
      currentExpoName || "Master Data",
      doc.internal.pageSize.getWidth() / 2,
      50,
      { align: "center" },
    );

    // Metadata Right
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Exported: ${new Date().toLocaleDateString("en-IN")}`,
      doc.internal.pageSize.getWidth() - 40,
      50,
      { align: "right" },
    );

    const headerKeys = Object.keys(rawData[0]).filter(
      (k) => k !== "isPrimary" && k !== "spanCount",
    );
    const body = rawData.map((r) =>
      r.isPrimary
        ? headerKeys.map((k) => r[k])
        : headerKeys.slice(3).map((k) => r[k]),
    );
    let bIdx = 0;
    rawData.forEach((r) => {
      if (r.isPrimary && r.spanCount > 1) {
        for (let c = 0; c <= 2; c++)
          body[bIdx][c] = { content: body[bIdx][c], rowSpan: r.spanCount };
      }
      bIdx++;
    });

    autoTable(doc, {
      head: [headerKeys],
      body: body,
      startY: 90,
      styles: { fontSize: 14, cellPadding: 8, halign: "center" },
      headStyles: {
        fillColor: [30, 30, 30],
        fontSize: 16,
        fontStyle: "bold",
        textColor: [255, 255, 255],
      },
      theme: "grid",
    });

    const safeExpoName = (currentExpoName || "Export").replace(
      /[^a-z0-9]/gi,
      "_",
    );
    const dateStr = new Date().toISOString().split("T")[0];
    doc.save(`${safeExpoName}_${dateStr}.pdf`);
  };

  const renderPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setPage(i)}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold  ${page === i ? "bg-red-600 text-white shadow-md shadow-red-200" : "bg-white text-gray-500 border border-gray-200"}`}
        >
          {i}
        </button>,
      );
    }
    return pages;
  };

  return (
    <div className="min-h-screen  bg-[#fafafa]">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm relative">
        {/* Row 1: Back + Title + Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-full text-black bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer shadow-sm border border-gray-200 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-1 h-7 rounded-full bg-[#e81c21] shrink-0" />
          <h1 className="text-lg md:text-xl text-gray-900 shrink-0">Master Data</h1>
          <button
            onClick={fetchEverything}
            title="Refresh Data"
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-[#e81c21] transition-all cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* {currentExpoName && (
            <span className="hidden md:block text-[18px] md:text-[22px] text-[#ff3b3a] tracking-[0.1em] drop-shadow-sm uppercase mx-auto">
              {currentExpoName}
            </span>
          )} */}

          <div className="flex items-center gap-2 ml-auto">
            {/* Export buttons — desktop only in header */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-all font-bold text-sm cursor-pointer"
              >
                <span>Export Excel</span>
                <img src={ExcelIcon} alt="Excel" className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all font-bold text-sm cursor-pointer"
              >
                <span>Export PDF</span>
                <img src={PdfIcon} alt="PDF" className="w-4 h-4" />
              </button>
            </div>
            {/* Search */}
            <div className="relative w-36 sm:w-52 md:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search records..."
                className="w-full bg-gray-50 border border-gray-200 rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center gap-1 px-3 py-2 rounded-full bg-black text-white text-xs font-bold shrink-0"
            >
              {showFilters ? "Hide" : "Filters"}
              <svg className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
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

        {/* Filter row */}
        <div className={`mt-4 transition-all duration-300 overflow-hidden ${showFilters ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 md:max-h-[1000px] md:opacity-100"}`}>
          {/* Mobile export buttons */}
          <div className="md:hidden flex gap-2 mb-3">
            <button onClick={handleExportExcel} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-600 border border-green-200 font-bold text-xs">
              <img src={ExcelIcon} className="w-4 h-4" /> <span>Export Excel</span>
            </button>
            <button onClick={handleExportPDF} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 font-bold text-xs">
              <img src={PdfIcon} className="w-4 h-4" /> <span>Export PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:flex md:flex-wrap items-end gap-3">
            {/* Employee filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] md:text-[15px] font-bold text-gray-800 ml-1">Employee</span>
              <select
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
                className="w-full md:min-w-[160px] px-3 md:px-4 py-2.5 rounded-full border border-gray-200 bg-white text-[13px] outline-none cursor-pointer hover:border-red-400 transition-colors"
              >
                <option value="">Select employee</option>
                {allocatedEmployees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] md:text-[15px] font-bold text-gray-800 ml-1">From date</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-3 md:px-5 py-2.5 rounded-full border border-gray-200 text-[13px] outline-none hover:border-red-400 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={`text-[13px] md:text-[15px] ml-1 font-bold ${!filterStartDate ? "text-gray-300" : "text-gray-800"}`}>To date</span>
              <input
                disabled={!filterStartDate}
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className={`w-full px-3 md:px-5 py-2.5 rounded-full border border-gray-200 text-[13px] outline-none hover:border-red-400 transition-colors ${!filterStartDate ? "bg-gray-50 opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>

            {/* Per page */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] md:text-[15px] font-bold text-gray-800 ml-1">Per page</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                className="w-full md:min-w-[100px] px-3 md:px-4 py-2.5 rounded-full border border-gray-200 bg-white text-[13px]"
              >
                {[10, 25, 50, 100, 250].map((v) => (
                  <option key={v} value={v}>{v} Rows</option>
                ))}
              </select>
            </div>

            {/* Tabs */}
            <div className="col-span-2 md:col-span-1 flex flex-wrap items-center gap-1.5 md:ml-auto mt-1 md:mt-0">
              {[
                { id: "all", label: "All", count: counts.all },
                { id: "taken", label: "Followup Taken", count: counts.taken },
                { id: "not_taken", label: "Followup Pending", count: counts.pending },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all shadow-sm ${activeTab === t.id ? "bg-black text-white" : "bg-white text-gray-400 border border-gray-200 hover:border-gray-400 cursor-pointer"}`}
                >
                  {t.label} ({t.count})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 pb-24">
        <div className="bg-white rounded-xl md:rounded-3xl shadow-sm border border-gray-200 flex flex-col min-h-[50vh] overflow-hidden">
          <div className="px-4 md:px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[15px] font-bold text-gray-700  mr-1">
                Select all:
              </span>
              <button
                onClick={() => handleSmartSelect("page")}
                className="whitespace-nowrap px-4 py-2 rounded-lg bg-white border border-gray-200 text-[13px] font-bold hover:shadow-md transition-all"
              >
                Page
              </button>
              <button
                onClick={() => handleSmartSelect("50")}
                className="whitespace-nowrap px-4 py-2 rounded-lg bg-white border border-gray-200 text-[13px] font-bold hover:shadow-md transition-all"
              >
                Top 50
              </button>
              <button
                onClick={() => handleSmartSelect("all")}
                className="whitespace-nowrap px-4 py-2 rounded-lg bg-white border border-gray-200 text-[13px] font-bold hover:shadow-md transition-all"
              >
                All Result ({filteredData.length})
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="whitespace-nowrap px-4 py-2 rounded-lg text-[14px]  text-red-600 hover:bg-red-50 transition-all"
              >
                Clear
              </button>
            </div>
            {selectedIds.length > 0 && (
              <button
                onClick={() => handleBulkDeactivate()}
                className="w-full md:w-auto px-6 py-2.5 rounded-full bg-red-600 text-white text-[11px]  uppercase shadow-xl  "
              >
                Delete {selectedIds.length}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-x-auto">
            {!isInitializing && (
              <table className="w-full text-sm border-collapse text-left   ">
                <thead className="bg-[#111111] text-white   ">
                  <tr>
                    <th className="px-4 py-4 w-10 text-center border-r border-white/5 ">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length > 0 &&
                          paginatedData.every((r) => selectedIds.includes(r.id))
                        }
                        onChange={(e) =>
                          handleSmartSelect(e.target.checked ? "page" : "none")
                        }
                        className="w-4 h-4 accent-red-600 rounded cursor-pointer "
                      />
                    </th>
                    <th className="px-4 py-4 text-[14px] whitespace-nowrap font-bold text-center border-r border-white/5 ">
                      S.No
                    </th>
                    <th className="px-4 py-4 text-[14px] whitespace-nowrap font-bold text-center border-r border-white/5 ">
                      Action
                    </th>
                    <th className="px-4 py-4 text-[14px] whitespace-nowrap font-bold text-center border-r border-white/5  whitespace-nowrap">
                      Entry Date
                    </th>
                    <th className="px-4 py-4 text-[14px] whitespace-nowrap font-bold border-r border-white/5 ">
                      Company
                    </th>
                    <th className="px-4 py-4 text-[14px] whitespace-nowrap font-bold text-center border-r border-white/5 ">
                      Type of business
                    </th>
                    {activeTab === "all" && (
                      <th className="px-4 py-4 text-[14px] whitespace-nowrap font-bold text-center border-r border-white/5 ">
                        Status
                      </th>
                    )}
                    {TABLE_COLS.map((c) => (
                      <th
                        key={c.key}
                        className="px-4 py-4 border-r border-white/5 text-[14px] whitespace-nowrap font-bold whitespace-nowrap px-4 "
                      >
                        {c.label}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-[14px] whitespace-nowrap font-bold text-center border-r border-white/5 ">
                      Employee
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={20}
                        className="p-20 text-center text-gray-300 italic"
                      >
                        No matches found.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((rec, i) => (
                      <RecordRow
                        key={rec.id}
                        rec={rec}
                        index={i}
                        startSNo={(page - 1) * pageSize + 1}
                        selectedExpoId={localStorage.getItem(
                          "utfi_current_expo_id",
                        )}
                        isSelected={selectedIds.includes(rec.id)}
                        onToggleSelect={() =>
                          setSelectedIds((prev) =>
                            prev.includes(rec.id)
                              ? prev.filter((mid) => mid !== rec.id)
                              : [...prev, rec.id],
                          )
                        }
                        onDetail={(r) => {
                          setEditRecord(JSON.parse(JSON.stringify(r)));
                        }}
                        activeTab={activeTab}
                        employees={allocatedEmployees}
                        onViewHistory={(r) => setHistoryRecord(r)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-6 py-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 bg-white mt-auto">
            <div className="text-center md:text-left">
              <span className="text-[13px] font-bold text-gray-900 block">
                Total: {filteredData.length}
              </span>
              <p className="text-[10px] font-medium text-gray-400">
                Rows {(page - 1) * pageSize + 1} -{" "}
                {Math.min(page * pageSize, filteredData.length)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
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
              <div className="flex items-center gap-1 ">
                {renderPageNumbers()}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center  "
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {editRecord && (
        <DetailModal
          row={editRecord}
          segmentList={segmentList}
          onClose={() => setEditRecord(null)}
          onSave={handleUpdate}
          onDelete={(id) => handleBulkDeactivate([id])}
        />
      )}
      {historyRecord && (
        <HistoryModal record={historyRecord} onClose={() => setHistoryRecord(null)} />
      )}
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } . { font-family: 'Inter', sans-serif; } `}</style>
    </div>
  );
}

function DetailModal({ row, segmentList, onClose, onSave, onDelete }) {
  const [data, setData] = useState({ ...row });
  const [activeTab, setActiveTab] = useState(-1); // -1 for primary

  const updPrimary = (f, v) => {
    setData((prev) => ({
      ...prev,
      primary_details: { ...prev.primary_details, [f]: v },
    }));
  };
  const updSub = (idx, f, v) => {
    const next = [...(data.sub_entities || [])];
    next[idx] = { ...next[idx], data: { ...next[idx].data, [f]: v } };
    setData((prev) => ({ ...prev, sub_entities: next }));
  };

  const field = (label, key, isSub = false, index = 0) => {
    const val = isSub
      ? data.sub_entities[index].data[key]
      : data.primary_details[key];
    const onChange = (v) =>
      isSub ? updSub(index, key, v) : updPrimary(key, v);

    return (
      <div key={key} className="flex flex-col gap-1.5">
        <label className="text-[14px] font-bold text-gray-800 ml-1">
          {label}
        </label>
        <input
          value={val || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-500 text-[14px]  text-gray-900 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-600 transition-all   "
        />
      </div>
    );
  };

  const currentEntityName =
    activeTab === -1
      ? data.primary_details.companyName
      : data.sub_entities[activeTab].data.companyName;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-6   ">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl  ">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-[#111111]  ">
          <div className="flex items-center gap-4  ">
            <h2 className="text-white text-[15px]   ">
              {currentEntityName || "Update Lead"}
            </h2>
            <div className="flex items-center gap-2 ">
              <button
                onClick={() => setActiveTab(-1)}
                className={`px-5 py-2 rounded-full text-[13px]   transition-all ${activeTab === -1 ? "bg-red-600 text-white shadow-lg shadow-red-500/30" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}
              >
                {data.primary_type || "Primary"}
              </button>
              {data.sub_entities?.map((sub, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => setActiveTab(sIdx)}
                  className={`px-5 py-2 rounded-full text-[10px]   transition-all ${activeTab === sIdx ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}
                >
                  {sub.type || "Secondary"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all text-xl  "
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-gray-50/50   ">
          <div className="space-y-10">
            <div className="flex items-center justify-between border-b border-gray-200 pb-6 ">
              <div className="flex items-center gap-3 ">
                <span
                  className={`w-1.5 h-6 rounded-full ${activeTab === -1 ? "bg-red-600   " : "bg-blue-600"}`}
                />
                <h3 className="text-lg font-bold text-gray-900 ">
                  {currentEntityName || "Lead Details"}
                </h3>
              </div>
              <select
                value={
                  activeTab === -1
                    ? data.primary_type
                    : data.sub_entities[activeTab].type
                }
                onChange={(e) => {
                  if (activeTab === -1)
                    setData({ ...data, primary_type: e.target.value });
                  else {
                    const next = [...data.sub_entities];
                    next[activeTab].type = e.target.value;
                    setData({ ...data, sub_entities: next });
                  }
                }}
                className="px-6 py-2.5 rounded-full border border-gray-500 text-[13px]  bg-white outline-none cursor-pointer hover:border-black transition-colors   "
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ">
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

              <div className="flex flex-col gap-1.5 ">
                <label className="text-[13px] font-bold text-gray-800 ml-1 ">
                  Segment
                </label>
                <select
                  value={
                    (activeTab === -1
                      ? data.primary_details.segment
                      : data.sub_entities[activeTab].data.segment) || ""
                  }
                  onChange={(e) => {
                    if (activeTab === -1) updPrimary("segment", e.target.value);
                    else updSub(activeTab, "segment", e.target.value);
                  }}
                  className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-500 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-600 transition-all  cursor-pointer "
                >
                  <option value="">-- Select --</option>
                  {segmentList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-white border-t border-gray-100 flex items-center justify-between ">
          <div className="hidden sm:block">
            <p className="text-[10px] font-medium text-gray-400 ">
              Database Entry: {fmtTime(data.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-4 ml-auto  ">
            <button
              onClick={() => onDelete(data.id)}
              className="px-6 py-3.5 rounded-full border-2 border-red-50 text-red-600 font-extrabold text-[14px]   hover:bg-red-50 hover:border-red-200 transition-all active:scale-95 "
            >
              Delete Record
            </button>
            <button
              onClick={onClose}
              className="text-[14px]   text-gray-400 hover:text-red-600 transition-colors  "
            >
              Discard
            </button>
            <button
              onClick={() => onSave(data)}
              className="px-10 py-3.5 rounded-full bg-black text-white  text-[14px]   shadow-xl active:scale-95 transition-all "
            >
              Update Lead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
