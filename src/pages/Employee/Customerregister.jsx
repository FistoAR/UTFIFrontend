import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLoading } from "../../context/LoadingContext";
import { useToast } from "../../context/ToastContext";

// ─── helpers ─────────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const saveRegistration = async (data) => {
  const response = await fetch(`${API_BASE_URL}/customer-registration`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "69420" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Server error");
  }
  return response.json();
};


// ─── Field ────────────────────────────────────────────────────────────────────
const Field = ({ label, required, disabled, value, onChange, type = "text" }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-semibold text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`rounded-full px-4 py-2.5 border text-sm transition-all
        ${disabled
          ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
          : "bg-gray-50 border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white hover:border-gray-500 cursor-text"
        }`}
    />
  </div>
);

// ─── Unsaved Modal ────────────────────────────────────────────────────────────
const UnsavedModal = ({ onStay, onLeave }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm animate-fadeIn">
      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
      </div>
      <h2 className="text-base font-bold text-center text-gray-900 mb-1">Unsaved Changes</h2>
      <p className="text-sm text-gray-500 text-center mb-6">You have unsaved changes. Are you sure you want to exit?</p>
      <div className="flex gap-3">
        <button onClick={onStay} className="flex-1 py-2.5 rounded-full border border-gray-300 text-sm font-medium cursor-pointer hover:bg-gray-50">Stay</button>
        <button onClick={onLeave} className="flex-1 py-2.5 rounded-full text-white text-sm font-bold cursor-pointer"
          style={{ background: "linear-gradient(135deg,#e81c21,#c01519)" }}>Leave</button>
      </div>
    </div>
  </div>
);



