import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchExpos } from "../../store/exposSlice";
import { useLoading } from "../../context/LoadingContext";
import { useToast } from "../../context/ToastContext";

import customerIcon from "../../assets/home-icons/customer.png"
import followupIcon from "../../assets/home-icons/followup.png"
import analysisIcon from "../../assets/home-icons/analysis.png"
import newLeadIcon from "../../assets/home-icons/newlead.png"
import reportIcon from "../../assets/home-icons/report.png"

export default function EmployeeHome() {
  const { startLoading, stopLoading } = useLoading();
  const { showToast } = useToast();
  const dispatch = useDispatch();
  const { items: expos, status, error } = useSelector((state) => state.expos);
  
  const [selectedExpo, setSelectedExpo] = useState(
    localStorage.getItem("utfi_current_expo_id") || ""
  );

  useEffect(() => {
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const employeeId = userData.user?.id || null;

  if (employeeId) {
    dispatch(fetchExpos(employeeId));
  }
}, [dispatch]);

  // Handle loading UI and defaults
  useEffect(() => {
    if (status === "loading" && expos.length === 0) {
      startLoading();
    } else {
      stopLoading();
    }

    if (status === "failed" && error) {
      showToast("Backend connection failed or issue fetching expos.", "error");
    }

    // Removed auto-selection from localStorage to force user choice
  }, [status, error, startLoading, stopLoading, showToast]);

  const handleExpoChange = (e) => {
    const id = e.target.value;
    const selectedObj = expos.find(ex => String(ex.id) === String(id));
    const name = selectedObj ? selectedObj.name : "";
    
    setSelectedExpo(id);
    localStorage.setItem("utfi_current_expo_id", id);
    localStorage.setItem("utfi_current_expo_name", name);
    window.dispatchEvent(new Event("utfi_expo_changed"));
  };

  const menuItems = [
    {
      title: "New Lead",
      icon: newLeadIcon,
      bg: "bg-[#fee7e5]",
      path: "/Employee/newLead"
    },
    {
      title: "Customer Data",
      icon: customerIcon,
      bg: "bg-[#ffe7e5]",
      path: "/Employee/CustomerData"
    },
    {
      title: "FollowUp",
      icon: followupIcon,
      bg: "bg-[#fee7e5]",
      path: "/Employee/followupMainPage"
    },
    {
      title: "Date-wise Analysis",
      icon: analysisIcon,
      bg: "bg-[#dbe5ff]",
      path: "/Employee/dateWiseAnalysis"
    },
    {
      title: "Followup Reports",
      icon: reportIcon,
      bg: "bg-[#fff8e4]",
      path: "/Employee/followupReports"
    },
   
    // {
    //   title: "Expo Reports",
    //   icon: reportIcon,
    //   bg: "bg-orange-100",
    //   path: "/Employee/expoReports"
    // },
  ]

  return (
    <div className="p-4 md:p-6">

      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-center md:justify-between mb-6">

        <select 
          value={selectedExpo}
          onChange={handleExpoChange}
          className={`border rounded-md px-4 py-2 min-w-[12vw] text-sm mb-4 md:mb-0 bg-white cursor-pointer font-bold  shadow-sm transition-all
            ${!selectedExpo ? "border-black ring-2 ring-gray-300 text-black animate-pulse" : "border-gray-400"}
          `}
        >
          <option value="" disabled>Select Expo</option>
          {expos
            .filter((ex) => Number(ex.active) !== 0)
            .map((ex, idx) => (
              <option key={idx} value={ex.id}>
                {ex.name}
              </option>
            ))}
        </select>

        <h1 className="text-2xl md:text-3xl font-bold">
          Employee Home
        </h1>

        <div className="hidden md:block w-[100px]" />
      </div>


      {/* Dashboard Container */}
      <div className={`relative bg-gray-100 rounded-xl p-6 md:p-10 transition-all duration-300 ${!selectedExpo || status === "loading" ? "pointer-events-none" : "opacity-100"}`}>
        
        {status === "loading" && expos.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-100/50 rounded-xl backdrop-blur-[2px]">
             <div className="w-12 h-12 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin mb-4"></div>
             <p className="text-red-600 font-black tracking-widest text-lg animate-pulse">FETCHING EXPOS...</p>
          </div>
        )}

        {!selectedExpo && status !== "loading" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-200/50 backdrop-blur-sm rounded-xl pointer-events-none">
             <div className="bg-gray-100 px-6 py-3 rounded-full shadow-sm text-center border border-gray-200">
                <p className="text-gray-600 font-black tracking-widest text-sm uppercase">
                  Please Select an Expo
                </p>
             </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-12 gap-x-8 place-items-center">

          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`flex flex-col items-center group ${!selectedExpo ? "cursor-not-allowed" : "cursor-pointer"}`}
              onClick={(e) => { 
                if (!selectedExpo) {
                  e.preventDefault(); 
                  showToast("Please select an Expo first", "error"); 
                } 
              }}
            >

              {/* Circle Icon */}
              <div
                className={`w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center ${item.bg} transition-transform duration-200 ${selectedExpo ? "group-hover:scale-105" : ""}`}
              >
                <img
                  src={item.icon}
                  alt={item.title}
                  className="w-12 h-12 md:w-14 md:h-14 object-contain"
                />
              </div>

              {/* Label */}
              <p className="mt-4 text-sm md:text-base font-semibold text-center">
                {item.title}
              </p>

            </Link>
          ))}

        </div>

      </div>

    </div>
  )
}