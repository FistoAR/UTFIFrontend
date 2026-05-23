import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLoading } from "../../context/LoadingContext";
import { useToast } from "../../context/ToastContext";

// ─── helpers ─────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowDateFmt = () =>
  new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
const nowTimeFmt = () =>
  new Date()
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const fetchFollowupHistory = async (recordId) => {
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

const saveFollowupEntry = async (entry, isEdit = false) => {
  const res = await fetch(`${API_BASE_URL}/customer-followup`, {
    method: isEdit ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "69420",
    },
    body: JSON.stringify(entry),
  });
  return res.json();
};

const FOLLOWUP_STAGES = [
  "Inprogress",
  "Not Interested",
  "Prospective",
  "Confirmed",
];
const NEXT_FOLLOW_REASONS = ["Tele Call", "Site Visit"];

// ─── Field ────────────────────────────────────────────────────────────────────
const Field = ({
  label,
  required,
  disabled,
  value,
  onChange,
  type = "text",
  id,
  placeholder,
}) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={id} className="text-sm text-black font-medium">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className={`rounded-full px-4 py-2.5 border text-sm transition-all
        ${
          disabled
            ? "bg-gray-100 border-gray-400 text-black cursor-not-allowed"
            : "bg-gray-100 border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white hover:border-gray-400 cursor-text text-black font-medium"
        }`}
    />
  </div>
);

// ─── AudioRecorder ────────────────────────────────────────────────────────────
const AudioRecorder = ({ onRecorded }) => {
  const [status, setStatus] = useState("idle");
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecorded?.(url);
      };
      mediaRef.current.start();
      setStatus("recording");
    } catch {
      /* mic denied */
    }
  };
  const stop = () => {
    mediaRef.current?.stop();
    setStatus("stopped");
  };
  const clear = () => {
    setAudioUrl(null);
    setStatus("idle");
    onRecorded?.(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-black font-medium">Voice Note</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={status === "recording"}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${status === "recording" ? "bg-red-100 text-red-400 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-gray-700"}`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zm-1 14.93V20H9v2h6v-2h-2v-2.07A8 8 0 0120 11h-2a6 6 0 01-12 0H4a8 8 0 007 7.93z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => audioUrl && new Audio(audioUrl).play()}
          disabled={!audioUrl}
          className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg
            className="w-4 h-4 ml-0.5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={stop}
          disabled={status !== "recording"}
          className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={!audioUrl}
          className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-red-600 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 3h6l1 1h4v2H4V4h4l1-1zM5 7h14l-1.5 13.5A1 1 0 0116.5 21h-9a1 1 0 01-1-1.5L5 7zm5 3v7h1v-7h-1zm3 0v7h1v-7h-1z" />
          </svg>
        </button>
      </div>
      {status === "recording" && (
        <span className="text-xs text-red-500 font-medium animate-pulse">
          ● Recording…
        </span>
      )}
      {audioUrl && (
        <audio
          src={audioUrl}
          controls
          className="h-8 w-full mt-1 rounded-full"
        />
      )}
    </div>
  );
};

