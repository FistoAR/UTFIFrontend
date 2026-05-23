import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import AutocompleteInput from "../../components/AutocompleteInput";

// ─── helpers ────────────────────────────────────────────────────────────────
const cleanVal = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const BUSINESS_TYPES = ["Manufacturer", "Dealer", "Distributor"];

// Given the primary type, returns the two other types that can be added as sub-entities
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const saveToBackend = async (data) => {
  const response = await fetch(`${API_BASE_URL}/customer-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
};

// ─── InputField ──────────────────────────────────────────────────────────────
const InputField = ({ label, id, required, disabled, isInvalid, isLoading, ...rest }) => (
  <div className="relative">
    <label htmlFor={id} className={`block text-sm font-bold mb-1 transition-colors ${isInvalid ? "text-red-600" : "text-gray-900"}`}>
      {label} {required && <span className="text-red-600">*</span>}
    </label>
    <div className="relative">
      <input
        id={id}
        disabled={disabled}
        className={`w-full rounded-full px-4 py-2.5 border text-sm transition-all duration-200
          ${isInvalid ? "border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.05)]" : "bg-gray-50 border-gray-500 focus:ring-red-400 focus:border-red-400"}
          ${disabled
            ? "bg-gray-100 border-gray-300 text-red-600 font-semibold cursor-not-allowed"
            : "hover:border-gray-400 cursor-text focus:outline-none focus:ring-2"
          }`}
        {...rest}
      />
      {isLoading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-red-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-[10px] font-bold text-red-400 animate-pulse hidden sm:inline">Verifying</span>
        </div>
      )}
    </div>
  </div>
);

// ─── SelectField ─────────────────────────────────────────────────────────────
const SelectField = ({ label, id, required, options, value, onChange, isInvalid }) => (
  <div>
    <label htmlFor={id} className={`block text-sm font-bold mb-1 transition-colors ${isInvalid ? "text-red-600" : "text-gray-900"}`}>
      {label} {required && <span className="text-red-600">*</span>}
    </label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      autoComplete="nope"
      className={`w-full rounded-full px-4 py-2.5 border text-sm transition-all duration-200 appearance-none cursor-pointer focus:outline-none focus:ring-2
        ${isInvalid ? "border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500" : "border-gray-500 bg-gray-50 focus:ring-red-400 focus:border-red-400 hover:border-gray-400"}
      `}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23${isInvalid ? "ef4444" : "6b7280"}'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 1rem center",
        backgroundSize: "1rem",
        paddingRight: "2.5rem",
      }}
    >
      <option value="" disabled>-- Select --</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ─── ContactFormBlock ─────────────────────────────────────────────────────────
const ContactFormBlock = ({
  values, onChange, showExpo = false,
  showTypeOfBusiness = false, tobValue, onTobChange,
  compact = false,
  invalidFields = [], 
  onFieldTouch, 
  suggestions = {}, 
  dupWarnings = {}, 
  checkingFields = {},
  segmentList = []
}) => {
  const fld = (label, field, required = false, type = "text", maxLength) => {
    const fieldId = `${field}-${compact ? "sub" : "main"}`;
    const listId = suggestions[field] ? `list-${fieldId}` : undefined;
    const warning = dupWarnings[fieldId];
    const isLoading = checkingFields[fieldId];
    
    const handleChange = (val) => {
      if (type === "tel") {
        val = val.replace(/[^0-9]/g, "");
      }
      onChange(field, val);
      if (val.trim() && onFieldTouch) onFieldTouch(fieldId);
    };

    const isAutocompleteField = ["city", "pincode", "state", "country", "source"].includes(field);

    if (isAutocompleteField) {
      return (
        <div className="relative group">
          <AutocompleteInput
            label={label}
            id={fieldId}
            value={values[field]}
            onChange={handleChange}
            options={suggestions[field] || []}
            required={required}
            disabled={isLoading}
            isInvalid={invalidFields.includes(fieldId) || !!warning}
            onTouch={() => onFieldTouch && onFieldTouch(fieldId)}
          />
          {warning && !isLoading && (
            <div className="absolute left-2 -bottom-[2.5rem] z-20 flex items-center gap-1.5 p-1 px-3 bg-red-600 text-white text-[11px] font-semibold  rounded-full shadow-lg shadow-red-500/20 border-2 border-white animate-in slide-in-from-top-1">
              <span className="text-sm">⚠</span> {warning}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative group">
        <InputField
          key={field}
          label={label}
          id={fieldId}
          required={required}
          type={type}
          value={values[field]}
          isLoading={isLoading}
          isInvalid={invalidFields.includes(fieldId) || !!warning}
          onChange={(e) => handleChange(e.target.value)}
          maxLength={maxLength}
          autoComplete="nope"
        />
        {warning && !isLoading && (
          <div className="absolute left-2 -bottom-[2.5rem] z-20 flex items-center gap-1.5 p-1 px-3 bg-red-600 text-white text-[11px] font-semibold  rounded-full shadow-lg shadow-red-500/20 border-2 border-white animate-in slide-in-from-top-1">
            <span className="text-sm">⚠</span> {warning}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`grid gap-4 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
      {showExpo && (
        <InputField label="Expo Name" id="expo-name" disabled value={values.expoName} onChange={() => {}} />
      )}
      {fld("Company Name", "companyName", true)}
      {fld("Remarks", "remarks", true)}
      {fld("Contact Person", "contactPerson", true)}
      {fld("Designation", "designation", true)}
      {fld("Mobile No 1", "mobile1", true, "tel", 10)}
      {fld("Mobile No 2", "mobile2", false, "tel", 10)}
      {fld("Land Line No", "landline")}
      {fld("Email Id 1", "email1", true, "email")}
      {fld("Email Id 2", "email2", false, "email")}
      {fld("Address 1", "address1", true)}
      {fld("Address 2", "address2", true)}
      {fld("Address 3", "address3", false)}
      {fld("City", "city", true)}
      {fld("Pin Code", "pincode", true)}
      {fld("State", "state", true)}
      {fld("Country", "country", true)}
      {fld("Website", "website")}
      {fld("Source", "source", true)}
      {fld("Product Details", "productDetails", true, "text", 50)}

      <SelectField
        label="Segment"
        id={`segment-${compact ? "sub" : "main"}`}
        required
        options={segmentList}
        value={values.segment}
        isInvalid={invalidFields.includes(`segment-${compact ? "sub" : "main"}`)}
        onChange={(e) => {
          onChange("segment", e.target.value);
          if (onFieldTouch) onFieldTouch(`segment-${compact ? "sub" : "main"}`);
        }}
      />

      {showTypeOfBusiness && (
        <SelectField
          label="Type of Business"
          id="type-of-business-main"
          required
          options={BUSINESS_TYPES}
          value={tobValue}
          isInvalid={invalidFields.includes("type-of-business-main")}
          onChange={(e) => {
            if (onTobChange) onTobChange(e.target.value);
            if (onFieldTouch) onFieldTouch("type-of-business-main");
          }}
        />
      )}
    </div>
  );
};

