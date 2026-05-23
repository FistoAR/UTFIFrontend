import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchExpos } from "../../store/exposSlice";

// Reuse existing icons
import expoCreate from "../../assets/home-icons/Expo_Create.png";
import employeeRegister from "../../assets/home-icons/Employee Register.png";
import expoAllocate from "../../assets/home-icons/Expo-Allocate.png";
import designation from "../../assets/home-icons/designation.png";
import deleteIcon from "../../assets/home-icons/delete.png";
import materIcon from "../../assets/home-icons/edit-folder.png";
import dataChanges from "../../assets/home-icons/Icon 3.png";
import locationIcon from "../../assets/home-icons/Last Location.png";

import customerIcon from "../../assets/home-icons/customer.png";
import analysisIcon from "../../assets/home-icons/analysis.png";
import reportIcon from "../../assets/home-icons/report.png";
import leadRequestIcon from "../../assets/home-icons/lead_request.png";

export default function AdminHome() {
  const [showTeamModal, setShowTeamModal] = useState(false);
  const dispatch = useDispatch();
  const { items: expos, status } = useSelector((state) => state.expos);
  const [selectedExpoId, setSelectedExpoId] = useState(
    localStorage.getItem("utfi_current_expo_id") || ""
  );
  const [employees, setEmployees] = useState([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  
  const [userData] = useState(() => {
    const stored = localStorage.getItem("userData");
    return stored ? JSON.parse(stored).user : null;
  });
  
  const role = (userData?.role || "").toLowerCase();
  const basePath = role === "super admin" ? "/SuperAdmin" : "/Admin";

  useEffect(() => {
    if (status === "idle") {
      // Admin should see all expos (no filtering by employee)
      dispatch(fetchExpos(null));
    }
  }, [status, dispatch]);



  const handleExpoChange = (id, name) => {
    setSelectedExpoId(id);
    localStorage.setItem("utfi_current_expo_id", id);
    localStorage.setItem("utfi_current_expo_name", name);
    window.dispatchEvent(new Event("utfi_expo_changed"));
  };

  // Handle Team member fetching dynamically
  const handleOpenTeamModal = async () => {
    setShowTeamModal(true);
    if (employees.length === 0) {
      setIsLoadingStaff(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}/employee`,
          {
            headers: { "ngrok-skip-browser-warning": "any" },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);
        }
      } catch (e) {
        console.error("Failed to load staff", e);
      } finally {
        setIsLoadingStaff(false);
      }
    }
  };

  // Resolve allocations dynamically
  const activeExpo = expos.find((e) => String(e.id) === String(selectedExpoId));
  const allocatedIds = activeExpo?.employees_allocated?.map(String) || [];
  const currentAllocations = employees.filter((emp) =>
    allocatedIds.includes(String(emp.id)),
  );

  const adminItems = [
    {
      title: "Expo Creation",
      icon: expoCreate,
      bg: "bg-[#fee7e5]",
      path: `${basePath}/expoCreation`,
    },
    {
      title: "Employee Register",
      icon: employeeRegister,
      bg: "bg-[#feeae5]",
      path: `${basePath}/employeeRegister`,
    },
    {
      title: "Employee Allocate",
      icon: expoAllocate,
      bg: "bg-[#d2ebf5]",
      path: `${basePath}/employeeAllocate`,
    },
    {
      title: "Admin Reports",
      icon: reportIcon,
      bg: "bg-[#fff8e5]",
      path: `${basePath}/adminReports`,
    },
    {
      title: "Edit Employee Data",
      icon: customerIcon,
      bg: "bg-[#ececec]",
      path: `${basePath}/editEmployee`,
    },
    {
      title: "Designation Add / delete",
      icon: designation,
      bg: "bg-[#d8ede4]",
      path: `${basePath}/designation`,
    }
  ];

  if (role === "super admin") {
    adminItems.push(
      {
        title: "Delete All Data",
        icon: deleteIcon,
        bg: "bg-[#e3eeee]",
        path: `${basePath}/deleteAll`,
      },
      {
        title: "Restore / Delete",
        icon: deleteIcon,
        bg: "bg-[#ececec]",
        path: `${basePath}/restoreDelete`,
      }
    );
  }

  const sections = [
    {
      title: "Admin Section",
      items: adminItems,
    },
    {
      title: "Team Leaders Section",
      items: [
        {
          title: "Segments",
          icon: designation,
          bg: "bg-[#e8f0fe]",
          path: `${basePath}/segments`,
        },
        {
          title: "Master Data Update / Delete",
          icon: materIcon,
          bg: "bg-[#ebdfe8]",
          path: `${basePath}/masterData`,
        },
        {
          title: "Master Data Allocation",
          icon: expoAllocate,
          bg: "bg-[#fff2e2]",
          path: `${basePath}/leadReuse`,
        },
        {
          title: "New Leads List",
          icon: leadRequestIcon,
          bg: "bg-[#ececec]",
          path: `${basePath}/newLeads`,
        },
      ],
    },
    {
      title: "Employee Section",
      items: [
        {
          title: "Date-wise Analysis",
          icon: analysisIcon,
          bg: "bg-[#dbe5ff]",
          path: `${basePath}/dateWiseAnalysis`,
        },
        {
          title: "Followup Reports",
          icon: reportIcon,
          bg: "bg-[#fff8e4]",
          path: `${basePath}/followupReports`,
        },
        {
          title: "Data Changes",
          icon: dataChanges,
          bg: "bg-[#d6f8d7]",
          path: `${basePath}/dataChanges`,
        },
        {
          title: "Employee Last Location",
          icon: locationIcon,
          bg: "bg-[#ececec]",
          path: `${basePath}/employeeLocation`,
        },
      ],
    },
  ];

  return (
    <div className="p-[1vw] md:p-[1.5vw] min-h-screen bg-white">
      <div className="space-y-[4vw]">
        {sections.map((section, sidx) => (
          <div key={sidx} className="flex flex-col items-center">
            {/* Header Row for Section */}
            <div className="w-full flex flex-col md:flex-row items-center justify-center relative mb-6 md:mb-[1.5vw] gap-4 md:gap-0">
              {/* Dropdown - Only for the first section (Admin Section) */}
              {sidx === 0 && (
                <div className="md:absolute left-0 flex items-center justify-between md:justify-start w-full md:w-auto gap-3 md:gap-[1vw]">
                  <select
                    className={`flex-1 md:flex-none border rounded-lg md:rounded-[0.5vw] px-3 py-1.5 md:px-[0.8vw] md:py-[0.4vw] text-sm md:text-[1vw] min-w-0 md:min-w-[12vw] outline-none cursor-pointer font-bold transition-all bg-white
                      ${!selectedExpoId ? "border-black ring-2 ring-gray-300 text-black animate-pulse" : "border-gray-400 text-gray-700 focus:ring-1 focus:ring-black"}
                    `}
                    value={selectedExpoId}
                    onChange={(e) => handleExpoChange(e.target.value, e.target.options[e.target.selectedIndex].dataset.name)}
                  >
                    <option value="" disabled>Select Expo</option>
                    {expos.length > 0 ? (
                      expos
                        .filter((ex) => Number(ex.active) !== 0)
                        .map((ex) => (
                          <option key={ex.id} value={ex.id} data-name={ex.name}>
                            {ex.name}
                          </option>
                        ))
                    ) : (
                      <option>No Expos Found</option>
                    )}
                  </select>
                  {expos.length > 0 && selectedExpoId && (
                    <button
                      onClick={handleOpenTeamModal}
                      className="text-red-600 text-sm md:text-[1vw] font-black cursor-pointer hover:underline tracking-tight whitespace-nowrap"
                    >
                      Team members
                    </button>
                  )}
                </div>
              )}

              {/* Centered Title */}
              <h2 className="text-xl md:text-[2vw] font-black tracking-tight text-gray-900 border-0 pb-0">
                {section.title}
              </h2>
            </div>

            <div className={`relative bg-[#f5f5f5] rounded-[1.5vw] md:rounded-[3vw] p-[5vw] md:p-[3.5vw] w-full shadow-sm border border-gray-100 flex justify-center transition-all duration-300 ${!selectedExpoId || status === "loading" ? "pointer-events-none" : "opacity-100"}`}>
                
                {status === "loading" && expos.length === 0 && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#f5f5f5]/50 rounded-[1.5vw] md:rounded-[3vw] backdrop-blur-[2px]">
                    <div className="w-[8vw] h-[8vw] sm:w-[4vw] sm:h-[4vw] border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-red-600 font-black tracking-widest text-lg md:text-[1.2vw] animate-pulse uppercase">Fetching Expos...</p>
                  </div>
                )}

                {!selectedExpoId && status !== "loading" && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-200/50 backdrop-blur-sm rounded-[1.5vw] md:rounded-[3vw] pointer-events-none">
                    <div className="bg-gray-100 px-[3vw] py-[1.5vw] md:px-[2vw] md:py-[1vw] rounded-full shadow-sm text-center border border-gray-200">
                      <p className="text-gray-600 font-black tracking-[0.2em] text-sm md:text-[1vw] uppercase">
                        Please Select an Expo
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-x-[4vw] sm:gap-x-[3vw] md:gap-x-[5vw] lg:gap-x-[8vw] gap-y-[10vw] sm:gap-y-[4vw] md:gap-y-[6vw] w-full max-w-[90vw] sm:max-w-[75vw]">
                  {section.items.map((item, index) => (
                  <Link
                    key={index}
                    to={item.path}
                    className="flex flex-col items-center cursor-pointer group w-full sm:w-[8vw] md:w-[10vw]"
                  >
                    <div
                      className={`w-[18vw] h-[18vw] sm:w-[6vw] sm:h-[6vw] md:w-[7vw] md:h-[7vw] rounded-full flex items-center justify-center ${item.bg} transition-transform duration-200 group-hover:scale-105 shadow-sm border border-white/50`}
                    >
                      <img
                        src={item.icon}
                        alt={item.title}
                        className="w-[10vw] h-[10vw] sm:w-[3vw] sm:h-[3vw] md:w-[4vw] md:h-[4vw] object-contain"
                      />
                    </div>
                    <p className="mt-[2vw] sm:mt-[1vw] text-[3.5vw] sm:text-[0.8vw] md:text-[1vw] font-bold text-center tracking-tight leading-tight">
                      {item.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Team Members Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-[1vw] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2vw] shadow-2xl w-full max-w-[28vw] overflow-hidden animate-in zoom-in duration-200">
            <div className="p-[0.5vw] px-[1vw] border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-[1.2vw] font-black text-gray-900 tracking-tight">
                Allocated Employees
              </h3>
              <button
                onClick={() => setShowTeamModal(false)}
                className="text-red-500 hover:text-red-700 transition-colors p-[0.5vw] rounded-full hover:bg-red-50 cursor-pointer"
              >
                <svg
                  className="w-[1.5vw] h-[1.5vw]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-[2vw]">
              {isLoadingStaff ? (
                <div className="py-[2.5vw] text-center">
                  <svg
                    className="animate-spin h-[2vw] w-[2vw] text-red-500 mx-auto"
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
                  <p className="mt-[1vw] text-[0.8vw] font-bold text-gray-500">
                    Loading Team Data...
                  </p>
                </div>
              ) : currentAllocations.length > 0 ? (
                <ul className="space-y-[1vw]">
                  {currentAllocations.map((member, idx) => (
                    <li
                      key={idx}
                      className="flex flex-col border-b border-gray-50 pb-[0.7vw] last:border-0"
                    >
                      <div className="flex items-center gap-[0.7vw]">
                        <span className="w-[1.5vw] h-[1.5vw] rounded-full bg-red-50 text-red-500 flex items-center justify-center text-[0.6vw] font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-gray-900 font-bold text-[1vw] tracking-tight">
                          {member.name}
                        </span>
                      </div>
                      <span className="ml-[2.2vw] text-[0.7vw] font-black text-gray-400 tracking-widest">
                        {member.designation}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-[2.5vw] text-center opacity-40">
                  <p className="font-bold italic text-[0.8vw]">
                    No employees allocated to this expo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