// ─── Confirm Full Payment Modal ──────────────────────────────────────────────
const ConfirmFullModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
    <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md border border-gray-100 scale-in-center">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-center text-gray-900 mb-2">Confirm Full Payment</h2>
      <p className="text-sm text-gray-500 text-center leading-relaxed mb-8 px-2">
        You have marked the payment as <strong>'Full Amount Received'</strong>. 
        Once registered, the follow-up details will no longer be editable. 
        You can still review the record in <strong>Follow-up Reports</strong>.
        <br/><br/>
        Do you want to proceed?
      </p>
      <div className="flex gap-4">
        <button onClick={onCancel} className="flex-1 py-3.5 rounded-full border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer">
          CANCEL
        </button>
        <button onClick={onConfirm} className="flex-1 py-3.5 rounded-full text-white text-sm font-bold shadow-lg transition-all active:scale-95 cursor-pointer"
          style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}>
          PROCEED
        </button>
      </div>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CustomerRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startLoading, stopLoading } = useLoading();
  const { showToast } = useToast();
  const { entry, record } = location.state || {};

  const [registrationId, setRegistrationId] = useState(null);
  const [expoName, setExpoName] = useState("");
  const [exhibitorName, setExhibitorName] = useState("");
  const [faciaName, setFaciaName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [mailId, setMailId] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [segment, setSegment] = useState("");
  const [stallNo, setStallNo] = useState("");
  const [stallSize, setStallSize] = useState("");
  const [remarks, setRemarks] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [source, setSource] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Not received");
  const [showConfirmFull, setShowConfirmFull] = useState(false);

  const [showUnsaved, setShowUnsaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataFetching, setIsDataFetching] = useState(false);
  const [segmentList, setSegmentList] = useState([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    const currentExpoId = localStorage.getItem("utfi_current_expo_id");
    const recId = record?.id || record?.customer_data_id;

    const loadData = async () => {
      const isUpdateFlow = location.state?.sourcePage === "/Employee/followupEditPage";
      setIsDataFetching(true);
      startLoading(isUpdateFlow ? "Fetching registration details..." : "Loading lead details...");
      try {
        const segmentsPromise = fetch(`${API_BASE_URL}/segments?expos_id=${currentExpoId || ""}`, { 
          headers: { "ngrok-skip-browser-warning": "69420" } 
        }).then(r => r.json());

        // Fill from navigation state immediately
        const mfr = record?.primary_details || record?.manufacturer || {};
        const expoStored = localStorage.getItem("utfi_current_expo_name") || "";
        const regObj = record?.register_data || record?.registerData;
        const d_initial = regObj ? (typeof regObj === "string" ? JSON.parse(regObj) : regObj) : null;

        setExpoName(mfr.expoName || expoStored);
        setExhibitorName(d_initial?.exhibitorName ?? mfr.companyName ?? "");
        setContactPerson(entry?.contactPerson ?? d_initial?.contactPerson ?? mfr.contactPerson ?? "");
        setMailId(entry?.emailId ?? d_initial?.mailId ?? mfr.email1 ?? "");
        setContactNumber(entry?.mobileNo ?? d_initial?.contactNumber ?? mfr.mobile1 ?? "");
        setSegment(entry?.segment ?? d_initial?.segment ?? mfr.segment ?? "");
        setCity(d_initial?.city ?? mfr.city ?? "");
        setState(d_initial?.state ?? mfr.state ?? "");
        setCountry(d_initial?.country ?? mfr.country ?? "");
        setSource(d_initial?.source ?? mfr.source ?? "");
        setRemarks(entry?.remarks ?? d_initial?.remarks ?? "");
        if (d_initial?.faciaName !== undefined) setFaciaName(d_initial.faciaName);
        if (d_initial?.stallNo !== undefined) setStallNo(d_initial.stallNo);
        if (d_initial?.stallSize !== undefined) setStallSize(d_initial.stallSize);
        if (d_initial?.paymentStatus !== undefined) setPaymentStatus(d_initial.paymentStatus);

        let recordFetchPromise = Promise.resolve(null);
        // Explicitly fetch the latest registration data from the server
        if (recId) {
          recordFetchPromise = fetch(`${API_BASE_URL}/customer-registration?customer_data_id=${recId}`, {
            headers: { "ngrok-skip-browser-warning": "69420" }
          }).then(r => r.json());
        }



        // Wait for all fetches
        const [segmentsData, regData] = await Promise.all([segmentsPromise, recordFetchPromise]);

        // Process Segments
        if (Array.isArray(segmentsData)) {
          setSegmentList(segmentsData.map(s => s.segment));
        }

        // Process Fetched Registration Data
        if (regData && regData.success && regData.data) {
          const d = regData.data;
          if (d.id) setRegistrationId(d.id);
          if (d.exhibitor_name !== undefined && d.exhibitor_name !== null) setExhibitorName(String(d.exhibitor_name));
          if (d.facia_name !== undefined && d.facia_name !== null) setFaciaName(d.facia_name);
          if (d.contact_person !== undefined && d.contact_person !== null) setContactPerson(d.contact_person);
          if (d.mail_id !== undefined && d.mail_id !== null) setMailId(d.mail_id);
          if (d.contact_number !== undefined && d.contact_number !== null) setContactNumber(d.contact_number);
          if (d.city !== undefined && d.city !== null) setCity(d.city);
          if (d.state !== undefined && d.state !== null) setState(d.state);
          if (d.country !== undefined && d.country !== null) setCountry(d.country);
          if (d.segment !== undefined && d.segment !== null) setSegment(d.segment);
          if (d.source !== undefined && d.source !== null) setSource(d.source);
          if (d.stall_no !== undefined && d.stall_no !== null) setStallNo(d.stall_no);
          if (d.stall_size !== undefined && d.stall_size !== null) setStallSize(d.stall_size);
          if (d.remarks !== undefined && d.remarks !== null) setRemarks(d.remarks);
          if (d.payment_status !== undefined && d.payment_status !== null) setPaymentStatus(d.payment_status);
        }
      } catch (err) {
        console.error("Error loading registration data:", err);
      } finally {
        setIsDataFetching(false);
        stopLoading();
        setTimeout(() => { initializedRef.current = true; }, 500);
      }
    };

    loadData();
  }, [record, entry]);

  // Dirty tracking
  useEffect(() => {
    if (!initializedRef.current) return;
    setIsDirty(true);
  }, [exhibitorName, faciaName, contactPerson, mailId, contactNumber, segment, stallNo, stallSize, remarks, paymentStatus]);



  const handleBack = () => {
    if (isDirty) setShowUnsaved(true);
    else {
      const dest = location.state?.sourcePage || "/Employee/home";
      navigate(dest);
    }
  };

  const handleRegister = () => {
    // Mandatory fields
    const errors = [];
    if (!exhibitorName.trim()) errors.push("Exhibitor Name");
    if (!faciaName.trim()) errors.push("Facia Name");
    if (!contactPerson.trim()) errors.push("Contact Person");
    if (!contactNumber.trim()) errors.push("Contact Number");
    if (!segment.trim()) errors.push("Segment");
    if (!stallNo.trim()) errors.push("Stall No");
    if (!stallSize.trim()) errors.push("Stall Size");
    if (!remarks.trim()) errors.push("Remarks");
    if (errors.length) { showToast(`Required: ${errors.join(", ")}`, "error"); return; }
    if (isSubmitting) return;

    if (paymentStatus === "Full amount received") {
      setShowConfirmFull(true);
    } else {
      executeRegister();
    }
  };

  const executeRegister = async () => {
    const isFullPayment = paymentStatus === "Full amount received";
    const registerData = {
      exhibitorName, faciaName, contactPerson, mailId, contactNumber,
      city, state, country, segment, source, stallNo, stallSize, remarks, paymentStatus,
      registeredAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    startLoading("Saving");
    try {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      const employeeId = userData.user?.id || null;
      
      // Fix: Use current active expo ID instead of the record's expos_id array
      const exposId = localStorage.getItem("utfi_current_expo_id") || record?.expos_id || null;

      // Get the pending followup entry from navigation state
      const pendingFollowup = location.state?.pendingFollowup || null;
      
      // Ensure pending followup also uses the correct current expo id
      if (pendingFollowup) {
        pendingFollowup.expos_id = exposId;
      }

      const customerDataId = record?.customer_data_id || record?.id || null;
      const payload = {
        id: registrationId,
        customer_data_id: customerDataId,
        expos_id: exposId,
        employee_id: employeeId,
        // Send pending followup so backend saves it first and links the followup_id
        followup_entry: pendingFollowup,
        // All registration form fields
        exhibitor_name: exhibitorName,
        facia_name: faciaName,
        contact_person: contactPerson,
        mail_id: mailId,
        contact_number: contactNumber,
        city,
        state,
        country,
        segment,
        source,
        stall_no: stallNo,
        stall_size: stallSize,
        remarks,
        payment_status: paymentStatus,
        register_data: registerData,
        full_payment: isFullPayment,
      };

      const result = await saveRegistration(payload);
      if (!result.success) {
        showToast(result.message || "Failed to save registration", "error");
        setIsSubmitting(false);
        stopLoading();
        return;
      }

      setIsDirty(false);
      showToast(isFullPayment ? "Registered and marked as confirmed!" : "Registration saved!");

      setTimeout(() => {
        const dest = location.state?.sourcePage || "/Employee/followupMainPage";
        navigate(dest, { replace: true });
      }, 1500);
    } catch (error) {
      showToast("Error connecting to server", "error");
    } finally {
      setIsSubmitting(false);
      stopLoading();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={handleBack}
          className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-gray-600 hover:bg-red-100 transition-all cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">New Customer Registration</h1>
      </div>

      <div className="max-w-[90%] mx-auto px-4 py-8 space-y-6">

        {/* Row 1: Expo Name, Exhibitor Name, Facia Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="Expo Name" required value={expoName} onChange={(e) => setExpoName(e.target.value)} disabled />
          <Field label="Exhibitor Name" required value={exhibitorName} onChange={(e) => setExhibitorName(e.target.value)} disabled={isDataFetching} />
          <Field label="Facia Name" required value={faciaName} onChange={(e) => setFaciaName(e.target.value)} disabled={isDataFetching} />
        </div>

        {/* Row 2: Contact Person, Mail ID, Contact Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="Contact Person" required value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} disabled={isDataFetching} />
          <Field label="Mail ID" value={mailId} onChange={(e) => setMailId(e.target.value)} type="email" disabled={isDataFetching} />
          <Field label="Contact Number" required value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} type="tel" disabled={isDataFetching} />
        </div>

        {/* Row 3: City, State, Country */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="City" required value={city} onChange={(e) => setCity(e.target.value)} disabled={isDataFetching} />
          <Field label="State" required value={state} onChange={(e) => setState(e.target.value)} disabled={isDataFetching} />
          <Field label="Country" required value={country} onChange={(e) => setCountry(e.target.value)} disabled={isDataFetching} />
        </div>

        {/* Row 4: Segment, Source, Stall No */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Segment <span className="text-red-500">*</span>
            </label>
            <select value={segment} onChange={(e) => setSegment(e.target.value)}
              disabled={isDataFetching}
              className="rounded-full px-4 py-2.5 border border-gray-400 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer appearance-none transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", backgroundSize: "1rem", paddingRight: "2.5rem",
              }}>
              <option value="">-- Select Segment --</option>
              {segmentList.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Field label="Source" required value={source} onChange={(e) => setSource(e.target.value)} disabled={isDataFetching} />
          <Field label="Stall No" required value={stallNo} onChange={(e) => setStallNo(e.target.value)} disabled={isDataFetching} />
        </div>

        {/* Row 5: Stall Size, Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="Stall Size" required value={stallSize} onChange={(e) => setStallSize(e.target.value)} disabled={isDataFetching} />
          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-sm font-semibold text-gray-700">
              Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={1}
              disabled={isDataFetching}
              className="rounded-full px-4 py-2.5 border border-gray-400 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none cursor-text disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Row 5: Payment Status + Register */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-end">
          <div className="lg:col-span-2">
            <label className="text-sm font-semibold text-gray-700 block mb-3">
              Payment Status <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4 flex-wrap">
              {["Not received", "Partially received", "Full amount received"].map((ps) => (
                <label key={ps} className={`flex items-center gap-2 text-sm px-2 py-1 rounded-lg transition-colors ${isDataFetching ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
                  <input type="radio" name="paymentStatus" value={ps} checked={paymentStatus === ps}
                    disabled={isDataFetching}
                    onChange={() => setPaymentStatus(ps)} className="accent-red-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed" />
                  <span className="text-gray-700 whitespace-nowrap">{ps}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Register button */}
          <div className="flex justify-end items-end">
            <button type="button" onClick={handleRegister}
              disabled={isDataFetching || isSubmitting}
              className="px-10 py-3 rounded-full text-white font-bold text-sm tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-3"
              style={{ background: "linear-gradient(135deg,#e81c21,#c01519)" }}>
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  SAVING...
                </>
              ) : (
                "REGISTER"
              )}
            </button>
          </div>
        </div>


      </div>

      {showUnsaved && (
        <UnsavedModal onStay={() => setShowUnsaved(false)} onLeave={() => { 
          setShowUnsaved(false); 
          const dest = location.state?.sourcePage || "/Employee/home";
          navigate(dest); 
        }} />
      )}
      {showConfirmFull && (
        <ConfirmFullModal 
          onCancel={() => setShowConfirmFull(false)} 
          onConfirm={() => {
            setShowConfirmFull(false);
            executeRegister();
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