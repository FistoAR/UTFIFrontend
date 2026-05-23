import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../../context/LoadingContext";
import { useToast } from "../../context/ToastContext";
import AutocompleteInput from "../../components/AutocompleteInput";

// ─── constants ────────────────────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50];
const BUSINESS_TYPES = ["Manufacturer", "Dealer", "Distributor"];

const getSubTypes = (primaryType) => {
  return BUSINESS_TYPES.filter((t) => t !== primaryType);
};

const emptyContact = () => ({
  expoName: "",
  companyName: "",
  remarks: "",
  contactPerson: "",
  designation: "",
  mobile1: "",
  mobile2: "",
  landline: "",
  email1: "",
  email2: "",
  address1: "",
  address2: "",
  address3: "",
  city: "",
  pincode: "",
  state: "",
  country: "",
  website: "",
  source: "",
  segment: "",
  productDetails: "",
});

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
  { key: "email1", label: "Email 1" },
  { key: "source", label: "Source" },
  { key: "productDetails", label: "Product Details" },
  { key: "remarks", label: "Remarks" },
];

const DEFAULT_VISIBLE = [
  "companyName",
  "contactPerson",
  "designation",
  "city",
  "mobile1",
  "segment",
  "typeOfBusiness",
];

const FOLLOWUP_STATUSES = [
  "Interested",
  "Not Interested",
  "Call Back",
  "Meeting Scheduled",
  "Converted",
  "Dead Lead",
];

// ─── helpers ──────────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const fetchLeads = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}/customer-data?${query}`, {
    headers: { "ngrok-skip-browser-warning": "69420" },
  });
  return response.json();
};

const deleteLead = async (id, expo_id) => {
  const response = await fetch(
    `${API_BASE_URL}/customer-data?id=${id}&expo_id=${expo_id}`,
    {
      method: "DELETE",
      headers: { "ngrok-skip-browser-warning": "69420" },
    },
  );
  return response.json();
};

