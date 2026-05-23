import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "../../assets/images/logo.png";

import Calendar from "../../assets/icons/calendar.svg";
import PdfIcon from "../../assets/icons/pdfIcon.svg";
import ExcelIcon from "../../assets/icons/excelIcon.svg";

import { useLoading } from "../../context/LoadingContext";

// ─── helpers ─────────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const fetchAllFollowups = async (exposId) => {
  const queryParams = { pending: 1, all: 1, userRole: "Admin" };
  if (exposId) queryParams.exposId = exposId;

  const query = new URLSearchParams(queryParams).toString();
  try {
    const res = await fetch(`${API_BASE_URL}/customer-followup?${query}`, {
      headers: { "ngrok-skip-browser-warning": "69420" },
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
};

const fetchHistoryById = async (recordId) => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/customer-followup?recordId=${recordId}`,
      {
        headers: { "ngrok-skip-browser-warning": "69420" },
      },
    );
    const result = await res.json();
    return result.success ? result.data : [];
  } catch {
    return [];
  }
};

const fmtDate = (iso) => {
  if (!iso || iso.startsWith("0000")) return "—";
  try {
    const normalized = iso.replace(" ", "T");
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

// ─── Standard followup table columns ─────────────────────────────────────────
const TABLE_COLS = [
  { key: "employeeName", label: "Employee" },
  { key: "companyName", label: "Company Name" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "website", label: "Website" },
  { key: "contactPerson", label: "Contact Person" },
  { key: "mobile1", label: "Mobile" },
  { key: "designation", label: "Designation" },
  { key: "email1", label: "Email" },
  { key: "segment", label: "Segment" },
  { key: "entity_type", label: "Type of Business" },
  { key: "source", label: "Source" },
  { key: "productDetails", label: "Product Details" },
  { key: "remarks", label: "Remarks" },
];

// ─── Confirmed list columns ───────────────────────────────────────────────────
const CONFIRMED_COLS = [
  { label: "Employee", get: (mfr, reg, rec) => rec.employeeName || "—" },
  { label: "Company Name", get: (mfr, reg) => mfr.companyName || "—" },
  {
    label: "Exhibitor Name",
    get: (mfr, reg) => reg.exhibitorName || mfr.companyName || "—",
  },
  { label: "Facia Name", get: (mfr, reg) => reg.faciaName || "—" },
  {
    label: "Contact Person",
    get: (mfr, reg) => reg.contactPerson || mfr.contactPerson || "—",
  },
  {
    label: "Contact Number",
    get: (mfr, reg) => reg.contactNumber || mfr.mobile1 || "—",
  },
  { label: "City", get: (mfr, reg) => reg.city || mfr.city || "—" },
  { label: "State", get: (mfr, reg) => reg.state || mfr.state || "—" },
  { label: "Country", get: (mfr, reg) => reg.country || mfr.country || "—" },
  { label: "Source", get: (mfr, reg) => reg.source || mfr.source || "—" },
  { label: "Segment", get: (mfr, reg) => reg.segment || mfr.segment || "—" },
  { label: "Stall No", get: (mfr, reg) => reg.stallNo || "—" },
  { label: "Stall Size", get: (mfr, reg) => reg.stallSize || "—" },
  { label: "Remarks", get: (mfr, reg) => reg.remarks || "—" },
  {
    label: "Payment Status",
    get: (mfr, reg) => reg.paymentStatus || "—",
    render: (val) =>
      val === "—" ? (
        <span className="text-gray-300">—</span>
      ) : (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            val === "Full amount received"
              ? "text-gray-700"
              : val === "Partially received"
                ? "text-gray-700"
                : "text-gray-700"
          }`}
        >
          {val}
        </span>
      ),
  },
];

const FILTER_FIELDS = [
  { key: "companyName", label: "Company Name" },
  { key: "contactPerson", label: "Contact Person" },
  { key: "city", label: "City" },
  { key: "segment", label: "Segment" },
  { key: "source", label: "Source" },
];

