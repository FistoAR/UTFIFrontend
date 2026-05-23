import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../../context/LoadingContext";

export default function EmployeeLocation() {
  const navigate = useNavigate();
  const { isLoading, startLoading, stopLoading } = useLoading();
  const [locations, setLocations] = useState([]);

  const fetchLocationData = async () => {
    startLoading();
    try {
      const response = await fetch("https://utfi.in/app/Php/fetch_latest_locations.php");
      const json = await response.json();
      if (json.success) {
        setLocations(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching location data:", error);
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    fetchLocationData();
  }, []);

  return (
    <div className="p-[1vw] md:p-[2.5vw] max-w-[95vw] mx-auto bg-white min-h-screen font-sans space-y-[2vw] animate-in fade-in duration-500 pb-[6vw]">

      {/* Header */}
      <div className="flex items-center gap-[1vw] mb-[2vw]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-[2.5vw] h-[2.5vw] rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-all shadow-sm shrink-0 border border-gray-100 cursor-pointer "
        >
          <svg className="w-[1.2vw] h-[1.2vw] transition-transform hover:-translate-x-[0.2vw]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-[1.8vw] font-semibold text-gray-800   bg-clip-text text-transparent bg-gradient-to-r from-black to-gray-500">Employee Last Location</h1>
        </div>
      </div>

      {/* Total Count */}
      <div className="text-center">
        <p className="text-[1.2vw] font-black text-gray-800 ">
          Total Employees Count: <span className="text-red-600">{locations.length}</span>
        </p>
      </div>

      {/* Location Cards Container */}
      <div className="bg-whitesmoke rounded-[1.2vw] p-[1.5vw] md:p-[2.5vw] grid grid-cols-1 md:grid-cols-2 gap-[2vw] justify-items-center bg-[#F5F5F5]">
        {locations.map((item, idx) => (
          <div
            key={idx}
            className="bg-[#f3fbfc] shadow-lg w-[90%] md:w-[80%] p-[2vw] rounded-[1.5vw] transition-all hover:scale-[1.02] border border-gray-100"
          >
            <div className="space-y-[1vw]">
              <p className="text-[1.1vw] font-black text-gray-800  ">
                Employee Name: <span className="text-gray-700 font-bold">{item.name}</span>
              </p>
              <p className="text-[1vw] font-bold text-gray-600 ">
                Address: <span className="text-gray-500 font-medium normal-case">{item.address || "-"}</span>
              </p>
              <p className="text-[1vw] font-bold text-gray-600 ">
                Date and Time: <span className="text-gray-500 font-medium ">{item.timestamp || "-"}</span>
              </p>
            </div>
          </div>
        ))}
        {locations.length === 0 && !isLoading && (
            <div className="col-span-full py-[5vw] text-center text-gray-400 font-black   ">
                No location data available
            </div>
        )}
      </div>

    </div>
  );
}
