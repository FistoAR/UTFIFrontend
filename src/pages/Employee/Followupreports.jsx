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

const fetchAllFollowups = async () => {
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const role = userData.user?.role || "";
  const id = userData.user?.id || null;
  const exposId = localStorage.getItem("utfi_current_expo_id");

  const queryParams = { pending: 1, all: 1, userRole: role, userId: id };
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
  { key: "expoName", label: "Expo Name" },
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

// ─── Confirmed list columns — mirrors CustomerRegister form fields ─────────────
const CONFIRMED_COLS = [
  { label: "Expo Name", get: (mfr, reg) => mfr.expoName || "—" },
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

// ─── SVG Icons for sidebar (all unique) ──────────────────────────────────────
const IcoOverview = () => (
  <svg
    className="w-4 h-4 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
const IcoInProgress = () => (
  <svg
    className="w-4 h-4 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const IcoNotInterested = () => (
  <svg
    className="w-4 h-4 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
    />
  </svg>
);
const IcoProspective = () => (
  <svg
    className="w-4 h-4 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  </svg>
);
const IcoConfirmed = () => (
  <svg
    className="w-4 h-4 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
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
const IcoRefresh = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);
const IcoExcel = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1.8 14.5l-1.3-2.1l-1.3 2.1h-1.6l2.1-3.2l-2-2.8h1.6l1.2 1.8l1.2-1.8h1.6l-2 2.8l2.1 3.2h-1.6zM13 9V3.5L18.5 9H13z" />
  </svg>
);
const IcoPdf = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
  </svg>
);

// ─── Pagination component (with correct unique page numbers) ─────────────────
const Pagination = ({ page, totalPages, goPage, total, pageSize }) => {
  if (total === 0 || totalPages <= 0) return null;

  // Build page window: always show up to 5 unique sequential page numbers
  const buildPages = () => {
    const delta = 2;
    let start = Math.max(1, page - delta);
    let end = Math.min(totalPages, page + delta);
    // Expand window if it's too small
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
  const btnActive = `${btnBase} text-white border-transparent shadow`;

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
      // Sort history to show latest at top
      const sorted = mapped.sort((a, b) => {
        const dateA = new Date(
          (a.submitted_at || a.submittedAt || "").replace(" ", "T"),
        );
        const dateB = new Date(
          (b.submitted_at || b.submittedAt || "").replace(" ", "T"),
        );
        return dateB - dateA;
      });
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
    "Type",
    "Contact Person",
    "Mobile",
    "Remarks",
    "Next Followup Date",
    "Status",
    "F-Mode",
  ];

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
              <div className="w-10 h-10 border-4 border-cyan-100 border-t-cyan-500 rounded-full animate-spin"></div>
              <p className="text-gray-400 text-sm animate-pulse">
                Loading history...
              </p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-5xl mb-4 block">📁</span>
              <p className="text-gray-400 text-sm">No follow-up records yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {groupedHistory.map(([expo, items], gIdx) => (
                <div key={expo} className="flex flex-col gap-4">
                  {/* Expo Separator/Header */}
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-gray-200"></div>
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
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
                    <table className="w-full text-sm border-collapse min-w-[1100px]">
                      <thead>
                        <tr className="bg-[#1a1a1a] text-white">
                          {headers.map((h) => (
                            <th
                              key={h}
                              className="text-left px-5 py-3 font-bold text-white border-r border-white/10 whitespace-nowrap text-[11px] uppercase tracking-wider"
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
                              className="border-b border-gray-100 last:border-0 hover:bg-red-50/20 transition-all"
                            >
                              <td className="px-5 py-4 border-r border-gray-100 text-center text-gray-400 text-[10px] font-mono leading-none">
                                {i + 1}
                              </td>
                              <td className="px-5 py-4 border-r border-gray-100 whitespace-nowrap font-bold text-gray-800 text-xs">
                                {fmtDate(h.submitted_at || h.submittedAt)}
                              </td>
                              <td className="px-5 py-4 border-r border-gray-100 text-gray-800 text-xs font-medium">
                                {(() => {
                                  const hIdx = parseInt(h.entity_idx ?? -1);
                                  const subEnts = record.sub_entities || [];
                                  if (hIdx !== -1 && subEnts[hIdx]) {
                                    return subEnts[hIdx].data?.companyName || mfr.companyName || "—";
                                  }
                                  return mfr.companyName || "—";
                                })()}
                              </td>
                              <td className="px-5 py-4 border-r border-gray-100 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter text-white whitespace-nowrap ${
                                    (h.entity_type || h.entityType) === "Dealer"
                                      ? "bg-blue-600"
                                      : (h.entity_type || h.entityType) ===
                                          "Distributor"
                                        ? "bg-purple-600"
                                        : "bg-black"
                                  }`}
                                >
                                  {h.entity_type || h.entityType || "Mfr"}
                                </span>
                              </td>
                              <td className="px-5 py-4 border-r border-gray-100 font-bold text-gray-800 text-xs">
                                {h.contact_person || h.contactPerson || "—"}
                              </td>
                              <td className="px-5 py-4 border-r border-gray-100 text-gray-700 text-xs font-medium whitespace-nowrap">
                                {h.mobile_no || h.mobileNo || "—"}
                              </td>
                              <td
                                className="px-5 py-4 border-r border-gray-100 text-gray-600 text-xs leading-relaxed max-w-[250px] truncate"
                                title={h.remarks}
                              >
                                {h.remarks || "—"}
                              </td>
                              <td
                                className={`px-5 py-4 border-r border-gray-100 whitespace-nowrap font-bold text-xs ${nextDate ? "text-red-500" : "text-gray-400"}`}
                              >
                                {fmtDate(nextDate)}
                              </td>
                              <td className="px-5 py-4 border-r border-gray-100">
                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight  ${
                                    stage === "Confirmed"
                                      ? "bg-green-100 text-green-700"
                                      : stage === "Not Interested"
                                        ? "bg-red-100 text-red-700"
                                        : stage === "Prospective"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {stage || "—"}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-1.5">
                                  {fmode === "Tele Call" ? (
                                    <IcoTeleCall />
                                  ) : fmode === "Site Visit" ? (
                                    <IcoSiteVisit />
                                  ) : null}
                                  <span className="text-gray-500 text-[11px] font-bold whitespace-nowrap">
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

// ─── Reason filter checkbox pill (shown in main content area) ─────────────────
const ReasonPill = ({ reason, active, count, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all cursor-pointer ${
      active
        ? "bg-gray-900 text-white border-gray-900 shadow"
        : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
    }`}
  >
    {reason === "Tele Call" ? <IcoTeleCall /> : <IcoSiteVisit />}
    {reason}
    <span
      className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
        active
          ? "bg-white text-gray-900"
          : count > 0
            ? "bg-gray-900 text-white"
            : "bg-gray-200 text-gray-500"
      }`}
    >
      {count}
    </span>
  </button>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FollowupReports() {
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();
  const [records, setRecords] = useState([]);
  // activeNav: "followup" | "inprogress" | "notinterested" | "prospective" | "confirmed"
  const [activeNav, setActiveNav] = useState("followup");
  // reasonFilter: "" | "Tele Call" | "Site Visit"  (only for inprogress / notinterested)
  const [reasonFilter, setReasonFilter] = useState("");
  const [filterField, setFilterField] = useState("");
  const [filterVal, setFilterVal] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailRecord, setDetailRecord] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    startLoading();
    try {
      const all = await fetchAllFollowups();
      const mapped = all.map((rec) => {
        const pDetails = rec.primary_details || {};
        const sEntities = rec.sub_entities ? (typeof rec.sub_entities === 'string' ? JSON.parse(rec.sub_entities) : rec.sub_entities) : [];
        const eIdx = parseInt(rec.entity_idx ?? -1);
        const isSec = eIdx !== -1;
        const followed = isSec ? sEntities[eIdx] : null;

        return {
          id: rec.customer_data_id,
          dateOfEntry: rec.customer_created_at,
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
      // Sort by entry date descending (latest at top)
      const sorted = mapped.sort((a, b) => {
        const dA = new Date(a.dateOfEntry || 0);
        const dB = new Date(b.dateOfEntry || 0);
        return dB - dA;
      });
      setRecords(sorted);
    } finally {
      stopLoading();
    }
  };
  useEffect(() => {
    load();
  }, []);

  // Reset page on any filter/nav change
  useEffect(() => {
    setPage(1);
  }, [activeNav, reasonFilter, filterField, filterVal, dateFrom, dateTo]);

  // ── Counts for sidebar badges ───────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = (pred) => records.filter((r) => pred(r.followup)).length;
    return {
      followup: c(
        (f) =>
          f &&
          ["Inprogress", "Not Interested", "Prospective", "Confirmed"].includes(
            f.status,
          ),
      ),
      inprogress: c((f) => f && f.status === "Inprogress"),
      inprogress_tele: c(
        (f) => f && f.status === "Inprogress" && f.reason === "Tele Call",
      ),
      inprogress_site: c(
        (f) => f && f.status === "Inprogress" && f.reason === "Site Visit",
      ),
      notinterested: c((f) => f && f.status === "Not Interested"),
      notinterested_tele: c(
        (f) => f && f.status === "Not Interested" && f.reason === "Tele Call",
      ),
      notinterested_site: c(
        (f) => f && f.status === "Not Interested" && f.reason === "Site Visit",
      ),
      prospective: c((f) => f && f.status === "Prospective"),
      confirmed: c((f) => f && f.status === "Confirmed"),
    };
  }, [records]);

  // ── Summary stats for overview panel ───────────────────────────────────────
  const summary = useMemo(() => {
    const all = records.filter((r) => r.followup);
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
  }, [records]);

  // ── Filter records by active nav + reason ──────────────────────────────────
  const navFiltered = useMemo(() => {
    return records.filter((rec) => {
      const f = rec.followup;
      if (!f) return false;
      if (activeNav === "followup")
        return (
          f.status === "Inprogress" ||
          f.status === "Not Interested" ||
          f.status === "Prospective" ||
          f.status === "Confirmed"
        );
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
  }, [records, activeNav, reasonFilter]);

  // ── Apply search + date filter ─────────────────────────────────────────────
  const displayed = useMemo(() => {
    return navFiltered.filter((rec) => {
      const mfr = rec.manufacturer || {};
      const reg = rec.registerData || {};

      // Refined date filter:
      // If only dateFrom is set -> match exactly that day
      // If both set -> range
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
          const cp =
            rec.contact_person || mfr.contactPerson || reg.contactPerson || "";
          return cp.toLowerCase().includes(q);
        }
        return String(mfr[filterField] || reg[filterField] || "")
          .toLowerCase()
          .includes(q);
      }
      return true;
    });
  }, [navFiltered, filterField, filterVal, dateFrom, dateTo]);

  const availableFilters = useMemo(() => {
    if (activeNav === "confirmed") {
      return [
        { key: "exhibitorName", label: "Exhibitor Name" },
        { key: "paymentStatus", label: "Payment Status" },
        ...FILTER_FIELDS,
      ];
    }
    return FILTER_FIELDS;
  }, [activeNav]);

  const totalPages = Math.max(1, Math.ceil(displayed.length / pageSize));
  const paginated = displayed.slice((page - 1) * pageSize, page * pageSize);
  const goPage = (p) => setPage(Math.max(1, Math.min(totalPages, p)));

  const isOverview = activeNav === "followup";
  const isConfirmed = activeNav === "confirmed";
  const hasReasonSub =
    activeNav === "inprogress" || activeNav === "notinterested";

  const navTitleMap = {
    followup: "Followup Overview",
    inprogress: "In Progress",
    notinterested: "Not Interested",
    prospective: "Prospective List",
    confirmed: "Confirmed List",
  };

  const showSubTabs =
    activeNav === "inprogress" ||
    activeNav === "notinterested" ||
    activeNav === "prospective";

  const SideNavBtn = ({ id, label, Icon, count, onClick }) => {
    const active = activeNav === id;
    return (
      <button
        onClick={
          onClick ||
          (() => {
            setActiveNav(id);
            setReasonFilter("");
          })
        }
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-r-xl transition-all cursor-pointer text-left border-l-4 ${
          active
            ? "bg-white text-gray-900 font-bold shadow-sm border-red-600"
            : "text-gray-300 hover:bg-gray-800 hover:text-white border-transparent"
        }`}
      >
        <span className={active ? "text-gray-900" : "text-amber-400"}>
          <Icon className="w-5 h-5" />
        </span>
        <span className="flex-1 leading-tight tracking-wide font-bold text-[15px] whitespace-nowrap">
          {label}
        </span>
        {count !== undefined && (
          <span
            className={`text-[12px] px-2.5 py-1 rounded-full font-black shrink-0 transition-colors ${
              active ? "bg-amber-400 text-black" : "bg-black text-white"
            }`}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  // ─── Export Logic ──────────────────────────────────────────────────────────
  const prepareExportData = async () => {
    // We only export the currently displayed (and potentially filtered) records
    // showing their LATEST followup status.
    const rows = displayed.map((rec, idx) => {
      const mfr = rec.manufacturer || {};
      const reg = rec.registerData || {};
      const f = rec.followup || {};

      const city = reg.city || mfr.city || "—";
      const state = reg.state || mfr.state || "—";
      const country = reg.country || mfr.country || "—";

      return {
        "S.No": idx + 1,
        "Entry Date": fmtDate(rec.dateOfEntry),
        "Expo Name": mfr.expoName || "—",
        "Company Name": mfr.companyName || "—",
        City: city,
        State: state,
        Country: country,
        "Followup Date": fmtDate(
          f.submittedAt || f.submitted_at || rec.dateOfEntry,
        ),
        Entity: mfr.typeOfBusiness || "Mfr",
        "Contact Person": mfr.contactPerson || "—",
        "Product Details": mfr.productDetails || "—",
        "Followup Remarks": f.remarks || "—",
        Mobile: mfr.mobile1 || "—",
        Designation: mfr.designation || "—",
        Email: mfr.email1 || "—",
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
    XLSX.utils.book_append_sheet(wb, ws, "Followup Report");
    XLSX.writeFile(wb, `Followup_Report_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = async () => {
    const data = await prepareExportData();
    if (data.length === 0) return alert("No data to export");
    const doc = new jsPDF("l", "pt", "a4");
    const headers = Object.keys(data[0]);
    const body = data.map((row) => headers.map((h) => row[h]));

    // Center the logo with correct aspect ratio
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoImgObj = await loadImage(logoImg);
    if (logoImgObj) {
      const naturalW = logoImgObj.width;
      const naturalH = logoImgObj.height;
      const ratio = naturalW / naturalH;
      const targetH = 50;
      const targetW = targetH * ratio;
      const logoX = (pageWidth - targetW) / 2;
      doc.addImage(logoImg, "PNG", logoX, 20, targetW, targetH);
    }

    doc.setFontSize(16);
    doc.setTextColor(80, 80, 80);
    doc.text(navTitleMap[activeNav], pageWidth / 2, 85, { align: "center" });

    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 100,
      styles: {
        fontSize: 7,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [232, 28, 33],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 40, left: 40, right: 40 },
    });

    doc.save(`UTFI_Followup_Report_${new Date().getTime()}.pdf`);
  };

  const NAV_ITEMS = [
    { id: "followup", label: "All Followups" },
    { id: "inprogress", label: "In Progress" },
    { id: "notinterested", label: "Not Interested" },
    { id: "prospective", label: "Prospective" },
    { id: "confirmed", label: "Confirmed" },
  ];

  return (
    <div
      className="flex bg-gray-50 overflow-hidden"
      style={{ height: "calc(100vh - 70px)" }}
    >
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
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
            Followup Reports
          </h1>
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
              className={`flex items-center justify-between px-4 py-3 rounded-l-full outline-none transition-all cursor-pointer border-t border-b border-l-[4px] border-r-0 ${
                activeNav === item.id
                  ? "bg-white text-black font-bold border-l-red-600 border-t-white border-b-white"
                  : "bg-transparent text-gray-300 hover:text-white border-transparent"
              }`}
            >
              <div className="flex items-center">
                <img src={Calendar} alt="calendar" className="w-4 h-4 mr-3" />
                <span className="text-sm">{item.label}</span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-black mr-2 ${
                  activeNav === item.id
                    ? "bg-red-600 text-white"
                    : "bg-white/10 text-gray-400"
                }`}
              >
                {counts[item.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10 gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-3">
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
              <h1 className="text-sm sm:text-xl font-bold text-black truncate max-w-[120px] sm:max-w-none">
                {navTitleMap[activeNav]}
              </h1>
            </div>
            <button
              onClick={load}
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
          {/* Filter bar */}
          <div className="flex flex-wrap items-end gap-4 mb-5 p-4 bg-white rounded-2xl border border-gray-200">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Search
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-cyan-300 transition-all">
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="bg-transparent text-sm text-gray-700 px-3 py-2 focus:outline-none cursor-pointer border-r border-gray-300 appearance-none"
                  style={{ minWidth: "140px" }}
                >
                  <option value="">All fields</option>
                  {availableFilters.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <input
                  value={filterVal}
                  onChange={(e) => setFilterVal(e.target.value)}
                  placeholder="Type to search…"
                  className="bg-transparent text-sm px-3 py-2 focus:outline-none w-40 cursor-text"
                />
                {filterVal && (
                  <button
                    onClick={() => setFilterVal("")}
                    className="pr-3 text-gray-400 hover:text-gray-600 cursor-pointer text-sm"
                  >
                    ✕
                  </button>
                )}
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
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-300 cursor-pointer w-full sm:w-auto"
                />
                <span className="hidden sm:block text-xs font-bold text-gray-400">TO</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-300 cursor-pointer w-full sm:w-auto"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setFilterField("");
                setFilterVal("");
                setDateFrom("");
                setDateTo("");
                setReasonFilter("");
              }}
              className="px-5 py-2 rounded-lg text-white text-sm font-bold cursor-pointer hover:opacity-90 transition-all"
              style={{ background: "#e81c21" }}
            >
              Reset All
            </button>

            {showSubTabs && (
              <div className="flex p-1 bg-gray-100 rounded-xl shadow-inner">
                {[
                  { id: "", label: "All" },
                  { id: "Tele Call", label: "Tele Call" },
                  { id: "Site Visit", label: "Site Visit" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setReasonFilter(t.id)}
                    className={`px-6 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      reasonFilter === t.id
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Overview stats */}
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

          {/* Record count + rows-per-page */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800">
              Total records :{" "}
              <span style={{ color: "#e81c21" }}>{displayed.length}</span>
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
              >
                {[10, 25, 50, 100].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {displayed.length > 0 && (
                <span className="text-gray-400">
                  {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, displayed.length)} of{" "}
                  {displayed.length}
                </span>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm min-h-[60vh] flex flex-col">
            <div className="overflow-x-auto flex-1">
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

                    {/* Columns differ for confirmed vs others */}
                    {isConfirmed
                      ? CONFIRMED_COLS.map((c) => (
                          <th
                            key={c.label}
                            className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap"
                          >
                            {c.label}
                          </th>
                        ))
                      : TABLE_COLS.filter(
                          (c) =>
                            reasonFilter === "" || c.key !== "typeOfBusiness",
                        ).map((c) => (
                          <th
                            key={c.key}
                            className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap"
                          >
                            {c.label}
                          </th>
                        ))}

                    {/* Mode column at end for non-confirmed if All is selected */}
                    {!isConfirmed && (
                      <th className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap">
                        Mode
                      </th>
                    )}

                    {!isConfirmed && (
                      <>
                        <th className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap">
                          Status
                        </th>
                        <th className="text-left px-4 py-3.5 font-bold text-white border border-cyan-400 whitespace-nowrap">
                          Next Followup Date
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          isConfirmed
                            ? CONFIRMED_COLS.length + 3
                            : TABLE_COLS.length + 5
                        }
                        className="text-center py-16 text-gray-400 text-sm"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl">📋</span>
                          <span>No records found.</span>
                        </div>
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
                          className={`border-b border-gray-100 transition-colors hover:bg-cyan-50 ${
                            i % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="px-4 py-3 border-r border-gray-200 text-gray-400 text-center font-mono text-xs">
                            {globalIdx}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-200 whitespace-nowrap">
                            <button
                              onClick={() => setDetailRecord(rec)}
                              className="text-blue-600 font-semibold text-sm hover:underline cursor-pointer hover:text-blue-800 transition-colors"
                            >
                              View Details
                            </button>
                          </td>
                          <td className="px-4 py-3 border-r border-gray-200 text-gray-500 whitespace-nowrap text-xs">
                            {fmtDate(rec.dateOfEntry)}
                          </td>

                          {isConfirmed
                            ? CONFIRMED_COLS.map((col) => {
                                const val = col.get(mfr, reg);
                                return (
                                  <td
                                    key={col.label}
                                    className="px-4 py-3 border-r border-gray-200 text-gray-700 whitespace-nowrap min-w-fit"
                                  >
                                    {col.render
                                      ? col.render(val)
                                      : val || (
                                          <span className="text-gray-300">
                                            —
                                          </span>
                                        )}
                                  </td>
                                );
                              })
                            : TABLE_COLS.filter(
                                (c) =>
                                  reasonFilter === "" ||
                                  c.key !== "typeOfBusiness",
                              ).map((col) => {
                                const val = rec[col.key] || mfr[col.key] || "";
                                return (
                                  <td
                                    key={col.key}
                                    className="px-4 py-3 border-r border-gray-200 text-gray-700 max-w-[150px] truncate text-xs"
                                    title={String(val)}
                                  >
                                    {val || (
                                      <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                );
                              })}

                          {!isConfirmed && (
                            <td className="px-4 py-3 border-r border-gray-200 text-gray-700 whitespace-nowrap">
                              <span className="inline-block bg-gray-900 text-white px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">
                                {rec.followup?.reason || "—"}
                              </span>
                            </td>
                          )}

                          {!isConfirmed && (
                            <>
                              <td className="px-4 py-3 border-r border-gray-200 whitespace-nowrap">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    f.status === "Confirmed"
                                      ? "bg-green-100 text-green-700"
                                      : f.status === "Not Interested"
                                        ? "bg-red-100 text-red-700"
                                        : f.status === "Prospective"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {f.status || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                                {f.status === "Confirmed"
                                  ? "—"
                                  : fmtDate(f.nextDate)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              goPage={goPage}
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