// ─── Unsaved Modal ────────────────────────────────────────────────────────────
const UnsavedModal = ({ onStay, onLeave }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm animate-fadeIn">
      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-6 h-6 text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-center text-black mb-1">
        Unsaved Changes
      </h2>
      <p className="text-sm text-black text-center mb-6">
        You have unsaved changes. Are you sure you want to exit?
      </p>
      <div className="flex gap-3">
        <button
          onClick={onStay}
          className="flex-1 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-black hover:bg-gray-50 cursor-pointer"
        >
          Stay
        </button>
        <button
          onClick={onLeave}
          className="flex-1 py-2.5 rounded-full text-white text-sm font-bold cursor-pointer"
          style={{ background: "linear-gradient(135deg,#e81c21,#c01519)" }}
        >
          Leave
        </button>
      </div>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CustomerFollowup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startLoading, stopLoading } = useLoading();
  const { showToast } = useToast();
  const passedRow = location.state?.row;
  const cameFromSiteVisit = location.state?.fromReason === "Site Visit";
  const _isEditMode = passedRow?._isEditMode || false;
  const _followupId = passedRow?._followupId;

  const [record, setRecord] = useState(null);
  const [selectedEntityIdx, setSelectedEntityIdx] = useState(-1); // -1: primary_details, 0+: sub_entities[idx]

  const entityData = record
    ? selectedEntityIdx === -1
      ? record.primary_details
      : record.sub_entities?.[selectedEntityIdx]?.data
    : null;

  const [savedContacts, setSavedContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactPerson, setContactPerson] = useState("");
  const [designation, setDesignation] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [emailId, setEmailId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [city, setCity] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [productDetails, setProductDetails] = useState("");
  const [source, setSource] = useState("");
  const [typeOfBusiness, setTypeOfBusiness] = useState("");
  const [followupStage, setFollowupStage] = useState("Inprogress");
  const [nextFollowupDate, setNextFollowupDate] = useState(todayStr());
  const [nextFollowReason, setNextFollowReason] = useState(
    cameFromSiteVisit ? "Site Visit" : "Tele Call",
  );
  const [siteVisitLocation, setSiteVisitLocation] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [segment, setSegment] = useState("");
  const [segmentsList, setSegmentsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedRef = useRef(false);

  // Combine loading and submitting for global disabled state
  const isFormDisabled = isLoading || isSubmitting;

  useEffect(() => {
    const t = setInterval(() => {}, 60000);
    return () => clearInterval(t);
  }, []);

  const buildPrefill = (rec, idx, hist) => {
    const regData =
      idx === -1 ? rec.primary_details : rec.sub_entities?.[idx]?.data;
    if (!regData) return {};
    const h = hist.length > 0 ? hist[hist.length - 1] : null;

    return {
      // Contact fields — prefer latest followup history
      contactPerson: h?.contact_person || regData.contactPerson || "",
      designation: h?.designation || regData.designation || "",
      mobileNo: h?.mobile_no || regData.mobile1 || "",
      emailId: h?.email_id || regData.email1 || "",

      // Master data fields — ALWAYS load from customer record, not from followup
      city: regData.city || "",
      website: regData.website || "",
      source: regData.source || "",
      segment: regData.segment || "",
      typeOfBusiness:
        idx === -1
          ? rec.primary_type || "Manufacturer"
          : rec.sub_entities?.[idx]?.type || "",
      companyEmail: regData.email1 || "",
      productDetails: regData.productDetails || "",
    };
  };

  const applyPrefill = (data) => {
    setCity(data.city || "");
    setWebsite(data.website || "");
    setSource(data.source || "");
    setSegment(data.segment || "");
    setTypeOfBusiness(data.typeOfBusiness || "");
    setCompanyEmail(data.companyEmail || "");
    setContactPerson(data.contactPerson || "");
    setDesignation(data.designation || "");
    setMobileNo(data.mobileNo || "");
    setEmailId(data.emailId || "");
    setProductDetails(data.productDetails || "");
  };

  useEffect(() => {
    if (!passedRow?._raw) return;
    const rec = passedRow._raw;
    const initIdx = location.state?.initialEntityIdx ?? -1;

    setRecord(rec);
    setSelectedEntityIdx(initIdx);

    const initLoad = async () => {
      startLoading();
      setIsLoading(true);
      try {
        // Fetch segments
        const currentExpoId = localStorage.getItem("utfi_current_expo_id");
        const segRes = await fetch(`${API_BASE_URL}/segments?expos_id=${currentExpoId || ""}`, {
          headers: { "ngrok-skip-browser-warning": "69420" },
        });
        const segData = await segRes.json();
        if (Array.isArray(segData)) setSegmentsList(segData);

        const hist = await fetchFollowupHistory(rec.id);
        const prefillData = buildPrefill(rec, initIdx, hist);
        applyPrefill(prefillData);

        // Clear contact fields as per request for new followups (user must select or type manually)
        if (!_isEditMode) {
          setContactPerson("");
          setDesignation("");
          setMobileNo("");
          setEmailId("");
        }

        const targetType = initIdx === -1 ? (rec.primary_type || "Manufacturer") : rec.sub_entities?.[initIdx]?.type;
        const contacts = [];
        hist.forEach((h) => {
          const hIdx = h.entity_idx !== undefined && h.entity_idx !== null ? parseInt(h.entity_idx) : -1;
          const hType = h.entity_type || h.type_of_business || "";
          
          if (hIdx === initIdx || hType === targetType) {
            const cp = h.contact_person || h.contactPerson;
            const mn = h.mobile_no || h.mobileNo;
            if (cp && mn) {
              const key = `${cp}__${mn}`;
              if (!contacts.find((c) => c.key === key))
                contacts.push({
                  key,
                  contactPerson: cp,
                  designation: h.designation,
                  mobileNo: mn,
                  emailId: h.email_id || h.emailId,
                });
            }
          }
        });
        setSavedContacts(contacts);

        if (_isEditMode && _followupId) {
          // Prefill all interaction details exactly as it was!
          const target =
            hist.find((h) => h.id == _followupId) || hist[hist.length - 1];
          if (target) {
            setRemarks(target.remarks || "");
            setFollowupStage(target.followup_stage || "Inprogress");
            setNextFollowReason(target.next_follow_reason || "Tele Call");
            if (target.next_followup_date)
              setNextFollowupDate(target.next_followup_date.substring(0, 10));
            setSiteVisitLocation(target.site_visit_location || "");

            // Re-populate contact info for the edit view
            setContactPerson(
              target.contact_person || target.contactPerson || "",
            );
            setDesignation(target.designation || "");
            setMobileNo(target.mobile_no || target.mobileNo || "");
            setEmailId(target.email_id || target.emailId || "");
          }
        }
      } finally {
        setTimeout(() => {
          initializedRef.current = true;
        }, 100);
        setIsLoading(false);
        stopLoading();
      }
    };

    initLoad();
  }, [passedRow]);

  // Track dirty state
  useEffect(() => {
    if (!initializedRef.current) return;
    setIsDirty(true);
  }, [
    remarks,
    contactPerson,
    designation,
    mobileNo,
    emailId,
    city,
    companyEmail,
    website,
    source,
    followupStage,
    nextFollowupDate,
    nextFollowReason,
    siteVisitLocation,
  ]);

  const handleEntityChange = async (idx) => {
    if (idx === selectedEntityIdx) return;
    if (isDirty) {
      if (!window.confirm("Switch business? You have unsaved changes.")) return;
    }
    const rec = record;
    if (!rec) return;

    setSelectedEntityIdx(idx);
    setIsDirty(false);
    initializedRef.current = false;

    startLoading();
    setIsLoading(true);
    try {
      const hist = await fetchFollowupHistory(rec.id);
      const data = buildPrefill(rec, idx, hist);
      applyPrefill(data);

      const targetType = idx === -1 ? (rec.primary_type || "Manufacturer") : rec.sub_entities?.[idx]?.type;
      const contacts = [];
      hist.forEach((h) => {
        const hIdx = h.entity_idx !== undefined && h.entity_idx !== null ? parseInt(h.entity_idx) : -1;
        const hType = h.entity_type || h.type_of_business || "";
        
        if (hIdx === idx || hType === targetType) {
          const cp = h.contact_person || h.contactPerson;
          const mn = h.mobile_no || h.mobileNo;
          if (cp && mn) {
            const key = `${cp}__${mn}`;
            if (!contacts.find((c) => c.key === key))
              contacts.push({
                key,
                contactPerson: cp,
                designation: h.designation,
                mobileNo: mn,
                emailId: h.email_id || h.emailId,
              });
          }
        }
      });
      setSavedContacts(contacts);
      setSelectedContact(null);

      if (!_isEditMode) {
        setContactPerson("");
        setDesignation("");
        setMobileNo("");
        setEmailId("");
      }
    } finally {
      setIsLoading(false);
      stopLoading();
      setTimeout(() => {
        initializedRef.current = true;
      }, 100);
    }
  };

  const handleApplyExistingContact = () => {
    const data =
      selectedEntityIdx === -1
        ? record?.primary_details
        : record?.sub_entities?.[selectedEntityIdx]?.data;
    if (!data) return;
    setContactPerson(data.contactPerson || "");
    setDesignation(data.designation || "");
    setMobileNo(data.mobile1 || "");
    setEmailId(data.email1 || "");
  };

  const handleSelectContact = (c) => {
    setSelectedContact(c.key);
  };

  const handleApplySavedContact = () => {
    const c = savedContacts.find((sc) => sc.key === selectedContact);
    if (!c) return;
    setContactPerson(c.contactPerson);
    setDesignation(c.designation);
    setMobileNo(c.mobileNo);
    setEmailId(c.emailId);
  };

  const handleAddNewContact = () => {
    setSelectedContact(null);
    setContactPerson("");
    setDesignation("");
    setMobileNo("");
    setEmailId("");
  };

  const handleBack = () => {
    if (isDirty) setShowUnsaved(true);
    else navigate(-1);
  };

  const detectChanges = (current, prev) => {
    // If no previous followup, compare with master data
    const comparisonTarget =
      prev ||
      (selectedEntityIdx === -1
        ? record?.primary_details
        : record?.sub_entities?.[selectedEntityIdx]?.data) ||
      {};

    // Normalize keys since master data might use different names (e.g. email1 vs email_id)
    const normalizedTarget = {
      contactPerson:
        comparisonTarget.contactPerson || comparisonTarget.contact_person || "",
      designation: comparisonTarget.designation || "",
      mobileNo: comparisonTarget.mobile1 || comparisonTarget.mobile_no || "",
      emailId: comparisonTarget.email1 || comparisonTarget.email_id || "",
      city: comparisonTarget.city || "",
      companyEmail:
        comparisonTarget.company_email || comparisonTarget.email1 || "",
      website: comparisonTarget.website || "",
      source: comparisonTarget.source || "",
      segment: comparisonTarget.segment || "",
      productDetails:
        comparisonTarget.productDetails ||
        comparisonTarget.product_details ||
        "",
      typeOfBusiness:
        comparisonTarget.typeOfBusiness ||
        comparisonTarget.type_of_business ||
        (selectedEntityIdx === -1 ? record?.primary_type : record?.sub_entities?.[selectedEntityIdx]?.type) ||
        "",
    };

    const currentWithAll = {
      ...current,
      segment,
      productDetails,
      typeOfBusiness,
    };

    const changes = {};
    [
      "contactPerson",
      "designation",
      "mobileNo",
      "emailId",
      "city",
      "companyEmail",
      "website",
      "source",
      "segment",
      "productDetails",
      "typeOfBusiness",
    ].forEach((f) => {
      const currentVal = String(currentWithAll[f] || "").trim();
      const targetVal = String(normalizedTarget[f] || "").trim();
      if (currentVal !== targetVal) {
        changes[f] = { from: targetVal, to: currentVal };
      }
    });
    return changes;
  };

  const handleSubmit = async () => {
    if (!record || isSubmitting) return;

    // 1. Start loading immediately to provide instant feedback
    setIsSubmitting(true);
    startLoading(_isEditMode ? "Updating..." : "Saving...");

    try {
      const errors = [];
      if (!remarks.trim()) errors.push("Remarks");
      if (!contactPerson.trim()) errors.push("Contact Person");
      if (!designation.trim()) errors.push("Designation");
      if (!mobileNo.trim()) errors.push("Mobile No");
      if (!city.trim()) errors.push("City");
      if (!source.trim()) errors.push("Source");
      if (!productDetails.trim()) errors.push("Product Details");
      if (
        !nextFollowupDate &&
        followupStage !== "Confirmed" &&
        followupStage !== "Not Interested"
      )
        errors.push("Next Followup Date");

      if (errors.length) {
        showToast(`Required: ${errors.join(", ")}`, "error");
        setIsSubmitting(false);
        stopLoading();
        return;
      }

      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      const employeeId = userData.user?.id || null;

      const hist = await fetchFollowupHistory(record.id);
      const prevEntry = hist.length > 0 ? hist[hist.length - 1] : null;
      const currentFields = {
        contactPerson,
        designation,
        mobileNo,
        emailId,
        city,
        companyEmail,
        website,
        source,
        productDetails,
        typeOfBusiness,
      };

      const recordId = record.customer_data_id || record.id;
      const currentExpoId = localStorage.getItem("utfi_current_expo_id");
      const changes = detectChanges(currentFields, prevEntry);
      if (Object.keys(changes).length > 0) {
        changes.updated = false;
      }

      let finalExposId = currentExpoId ? parseInt(currentExpoId) : null;
      if (!finalExposId && record.expos_id) {
        try {
          // If it's a JSON string, parse it; if already an array, use it
          const parsedExpos = typeof record.expos_id === 'string' ? JSON.parse(record.expos_id) : record.expos_id;
          if (Array.isArray(parsedExpos) && parsedExpos.length > 0) {
            finalExposId = parseInt(parsedExpos[0]);
          } else if (!isNaN(parseInt(record.expos_id))) {
            finalExposId = parseInt(record.expos_id);
          }
        } catch (e) {
          if (!isNaN(parseInt(record.expos_id))) {
            finalExposId = parseInt(record.expos_id);
          }
        }
      }

      const entry = {
        recordId: recordId,
        employeeId,
        expos_id: finalExposId,
        entityIdx: selectedEntityIdx,
        entityType:
          selectedEntityIdx === -1
            ? record.primary_type || "Manufacturer"
            : record.sub_entities?.[selectedEntityIdx]?.type,
        contactPerson,
        designation,
        mobileNo,
        emailId,
        remarks,
        city,
        companyEmail,
        website,
        productDetails,
        source,
        typeOfBusiness,
        segment,
        followupStage,
        nextFollowupDate,
        nextFollowReason,
        siteVisitLocation:
          nextFollowReason === "Site Visit" ? siteVisitLocation : "",
        audioUrl,
        field_changes: changes,
      };
      if (_isEditMode && _followupId) {
        entry.followup_id = _followupId;
      }

      // ── If Confirmed: don't save followup now, pass it to registration page ──
      if (followupStage === "Confirmed") {
        setIsDirty(false);
        stopLoading();
        setIsSubmitting(false);
        navigate("/Employee/ConfirmedFollowup", {
          state: { entry, record, pendingFollowup: entry, sourcePage: location.state?.sourcePage },
        });
        return;
      }

      // ── For other stages: save followup immediately ──
      const res = await saveFollowupEntry(entry, _isEditMode);
      if (res.success) {
        setIsDirty(false);
        showToast(
          _isEditMode
            ? "Follow-up updated successfully!"
            : "Follow-up saved successfully!",
        );
        setTimeout(() => navigate(-1), 1500);
      } else {
        showToast(res.message || "Failed to save follow-up", "error");
        setIsSubmitting(false);
      }
    } catch (e) {
      showToast("Network error", "error");
      setIsSubmitting(false);
    } finally {
      stopLoading();
    }
  };

  const expoName = record?.primary_details?.expoName || "—";
  const companyName =
    entityData?.companyName || record?.primary_details?.companyName || "—";
  // Banner always shows the selected entity's contact details
  const entityContactForBanner =
    selectedEntityIdx === -1
      ? record?.primary_details
      : record?.sub_entities?.[selectedEntityIdx]?.data;

  const entityOptions = record
    ? [
        {
          idx: -1,
          label: record.primary_type || "Manufacturer",
          color: "#1c1c1c",
        },
        ...(record.sub_entities || []).map((se, i) => ({
          idx: i,
          label: se.type,
          color: se.type === "Dealer" ? "#3b82f6" : "#8b5cf6",
        })),
      ]
    : [];

  const showLocationField =
    nextFollowReason === "Site Visit" || cameFromSiteVisit;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            disabled={isFormDisabled}
            className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100 transition-all cursor-pointer disabled:opacity-50"
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
          </button>
          <h1 className="text-xl font-semibold text-black">
            Customer Follow-Up
          </h1>
        </div>
        <div className="text-sm sm:text-right flex flex-row sm:flex-col gap-2 sm:gap-0 pl-12 sm:pl-0">
          <span className="text-blue-600 font-semibold">
            Date: {nowDateFmt()}
          </span>
          <span className="hidden sm:inline mx-3 text-gray-300">|</span>
          <span className="text-green-600 font-semibold">
            Time: {nowTimeFmt()}
          </span>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-10 max-w-[95%] mx-auto space-y-6">
        {/* Entity selector */}
        {entityOptions.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-black font-medium">
              Select Business:
            </span>
            {entityOptions.map((e) => (
              <button
                key={e.idx}
                type="button"
                onClick={() => handleEntityChange(e.idx)}
                disabled={isFormDisabled}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-2 ${
                  selectedEntityIdx === e.idx
                    ? "text-white border-transparent shadow-md"
                    : "bg-white border-gray-200 text-black hover:border-gray-400"
                } ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                style={
                  selectedEntityIdx === e.idx ? { background: e.color } : {}
                }
              >
                {e.label}
              </button>
            ))}
          </div>
        )}

        {/* Top row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field
            label="Event name"
            value={expoName}
            onChange={() => {}}
            disabled
          />
          <Field
            label="Company Name"
            required
            value={companyName}
            onChange={() => {}}
            disabled
          />
          <Field
            label="Remarks"
            required
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={isFormDisabled}
          />
        </div>

        {/* Existing contact details — changes based on selected entity */}
        {entityContactForBanner && (
          <div className="bg-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-300 mb-3">
              <p className="font-bold text-black text-sm">
                Existing contact details
                <span className="ml-2 text-xs font-bold text-black">
                  (
                  {selectedEntityIdx === -1
                    ? record?.primary_type || "Manufacturer"
                    : record?.sub_entities?.[selectedEntityIdx]?.type || ""}
                  )
                </span>
              </p>
              <button
                type="button"
                onClick={handleApplyExistingContact}
                disabled={isFormDisabled}
                className="px-3 py-1 rounded-full text-xs font-bold text-white cursor-pointer transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg,#e81c21,#c01519)",
                }}
              >
                Apply
              </button>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-black">
              <span>
                <strong>👤 Contact Person:</strong>{" "}
                {entityContactForBanner.contactPerson || "—"}
              </span>
              <span>
                <strong>💼 Designation:</strong>{" "}
                {entityContactForBanner.designation || "—"}
              </span>
              <span>
                <strong>📞 Mobile:</strong>{" "}
                {entityContactForBanner.mobile1 ||
                  entityContactForBanner.mobileNo ||
                  "—"}
                {entityContactForBanner.mobile2
                  ? ` / ${entityContactForBanner.mobile2}`
                  : ""}
              </span>
              <span>
                <strong>✉ Email:</strong>{" "}
                {entityContactForBanner.email1 ||
                  entityContactForBanner.emailId ||
                  "—"}
              </span>
            </div>
          </div>
        )}

        {/* Existing Contacts from history */}
        {savedContacts.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
            <div className="flex items-center justify-between pb-2 border-b border-orange-200 mb-3">
              <p className="font-bold text-black text-sm">
                Existing Contacts <span className="text-red-500">*</span>
              </p>
              <button
                type="button"
                onClick={handleApplySavedContact}
                disabled={!selectedContact || isFormDisabled}
                className="px-3 py-1 rounded-full text-xs font-bold text-white cursor-pointer transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg,#e81c21,#c01519)",
                }}
              >
                Apply Selected
              </button>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              {savedContacts.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="radio"
                    name="existingContact"
                    checked={selectedContact === c.key}
                    disabled={isFormDisabled}
                    onChange={() => handleSelectContact(c)}
                    className="accent-red-500 w-4 h-4 cursor-pointer disabled:opacity-50"
                  />
                  <span className="text-black font-bold">
                    {c.contactPerson} ({c.mobileNo})
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddNewContact}
              disabled={isFormDisabled}
              className="w-full py-2.5 rounded-full text-white text-sm font-semibold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#e81c21,#c01519)" }}
            >
              Add New Contact
            </button>
          </div>
        )}

        {/* Contact Section */}
        <div className="bg-blue-50/40 p-5 rounded-3xl border border-blue-100 shadow-sm">
          <p className="text-sm text-black font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
            Contact Section
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Field
              label="Contact Person"
              required
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              disabled={isFormDisabled}
            />
            <Field
              label="Designation"
              required
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              disabled={isFormDisabled}
            />
            <Field
              label="Mobile No"
              required
              value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value)}
              type="tel"
              disabled={isFormDisabled}
            />
            <Field
              label="Email ID"
              value={emailId}
              onChange={(e) => setEmailId(e.target.value)}
              type="email"
              disabled={isFormDisabled}
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field
            label="City"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={isFormDisabled}
          />
          <Field
            label="Company Email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
            type="email"
            disabled={isFormDisabled}
          />
          <Field
            label="Website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={isFormDisabled}
          />
          <Field
            label="Product Details"
            value={productDetails}
            onChange={(e) => setProductDetails(e.target.value)}
            maxLength={50}
            required
            disabled={isFormDisabled}
          />
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <Field
            label="Source"
            required
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={isFormDisabled}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm text-black font-bold">
              Type of Business
            </label>
            <input
              value={typeOfBusiness || "—"}
              disabled
              className="rounded-full px-4 py-2.5 border border-gray-400 bg-gray-100 text-sm text-black font-medium cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-black font-bold">Segment</label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              disabled={isFormDisabled}
              className={`rounded-full px-4 py-2.5 border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white bg-gray-100 border-gray-600 font-medium text-black`}
            >
              <option value="">Select Segment</option>
              {segmentsList.map((s) => (
                <option key={s.id} value={s.segment}>
                  {s.segment}
                </option>
              ))}
            </select>
          </div>
          <AudioRecorder onRecorded={setAudioUrl} />
        </div>

        {/* Followup Stage + Date + Reason */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div>
            <p className="text-sm text-black font-bold mb-2">
              Followup Stage <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FOLLOWUP_STAGES.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="radio"
                    name="followupStage"
                    value={s}
                    checked={followupStage === s}
                    disabled={isFormDisabled}
                    onChange={() => setFollowupStage(s)}
                    className="accent-red-500 w-4 h-4 cursor-pointer disabled:opacity-50"
                  />
                  <span className="text-black font-bold">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {followupStage !== "Confirmed" &&
            followupStage !== "Not Interested" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-black font-bold">
                    Next followup date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={nextFollowupDate}
                    onChange={(e) => setNextFollowupDate(e.target.value)}
                    disabled={isFormDisabled}
                    min={todayStr()}
                    className="rounded-full px-4 py-2.5 border border-gray-400 bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <p className="text-sm text-black font-bold mb-2">
                    Next Follow Reason <span className="text-red-500">*</span>
                  </p>
                  <div className="flex gap-4 mb-3">
                    {NEXT_FOLLOW_REASONS.map((r) => (
                      <label
                        key={r}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="nextFollowReason"
                          value={r}
                          checked={nextFollowReason === r}
                          disabled={isFormDisabled}
                          onChange={() => setNextFollowReason(r)}
                          className="accent-red-500 w-4 h-4 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-black font-bold">{r}</span>
                      </label>
                    ))}
                  </div>
                  {/* Location — shown when Site Visit selected or came from Site Visit */}
                  {showLocationField && (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm text-black font-bold">
                        Location{" "}
                        <span className="text-black font-bold text-xs">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={siteVisitLocation}
                        onChange={(e) => setSiteVisitLocation(e.target.value)}
                        disabled={isFormDisabled}
                        placeholder="Enter visit location…"
                        className="rounded-full px-4 py-2.5 border border-gray-600 bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white cursor-text disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
        </div>

        <div className="pt-2 flex justify-center sm:justify-start">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isFormDisabled}
            className="w-full sm:w-auto px-10 py-3 rounded-full text-white font-bold text-sm tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#e81c21,#c01519)" }}
          >
            {isFormDisabled && (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            Submit
          </button>
        </div>
      </div>

      {showUnsaved && (
        <UnsavedModal
          onStay={() => setShowUnsaved(false)}
          onLeave={() => {
            setShowUnsaved(false);
            navigate(-1);
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}
