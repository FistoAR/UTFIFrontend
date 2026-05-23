import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";
import ConfirmModal from "../../components/ConfirmModal";
import footerImg from "../../assets/images/footer-image.webp";

export default function DeleteAllData() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();

  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const EXPOS_API = `${API_BASE}/expos`;

  const [expos, setExpos] = useState([]);
  const [selectedExposId, setSelectedExposId] = useState("");
  const [selectedExpo, setSelectedExpo] = useState(null);
  const [recordCount, setRecordCount] = useState(0);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingCount, setIsFetchingCount] = useState(false);

  // Fetch expos on mount
  const fetchExpos = async () => {
    startLoading();
    try {
      const res = await fetch(`${EXPOS_API}?activeOnly=1`, {
        headers: { "ngrok-skip-browser-warning": "any" },
      });
      const data = await res.json();
      if (res.ok) {
        setExpos(data);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to fetch exhibitions", "error");
    } finally {
      stopLoading();
    }
  };

  const fetchRecordCount = async (id) => {
    setIsFetchingCount(true);
    setRecordCount(0);
    try {
      const res = await fetch(`${EXPOS_API}/stats?id=${id}`, {
        headers: { "ngrok-skip-browser-warning": "any" },
      });
      if (res.ok) {
        const data = await res.json();
        setRecordCount(data.count || 0);
      }
    } catch (e) {
      console.error("Count fetch error:", e);
    } finally {
      setIsFetchingCount(false);
    }
  };

  useEffect(() => {
    fetchExpos();
  }, []);

  useEffect(() => {
    if (selectedExposId) {
      const expo = expos.find((e) => e.id.toString() === selectedExposId);
      if (expo) {
        const parsed = {
          ...expo,
          dates:
            typeof expo.dates === "string"
              ? JSON.parse(expo.dates || "[]")
              : expo.dates || [],
        };
        setSelectedExpo(parsed);
        fetchRecordCount(expo.id);
      }
    } else {
      setSelectedExpo(null);
      setRecordCount(0);
    }
  }, [selectedExposId, expos]);

  // Reset count when expo is cleared
  useEffect(() => {
    if (!selectedExposId) {
      setRecordCount(0);
      setIsFetchingCount(false);
    }
  }, [selectedExposId]);

  const handlePurge = async () => {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const userId = userData.user?.id || "Admin";

    setIsProcessing(true);
    // Since this is the Delete All Data page, we perform a permanent purge
    const url = `${EXPOS_API}/delete-data?id=${selectedExpo.id}&deletedBy=${encodeURIComponent(userId)}`;

    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "ngrok-skip-browser-warning": "any" },
      });
      if (res.ok) {
        showToast(
          "All data in this expo has been deleted successfully!",
          "success",
        );
        setIsConfirmOpen(false);
        setSelectedExposId("");
        fetchExpos();
      } else {
        const data = await res.json();
        showToast(data.error || "Action failed", "error");
      }
    } catch (e) {
      showToast("Connection error", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col relative">
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Final Confirmation"
        message={`Are you absolutely sure you want to delete all ${recordCount} records for "${selectedExpo?.expo_name} ${selectedExpo?.year}"? This action is tracked and cannot be easily undone.`}
        onConfirm={handlePurge}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText="Yes, Delete Data"
        isLoading={isProcessing}
        requiredText={`${selectedExpo?.expo_name} ${selectedExpo?.year}`}
      />

      {/* Header */}
      <div className="w-full px-[5vw] pt-[2vw] flex items-center gap-4 mb-12">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-[#fdf0f0] flex items-center justify-center hover:bg-[#ffeced] transition-colors cursor-pointer text-red-500 shadow-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-black flex-1">
          Delete Expo Data
        </h1>
      </div>

      {/* Form Content Area */}
      <div className="w-full px-[5vw] flex-1">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10 items-start">
          <div className="space-y-4">
            <label className="block text-md font-bold text-black">
              Select Expo
            </label>
            <div className="relative">
              <select
                className="w-full h-14 px-6 rounded-full bg-gray-100 border border-transparent outline-none text-gray-800 font-bold focus:ring-2 focus:ring-red-600/10 transition-all appearance-none cursor-pointer"
                value={selectedExposId}
                onChange={(e) => setSelectedExposId(e.target.value)}
              >
                <option value="">Select an Expo</option>
                {expos
                  .map((expo) => (
                    <option key={expo.id} value={expo.id}>
                      {expo.expo_name} ({expo.year})
                    </option>
                  ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-md font-bold text-black">Expo name :</label>
            <div className="text-gray-700  text-lg">
              {selectedExpo?.expo_name || ""}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-md font-bold text-black">Location :</label>
            <div className="text-gray-700  text-lg">
              {selectedExpo?.location || ""}
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
          <div className="space-y-2">
            <label className="text-md font-bold text-black block">Notes</label>
            <div className="text-gray-700 whitespace-pre-wrap">
              {selectedExpo?.notes || ""}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-md font-bold text-black block">
              Event Dates
            </label>
            <div className="text-gray-700 ">
              {selectedExpo?.dates?.join(" • ") || ""}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-md font-bold text-black block text-red-600">
              Total Active Records Found
            </label>
            <div className="text-red-500 font-black text-xl">
              {!selectedExposId ? (
                ""
              ) : isFetchingCount ? (
                <span className="text-gray-400 text-base font-semibold animate-pulse">
                  Counting records…
                </span>
              ) : recordCount > 0 ? (
                recordCount
              ) : (
                <span className="text-gray-400 text-base font-semibold">
                  No active records found
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col items-center gap-3 mb-20">
          <button
            disabled={
              !selectedExposId ||
              isFetchingCount ||
              recordCount === 0 ||
              isProcessing
            }
            onClick={() => setIsConfirmOpen(true)}
            className="px-16 h-14 rounded-full bg-[#ff3b3a] hover:bg-black text-white font-bold text-lg shadow-xl shadow-red-500/10 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            Delete All Data
          </button>
          {selectedExposId && !isFetchingCount && recordCount === 0 && (
            <p className="text-sm text-gray-400 font-medium">
              No active records to delete for this exhibition.
            </p>
          )}
        </div>
      </div>

      {/* Footer Image Container */}
      <div className="w-full relative mt-auto">
        <img
          src={footerImg}
          alt="Road footer"
          className="w-full h-auto object-contain select-none pointer-events-none"
        />
      </div>
    </div>
  );
}