const saveLead = async (data) => {
  const response = await fetch(`${API_BASE_URL}/customer-data`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "69420",
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

const getFollowupHistory = (recordId) =>
  JSON.parse(localStorage.getItem(`followups_${recordId}`) || "[]");

const loadNotifications = () =>
  JSON.parse(localStorage.getItem("crm_notifications") || "[]");

// ── Rules for what shows in CustomerData ─────────────────────────────────────
// 1. entryType === "existing"  AND  status === "active"
// 2. entryType === "newlead"   AND  status === "active"  (admin accepted)
// 3. Record must NOT have any followup taken (no followup history)
const isEligible = (rec) => {
  if (rec.status !== "active") return false;
  return true;
};

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

const flattenRecord = (rec) => {
  const mfr = rec.primary_details || {};
  const primaryTob = rec.primary_type || "Manufacturer";

  // Return only one row per record
  return [
    {
      _id: rec.id,
      _recordId: rec.id,
      _entityType: primaryTob,
      _dateOfEntry: rec.created_at,
      _entryType: rec.new_lead ? "newlead" : "existing",
      _status: rec.status,
      _followup: rec.followup || {}, // For now
      ...mfr,
      typeOfBusiness: primaryTob,
      _raw: rec,
    },
  ];
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ row, onClose, onSave, onDelete, isLoading }) => {
  const [mfr, setMfr] = useState({ ...(row._raw.primary_details || {}) });
  const [subEntities, setSubEntities] = useState([
    ...(row._raw.sub_entities || []),
  ]);
  const primaryTob = row._raw.primary_type || "Manufacturer";
  const [suggestions, setSuggestions] = useState({});
  const [segmentList, setSegmentList] = useState([]);
  useEffect(() => {
    fetch(`${API_BASE_URL}/customer-data/suggestions`, {
      headers: { "ngrok-skip-browser-warning": "69420" },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSuggestions(d.suggestions);
      })
      .catch(() => {});

    const currentExpoId = localStorage.getItem("utfi_current_expo_id");
    fetch(`${API_BASE_URL}/segments?expos_id=${currentExpoId || ""}`, {
      headers: { "ngrok-skip-browser-warning": "69420" },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSegmentList(data.map((s) => s.segment));
      })
      .catch(() => {});
  }, []);

  const updMfr = (f, v) => {
    if (f === "mobile1" || f === "mobile2") {
      v = v.replace(/\D/g, "").slice(0, 10);
    }
    setMfr((p) => ({ ...p, [f]: v }));
  };

  const updSub = (index, field, v) => {
    if (field === "mobile1" || field === "mobile2") {
      v = v.replace(/\D/g, "").slice(0, 10);
    }
    setSubEntities((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        data: { ...next[index].data, [field]: v },
      };
      return next;
    });
  };

  const removeSub = (index) => {
    setSubEntities((prev) => prev.filter((_, i) => i !== index));
  };

  const addSub = (type) => {
    setSubEntities([{ type, data: emptyContact() }]);
  };

  const field = (
    label,
    key,
    isSub = false,
    index = 0,
    disabled = false,
    required = false,
  ) => {
    const value = isSub ? subEntities[index].data[key] : mfr[key];
    const onChange = (val) =>
      isSub ? updSub(index, key, val) : updMfr(key, val);

    return (
      <div key={key}>
        <label className="block text-xs font-bold text-gray-900 mb-1">
          {label}{" "}
          {required && <span className="text-red-500 font-bold">*</span>}
        </label>
        <input
          value={value || ""}
          disabled={disabled}
          autoComplete="nope"
          maxLength={(key === "mobile1" || key === "mobile2") ? 10 : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-full px-3 py-2 border text-sm transition-all
            ${disabled ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-gray-50 border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 cursor-text"}`}
        />
      </div>
    );
  };

  const acField = (
    label,
    key,
    isSub = false,
    index = 0,
    disabled = false,
    required = false,
  ) => {
    const val = isSub ? subEntities[index].data[key] : mfr[key];
    const onCh = (v) => (isSub ? updSub(index, key, v) : updMfr(key, v));
    return (
      <AutocompleteInput
        label={label}
        value={val || ""}
        onChange={onCh}
        options={suggestions[key] || []}
        required={required}
        disabled={disabled}
        labelClassName="!text-xs !font-bold !text-gray-900"
      />
    );
  };

  const subTypes = getSubTypes(primaryTob);

  const validate = () => {
    const MANDATORY = [
      "companyName",
      "remarks",
      "contactPerson",
      "designation",
      "mobile1",
      "email1",
      "address1",
      "address2",
      "city",
      "pincode",
      "state",
      "country",
      "source",
      "productDetails",
      "segment",
    ];

    // Validate Primary
    for (const f of MANDATORY) {
      if (!mfr[f] || !mfr[f].trim()) {
        alert(`Primary ${f.replace(/([A-Z])/g, " $1")} is required`);
        return false;
      }
    }
    if (mfr.mobile1?.trim().length < 10) {
      alert("Primary Mobile No 1 must be at least 10 characters");
      return false;
    }

    // Validate Subs
    for (let i = 0; i < subEntities.length; i++) {
      const se = subEntities[i];
      for (const f of MANDATORY) {
        if (!se.data[f] || !se.data[f].trim()) {
          alert(
            `Associated ${se.type} ${f.replace(/([A-Z])/g, " $1")} is required`,
          );
          return false;
        }
      }
      if (se.data.mobile1?.trim().length < 10) {
        alert(
          `Associated ${se.type} Mobile No 1 must be at least 10 characters`,
        );
        return false;
      }
      // Duplicate check
      const primaryMobiles = [mfr.mobile1, mfr.mobile2].filter(Boolean);
      const subMobiles = [se.data.mobile1, se.data.mobile2].filter(Boolean);
      for (const sm of subMobiles) {
        if (primaryMobiles.includes(sm)) {
          alert(`Mobile number ${sm} is already used in primary contact`);
          return false;
        }
      }
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col mt-[4vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">
              {mfr.companyName || "Untitled Record"}
            </h2>
            <p className="text-xs text-gray-900 font-medium mt-1">
              Entered: {fmtTime(row._raw.dateOfEntry)} &nbsp;·&nbsp;
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${row._raw.entryType === "newlead" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}
              >
                {row._raw.entryType === "newlead"
                  ? "New Lead"
                  : "Existing Customer"}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer text-xl"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-8">
          {/* Section: Primary Details */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-1.5 h-4 rounded-full bg-red-600" />
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">
                Primary Component ({primaryTob})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {field("Company Name", "companyName", false, 0, false, true)}
              {field("Remarks", "remarks", false, 0, false, true)}
              {field("Contact Person", "contactPerson", false, 0, false, true)}
              {field("Designation", "designation", false, 0, false, true)}
              {field("Mobile No 1", "mobile1", false, 0, false, true)}
              {field("Mobile No 2", "mobile2")}
              {field("Land Line No", "landline")}
              {field("Email Id 1", "email1", false, 0, false, true)}
              {field("Email Id 2", "email2")}
              {field("Address 1", "address1", false, 0, false, true)}
              {field("Address 2", "address2", false, 0, false, true)}
              {field("Address 3", "address3")}
              {acField("City", "city", false, 0, false, true)}
              {acField("Pin Code", "pincode", false, 0, false, true)}
              {acField("State", "state", false, 0, false, true)}
              {acField("Country", "country", false, 0, false, true)}
              {field("Website", "website")}
              {acField("Source", "source", false, 0, false, true)}
              {field(
                "Product Details",
                "productDetails",
                false,
                0,
                false,
                true,
              )}
              <div key="segment-primary">
                <label className="block text-xs font-bold text-gray-900 mb-1">
                  Segment <span className="text-red-500 font-bold">*</span>
                </label>
                <select
                  value={mfr.segment || ""}
                  onChange={(e) => updMfr("segment", e.target.value)}
                  className="w-full rounded-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer hover:border-gray-400 transition-all font-normal"
                >
                  <option value="">-- Select --</option>
                  {segmentList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div key="tob-primary">
                <label className="block text-xs font-bold text-gray-900 mb-1">
                  Type of Business
                </label>
                <select
                  value={primaryTob}
                  onChange={(e) => updMfr("typeOfBusiness", e.target.value)}
                  className="w-full rounded-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm font-normal text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400 hover:border-gray-400 transition-all"
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="h-px bg-gray-100 w-full" />

          {/* Section: Associated Business */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-4 rounded-full bg-blue-500" />
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">
                  Associated Business
                </h3>
              </div>

              {subEntities.length === 0 && (
                <div className="flex gap-2">
                  {subTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => addSub(t)}
                      className="px-4 py-1.5 rounded-full border-2 border-dashed border-blue-200 text-blue-600 text-xs font-bold hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer"
                    >
                      + Add {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {subEntities.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-8 text-center">
                <p className="text-sm text-gray-900 font-bold italic">
                  No associated business added yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {subEntities.map((se, idx) => (
                  <div
                    key={idx}
                    className="bg-white border-2 border-dashed border-blue-100 rounded-3xl p-6 relative group overflow-hidden"
                  >
                    {/* Badge & Switcher */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                          Business Type:
                        </span>
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-full">
                          {subTypes.map((st) => (
                            <button
                              key={st}
                              onClick={() => {
                                const next = [...subEntities];
                                next[idx].type = st;
                                setSubEntities(next);
                              }}
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                se.type === st
                                  ? "bg-blue-500 text-white shadow-sm"
                                  : "text-gray-400 hover:text-gray-600"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => removeSub(idx)}
                        className="flex items-center gap-1.5 text-red-400 hover:text-red-700 text-xs font-black transition-colors cursor-pointer"
                      >
                        ✕ REMOVE
                      </button>
                    </div>

                    {/* Sub fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {field(
                        "Company Name",
                        "companyName",
                        true,
                        idx,
                        false,
                        true,
                      )}
                      {field("Remarks", "remarks", true, idx, false, true)}
                      {field(
                        "Contact Person",
                        "contactPerson",
                        true,
                        idx,
                        false,
                        true,
                      )}
                      {field(
                        "Designation",
                        "designation",
                        true,
                        idx,
                        false,
                        true,
                      )}
                      {field("Mobile No 1", "mobile1", true, idx, false, true)}
                      {field("Mobile No 2", "mobile2", true, idx)}
                      {field("Land Line No", "landline", true, idx)}
                      {field("Email Id 1", "email1", true, idx, false, true)}
                      {field("Email Id 2", "email2", true, idx)}
                      {field("Address 1", "address1", true, idx, false, true)}
                      {field("Address 2", "address2", true, idx, false, true)}
                      {field("Address 3", "address3", true, idx)}
                      {acField("City", "city", true, idx, false, true)}
                      {acField("Pin Code", "pincode", true, idx, false, true)}
                      {acField("State", "state", true, idx, false, true)}
                      {acField("Country", "country", true, idx, false, true)}
                      {field("Website", "website", true, idx)}
                      {acField("Source", "source", true, idx, false, true)}
                      {field(
                        "Product Details",
                        "productDetails",
                        true,
                        idx,
                        false,
                        true,
                      )}
                      <div key={`segment-sub-${idx}`}>
                        <label className="block text-xs font-bold text-gray-900 mb-1">
                          Segment{" "}
                          <span className="text-red-500 font-bold">*</span>
                        </label>
                        <select
                          value={se.data.segment || ""}
                          onChange={(e) =>
                            updSub(idx, "segment", e.target.value)
                          }
                          className="w-full rounded-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer hover:border-gray-400 transition-all font-normal"
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
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 py-6 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl">
          <button
            onClick={() => onDelete(row._raw.id)}
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-red-500 border-2 border-red-50 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑 Delete Record
          </button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-gray-300 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (validate()) {
                  onSave({
                    ...row._raw,
                    primary_details: mfr,
                    sub_entities: subEntities,
                    primary_type: primaryTob,
                  });
                }
              }}
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-white transition-all shadow-md hover:shadow-xl active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#e81c21,#c01519)" }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── History Modal (Modern Cards View) ─────────────────────────────────────────
const HistoryModal = ({ row, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const recordId = row._id;
  const companyTitle = row.companyName || row._raw?.primary_details?.companyName || "COMPANY";

  useEffect(() => {
    fetch(`${API_BASE_URL}/customer-followup?recordId=${recordId}`, {
      headers: { "ngrok-skip-browser-warning": "69420" },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setHistory(res.data || []);
      })
      .finally(() => setLoading(false));
  }, [recordId]);

  const groupedHistory = useMemo(() => {
    const groups = {};
    const sorted = [...history].sort((a, b) => {
       const dateA = new Date((a.submitted_at || "").replace(" ", "T"));
       const dateB = new Date((b.submitted_at || "").replace(" ", "T"));
       return dateB - dateA;
    });
    sorted.forEach((h) => {
      const expo = `${h.expo_name || ""} ${h.expo_year || ""}`.trim() || "General";
      const stage = h.followup_stage || "Unspecified Status";
      if (!groups[expo]) groups[expo] = {};
      if (!groups[expo][stage]) groups[expo][stage] = [];
      groups[expo][stage].push(h);
    });
    return Object.entries(groups).map(([expo, stages]) => [expo, Object.entries(stages)]);
  }, [history]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white">
          <div>
            <h2 className="text-xl font-bold">{companyTitle} History</h2>

          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-black hover:bg-black hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 text-xl">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-8 py-8 bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-[5px] border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[11px] font-black text-gray-500 tracking-widest uppercase">Fetching interaction trail...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">No history records found.</p>
            </div>
          ) : (
            <div className="space-y-12 pb-10">
              {groupedHistory.map(([expo, statusGroups], expoIdx) => (
                <div key={expo} className="space-y-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <div className="bg-white border-2 border-black px-6 py-2 rounded-full shadow-sm shrink-0">
                      <span className="text-[13px] font-black   text-black whitespace-nowrap">{expo}</span>
                    </div>
                    {expoIdx === 0 && (
                      <div className="bg-red-600 text-white text-[13px] font-black px-3 py-1.5 rounded-full shadow-md shrink-0">Latest Expo</div>
                    )}
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {statusGroups.map(([stage, items]) => (
                      <div key={stage} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 flex flex-col overflow-hidden h-fit">
                        <div className="bg-black text-white px-8 py-3.5 flex items-center justify-center gap-3">
                          <span className="text-[13px] font-black tracking-wide uppercase">{stage}</span>
                        </div>
                        <div className="flex flex-col">
                          {items.map((h, i) => (
                            <div key={i} className="p-8 border-b border-gray-100 last:border-0 hover:bg-gray-50/30 transition-colors">
                              <div className="flex flex-col gap-2 mb-4 border-b border-gray-100 pb-3">
                                <h4 className="text-[15px] font-bold text-black leading-tight">Business Type : {h.entity_type || "Primary"}</h4>
                                <span className="text-[13px]  ">Taken On : <span className="text-black">{fmtTime(h.submitted_at)}</span></span>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-black mb-4">
                                <div><span className="text-[13px] font-black  block mb-0.5">Contact Person</span><p className="text-sm truncate">{h.contact_person || "—"}</p></div>
                                <div><span className="text-[13px] font-black  block mb-0.5">Mobile No</span><p className="text-sm tabular-nums">{h.mobile_no || "—"}</p></div>
                                <div><span className="text-[13px] font-black  block mb-0.5">Next Follow-up</span><p className="text-sm">{h.next_followup_date ? fmt(h.next_followup_date) : "—"}</p></div>
                                <div><span className="text-[13px] font-black  block mb-0.5">Followup Mode</span><p className="text-sm">{h.next_follow_reason || "—"}</p></div>
                              </div>
                              <div className="pt-4 border-t border-gray-100"><span className="text-[14px]  block mb-2">Remarks</span><p className="text-sm font-medium leading-relaxed ">{h.remarks || "No interaction remarks."}</p></div>
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

// ─── Table Row Component ──────────────────────────────────────────────────────
const RecordRow = ({
  row,
  index,
  page,
  pageSize,
  colsToShow,
  onDetail,
  onHistory,
  navigate,
  followupToggle,
  leadTypeToggle,
}) => {
  const lastFollowup = row._raw.last_followup;
  // Initialize to last follow-up entity if exists, otherwise Primary (-1)
  const initialIdx = lastFollowup
    ? parseInt(lastFollowup.entity_idx ?? -1)
    : -1;
  const [activeIdx, setActiveIdx] = useState(initialIdx);

  // Sync activeIdx if row data changes (e.g. after a refresh or change in last_followup)
  useEffect(() => {
    setActiveIdx(initialIdx);
  }, [initialIdx]);

  const currentData =
    activeIdx === -1
      ? row._raw.primary_details
      : row._raw.sub_entities[activeIdx]?.data;

  const currentType =
    activeIdx === -1
      ? row._raw.primary_type || "Manufacturer"
      : row._raw.sub_entities[activeIdx]?.type;

  const totalFollowups = row._raw.total_followup_count || 0;
  let lastStatus = "Pending";
  if (lastFollowup?.followup_stage) {
    lastStatus = lastFollowup.followup_stage;
  } else if (totalFollowups > 0) {
    lastStatus = "Inprogress";
  }

  if (!currentData) return null;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-4 text-gray-400 text-xs font-mono border-r border-gray-100 italic">
        {(page - 1) * pageSize + index + 1}
      </td>
      <td className="px-4 py-4 text-gray-800 text-xs whitespace-nowrap border-r border-gray-100 font-medium">
        {(() => {
          const assignments = row._raw?.assignments;
          if (row._entryType === "existing" && assignments?.timestamp) {
            const d = assignments.timestamp.split(" ")[0]; // YYYY-MM-DD
            return d.split("-").reverse().join("/");
          }
          return row._dateOfEntry?.slice(0, 10).split("-").reverse().join("/");
        })()}
      </td>

      {/* History Column */}
      {leadTypeToggle !== "new" && (
        <td className="px-4 py-4 border-r border-gray-100 text-center">
          <button
            onClick={() => onHistory(row)}
            className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all hover:shadow-lg active:scale-95 cursor-pointer shadow-sm w-full"
            style={{ background: "linear-gradient(135deg,#e81c21,#c01519)" }}
          >
             History
          </button>
        </td>
      )}

      {colsToShow.map((c) => (
        <td
          key={c.key}
          className="px-4 py-4 text-gray-700 max-w-[220px] border-r border-gray-100"
        >
          {c.key === "companyName" ? (
            <div className="flex flex-col gap-2 py-1">
              {/* Entity Selectors (Horizontal) */}
              {row._raw.sub_entities?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setActiveIdx(-1)}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                      activeIdx === -1
                        ? "bg-red-600 text-white border-red-600 shadow-md"
                        : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    Primary
                  </button>
                  {row._raw.sub_entities.map((sub, sidx) => (
                    <button
                      key={sidx}
                      onClick={() => setActiveIdx(sidx)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                        activeIdx === sidx
                          ? "bg-blue-600 text-white border-blue-600 shadow-md"
                          : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      Secondary{" "}
                      {row._raw.sub_entities.length > 1 ? sidx + 1 : ""}
                    </button>
                  ))}
                </div>
              )}

              {/* Bold Company Name */}
              <div
                className={`font-bold truncate text-sm px-1 ${activeIdx === -1 ? "text-gray-900" : "text-blue-700"}`}
                title={currentData.companyName}
              >
                {currentData.companyName}
              </div>
            </div>
          ) : c.key === "typeOfBusiness" ? (
            <span
              className={`px-3 py-1 rounded-full text-[12px] font-black  ${
                activeIdx === -1
                  ? "bg-gray-100 text-gray-700 border border-gray-200"
                  : "bg-blue-100 text-blue-600 border border-blue-200"
              }`}
            >
              {currentType}
            </span>
          ) : (
            <span
              className={`truncate block text-sm ${activeIdx === -1 ? "font-medium text-gray-800" : "font-semibold text-blue-700"}`}
            >
              {currentData[c.key] || <span className="text-gray-200">—</span>}
            </span>
          )}
        </td>
      ))}

      {/* Latest Status Column */}
      {leadTypeToggle !== "new" && (
        <td className="px-4 py-4 border-r border-gray-100 text-center">
          <span
            className={`text-[12px] font-black  px-3 py-1 rounded-full border shadow-sm ${
              lastStatus === "Pending"
                ? "bg-gray-50 text-gray-400 border-gray-200"
                : lastStatus === "Confirmed"
                  ? "bg-green-100 text-green-700 border-green-200"
                  : "bg-blue-100 text-blue-700 border-blue-200"
            }`}
          >
            {lastStatus}
          </span>
        </td>
      )}

      <td className="px-4 py-4 border-r border-gray-100">
        {followupToggle !== "taken" && (
          <button
            onClick={() =>
              navigate("/Employee/followup", {
                state: { row, initialEntityIdx: activeIdx, sourcePage: "/Employee/CustomerData" },
              })
            }
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs text-nowrap font-bold border-2 transition-all cursor-pointer bg-white"
            style={
              row._followup?.status
                ? { borderColor: "#e81c21", color: "#e81c21" }
                : { borderColor: "#e5e7eb", color: "#6b7280" }
            }
          >
            📋 {row._followup?.status || "Followup"}
          </button>
        )}
      </td>
      <td className="px-4 py-4">
        <button
          onClick={() => onDetail(row)}
          className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all hover:shadow-lg active:scale-95 cursor-pointer shadow-sm w-full"
          style={{ background: "linear-gradient(135deg,#e81c21,#c01519)" }}
        >
          View
        </button>
      </td>
    </tr>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CustomerData() {
  const navigate = useNavigate();
  const {
    startLoading,
    stopLoading,
    isLoading: isGlobalLoading,
  } = useLoading();
  const { showToast } = useToast();

  const [allData, setAllData] = useState([]);
  const [records, setRecords] = useState([]);
  const [searchCol, setSearchCol] = useState("all");
  const [searchVal, setSearchVal] = useState("");
  const [visibleCols, setVisibleCols] = useState(() => {
    const saved = localStorage.getItem("utfi_visible_columns");
    return saved ? JSON.parse(saved) : DEFAULT_VISIBLE;
  });
  const [dynamicAllCols, setDynamicAllCols] = useState(() => {
    const saved = localStorage.getItem("utfi_columns_order");
    return saved ? JSON.parse(saved) : ALL_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("utfi_visible_columns", JSON.stringify(visibleCols));
    localStorage.setItem("utfi_columns_order", JSON.stringify(dynamicAllCols));
  }, [visibleCols, dynamicAllCols]);

  const [colDropdown, setColDropdown] = useState(false);
  const colDropdownRef = useRef(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [leadTypeToggle, setLeadTypeToggle] = useState("new"); // 'all', 'new', 'existing'
  const [followupToggle, setFollowupToggle] = useState("pending");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailRow, setDetailRow] = useState(null);
  const [historyRow, setHistoryRow] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [newNotifications, setNewNotifications] = useState([]);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    setIsLoading(true);
    startLoading();
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const userRole = userData.user?.role || "";
    const userId = userData.user?.id || null;
    const selectedExpoId = localStorage.getItem("utfi_current_expo_id");

    const result = await fetchLeads({
      page: 1,
      pageSize: 50000, // Fetch all records at once
      searchCol: "all",
      searchVal: "",
      fromDate: "",
      toDate: "",
      userRole,
      userId,
      followupStatus: "all",
      expos_id: selectedExpoId,
    });

    if (result.success) {
      // Backend already scopes records by userId & expos_id.
      // We only need to parse _expoStatus from followup_taken_expos.
      const expoId = parseInt(selectedExpoId) || 0;
      const decoded = result.data.map((rec) => {
        const followupTakenExpos = Array.isArray(rec.followup_taken_expos)
          ? rec.followup_taken_expos
          : [];
        const followupEntry = followupTakenExpos.find(
          (entry) =>
            parseInt(entry.expo_id) === expoId ||
            entry[String(expoId)] !== undefined ||
            entry[expoId] !== undefined,
        );

        let status = 0;
        if (followupEntry) {
          status =
            parseInt(followupEntry.expo_id) === expoId
              ? followupEntry.status
              : (followupEntry[String(expoId)] ?? followupEntry[expoId]);
        }

        return {
          ...rec,
          _expoStatus: parseInt(status || 0),
        };
      });

      const mapped = decoded.flatMap((rec) => flattenRecord(rec));
      setAllData(mapped);
    }

    // Load unread notifications for employee
    const notifs = loadNotifications().filter((n) => !n.read);
    setNewNotifications(notifs);
    if (notifs.length > 0) setShowNotifBanner(true);
    setIsLoading(false);
    stopLoading();
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    let filtered = [...allData];

    // Note: allData is already filtered in load() to show only pending followups (status 0)
    // The followupToggle is kept for UI consistency but all shown records are already status 0

    if (fromDate) {
      const fd = new Date(fromDate).getTime();
      filtered = filtered.filter((row) => {
        const rawDateStr = row._dateOfEntry
          ? row._dateOfEntry.split(" ")[0]
          : ""; // 'YYYY-MM-DD HH:mm:ss' to 'YYYY-MM-DD'
        if (!rawDateStr) return false;
        return new Date(rawDateStr).getTime() >= fd;
      });
    }
    if (toDate) {
      const td = new Date(toDate).getTime();
      filtered = filtered.filter((row) => {
        const rawDateStr = row._dateOfEntry
          ? row._dateOfEntry.split(" ")[0]
          : "";
        if (!rawDateStr) return false;
        return new Date(rawDateStr).getTime() <= td;
      });
    }

    if (searchVal.trim() !== "") {
      const lowerVal = searchVal.toLowerCase();
      filtered = filtered.filter((row) => {
        if (searchCol === "all") {
          return JSON.stringify(row._raw).toLowerCase().includes(lowerVal);
        } else {
          const val = row[searchCol] || "";
          return String(val).toLowerCase().includes(lowerVal);
        }
      });
    }

    const startIndex = (page - 1) * pageSize;

    // Filter by Lead Type (Home Expo vs Recycled)
    const currentExpoId =
      parseInt(localStorage.getItem("utfi_current_expo_id")) || 0;
    if (leadTypeToggle === "new") {
      filtered = filtered.filter((row) => row._raw.new_lead === 1);
    } else if (leadTypeToggle === "existing") {
      filtered = filtered.filter((row) => row._raw.new_lead === 0);
    }

    // Filter by Followup Status
    if (followupToggle === "pending") {
      filtered = filtered.filter(
        (row) => parseInt(row._raw._expoStatus || 0) === 0,
      );
    } else {
      filtered = filtered.filter(
        (row) => parseInt(row._raw._expoStatus || 0) !== 0,
      );
    }

    setTotalRecords(filtered.length);
    setTotalPages(Math.ceil(filtered.length / pageSize) || 1);
    setRecords(filtered.slice(startIndex, startIndex + pageSize));
  }, [
    allData,
    followupToggle,
    leadTypeToggle,
    fromDate,
    toDate,
    searchCol,
    searchVal,
    page,
    pageSize,
  ]);

  const newCount = useMemo(() => {
    const currentExpoId = parseInt(
      localStorage.getItem("utfi_current_expo_id"),
    );
    return allData.filter((r) => r._raw.new_lead === 1).length;
  }, [allData]);

  const existingCount = useMemo(() => {
    const currentExpoId = parseInt(
      localStorage.getItem("utfi_current_expo_id"),
    );
    return allData.filter((r) => r._raw.new_lead === 0).length;
  }, [allData]);

  const pendingCount = useMemo(() => {
    const currentExpoId = parseInt(
      localStorage.getItem("utfi_current_expo_id"),
    );
    let base = [...allData].filter((r) => r._raw._expoStatus === 0);
    if (leadTypeToggle === "new")
      base = base.filter((r) => r._raw.new_lead === 1);
    if (leadTypeToggle === "existing")
      base = base.filter((r) => r._raw.new_lead === 0);
    return base.length;
  }, [allData, leadTypeToggle]);

  const takenCount = useMemo(() => {
    const currentExpoId = parseInt(
      localStorage.getItem("utfi_current_expo_id"),
    );
    let base = [...allData].filter((r) => r._raw._expoStatus !== 0);
    if (leadTypeToggle === "new")
      base = base.filter((r) => r._raw.new_lead === 1);
    if (leadTypeToggle === "existing")
      base = base.filter((r) => r._raw.new_lead === 0);
    return base.length;
  }, [allData, leadTypeToggle]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        colDropdownRef.current &&
        !colDropdownRef.current.contains(e.target)
      ) {
        setColDropdown(false);
      }
    };
    if (colDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [colDropdown]);

  const dismissNotifBanner = () => {
    // Mark all as read
    const notifs = loadNotifications().map((n) => ({ ...n, read: true }));
    localStorage.setItem("crm_notifications", JSON.stringify(notifs));
    setShowNotifBanner(false);
    setNewNotifications([]);
  };

  const handleSave = async (updatedRec) => {
    startLoading("Updating Record...");
    try {
      const dataToSave = {
        id: updatedRec.id,
        primary_details: updatedRec.primary_details,
        sub_entities: updatedRec.sub_entities,
        primary_type: updatedRec.primary_type,
        status: updatedRec.status,
      };
      const result = await saveLead(dataToSave);
      if (result.success) {
        setDetailRow(null);
        showToast("Record updated!", "success");

        // Optimistic UI Update
        setAllData((prev) =>
          prev.map((rec) => {
            if (rec._id === updatedRec.id) {
              return {
                ...rec,
                ...updatedRec.primary_details,
                typeOfBusiness: updatedRec.primary_type,
                _entityType: updatedRec.primary_type,
                _raw: { ...rec._raw, ...updatedRec },
              };
            }
            return rec;
          }),
        );
      }
    } catch (e) {
      showToast("Failed to update record", "error");
    } finally {
      stopLoading();
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Move this record to inactive status for this exhibition?",
      )
    )
      return;
    startLoading("Archiving Lead...");
    try {
      const currentExpoId = localStorage.getItem("utfi_current_expo_id");
      const result = await deleteLead(id, currentExpoId);
      if (result.success) {
        setDetailRow(null);
        showToast("Record marked as inactive for this expo.", "success");

        // Optimistic UI Update
        setAllData((prev) => prev.filter((rec) => rec._id !== id));
        setTotalRecords((prev) => (prev > 0 ? prev - 1 : 0));
      } else {
        showToast(result.message || "Failed to delete record", "error");
      }
    } catch (e) {
      showToast("Failed to delete record", "error");
    } finally {
      stopLoading();
    }
  };

  const toggleCol = (key) => {
    setVisibleCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const reorderCol = (index, direction) => {
    const newCols = [...dynamicAllCols];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newCols.length) return;
    [newCols[index], newCols[targetIdx]] = [newCols[targetIdx], newCols[index]];
    setDynamicAllCols(newCols);
  };

  const [dragIdx, setDragIdx] = useState(null);
  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newCols = [...dynamicAllCols];
    const item = newCols.splice(dragIdx, 1)[0];
    newCols.splice(idx, 0, item);
    setDynamicAllCols(newCols);
    setDragIdx(null);
  };

  const goPage = (p) => setPage(Math.max(1, Math.min(totalPages, p)));
  const colsToShow = dynamicAllCols.filter((c) => visibleCols.includes(c.key));

  return (
    <div
      className="min-h-full"
      style={{ background: "linear-gradient(160deg,#f8f8f8 0%,#f1f1f1 100%)" }}
    >
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {/* Back */}
          <button
            onClick={() => navigate("/Employee/home")}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors cursor-pointer mr-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex items-center gap-2 mr-auto ml-1">
            <div
              className="w-1 h-7 rounded-full"
              style={{ background: "#e81c21" }}
            />
            <h1
              className="text-lg font-bold tracking-tight"
              style={{ color: "#1c1c1c" }}
            >
              Customer Data
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle — mobile only */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`md:hidden flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-sm
                ${showFilters ? "border-red-500 bg-red-500 text-white" : "border-gray-400 bg-gray-50 text-gray-900 hover:bg-gray-100"}
              `}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>

            {/* Refresh */}
            <button
              onClick={load}
              title="Refresh"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-400 bg-gray-50 text-xs font-bold text-gray-900 hover:bg-gray-100 transition-all cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>

            {/* Column selector */}
            <div className="relative" ref={colDropdownRef}>
              <button
                onClick={() => setColDropdown((p) => !p)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-400 bg-gray-50 text-xs font-bold text-gray-900 hover:bg-gray-100 transition-all cursor-pointer"
              >
                ⚙ Columns
              </button>
              {colDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 z-40">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase">
                      Columns Order
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto space-y-1">
                    {dynamicAllCols.map((c, idx) => (
                      <div
                        key={c.key}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        className={`flex items-center justify-between group px-2 py-1.5 rounded-xl border transition-all ${dragIdx === idx ? "opacity-30 scale-95 border-red-200" : "hover:bg-red-50/50 border-transparent"}`}
                      >
                        <div className="flex items-center gap-2 flex-1 cursor-move">
                          <svg
                            className="w-3 h-3 text-gray-300 group-hover:text-gray-400"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 9h8v2H8zm0 4h8v2H8z" />
                          </svg>
                          <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-gray-700">
                            <input
                              type="checkbox"
                              checked={visibleCols.includes(c.key)}
                              onChange={() => toggleCol(c.key)}
                              className="accent-red-500 cursor-pointer w-3.5 h-3.5"
                            />
                            {c.label}
                          </label>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => reorderCol(idx, -1)}
                            disabled={idx === 0}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-gray-400 disabled:opacity-10 cursor-pointer"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => reorderCol(idx, 1)}
                            disabled={idx === dynamicAllCols.length - 1}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-gray-400 disabled:opacity-10 cursor-pointer"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* closes relative/column-dropdown */}
          </div>
          {/* closes flex items-center gap-2 button group */}
        </div>
        {/* closes flex flex-wrap header row */}

        {/* Collapsible Filters Toolbar */}
        <div
          className={`overflow-hidden transition-all duration-300 md:!max-h-none md:!opacity-100 md:mt-4 md:border-t md:border-gray-100 md:pt-4 ${showFilters ? "max-h-[500px] mt-4 opacity-100 border-t border-gray-100 pt-4" : "max-h-0 opacity-0"}`}
        >
          <div className="flex flex-wrap items-center gap-4 justify-between">
            {/* Search with column selector */}
            <div className="flex items-center border border-gray-300 rounded-full bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-red-300 transition-all">
              <select
                value={searchCol}
                onChange={(e) => {
                  setSearchCol(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent border-r border-gray-300 text-xs text-gray-600 px-3 py-2 focus:outline-none cursor-pointer appearance-none"
                style={{ minWidth: "120px" }}
              >
                <option value="all">All Fields</option>
                {dynamicAllCols.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                value={searchVal}
                onChange={(e) => {
                  setSearchVal(e.target.value);
                  setPage(1);
                }}
                placeholder={
                  searchCol === "all"
                    ? "Search anything…"
                    : `Search ${dynamicAllCols.find((c) => c.key === searchCol)?.label}…`
                }
                className="bg-transparent text-sm px-3 py-2 focus:outline-none w-44 cursor-text"
              />
              {searchVal && (
                <button
                  onClick={() => setSearchVal("")}
                  className="pr-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Date Range Group */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-900 font-bold">
                <span>From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                    if (!e.target.value) setToDate("");
                  }}
                  className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-300 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-900 font-bold">
                <span>To:</span>
                <input
                  type="date"
                  value={toDate}
                  disabled={!fromDate}
                  min={fromDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className={`rounded-full border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-300 ${!fromDate ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                />
              </div>

              {(fromDate || toDate) && (
                <button
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setPage(1);
                  }}
                  className="text-gray-400 hover:text-red-500 cursor-pointer text-xs"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex bg-gray-100 rounded-full p-1 shadow-sm">
                <button
                  onClick={() => {
                    setLeadTypeToggle("new");
                    setPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                    leadTypeToggle === "new"
                      ? "bg-black text-white shadow shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  New Lead ({newCount})
                </button>
                <button
                  onClick={() => {
                    setLeadTypeToggle("existing");
                    setPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                    leadTypeToggle === "existing"
                      ? "bg-black text-white shadow shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Existing Lead ({existingCount})
                </button>
              </div>

              {/* Followup Status Toggle */}
              <div className="flex bg-gray-100 rounded-full p-1 shadow-sm">
                <button
                  onClick={() => {
                    setFollowupToggle("pending");
                    setPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                    followupToggle === "pending"
                      ? "bg-[#e81c21] text-white shadow shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Followup Pending{" "}
                  <span className="ml-[0.3vw]">({pendingCount})</span>
                </button>
                <button
                  onClick={() => {
                    setFollowupToggle("taken");
                    setPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                    followupToggle === "taken"
                      ? "bg-[#e81c21] text-white shadow shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Followup Taken{" "}
                  <span className="ml-[0.3vw]">({takenCount})</span>
                </button>
              </div>
            </div>
          </div>
          {/* end inner flex-wrap row */}
        </div>
        {/* end collapsible filters */}
      </div>
      {/* end sticky header */}

      {/* Notification Banner */}
      {showNotifBanner && newNotifications.length > 0 && (
        <div className="px-4 pt-3">
          <div className="rounded-2xl border overflow-hidden shadow-sm">
            {newNotifications.map((n, i) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 text-sm ${n.action === "active" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} ${i > 0 ? "border-t" : ""}`}
              >
                <span
                  className={`text-lg mt-0.5 ${n.action === "active" ? "text-green-600" : "text-red-500"}`}
                >
                  {n.action === "active" ? "✓" : "✕"}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    Lead {n.action === "active" ? "Accepted" : "Rejected"} —{" "}
                    {n.companyName}
                  </p>
                  {n.note && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Admin note: {n.note}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(n.timestamp).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            ))}
            <div
              className={`px-4 py-2 flex justify-end ${newNotifications[0]?.action === "active" ? "bg-green-50" : "bg-red-50"}`}
            >
              <button
                onClick={dismissNotifBanner}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer transition-colors"
              >
                Dismiss all ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="px-4 py-6">
        <div
          className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden"
          style={{ height: "70vh", display: "flex", flexDirection: "column" }}
        >
          <div className="overflow-x-auto flex-1 overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "#1c1c1c" }}>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-white border-r border-gray-700 whitespace-nowrap">
                    S.NO
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-white border-r border-gray-700 whitespace-nowrap">
                    Date
                  </th>
                  {leadTypeToggle !== "new" && (
                    <th className="text-left px-4 py-3.5 text-xs font-bold text-white border-r border-gray-700 whitespace-nowrap">
                      History
                    </th>
                  )}
                  {colsToShow.map((c) => (
                    <th
                      key={c.key}
                      className="text-left px-4 py-3.5 text-xs font-bold text-white border-r border-gray-700 whitespace-nowrap"
                    >
                      {c.label}
                    </th>
                  ))}
                  {leadTypeToggle !== "new" && (
                    <th className="text-left px-4 py-3.5 text-xs font-bold text-white border-r border-gray-700 whitespace-nowrap">
                      Latest Status
                    </th>
                  )}
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-white border-r border-gray-700 whitespace-nowrap">
                    Follow-up
                  </th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-white whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={
                        leadTypeToggle === "new"
                          ? colsToShow.length + 4
                          : colsToShow.length + 6
                      }
                      className="text-center py-16"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest animate-pulse">
                          Fetching Data...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        leadTypeToggle === "new"
                          ? colsToShow.length + 4
                          : colsToShow.length + 6
                      }
                      className="text-center py-16 text-gray-400 text-sm"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  records.map((row, i) => (
                    <RecordRow
                      key={row._id}
                      row={row}
                      index={i}
                      page={page}
                      pageSize={pageSize}
                      colsToShow={colsToShow}
                      onDetail={setDetailRow}
                      onHistory={(r) => setHistoryRow(r)}
                      navigate={navigate}
                      followupToggle={followupToggle}
                      leadTypeToggle={leadTypeToggle}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between px-5 py-4 border-t border-gray-100 gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-full border border-gray-300 px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="ml-2 text-gray-400">
                {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, totalRecords)} of {totalRecords}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {[
                { label: "«", action: () => goPage(1), disabled: page === 1 },
                {
                  label: "‹",
                  action: () => goPage(page - 1),
                  disabled: page === 1,
                },
              ].map(({ label, action, disabled }) => (
                <button
                  key={label}
                  onClick={action}
                  disabled={disabled}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {label}
                </button>
              ))}

              {(() => {
                const delta = 2;
                let start = Math.max(1, page - delta);
                let end = Math.min(totalPages, page + delta);
                if (end - start < delta * 2) {
                  if (start === 1)
                    end = Math.min(totalPages, start + delta * 2);
                  else start = Math.max(1, end - delta * 2);
                }
                const btns = [];
                if (start > 1) {
                  btns.push(
                    <button
                      key={1}
                      onClick={() => goPage(1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      1
                    </button>,
                  );
                  if (start > 2)
                    btns.push(
                      <span
                        key="dots-start"
                        className="w-6 text-center text-gray-400 text-xs select-none"
                      >
                        …
                      </span>,
                    );
                }
                for (let n = start; n <= end; n++) {
                  const active = n === page;
                  btns.push(
                    <button
                      key={n}
                      onClick={() => goPage(n)}
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-all cursor-pointer ${active ? "text-white shadow-md" : "text-gray-600 hover:bg-gray-100"}`}
                      style={
                        active
                          ? {
                              background:
                                "linear-gradient(135deg,#e81c21,#c01519)",
                            }
                          : {}
                      }
                    >
                      {n}
                    </button>,
                  );
                }
                if (end < totalPages) {
                  if (end < totalPages - 1)
                    btns.push(
                      <span
                        key="dots-end"
                        className="w-6 text-center text-gray-400 text-xs select-none"
                      >
                        …
                      </span>,
                    );
                  btns.push(
                    <button
                      key={totalPages}
                      onClick={() => goPage(totalPages)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      {totalPages}
                    </button>,
                  );
                }
                return btns;
              })()}

              {[
                {
                  label: "›",
                  action: () => goPage(page + 1),
                  disabled: page === totalPages,
                },
                {
                  label: "»",
                  action: () => goPage(totalPages),
                  disabled: page === totalPages,
                },
              ].map(({ label, action, disabled }) => (
                <button
                  key={label}
                  onClick={action}
                  disabled={disabled}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailRow && (
        <DetailModal
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          isLoading={isGlobalLoading}
        />
      )}

      {/* History Modal */}
      {historyRow && (
        <HistoryModal row={historyRow} onClose={() => setHistoryRow(null)} />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.22s ease-out; }
        button, select, input[type="checkbox"], input[type="radio"], input[type="date"] { cursor: pointer; }
      `}</style>
    </div>
  );
}
