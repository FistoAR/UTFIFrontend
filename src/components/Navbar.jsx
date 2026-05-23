import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png"

import bellIcon from "../assets/icons/bellIcon.svg"
import profileIcon from "../assets/icons/profile.png"
import logoutIcon from "../assets/icons/logout.png"

export default function Navbar() {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setShowTooltip(false);
      }
    };
    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTooltip]);

  const [profileData, setProfileData] = useState({
    name: "User",
    email: "",
    phone: "",
    role: "",
    designation: ""
  });

  const [notificationCount, setNotificationCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("userData");
    if (stored) {
      const { user } = JSON.parse(stored);
      setProfileData({
        name: user.name || "User",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "",
        designation: user.designation || ""
      });
    }
  }, []);

  useEffect(() => {
    const fetchCounts = async (silent = false) => {
      const storedData = localStorage.getItem("userData");
      if (!storedData) return;
      const { user } = JSON.parse(storedData);
      if (!user) return;
      
      if (!silent) setIsFetching(true);
      const role = (user.role || "").toLowerCase();
      let totalCount = 0;
      const API_BASE = import.meta.env.VITE_API_BASE_URL;
      
      try {
        const expoId = localStorage.getItem("utfi_current_expo_id");
        
        // 1. Fetch Missed Followups (Always fetch for everyone)
        const qParams = { pending: 1, all: 1, userRole: user.role, userId: user.id };
        if (expoId) qParams.exposId = expoId;

        const q1 = new URLSearchParams(qParams);
        const r1 = await fetch(`${API_BASE}/customer-followup?${q1}`, { headers: { "ngrok-skip-browser-warning": "any" }});
        const d1 = await r1.json();
        
        if (d1.success) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const latestRecordsMap = new Map();
          d1.data.forEach(item => {
            const current = latestRecordsMap.get(item.customer_data_id);
            if (!current || new Date(item.submitted_at || 0) > new Date(current.submitted_at || 0)) {
               latestRecordsMap.set(item.customer_data_id, item);
            }
          });

          latestRecordsMap.forEach(item => {
            const validStage = item.followup_stage === "Inprogress" || item.followup_stage === "Prospective";
            if (validStage && item.next_followup_date) {
              const dt = new Date(item.next_followup_date);
              dt.setHours(0, 0, 0, 0);
              if (dt < today) totalCount++;
            }
          });
        }
        
        // 2. Fetch Deleted Data / Expos for Superadmin
        if (role === "superadmin" || role === "super admin") {
          const q3 = new URLSearchParams({ inactiveOnly: 1, userRole: user.role, all: 1 });
          const r3 = await fetch(`${API_BASE}/customer-data?${q3}`, { headers: { "ngrok-skip-browser-warning": "any" }});
          const d3 = await r3.json();
          if (d3.success) totalCount += (d3.data || []).length;

          const r2 = await fetch(`${API_BASE}/expos?activeOnly=0`, { headers: { "ngrok-skip-browser-warning": "any" }});
          const d2 = await r2.json();
          if (Array.isArray(d2)) {
             totalCount += d2.filter(e => String(e.active) === "0").length;
          }
        }
        
        setNotificationCount(totalCount);
      } catch (e) {
        console.error("Error fetching notification counts:", e);
      } finally {
        if (!silent) setIsFetching(false);
      }
    };

    fetchCounts(false); // Initial load: show spinner
    const intv = setInterval(() => fetchCounts(true), 60 * 1000); // Background sync: silent
    
    const handleImmediateRefresh = () => {
      fetchCounts(false); // Triggered refresh: show spinner
    };

    const handleStorage = (e) => {
      if (e.key === "utfi_current_expo_id" || e.key === "userData") {
        fetchCounts(false);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("utfi_expo_changed", handleImmediateRefresh);
    
    const checkLocalId = setInterval(() => {
       const cur = localStorage.getItem("utfi_current_expo_id");
       if (cur !== localStorage.getItem("prev_expo_id_checked")) {
         localStorage.setItem("prev_expo_id_checked", cur || "");
         fetchCounts(false);
       }
    }, 1500);

    return () => {
      clearInterval(intv);
      clearInterval(checkLocalId);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("utfi_expo_changed", handleImmediateRefresh);
    };
  }, []);

  const goToNotifications = () => {
    const role = (profileData.role || "").toLowerCase();
    if (role === "superadmin") navigate("/SuperAdmin/notifications");
    else if (role === "admin") navigate("/Admin/notifications");
    else navigate("/Employee/notifications");
  };

  return (
    <>
      <div className="sticky top-0 z-50 w-full bg-[#1e1e1e]/95 backdrop-blur-sm text-white flex items-center justify-between px-[1vw] md:px-[1.5vw] py-[0.8vw] shadow-lg">

        {/* LEFT SIDE */}
        <div className="flex items-center">
          <img
            src={logo}
            alt="logo"
            className="h-8 md:h-[2.8vw] object-contain"
          />
        </div>


        {/* RIGHT SIDE */}
        <div className="flex items-center gap-[1vw] md:gap-[1.5vw]">

          <div 
            onClick={goToNotifications}
            className="relative cursor-pointer hover:opacity-80 transition-all"
          >
            <img
              src={bellIcon}
              alt="notification"
              className="w-8 h-8 md:w-[2.2vw] md:h-[2.2vw] bg-white p-2 md:p-[0.5vw] rounded-full"
            />

            {/* Badge */}
            <div className="absolute -top-1 -right-1 bg-red-500 text-[10px] md:text-[0.6vw] px-1.5 md:px-[0.4vw] rounded-full border border-[#1e1e1e] flex items-center justify-center min-w-[1.2rem] h-[1.2rem]">
              {isFetching ? (
                <div className="w-2 h-2 md:w-[0.5vw] md:h-[0.5vw] border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                notificationCount
              )}
            </div>
          </div>


          {/* Divider */}
          <div className="hidden sm:block h-[2vw] w-[0.1vw] bg-white"></div>


          {/* Profile */}
          <div className="relative" ref={tooltipRef}>
            <div 
              className="flex items-center gap-[0.5vw] cursor-pointer hover:opacity-80 transition-all p-[0.2vw] rounded-[0.5vw]"
              onClick={() => setShowTooltip(!showTooltip)}
            >
              {/* Avatar */}
              <div className="bg-red-500 rounded-full w-8 h-8 md:w-[2.2vw] md:h-[2.2vw] flex items-center justify-center border-2 border-transparent hover:border-white/20 transition-all shadow-sm">
                <img
                  src={profileIcon}
                  alt="profile"
                  className="w-4 h-4 md:w-[1.2vw] md:h-[1.2vw]"
                />
              </div>

              {/* Username + Role */}
              <div className="hidden md:flex flex-col text-[0.8vw] leading-tight">
                <span className="font-semibold">{profileData.name}</span>
                <span className="text-gray-400 text-[0.6vw] uppercase tracking-wider font-bold">
                  {profileData.role}
                </span>
              </div>
            </div>

            {/* Tooltip Modal */}
            {showTooltip && (
              <div className="absolute right-0 mt-[0.7vw] w-[16vw] bg-[#2a2a2a] border border-gray-700 rounded-[1.2vw] shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="bg-red-500 p-[1vw] flex flex-col items-center gap-[0.5vw]">
                  <div className="bg-white/20 p-[0.7vw] rounded-full backdrop-blur-sm">
                    <img src={profileIcon} alt="profile" className="w-[2vw] h-[2vw] brightness-0 invert" />
                  </div>
                  <h3 className="text-[0.8vw] font-bold text-white tracking-wide">Profile Details</h3>
                </div>
                
                <div className="p-[1vw] space-y-[1vw]">
                  <div className="space-y-[0.2vw]">
                    <p className="text-[0.6vw] text-gray-500 font-bold uppercase tracking-widest">Name</p>
                    <p className="text-[0.8vw] text-gray-200">{profileData.name}</p>
                  </div>

                  <div className="space-y-[0.2vw]">
                    <p className="text-[0.6vw] text-gray-500 font-bold uppercase tracking-widest">Email</p>
                    <p className="text-[0.8vw] text-gray-200 truncate">{profileData.email}</p>
                  </div>
                  
                  <div className="space-y-[0.2vw]">
                    <p className="text-[0.6vw] text-gray-500 font-bold uppercase tracking-widest">Phone</p>
                    <p className="text-[0.8vw] text-gray-200">{profileData.phone}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-[1vw]">
                    <div className="space-y-[0.2vw]">
                      <p className="text-[0.6vw] text-gray-500 font-bold uppercase tracking-widest">Role</p>
                      <p className="text-[0.7vw] text-gray-200 font-medium bg-red-500/10 text-red-400 px-[0.5vw] py-[0.1vw] rounded-full inline-block border border-red-500/20">
                        {profileData.role}
                      </p>
                    </div>
                    <div className="space-y-[0.2vw]">
                      <p className="text-[0.6vw] text-gray-500 font-bold uppercase tracking-widest">Designation</p>
                      <p className="text-[0.7vw] text-gray-200">{profileData.designation}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* Logout */}
          <button onClick={() => setShowLogoutConfirm(true)} className="cursor-pointer hover:opacity-80 transition-all ml-1">
            <img
              src={logoutIcon}
              alt="logout"
              className="w-7 h-7 md:w-[1.8vw] md:h-[1.8vw]"
            />
          </button>

        </div>
      </div>

      {/* Logout Confirmation Modal - Moved outside the backdrop-blur div to allow vertical centering */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-[1vw] animate-in fade-in duration-200">
          <div className="bg-[#1e1e1e] border border-gray-800 rounded-[2vw] w-full max-w-[24vw] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className="bg-red-500 p-[1.5vw] flex flex-col items-center gap-[0.7vw]">
              <div className="bg-white/20 p-[1vw] rounded-full backdrop-blur-sm">
                <img src={logoutIcon} alt="logout" className="w-[2vw] h-[2vw] brightness-0 invert" />
              </div>
              <h3 className="text-[1.2vw] font-bold text-white tracking-tight">Confirm Logout</h3>
            </div>
            
            <div className="p-[2vw] text-center">
              <p className="text-gray-300 text-[1.1vw]">Are you sure you want to log out?</p>
            </div>
            
            <div className="flex border-t border-gray-800">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-[1vw] py-[1vw] text-gray-400 font-bold hover:bg-white/5 transition-colors border-r border-gray-800 cursor-pointer text-[0.9vw]"
              >
                CANCEL
              </button>
              <button 
                onClick={() => {
                  setShowLogoutConfirm(false);
                  localStorage.removeItem("userData");
                  localStorage.removeItem("utfi_current_expo_id");
                  localStorage.removeItem("utfi_current_expo");
                  localStorage.removeItem("utfi_current_expo_name");
                  localStorage.removeItem("chosenExpoID");
                  localStorage.removeItem("chosenExpoName");
                  localStorage.removeItem("utfi_columns_order");
                  localStorage.removeItem("utfi_visible_columns");
                 
                  navigate("/");
                }}
                className="flex-1 px-[1vw] py-[1vw] text-red-500 font-bold hover:bg-red-500/10 transition-colors cursor-pointer text-[0.9vw]"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}