// ─── SubEntityCard ────────────────────────────────────────────────────────────
const SubEntityCard = ({ 
  type, values, onChange, onRemove, onTypeChange, allowedTypes, 
  invalidFields, onFieldTouch, suggestions, dupWarnings, checkingFields,
  segmentList
}) => (
  <div className="border border-dashed border-gray-300 rounded-2xl p-5 bg-gray-50/50">
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-gray-900">Type:</span>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
          {allowedTypes.map((t) => {
            const colorMap = {
              Manufacturer: { active: "bg-gray-800 text-white shadow", label: "text-gray-400" },
              Dealer:       { active: "bg-blue-500 text-white shadow", label: "text-gray-400" },
              Distributor:  { active: "bg-purple-500 text-white shadow", label: "text-gray-400" },
            };
            return (
              <button
                key={t}
                type="button"
                onClick={() => onTypeChange(t)}
                className={`px-4 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  type === t ? colorMap[t].active : colorMap[t].label + " hover:text-gray-600"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center gap-1 text-red-400 hover:text-red-600 text-xs font-semibold transition-colors cursor-pointer bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full"
      >
        ✕ Remove
      </button>
    </div>
    <ContactFormBlock
      values={values}
      onChange={onChange}
      compact
      invalidFields={invalidFields}
      onFieldTouch={onFieldTouch}
      suggestions={suggestions}
      dupWarnings={dupWarnings}
      checkingFields={checkingFields}
      segmentList={segmentList}
    />
  </div>
);

// ─── NewLeadModal ─────────────────────────────────────────────────────────────
const NewLeadModal = ({ onConfirm, onCancel, isSubmitting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-5 mx-auto">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Submit New Lead?</h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        This entry will be added as a <span className="font-semibold text-red-600">New Lead</span> and will be visible to the admin.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={isSubmitting} className="flex-1 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={isSubmitting} className="flex-1 py-2.5 rounded-full text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-80 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #e81c21, #c01519)" }}>
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>SAVING...</span>
            </>
          ) : "Yes, Submit Lead"}
        </button>
      </div>
    </div>
  </div>
);


// ─── Badge colour helper ──────────────────────────────────────────────────────
const tobBadgeStyle = (type) => {
  if (type === "Dealer")       return { background: "#3b82f6" }; // blue
  if (type === "Distributor")  return { background: "#8b5cf6" }; // purple
  return { background: "#1c1c1c" };                               // dark (Manufacturer)
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NewLead() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("newlead");

  // Primary contact type of business
  const [primaryTob, setPrimaryTob] = useState("Manufacturer");
  const [mainData, setMainData] = useState({ ...emptyContact(), expoName: localStorage.getItem("utfi_current_expo_name") || "" });

  // Up to 1 sub-entity at a time (can be any of the two non-primary types)
  const [subEntity, setSubEntity] = useState(null); // null OR { type, data }
  const [invalidFields, setInvalidFields] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [dupWarnings, setDupWarnings] = useState({}); // { 'companyName-main': 'string', ... }
  const [checkingFields, setCheckingFields] = useState({}); // { 'companyName-main': true }
  const lastChecked = useRef({}); // { 'companyName-main': 'lastValue', ... }
  const [segmentList, setSegmentList] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingDup, setIsCheckingDup] = useState(false);
  const { showToast } = useToast();

  // ─── Debounced Duplicate Check ─────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      // Internal form conflict check (Local Duplicates)
      const newLocalWarnings = {};

      // Cleanup & Normalized comparison
      const mainM1 = cleanVal(mainData.mobile1);
      const mainM2 = cleanVal(mainData.mobile2);
      const mainCo = cleanVal(mainData.companyName);

      // Main Form local conflicts
      if (mainM1 && mainM1 === mainM2) {
        newLocalWarnings["mobile2-main"] = "Same as Mobile 1";
      }

      // Sub Entity vs Main conflicts
      if (subEntity) {
        const subM1 = cleanVal(subEntity.data.mobile1);
        const subM2 = cleanVal(subEntity.data.mobile2);
        const subCo = cleanVal(subEntity.data.companyName);

        if (subM1 && subM1 === subM2) {
          newLocalWarnings["mobile2-sub"] = "Same as Mobile 1";
        }
        if (subCo && subCo === mainCo) {
          newLocalWarnings["companyName-sub"] = "Same as Primary Company";
        }
        
        // Mobile cross-checks
        const mainPhones = [mainM1, mainM2].filter(Boolean);
        if (subM1 && mainPhones.includes(subM1)) {
          newLocalWarnings["mobile1-sub"] = "Used in Primary Contact";
        }
        if (subM2 && mainPhones.includes(subM2)) {
          newLocalWarnings["mobile2-sub"] = "Used in Primary Contact";
        }
      }

      const check = async (field, val, suffix) => {
        const fieldId = `${field}-${suffix}`;
        
        // If we already have a local warning, don't hit backend
        if (newLocalWarnings[fieldId]) {
          setDupWarnings(p => ({ ...p, [fieldId]: newLocalWarnings[fieldId] }));
          return;
        }

        if (lastChecked.current[fieldId] === val) return;
        lastChecked.current[fieldId] = val;

        if (!val || val.trim().length < 3) {
          setDupWarnings(p => { const n = { ...p }; delete n[fieldId]; return n; });
          setCheckingFields(p => { const n = { ...p }; delete n[fieldId]; return n; });
          return;
        }
        
        setCheckingFields(p => ({ ...p, [fieldId]: true }));
        try {
          const params = new URLSearchParams({ [field]: val });
          const res = await fetch(`${API_BASE_URL}/customer-data/check-duplicate?${params.toString()}`, {
            headers: { "ngrok-skip-browser-warning": "any" }
          });
          const data = await res.json();
          if (data.success && data.duplicate) {
            setDupWarnings(p => ({ ...p, [fieldId]: data.message }));
          } else {
            setDupWarnings(p => { const n = { ...p }; delete n[fieldId]; return n; });
          }
        } catch (e) { 
          console.error(e); 
        } finally {
          setCheckingFields(p => { const n = { ...p }; delete n[fieldId]; return n; });
        }
      };

      // Apply initial local warnings before async checks
      setDupWarnings(p => {
        const cleaned = { ...p };
        // Remove existing warnings that might be replaced by new local ones or backend ones
        Object.keys(newLocalWarnings).forEach(k => delete cleaned[k]);
        return { ...cleaned, ...newLocalWarnings };
      });

      // Check Main
      if (mainData.companyName) check("companyName", mainData.companyName, "main");
      if (mainData.mobile1)      check("mobile1",     mainData.mobile1,     "main");
      if (mainData.mobile2)      check("mobile2",     mainData.mobile2,     "main");
      
      // Check Sub
      if (subEntity) {
        if (subEntity.data.companyName) check("companyName", subEntity.data.companyName, "sub");
        if (subEntity.data.mobile1)      check("mobile1",     subEntity.data.mobile1,     "sub");
        if (subEntity.data.mobile2)      check("mobile2",     subEntity.data.mobile2,     "sub");
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [mainData.companyName, mainData.mobile1, mainData.mobile2, subEntity?.data.companyName, subEntity?.data.mobile1, subEntity?.data.mobile2]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/customer-data/suggestions`, {
          headers: { "ngrok-skip-browser-warning": "any" }
        });
        const data = await res.json();
        if (data.success) setSuggestions(data.suggestions);
      } catch (e) {
        console.error("Suggestions fetch error:", e);
      }
    };
    const fetchSegments = async () => {
      try {
        const currentExpoId = localStorage.getItem("utfi_current_expo_id");
        const res = await fetch(`${API_BASE_URL}/segments?expos_id=${currentExpoId || ""}`, {
          headers: { "ngrok-skip-browser-warning": "any" }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setSegmentList(data.map(s => s.segment));
        }
      } catch (e) {
        console.error("Segments fetch error:", e);
      }
    };
    fetchSuggestions();
    fetchSegments();
  }, []);

  const updateMain = (field, val) => setMainData((p) => ({ ...p, [field]: val }));

  // When primary type changes, clear sub-entity if its type is no longer in allowed sub-types
  const handlePrimaryTobChange = (newType) => {
    setPrimaryTob(newType);
    if (subEntity && !getSubTypes(newType).includes(subEntity.type)) {
      setSubEntity(null);
    }
  };


  const clearInvalidField = (id) => {
    setInvalidFields((prev) => prev.filter((f) => f !== id));
  };

  const handleSubmit = () => {
    if (isSubmitting || isCheckingDup) return;
    const missing = [];
    const MANDATORY = [
      "companyName", "contactPerson", "mobile1", "address1", "city",
      "pincode", "state", "country", "source", "productDetails", "segment",
      "remarks", "designation", "email1"
    ];

    // Check Main
    MANDATORY.forEach((f) => {
      if (!mainData[f] || !mainData[f].trim()) {
        const id = `${f}-main`;
        missing.push(id);
      }
    });
    if (!primaryTob) missing.push("type-of-business-main");

    // Check Sub
    if (subEntity) {
      MANDATORY.forEach((f) => {
        if (!subEntity.data[f] || !subEntity.data[f].trim()) {
          const id = `${f}-sub`;
          missing.push(id);
        }
      });
    }

    if (missing.length > 0) {
      setInvalidFields(missing);
      showToast("Please fill all mandatory fields", "error");
      setTimeout(() => {
        document.getElementById(missing[0])?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }

    // 1. Minimum 10 characters validation for mobile numbers
    const mobileFields = [
      { name: "Primary Mobile 1", val: mainData.mobile1 },
      { name: "Primary Mobile 2", val: mainData.mobile2 },
      ...(subEntity ? [
        { name: `${subEntity.type} Mobile 1`, val: subEntity.data.mobile1 },
        { name: `${subEntity.type} Mobile 2`, val: subEntity.data.mobile2 }
      ] : [])
    ];

    for (const f of mobileFields) {
      if (f.val && f.val.trim().length !== 10) {
        showToast(`${f.name} must be exactly 10 digits`, "error");
        return;
      }
    }

    // 2. Prevent submission if duplicate warnings exist
    const hasDuplicates = Object.keys(dupWarnings).length > 0;
    if (hasDuplicates) {
      showToast("Please resolve all duplicate warnings before submitting.", "error");
      const firstDupId = Object.keys(dupWarnings)[0];
      document.getElementById(firstDupId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // 2. Duplicate restriction: Primary vs Associated
    if (subEntity) {
      const primaryMobiles = [mainData.mobile1, mainData.mobile2].filter(Boolean);
      const subMobiles = [subEntity.data.mobile1, subEntity.data.mobile2].filter(Boolean);

      for (const sm of subMobiles) {
        if (primaryMobiles.includes(sm)) {
          showToast(`Mobile number ${sm} is already used in primary contact`, "error");
          return;
        }
      }
    }

    if (mode === "newlead") {
      // 3. Duplicate backend check
      const checkDuplicates = async () => {
        try {
          const params = new URLSearchParams({
            companyName: mainData.companyName,
            mobile1: mainData.mobile1,
            mobile2: mainData.mobile2
          });
          const res = await fetch(`${API_BASE_URL}/customer-data/check-duplicate?${params.toString()}`, {
            headers: { "ngrok-skip-browser-warning": "any" }
          });
          const data = await res.json();
          if (data.success && data.duplicate) {
            showToast(data.message, "error");
            return false;
          }
          return true;
        } catch (e) {
          console.error("Duplicate check error:", e);
          return true; // Proceed anyway on network error? Or block?
        }
      };

      setIsCheckingDup(true);
      checkDuplicates().then((canProceed) => {
        setIsCheckingDup(false);
        if (canProceed) setShowModal(true);
      }).catch(() => {
        setIsCheckingDup(false);
      });
    } else {
      doSave("existing");
    }
  };

  const doSave = async (entryType) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const record = {
      expos_id: localStorage.getItem("utfi_current_expo_id") || null, // Assuming you store ID in localStorage
      new_lead: entryType === "newlead" ? 1 : 0,
      primary_type: primaryTob,
      primary_details: mainData,
      sub_entities: subEntity ? [{ type: subEntity.type, data: subEntity.data }] : [],
      status: "active",
      employee_id: JSON.parse(localStorage.getItem("userData") || "{}")?.user?.id || null,
    };

    try {
      const result = await saveToBackend(record);
      if (result.success) {
        showToast(entryType === "newlead" ? "New lead submitted successfully!" : "Entry saved successfully!", "success");
        setMainData({ ...emptyContact(), expoName: localStorage.getItem("utfi_current_expo_name") || "" });
        setPrimaryTob("Manufacturer");
        setSubEntity(null);
        setInvalidFields([]);
      } else {
        showToast("Error: " + (result.message || "Failed to save record"), "error");
      }
    } catch (error) {
      console.error("Save error:", error);
      showToast("Backend connection error. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const subTypes = getSubTypes(primaryTob); // the two addable types

  return (
    <div className="min-h-full" style={{ background: "linear-gradient(160deg, #f8f8f8 0%, #f1f1f1 100%)" }}>

      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <div className="w-1.5 h-7 rounded-full ml-1" style={{ background: "#e81c21" }} />
            <h1 className="text-base sm:text-lg font-bold tracking-tight" style={{ color: "#1c1c1c" }}>Lead Entry</h1>
          </div>
          
          {/* Mobile only toggle if we want it next to title, but user said below */}
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 w-full sm:w-auto overflow-hidden">
          {[{ key: "existing", label: "Existing Customer" }, { key: "newlead", label: "New Lead" }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
                mode === key ? "text-white shadow-md" : "text-gray-500 hover:text-gray-700"
              }`}
              style={mode === key ? { background: "linear-gradient(135deg, #e81c21, #c01519)" } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-[95%] sm:max-w-[90%] mx-auto px-2 sm:px-4 py-6 sm:py-8">

        {/* Primary Contact Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <span
              className="px-3 py-1 rounded-full text-white text-xs font-bold"
              style={tobBadgeStyle(primaryTob)}
            >
              {primaryTob}
            </span>
            <span className="text-xs text-gray-400">Primary Contact</span>
          </div>
          <ContactFormBlock
            values={mainData}
            onChange={updateMain}
            showExpo={true}
            showTypeOfBusiness={true}
            tobValue={primaryTob}
            onTobChange={handlePrimaryTobChange}
            invalidFields={invalidFields}
            onFieldTouch={clearInvalidField}
            suggestions={suggestions}
            dupWarnings={dupWarnings}
            checkingFields={checkingFields}
            segmentList={segmentList}
          />
        </div>

        {/* Add Sub-Entity — shows the two types that are NOT the primary */}
        <div className="mb-8">
          <p className="text-md text-gray-600 font-medium mb-3">
            Add Associated Business
          </p>
          {!subEntity ? (
            <div className="flex flex-wrap gap-3">
              {subTypes.map((t) => {
                const colorClass = t === "Dealer"
                  ? "border-blue-300 text-blue-600 hover:bg-blue-50"
                  : t === "Distributor"
                  ? "border-purple-300 text-purple-600 hover:bg-purple-50"
                  : "border-gray-400 text-gray-700 hover:bg-gray-50";
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSubEntity({ type: t, data: emptyContact() })}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-dashed text-sm font-semibold transition-all cursor-pointer ${colorClass}`}
                  >
                    <span className="text-lg leading-none">+</span> Add {t}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <SubEntityCard
                type={subEntity.type}
                values={subEntity.data}
                onChange={(field, val) => setSubEntity((p) => ({ ...p, data: { ...p.data, [field]: val } }))}
                onRemove={() => { setSubEntity(null); setInvalidFields([]); }}
                onTypeChange={(t) => setSubEntity((p) => ({ ...p, type: t }))}
                allowedTypes={subTypes}
                invalidFields={invalidFields}
                onFieldTouch={clearInvalidField}
                suggestions={suggestions}
                dupWarnings={dupWarnings}
                checkingFields={checkingFields}
                segmentList={segmentList}
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-center sm:justify-end mb-10">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isCheckingDup}
            className="w-full sm:w-auto px-10 py-4 sm:py-3 rounded-full text-white font-bold text-sm tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-80 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #e81c21 0%, #c01519 100%)" }}
          >
            {isSubmitting || isCheckingDup ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{isCheckingDup ? "VERIFYING..." : "SAVING..."}</span>
              </>
            ) : (
              mode === "newlead" ? "SUBMIT NEW LEAD" : "REGISTER"
            )}
          </button>
        </div>
      </div>

      {showModal && (
        <NewLeadModal onConfirm={() => { setShowModal(false); doSave("newlead"); }} onCancel={() => setShowModal(false)} isSubmitting={isSubmitting} />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}