const IcoTeleCall = () => (
  <svg
    className="w-3.5 h-3.5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);
const IcoSiteVisit = () => (
  <svg
    className="w-3.5 h-3.5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination = ({ page, totalPages, goPage, total, pageSize }) => {
  if (total === 0 || totalPages <= 0) return null;
  const buildPages = () => {
    const delta = 2;
    let start = Math.max(1, page - delta);
    let end = Math.min(totalPages, page + delta);
    if (end - start < delta * 2) {
      if (start === 1) end = Math.min(totalPages, start + delta * 2);
      else start = Math.max(1, end - delta * 2);
    }
    const items = [];
    if (start > 1) {
      items.push({ type: "num", val: 1 });
      if (start > 2) items.push({ type: "ellipsis", val: "s" });
    }
    for (let p = start; p <= end; p++) items.push({ type: "num", val: p });
    if (end < totalPages) {
      if (end < totalPages - 1) items.push({ type: "ellipsis", val: "e" });
      items.push({ type: "num", val: totalPages });
    }
    return items;
  };

  const btnBase =
    "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold border transition-all cursor-pointer";
  const btnNav = `${btnBase} text-gray-500 border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed`;
  const btnNum = `${btnBase} text-gray-600 border-gray-200 hover:bg-gray-100`;
  const btnActive = `${btnBase} text-white border-transparent shadow-sm`;
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between px-5 py-4 border-t border-gray-100 gap-3 bg-white">
      <p className="text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-700">{from}</span>–
        <span className="font-semibold text-gray-700">{to}</span> of{" "}
        <span className="font-semibold text-gray-700">{total}</span> records
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goPage(1)}
          disabled={page === 1}
          className={btnNav}
        >
          «
        </button>
        <button
          onClick={() => goPage(page - 1)}
          disabled={page === 1}
          className={btnNav}
        >
          ‹
        </button>
        {buildPages().map((item, idx) =>
          item.type === "ellipsis" ? (
            <span key={`e${item.val}`} className="px-1 text-gray-400 text-xs">
              …
            </span>
          ) : (
            <button
              key={item.val}
              onClick={() => goPage(item.val)}
              className={item.val === page ? btnActive : btnNum}
              style={item.val === page ? { background: "#1cb8c8" } : {}}
            >
              {item.val}
            </button>
          ),
        )}
        <button
          onClick={() => goPage(page + 1)}
          disabled={page === totalPages}
          className={btnNav}
        >
          ›
        </button>
        <button
          onClick={() => goPage(totalPages)}
          disabled={page === totalPages}
          className={btnNav}
        >
          »
        </button>
      </div>
    </div>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ record, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchHistoryById(record.id).then((data) => {
      const mapped = data.map((h) => ({
        ...h,
        expoName:
          `${h.expo_name || ""} ${h.expo_year || ""}`.trim() || (h.expos_id ? `Expo #${h.expos_id}` : "Unknown Expo"),
      }));
      const sorted = mapped.sort(
        (a, b) =>
          new Date((b.submitted_at || "").replace(" ", "T")) -
          new Date((a.submitted_at || "").replace(" ", "T")),
      );
      setHistory(sorted);
      setLoading(false);
    });
  }, [record.id]);
  const mfr = record.manufacturer || {};
  const groupedHistory = useMemo(() => {
    const groups = {};
    history.forEach((h) => {
      const eName = h.expoName || (h.expos_id ? `Expo #${h.expos_id}` : "Unknown Expo");
      if (!groups[eName]) groups[eName] = [];
      groups[eName].push(h);
    });
    return Object.entries(groups);
  }, [history]);
  const headers = [
    "S.No",
    "Followup Date",
    "Company Name",
    "Category",
    "Type",
    "Contact Person",
    "Mobile",
    "Remarks",
    "Next Followup Date",
    "Status",
    "F-Mode",
  ];

  const subEntities = record.sub_entities || [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">
            Followup History — {record.companyName || mfr.companyName || "—"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:opacity-80 transition-all shadow-md"
            style={{ background: "#e81c21" }}
          >
            ✕
          </button>
        </div>
        <div className="overflow-auto flex-1 p-8 bg-gray-50/20 font-sans">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-cyan-100 border-t-cyan-500 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm italic">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">
              No follow-up records yet.
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {groupedHistory.map(([expo, items], gIdx) => (
                <div key={expo} className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-gray-200" />
                    <div className="bg-white border-[1px] border-black px-6 py-1.5 rounded-full shadow-sm">
                      <span className="text-[12px] font-black uppercase tracking-[0.15em] text-black italic">
                        {expo}
                      </span>
                    </div>
                    {gIdx === 0 && (
                      <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                        Latest Expo
                      </span>
                    )}
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
                    <table className="w-full text-sm border-collapse min-w-[1100px]">
                      <thead>
                        <tr className="bg-[#1a1a1a] text-white whitespace-nowrap">
                          {headers.map((h) => (
                            <th
                              key={h}
                              className="text-left px-5 py-3 font-bold text-white border-r border-white/10 text-[11px] uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((h, i) => {
                          const stage = h.followup_stage || h.followupStage;
                          const nextDate =
                            stage === "Confirmed"
                              ? ""
                              : h.next_followup_date || h.nextFollowupDate;
                          const fmode =
                            h.next_follow_reason || h.nextFollowReason || "—";
                          return (
                            <tr
                              key={i}
                              className="border-b border-gray-100 last:border-0 hover:bg-red-50/20 transition-all font-sans"
                            >
                              <td className="px-5 py-4 border-r border-gray-100 text-center text-gray-400 text-[10px] font-mono leading-none">
                                {i + 1}
                              </td>
                              <td className="px-5 py-4 border-r border-gray-100 whitespace-nowrap text-gray-800 text-xs italic">
                                {fmtDate(h.submitted_at || h.submittedAt)}
                              </td>
                              <td className="px-5 py-4 border-r border-gray-100 text-gray-800 text-xs italic">
                                {(() => {
                                  const hIdx = parseInt(h.entity_idx ?? -1);
                                  if (hIdx !== -1 && subEntities[hIdx]) {
                                    return subEntities[hIdx].data?.companyName || mfr.companyName || "—";
                                  }
                                  return mfr.companyName || "—";
                                })()}
                              </td>
                              <td className="px-5 py-4 border-r border-gray-100 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter text-white whitespace-nowrap ${(h.entity_type || h.entityType) === "Dealer" ? "bg-blue-600" : (h.entity_type || h.entityType) === "Distributor" ? "bg-purple-600" : "bg-black"}`}
                                >
                                  {h.entity_type || h.entityType || "Mfr"}
                                </span>
                              </td>
                              <td className="px-5 py-4 border-r border-gray-100 text-gray-800 text-xs italic">
                                {h.contact_person || h.contactPerson || "—"}
                              </td>
                              <td className="px-5 py-4 border-r border-gray-100 text-gray-700 text-xs italic whitespace-nowrap">
                                {h.mobile_no || h.mobileNo || "—"}
                              </td>
                              <td
                                className="px-5 py-4 border-r border-gray-100 text-gray-600 text-xs italic leading-relaxed max-w-[250px] truncate"
                                title={h.remarks}
                              >
                                {h.remarks || "—"}
                              </td>
                              <td
                                className={`px-5 py-4 border-r border-gray-100 whitespace-nowrap text-xs italic ${nextDate ? "text-red-500" : "text-gray-400"}`}
                              >
                                {fmtDate(nextDate)}
                              </td>
                              <td className="px-5 py-4 border-r border-gray-100">
                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${stage === "Confirmed" ? "bg-green-100 text-green-700" : stage === "Not Interested" ? "bg-red-100 text-red-700" : stage === "Prospective" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}
                                >
                                  {stage || "—"}
                                </span>
                              </td>
                              <td className="px-5 py-4 italic font-bold">
                                <div className="flex items-center gap-1.5">
                                  {fmode === "Tele Call" ? (
                                    <IcoTeleCall />
                                  ) : fmode === "Site Visit" ? (
                                    <IcoSiteVisit />
                                  ) : null}
                                  <span className="text-gray-500 text-[11px] whitespace-nowrap italic">
                                    {fmode}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
export default function AdminFollowupReports() {
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [expos, setExpos] = useState([]);
  const [selectedExpoId, setSelectedExpoId] = useState(
    localStorage.getItem("utfi_current_expo_id") || "",
  );
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [activeNav, setActiveNav] = useState("followup");
  const [reasonFilter, setReasonFilter] = useState("");
  const [filterField, setFilterField] = useState("");
  const [filterVal, setFilterVal] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailRecord, setDetailRecord] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/employee`, {
        headers: { "ngrok-skip-browser-warning": "69420" },
      });
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
    } catch {}
  };

  const fetchExposlist = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/expos`, {
        headers: { "ngrok-skip-browser-warning": "69420" },
      });
      const result = await res.json();
      const data = result.data || result;
      if (Array.isArray(data)) {
        const mapped = data
          .filter((ex) => ex.active !== 0 && ex.active !== "0")
          .map((ex) => ({
            id: ex.id,
            name: `${ex.expo_name || ex.name} ${ex.year || ""}`.trim() || "—",
          }));
        setExpos(mapped);
      }
    } catch {}
  };

  const loadFollowups = async () => {
    if (!selectedExpoId) return;
    startLoading();
    try {
      const all = await fetchAllFollowups(selectedExpoId);
      const mapped = all.map((rec) => {
        const pDetails = rec.primary_details || {};
        const sEntities = rec.sub_entities ? (typeof rec.sub_entities === 'string' ? JSON.parse(rec.sub_entities) : rec.sub_entities) : [];
        const eIdx = parseInt(rec.entity_idx ?? -1);
        const isSec = eIdx !== -1;
        const followed = isSec ? sEntities[eIdx] : null;

        return {
          id: rec.customer_data_id,
          dateOfEntry: rec.customer_created_at,
          employeeName: rec.employee_name || "Unknown",
          employeeId: rec.employee_id,
          expoName: `${rec.expo_name || ""} ${rec.expo_year || ""}`.trim() || "—",
          followup: {
            status: rec.followup_stage,
            reason: rec.next_follow_reason,
            nextDate: rec.next_followup_date,
            remarks: rec.remarks,
          },
          manufacturer: pDetails,
          registerData: rec.register_data || {},
          contact_person: rec.contact_person,
          entity_type: rec.entity_type || "Manufacturer",
          companyCategory: isSec ? "Secondary" : "Primary",

          // Map display values based on entity followed
          companyName: isSec ? (followed?.data?.companyName || pDetails.companyName) : pDetails.companyName,
          city: isSec ? (followed?.data?.city || pDetails.city) : pDetails.city,
          state: isSec ? (followed?.data?.state || pDetails.state) : pDetails.state,
          country: isSec ? (followed?.data?.country || pDetails.country) : pDetails.country,
          website: isSec ? (followed?.data?.website || pDetails.website) : pDetails.website,
          contactPerson: isSec ? (followed?.data?.contactPerson || pDetails.contactPerson) : pDetails.contactPerson,
          mobile1: isSec ? (followed?.data?.mobile1 || pDetails.mobile1) : pDetails.mobile1,
          designation: isSec ? (followed?.data?.designation || pDetails.designation) : pDetails.designation,
          email1: isSec ? (followed?.data?.email1 || pDetails.email1) : pDetails.email1,
          segment: isSec ? (followed?.data?.segment || pDetails.segment) : pDetails.segment,
          source: isSec ? (followed?.data?.source || pDetails.source) : pDetails.source,
          productDetails: rec.productDetails || (isSec ? (followed?.data?.productDetails || pDetails.productDetails) : pDetails.productDetails),
          remarks: rec.remarks,
          sub_entities: sEntities,
        };
      });
      const sorted = mapped.sort(
        (a, b) => new Date(b.dateOfEntry || 0) - new Date(a.dateOfEntry || 0),
      );
      setRecords(sorted);
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchExposlist();
  }, []);
  useEffect(() => {
    loadFollowups();
  }, [selectedExpoId]);
  useEffect(() => {
    setPage(1);
  }, [
    activeNav,
    reasonFilter,
    filterField,
    filterVal,
    dateFrom,
    dateTo,
    employeeFilter,
  ]);

  const handleExpoChange = (id) => {
    setSelectedExpoId(id);
    localStorage.setItem("utfi_current_expo_id", id);
  };

  const counts = useMemo(() => {
    const list = records.filter(
      (r) => !employeeFilter || String(r.employeeId) === String(employeeFilter),
    );
    const c = (pred) => list.filter((r) => pred(r.followup)).length;
    return {
      followup: list.filter((r) => r.followup).length,
      inprogress: c((f) => f && f.status === "Inprogress"),
      notinterested: c((f) => f && f.status === "Not Interested"),
      prospective: c((f) => f && f.status === "Prospective"),
      confirmed: c((f) => f && f.status === "Confirmed"),
    };
  }, [records, employeeFilter]);

  const summary = useMemo(() => {
    const list = records.filter(
      (r) => !employeeFilter || String(r.employeeId) === String(employeeFilter),
    );
    const all = list.filter((r) => r.followup);
    const c = (pred) => all.filter((r) => pred(r.followup)).length;
    return {
      total: all.length,
      telecallInprogress: c(
        (f) => f.status === "Inprogress" && f.reason === "Tele Call",
      ),
      siteInprogress: c(
        (f) => f.status === "Inprogress" && f.reason === "Site Visit",
      ),
      telecallNotInterested: c(
        (f) => f.status === "Not Interested" && f.reason === "Tele Call",
      ),
      siteNotInterested: c(
        (f) => f.status === "Not Interested" && f.reason === "Site Visit",
      ),
      prospective: c((f) => f.status === "Prospective"),
      confirmed: c((f) => f.status === "Confirmed"),
    };
  }, [records, employeeFilter]);

  const navFiltered = useMemo(() => {
    let list = records.filter(
      (r) => !employeeFilter || String(r.employeeId) === String(employeeFilter),
    );
    return list.filter((rec) => {
      const f = rec.followup;
      if (!f) return false;
      if (activeNav === "followup") return true;
      if (activeNav === "inprogress")
        return (
          f.status === "Inprogress" &&
          (!reasonFilter || f.reason === reasonFilter)
        );
      if (activeNav === "notinterested")
        return (
          f.status === "Not Interested" &&
          (!reasonFilter || f.reason === reasonFilter)
        );
      if (activeNav === "prospective") return f.status === "Prospective";
      if (activeNav === "confirmed") return f.status === "Confirmed";
      return false;
    });
  }, [records, activeNav, reasonFilter, employeeFilter]);

  const displayed = useMemo(() => {
    return navFiltered.filter((rec) => {
      const mfr = rec.manufacturer || {};
      const reg = rec.registerData || {};
      if (dateFrom && !dateTo) {
        if (!rec.dateOfEntry || rec.dateOfEntry.slice(0, 10) !== dateFrom)
          return false;
      } else {
        if (
          dateFrom &&
          rec.dateOfEntry &&
          rec.dateOfEntry.slice(0, 10) < dateFrom
        )
          return false;
        if (dateTo && rec.dateOfEntry && rec.dateOfEntry.slice(0, 10) > dateTo)
          return false;
      }
      if (filterField && filterVal.trim()) {
        const q = filterVal.toLowerCase();
        if (filterField === "contactPerson") {
          return (
            rec.contact_person ||
            mfr.contactPerson ||
            reg.contactPerson ||
            ""
          )
            .toLowerCase()
            .includes(q);
        }
        return String(
          mfr[filterField] || reg[filterField] || rec[filterField] || "",
        )
          .toLowerCase()
          .includes(q);
      }
      return true;
    });
  }, [navFiltered, filterField, filterVal, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(displayed.length / pageSize));
  const paginated = displayed.slice((page - 1) * pageSize, page * pageSize);
  const goPage = (p) => setPage(Math.max(1, Math.min(totalPages, p)));

  const navTitleMap = {
    followup: "Followup Overview",
    inprogress: "In Progress",
    notinterested: "Not Interested",
    prospective: "Prospective List",
    confirmed: "Confirmed List",
  };

  const isOverview = activeNav === "followup";
  const isConfirmed = activeNav === "confirmed";
  const showSubTabs =
    activeNav === "inprogress" ||
    activeNav === "notinterested" ||
    activeNav === "prospective";

  const prepareExportData = async () => {
    // We only export the currently displayed (and potentially filtered) records
    // showing their LATEST followup status.
    const rows = displayed.map((rec, idx) => {
      const mfr = rec.manufacturer || {};
      const reg = rec.registerData || {};
      const f = rec.followup || {};

      const city = rec.city || mfr.city || reg.city || "—";
      const state = rec.state || mfr.state || reg.state || "—";
      const country = rec.country || mfr.country || reg.country || "—";

      return {
        "S.No": idx + 1,
        Employee: rec.employeeName,
        "Entry Date": fmtDate(rec.dateOfEntry),
        "Expo Name": rec.expoName,
        "Company Name": mfr.companyName || "—",
        City: city,
        State: state,
        Country: country,
        "Followup Date": fmtDate(
          rec.followup?.submitted_at ||
            rec.followup?.submittedAt ||
            rec.followup?.dateOfEntry,
        ),
        Entity: rec.entity_type || mfr.typeOfBusiness || "Mfr",
        "Contact Person": rec.contact_person || mfr.contactPerson || "—",
        "Product Details": rec.productDetails || mfr.productDetails || "—",
        "Followup Remarks": f.remarks || "—",
        Mobile: rec.mobile1 || mfr.mobile1 || "—",
        Designation: rec.designation || mfr.designation || "—",
        Email: rec.email1 || mfr.email1 || "—",
        "Next Followup Date": fmtDate(f.nextDate),
        Stage: f.status || "—",
        Reason: f.reason || "—",
      };
    });
    return rows;
  };

  const loadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  const handleExportExcel = async () => {
    const data = await prepareExportData();
    if (data.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admin Followup Report");
    XLSX.writeFile(wb, `Admin_Followup_Report_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (displayed.length === 0) return alert("No data to export");
    const doc = new jsPDF("l", "pt", "a4");

    const pdfHeaders = [
      "S.No", 
      "Employee", 
      "Followup Date", 
      "Expo Name", 
      "Segment", 
      "Company Name", 
      "Product Details", 
      "Business Type", 
      "Location", 
      "Contact Person", 
      "Remarks", 
      "Next Followup", 
      "Status", 
      "Mode Call"
    ];

    const pdfBody = displayed.map((rec, idx) => {
      const mfr = rec.manufacturer || {};
      const reg = rec.registerData || {};
      const f = rec.followup || {};

      const city = rec.city || mfr.city || reg.city || "";
      const state = rec.state || mfr.state || reg.state || "";
      const country = rec.country || mfr.country || reg.country || "";
      const location = [city, state, country].filter(v => v && v !== "—").join("\n");

      const contactName = rec.contact_person || mfr.contactPerson || "—";
      const contactNo = rec.mobile1 || mfr.mobile1 || "—";
      const contactDisplay = `${contactName}\n${contactNo}`;

      const followupDate = fmtDate(f.submitted_at || f.submittedAt || rec.dateOfEntry);
      
      const nextDate = (f.status === "Inprogress" || f.status === "Prospective") 
        ? fmtDate(f.nextDate) 
        : "—";

      return [
        idx + 1,
        rec.employeeName || "—",
        followupDate,
        rec.expoName || "—",
        rec.segment || mfr.segment || "—",
        mfr.companyName || "—",
        rec.productDetails || mfr.productDetails || "—",
        rec.entity_type || "Mfr",
        location || "—",
        contactDisplay,
        f.remarks || "—",
        nextDate,
        f.status || "—",
        f.reason || "—"
      ];
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const logoImgObj = await loadImage(logoImg);
    if (logoImgObj) {
      const naturalW = logoImgObj.width;
      const naturalH = logoImgObj.height;
      const ratio = naturalW / naturalH;
      const targetH = 40;
      const targetW = targetH * ratio;
      const logoX = (pageWidth - targetW) / 2;
      doc.addImage(logoImg, "PNG", logoX, 15, targetW, targetH);
    }

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(`UTFI Trade Fair - ${navTitleMap[activeNav]}`, pageWidth / 2, 75, { align: "center" });

    autoTable(doc, {
      head: [pdfHeaders],
      body: pdfBody,
      startY: 90,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 4,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle'
      },
      headStyles: { 
        fillColor: [232, 28, 33],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 25 }, // S.No
        5: { halign: 'left', cellWidth: 70 }, // Company Name
        6: { halign: 'left', cellWidth: 70 }, // Product
        8: { halign: 'left', cellWidth: 60 }, // Location
        9: { halign: 'left', cellWidth: 70 }, // Contact
        10: { halign: 'left', cellWidth: 100 }, // Remarks
      },
      margin: { left: 20, right: 20 }
    });
    doc.save(`Admin_Followup_Report_${new Date().getTime()}.pdf`);
  };

  const NAV_ITEMS = [
    { id: "followup", label: "Followup Overview" },
    { id: "inprogress", label: "In Progress" },
    { id: "notinterested", label: "Not Interested" },
    { id: "prospective", label: "Prospective List" },
    { id: "confirmed", label: "Confirmed List" },
  ];

  return (
    <div className="flex bg-gray-50 overflow-hidden h-[calc(100vh-70px)] font-sans">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative z-50 md:z-auto
          w-[75vw] md:w-[20%]
          shrink-0 bg-[#1f1f1f] text-white flex flex-col h-full overflow-y-auto
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h1
            className="text-white font-extrabold text-2xl"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            Admin Reports
          </h1>
          {/* Close button mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col space-y-2 flex-1 ml-4 py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveNav(item.id);
                setReasonFilter("");
                setSidebarOpen(false);
              }}
              className={`flex items-center justify-between px-4 py-3 rounded-l-full outline-none transition-all cursor-pointer border-t border-b border-l-[4px] border-r-0 ${activeNav === item.id ? "bg-white text-black font-bold border-l-red-600 border-t-white border-b-white" : "bg-transparent text-gray-300 hover:text-white border-transparent"}`}
            >
              <div className="flex items-center">
                <img src={Calendar} alt="calendar" className="w-5 h-5 mr-3" />
                <span className="text-sm">{item.label}</span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-black mr-2 ${activeNav === item.id ? "bg-red-600 text-white" : "bg-white/10 text-gray-400"}`}
              >
                {counts[item.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10 gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-2">
              {/* Hamburger - mobile only */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center p-2 rounded-full cursor-pointer bg-red-50 hover:bg-red-100 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-black truncate max-w-[150px] sm:max-w-none">
                {navTitleMap[activeNav]}
              </h1>
            </div>
            <button
              onClick={loadFollowups}
              className="transition-all hover:scale-110 cursor-pointer"
              title="Refresh"
            >
              <svg
                className="w-6 h-6 text-black"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={handleExportExcel}
              className="flex items-center text-xs sm:text-sm font-bold py-2 px-3 sm:py-2.5 sm:px-5 rounded-full border border-green-500 bg-green-50 text-green-600 hover:bg-green-100 transition-colors cursor-pointer shadow-sm whitespace-nowrap flex-shrink-0"
            >
              <img src={ExcelIcon} alt="Excel" className="w-4 h-4 mr-2" />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center text-xs sm:text-sm font-bold py-2 px-3 sm:py-2.5 sm:px-5 rounded-full border border-red-500 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer shadow-sm whitespace-nowrap flex-shrink-0"
            >
              <img src={PdfIcon} alt="PDF" className="w-4 h-4 mr-2" />
              PDF
            </button>
          </div>
        </div>

        <div className="px-6 pb-8 flex-1 pt-5">
          {isOverview && (
            <div className="flex justify-center mb-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full max-w-2xl">
                <p className="text-center font-bold text-gray-900 mb-5 text-base">
                  Total Followup Taken :{" "}
                  <span className="text-2xl" style={{ color: "#e81c21" }}>
                    {summary.total}
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
                  {[
                    {
                      label: "Telecall In Progress",
                      val: summary.telecallInprogress,
                      color: "text-amber-600",
                    },
                    {
                      label: "Site Visit In Progress",
                      val: summary.siteInprogress,
                      color: "text-amber-600",
                    },
                    {
                      label: "Telecall Not Interested",
                      val: summary.telecallNotInterested,
                      color: "text-red-500",
                    },
                    {
                      label: "Site Not Interested",
                      val: summary.siteNotInterested,
                      color: "text-red-500",
                    },
                    {
                      label: "Prospective",
                      val: summary.prospective,
                      color: "text-blue-600",
                    },
                    {
                      label: "Confirmed",
                      val: summary.confirmed,
                      color: "text-green-600",
                    },
                  ].map(({ label, val, color }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100"
                    >
                      <span className="text-gray-600">{label}</span>
                      <span className={`font-bold text-base ${color}`}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-4 mb-5 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Expo Name
              </label>
              <select
                value={selectedExpoId}
                onChange={(e) => handleExpoChange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-300 cursor-pointer h-[38px] min-w-[140px]"
              >
                {expos.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Employee
              </label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-300 cursor-pointer h-[38px] min-w-[140px]"
              >
                <option value="">All Employees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Search
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-cyan-300 transition-all h-[38px]">
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="bg-transparent text-sm text-gray-700 px-3 py-2 focus:outline-none cursor-pointer border-r border-gray-300 min-w-[140px] appearance-none"
                >
                  <option value="">All fields</option>
                  {FILTER_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <input
                  value={filterVal}
                  onChange={(e) => setFilterVal(e.target.value)}
                  placeholder="Type to search..."
                  className="bg-transparent text-sm px-3 py-2 focus:outline-none w-40 cursor-text"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Date Range
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-300 h-[38px] w-full sm:w-auto"
                />
                <span className="hidden sm:block text-xs font-bold text-gray-400">TO</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-300 h-[38px] w-full sm:w-auto"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFilterField("");
                  setFilterVal("");
                  setDateFrom("");
                  setDateTo("");
                  setReasonFilter("");
                  setEmployeeFilter("");
                }}
                className="px-5 h-[38px] rounded-lg text-white text-sm font-bold cursor-pointer hover:opacity-90 transition-all shadow-sm"
                style={{ background: "#e81c21" }}
              >
                Reset All
              </button>
            </div>

            {showSubTabs && (
              <div className="flex p-1 bg-gray-100 rounded-xl ml-auto">
                {[
                  { id: "", label: "All" },
                  { id: "Tele Call", label: "Tele Call" },
                  { id: "Site Visit", label: "Site Visit" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setReasonFilter(t.id)}
                    className={`px-6 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${reasonFilter === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-sm font-bold text-gray-800 mb-3 ml-1">
            Total records :{" "}
            <span style={{ color: "#e81c21" }}>{displayed.length}</span>
          </p>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm h-[60vh] flex flex-col font-sans">
            <div className="overflow-x-auto flex-1 font-sans">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: "#1cb8c8" }}>
                    <th className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap w-14">
                      S.No.
                    </th>
                    <th className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap">
                      Details
                    </th>
                    <th className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap">
                      Followup Date
                    </th>
                    {isConfirmed
                      ? CONFIRMED_COLS.map((c) => (
                          <th
                            key={c.label}
                            className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap"
                          >
                            {c.label}
                          </th>
                        ))
                      : TABLE_COLS.map((c) => (
                          <th
                            key={c.key}
                            className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap"
                          >
                            {c.label}
                          </th>
                        ))}
                    {!isConfirmed && (
                      <th className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap">
                        Mode
                      </th>
                    )}
                    <th className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap">
                      Status
                    </th>
                    {!isConfirmed && (
                      <th className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap">
                        Next Followup Date
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan="30"
                        className="text-center py-16 text-gray-400 text-sm"
                      >
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((rec, i) => {
                      const mfr = rec.manufacturer || {};
                      const reg = rec.registerData || {};
                      const f = rec.followup || {};
                      const globalIdx = (page - 1) * pageSize + i + 1;
                      return (
                        <tr
                          key={rec.id}
                          className={`border-b border-gray-100 transition-colors hover:bg-cyan-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                        >
                          <td className="px-4 py-3 border-r border-gray-200 text-gray-400 text-center font-mono text-xs">
                            {globalIdx}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-200 whitespace-nowrap">
                            <button
                              onClick={() => setDetailRecord(rec)}
                              className="text-blue-600 font-semibold text-sm hover:underline cursor-pointer"
                            >
                              View Details
                            </button>
                          </td>
                          <td className="px-4 py-3 border-r border-gray-200 text-gray-500 whitespace-nowrap text-xs">
                            {fmtDate(rec.dateOfEntry)}
                          </td>
                          {isConfirmed
                            ? CONFIRMED_COLS.map((c) => (
                                <td
                                  key={c.label}
                                  className="px-4 py-3 border-r border-gray-200 text-gray-700 whitespace-nowrap text-xs"
                                >
                                  {c.render
                                    ? c.render(c.get(mfr, reg, rec))
                                    : c.get(mfr, reg, rec)}
                                </td>
                              ))
                            : TABLE_COLS.map((c) => {
                                const val = rec[c.key] || mfr[c.key] || "";
                                return (
                                  <td
                                    key={c.key}
                                    className={`px-4 py-3 border-r border-gray-200 text-gray-700 max-w-[150px] truncate text-xs ${c.key === "employeeName" ? "text-red-600 font-bold" : ""}`}
                                    title={String(val)}
                                  >
                                    {val || (
                                      <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                );
                              })}
                          {!isConfirmed && (
                            <td className="px-4 py-3 border-r border-gray-200">
                              <span className="inline-block bg-gray-900 text-white px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">
                                {rec.followup?.reason || "—"}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 border-r border-gray-200 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${f.status === "Confirmed" ? "bg-green-100 text-green-700" : f.status === "Not Interested" ? "bg-red-100 text-red-700" : f.status === "Prospective" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}
                            >
                              {f.status || "—"}
                            </span>
                          </td>
                          {!isConfirmed && (
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                              {f.status === "Confirmed"
                                ? "—"
                                : fmtDate(f.nextDate)}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              goPage={setPage}
              total={displayed.length}
              pageSize={pageSize}
            />
          </div>
        </div>
      </main>
      {detailRecord && (
        <DetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
        />
      )}
    </div>
  );
}
