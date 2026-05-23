import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import logoIcon from "../../assets/images/logo.png";
import Calendar from "../../assets/icons/calendar.svg"
import PdfIcon from "../../assets/icons/pdfIcon.svg"
import ExcelIcon from "../../assets/icons/excelIcon.svg"

const REPORT_TYPES = {
  EXPO_ALL: "Expo Details",
  EMPLOYEE_DATA: "Employee Details"
};

export default function AdminReports() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [activeReport, setActiveReport] = useState(REPORT_TYPES.EXPO_ALL);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [tooltip, setTooltip] = useState(null);

  const [expos, setExpos] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [modalMembers, setModalMembers] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [activeReport, searchTerm, filterType, startDate, endDate, expos, employees]);

  const fetchData = async () => {
    if (isLoading) return;
    setIsLoading(true);
    startLoading();
    try {
      const [exposRes, empRes] = await Promise.all([
        fetch(`${API_BASE}/expos`, { headers: { 'ngrok-skip-browser-warning': 'any' } }),
        fetch(`${API_BASE}/employee`, { headers: { 'ngrok-skip-browser-warning': 'any' } })
      ]);

      if (exposRes.ok && empRes.ok) {
        let exposData = await exposRes.json();
        exposData = exposData.filter(expo => expo.active !== 0 && expo.active !== '0');
        const empData = await empRes.json();

        const parsedExpos = exposData.map(ex => ({
          ...ex,
          dates: typeof ex.dates === 'string' ? JSON.parse(ex.dates || "[]") : (ex.dates || []),
          employees_allocated: typeof ex.employees_allocated === 'string' 
            ? JSON.parse(ex.employees_allocated || "[]") 
            : (ex.employees_allocated || [])
        }));

        setExpos(parsedExpos);
        setEmployees(empData);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsLoading(false);
      stopLoading();
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const filterData = () => {
    let data = [];
    if (activeReport === REPORT_TYPES.EXPO_ALL) {
      data = expos.map(ex => {
        const memberNames = (ex.employees_allocated || [])
          .map(id => employees.find(emp => String(emp.id) === String(id))?.name)
          .filter(Boolean)
          .join(", ");
        const creator = employees.find(emp => String(emp.id) === String(ex.createdBy))?.name || ex.createdBy || "Admin";
        return { ...ex, allocatedMembers: memberNames || "No members allocated", creator };
      });
    } else if (activeReport === REPORT_TYPES.EMPLOYEE_DATA) {
      data = employees;
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      data = data.filter(item => {
        if (filterType) {
          let fieldValue = "";
          if (filterType === "dates" && Array.isArray(item.dates)) {
            fieldValue = item.dates.join(", ");
          } else {
            fieldValue = item[filterType] || "";
          }
          return String(fieldValue).toLowerCase().includes(s);
        } else {
          if (activeReport === REPORT_TYPES.EXPO_ALL) {
            return (
              (item.expo_name || "").toLowerCase().includes(s) ||
              (item.location || "").toLowerCase().includes(s) ||
              (item.dates?.join(", ") || "").toLowerCase().includes(s)
            );
          } else {
            return (
              (item.name || "").toLowerCase().includes(s) ||
              (item.designation || "").toLowerCase().includes(s) ||
              (item.role || "").toLowerCase().includes(s) ||
              (item.email || "").toLowerCase().includes(s) ||
              (item.username || "").toLowerCase().includes(s)
            );
          }
        }
      });
    }

    if (activeReport === REPORT_TYPES.EXPO_ALL && (startDate || endDate)) {
      data = data.filter(item => {
        if (!item.dates || item.dates.length === 0) return false;
        return item.dates.some(d => {
          const dt = new Date(d);
          if (startDate && dt < new Date(startDate)) return false;
          if (endDate && dt > new Date(endDate)) return false;
          return true;
        });
      });
    }
    setFilteredData(data);
  };

  useEffect(() => {
    filterData();
  }, [activeReport, searchTerm, filterType, startDate, endDate, expos, employees]);

  const loadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  const getFilterText = () => {
    let filters = [];
    if (activeReport === REPORT_TYPES.EXPO_ALL) {
        if (filterType && searchTerm) filters.push(`${filterType}: ${searchTerm}`);
        if (startDate) filters.push(`From: ${startDate}`);
        if (endDate) filters.push(`To: ${endDate}`);
    } else {
        if (filterType && searchTerm) filters.push(`${filterType}: ${searchTerm}`);
    }
    return filters.length > 0 ? filters.join(" | ") : "None";
  };

  const handleExport = async (type) => {
    if (filteredData.length === 0) {
      showToast("No data to export.", "error");
      return;
    }
    showToast(`Exporting ${activeReport} to ${type}...`, "success");

    if (type === "Excel") {
        let exportData = [];
        if (activeReport === REPORT_TYPES.EXPO_ALL) {
            exportData = filteredData.map((item, index) => ({
                "S.No": index + 1,
                "Created At": item.created_at ? formatDate(item.created_at) : "-",
                "Created By": item.creator || "-",
                "Expo Name": item.expo_name || item.name,
                "Venue": item.location,
                "Dates": (item.dates && Array.isArray(item.dates)) ? item.dates.map(d => formatDate(d)).join(", ") : "-",
                "Allocated Members": item.allocatedMembers || "None"
            }));
        } else {
            exportData = filteredData.map((item, index) => ({
                "S.No": index + 1,
                "Name": item.name,
                "Designation": item.designation,
                "Username": item.username || "-",
                "Email": item.email,
                "Password": item.password || "-",
                "Role": item.role,
                "Phone": item.phone || item.contact || "-"
            }));
        }

        const wb = XLSX.utils.book_new();
        const wsData = [
            ["Company:", "UTFI Trade Fair"],
            ["Report Base:", activeReport],
            ["Applied Filters:", getFilterText()],
            [], 
        ];
        const headers = Object.keys(exportData[0] || {});
        wsData.push(headers);
        exportData.forEach(row => wsData.push(Object.values(row)));

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `${activeReport.replace(/\s+/g, "_")}_Report.xlsx`);

    } else if (type === "PDF") {
        try {
            const doc = new jsPDF("landscape");
            const indianTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
            
            const logoImage = await loadImage(logoIcon);
            if (logoImage) {
                doc.addImage(logoImage, 'PNG', 14, 10, 30, 15); 
            }

            doc.setFontSize(10);
            doc.text(`Generated At: ${indianTime}`, doc.internal.pageSize.getWidth() - 14, 15, { align: "right" });
            
            doc.setFontSize(15);
            doc.setFont(undefined, "bold");
            doc.text(`UTFI Trade Fair - ${activeReport}`, doc.internal.pageSize.getWidth() / 2, 25, { align: "center" });
            
            doc.setFontSize(10);
            doc.setFont(undefined, "normal");
            doc.text(`Applied Filters: ${getFilterText()}`, 14, 38);

            let tableColumns = [];
            let tableRows = [];

            if (activeReport === REPORT_TYPES.EXPO_ALL) {
                 tableColumns = ["S.No", "Created At", "Created By", "Expo Name", "Venue", "Event Dates", "Allocated Members"];
                 tableRows = filteredData.map((item, index) => [
                     index + 1,
                     item.created_at ? formatDate(item.created_at) : "-",
                     item.creator || "-",
                     item.expo_name || item.name,
                     item.location,
                     item.dates && Array.isArray(item.dates) ? item.dates.map(d => formatDate(d)).join(",\n") : "-", 
                     item.allocatedMembers || "None"
                 ]);
            } else {
                 tableColumns = ["S.No", "Name", "Designation", "Username", "Email", "Password", "Role", "Phone"];
                 tableRows = filteredData.map((item, index) => [
                     index + 1,
                     item.name,
                     item.designation,
                     item.username || "-",
                     item.email,
                     item.password || "-",
                     item.role,
                     item.phone || item.contact || "-"
                 ]);
            }

            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: 45,
                theme: 'grid',
                headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], lineColor: [255, 255, 255], lineWidth: 0.1 },
                bodyStyles: { textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
                styles: { fontSize: 9 }
            });

            doc.save(`${activeReport.replace(/\s+/g, "_")}_Report.pdf`);
        } catch(e) {
            console.error("PDF Export failed", e);
            showToast("Failed to compile PDF.", "error");
        }
    }
  };

  const openMembersModal = (membersStr) => {
    setModalMembers(membersStr);
    setIsTeamModalOpen(true);
  };

  const renderTableHead = () => {
    if (activeReport === REPORT_TYPES.EXPO_ALL) {
      return (
        <tr className="bg-[#00bcd4] text-black text-sm font-bold tracking-wide">
          <th className="py-2 px-3 text-center border border-white">S.No</th>
          <th className="py-2 px-3 text-center border border-white">Created At</th>
          <th className="py-2 px-3 text-center border border-white">Created By</th>
          <th className="py-2 px-3 text-center border border-white">Expo Name</th>
          <th className="py-2 px-3 text-center border border-white">Venue</th>
          <th className="py-2 px-3 text-center border border-white">Dates</th>
          <th className="py-2 px-3 text-center border border-white">Allocated Members</th>
        </tr>
      );
    }
    return (
      <tr className="bg-[#00bcd4] text-black text-sm font-bold tracking-wide">
        <th className="py-2 px-3 text-center border border-white">S.No</th>
        <th className="py-2 px-3 text-center border border-white">Name</th>
        <th className="py-2 px-3 text-center border border-white">Designation</th>
        <th className="py-2 px-3 text-center border border-white">Username</th>
        <th className="py-2 px-3 text-center border border-white">Email</th>
        <th className="py-2 px-3 text-center border border-white">Password</th>
        <th className="py-2 px-3 text-center border border-white">Phone</th>
        <th className="py-2 px-3 text-center border border-white">Role</th>
      </tr>
    );
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const renderTableRows = () => {
    if (filteredData.length === 0) {
      return (
        <tr>
          <td colSpan="12" className="py-8 text-center text-black italic text-sm border-b border-black">
            No records found.
          </td>
        </tr>
      );
    }

    if (activeReport === REPORT_TYPES.EXPO_ALL) {
      let sNo = indexOfFirstItem + 1;
      return currentItems.map((item) => (
        <tr key={item.id} className="bg-white hover:bg-gray-50 border-b border-black">
          <td className="py-2 px-3 text-center text-sm text-black border-r border-black">{sNo++}</td>
          <td className="py-2 px-3 text-center text-sm text-black border-r border-black">
             {item.created_at ? formatDate(item.created_at) : "-"}
          </td>
          <td className="py-2 px-3 text-center text-sm text-black border-r border-black">{item.creator || "-"}</td>
          <td className="py-2 px-3 text-center text-sm text-black border-r border-black">{item.expo_name || item.name}</td>
          <td className="py-2 px-3 text-center text-sm text-black border-r border-black">{item.location}</td>
          <td className="py-2 px-3 text-center text-sm text-black border-r border-black">
             {item.dates && item.dates.length > 3 ? (
                <div className="relative group inline-block">
                  <span className="cursor-pointer pb-0.5 whitespace-nowrap text-black">
                    {item.dates.slice(0, 3).map(d => formatDate(d)).join(", ")} <span className="text-red-500 font-bold ml-1">+{item.dates.length - 3}more</span>
                  </span>
                  <div className="hidden group-hover:block absolute z-[100] bg-black font-medium text-white text-xs let-spacing rounded p-2.5 top-full mt-2 left-1/2 transform -translate-x-1/2 w-max max-w-[250px] whitespace-normal shadow-2xl text-center leading-relaxed">
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                    {item.dates.map(d => formatDate(d)).join(", ")}
                  </div>
                </div>
             ) : (
               item.dates?.map(d => formatDate(d)).join(", ") || "-"
             )}
          </td>
          <td className="py-2 px-3 text-center text-sm text-black border-r border-black">
            <span
              onClick={() => openMembersModal(item.allocatedMembers)}
              className="cursor-pointer text-black hover:underline transition-colors"
            >
              View Members
            </span>
          </td>
        </tr>
      ));
    }

    return currentItems.map((item, index) => (
      <tr key={item.id} className="bg-white hover:bg-gray-50 border-b border-black text-sm text-black">
        <td className="py-2 px-3 text-center border-r border-black">{indexOfFirstItem + index + 1}</td>
        <td className="py-2 px-3 text-center border-r border-black">{item.name}</td>
        <td className="py-2 px-3 text-center border-r border-black">{item.designation}</td>
        <td className="py-2 px-3 text-center border-r border-black">{item.username || "-"}</td>
        <td className="py-2 px-3 text-center border-r border-black">{item.email}</td>
        <td className="py-2 px-3 text-center border-r border-black">{item.password || "-"}</td>
        <td className="py-2 px-3 text-center border-r border-black">{item.phone || item.contact || "-"}</td>
        <td className="py-2 px-3 text-center border-r border-black">{item.role}</td>
      </tr>
    ));
  };

  return (
    <div className="flex h-screen font-sans bg-white overflow-hidden">

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Side: Navigation Sidebar */}
      <div
        className={`
          fixed lg:relative z-50 lg:z-auto
          w-[75vw] lg:w-[20%]
          pt-6 bg-[#1f1f1f] text-white h-full shrink-0 flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
          <div className="px-6 pb-4 flex items-center justify-between">
            <h1 className="text-white font-extrabold text-2xl" style={{fontFamily: "Arial, sans-serif"}}>
              Admin Reports
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex flex-col space-y-2 flex-1 ml-4 py-2">
            <button
              onClick={() => { setActiveReport(REPORT_TYPES.EXPO_ALL); setSidebarOpen(false); }}
              className={`nav-button flex items-center px-4 py-3 rounded-l-full outline-none transition-all cursor-pointer border-t border-b border-l-[4px] border-r-0 ${
                activeReport === REPORT_TYPES.EXPO_ALL 
                  ? "bg-white text-black font-bold border-l-red-600 border-t-white border-b-white" 
                  : "bg-transparent text-gray-300 hover:text-white border-transparent"
              }`}
            >
              <img src={Calendar} alt="calendar" className="w-5 h-5 mr-3" />
              <span>{REPORT_TYPES.EXPO_ALL}</span>
            </button>
            <button
              onClick={() => { setActiveReport(REPORT_TYPES.EMPLOYEE_DATA); setSidebarOpen(false); }}
              className={`nav-button flex items-center px-4 py-3 rounded-l-full outline-none transition-all cursor-pointer border-t border-b border-l-[4px] border-r-0 ${
                activeReport === REPORT_TYPES.EMPLOYEE_DATA 
                  ? "bg-white text-black font-bold border-l-red-600 border-t-white border-b-white" 
                  : "bg-transparent text-white/70 hover:text-white border-transparent"
              }`}
            >
              <img src={Calendar} alt="calendar" className="w-5 h-5 mr-3" />
              <span>{REPORT_TYPES.EMPLOYEE_DATA}</span>
            </button>
          </div>
      </div>

      {/* Right Side: Content Area (80%) */}
      <div className="flex-1 pt-6 px-6 lg:px-8 flex flex-col h-full bg-white relative overflow-y-auto">
        
        {/* Title & Exports */}
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-3">
              {/* Hamburger - mobile only */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
               <button className="flex items-center justify-center p-2 rounded-full cursor-pointer bg-red-50 hover:bg-red-100 transition-colors" onClick={() => navigate(-1)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
              </button>
                <h2 className="text-xl font-bold text-black truncate max-w-[150px] sm:max-w-none" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}}>
                    {activeReport}
                </h2>
            </div>
            <button 
              onClick={fetchData} 
              className={`transition-all ${isLoading ? 'animate-spin' : 'hover:scale-110 cursor-pointer'}`}
            >
                <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button onClick={() => handleExport("Excel")} className="flex items-center text-xs sm:text-sm font-bold py-2 px-3 sm:py-2.5 sm:px-5 rounded-full border border-green-500 bg-green-50 text-green-600 hover:bg-green-100 transition-colors cursor-pointer shadow-sm whitespace-nowrap flex-shrink-0">
                  <img src={ExcelIcon} alt="Excel" className="w-4 h-4 mr-2" />
                  Export as Excel
              </button>
              <button onClick={() => handleExport("PDF")} className="flex items-center text-xs sm:text-sm font-bold py-2 px-3 sm:py-2.5 sm:px-5 rounded-full border border-red-500 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer shadow-sm whitespace-nowrap flex-shrink-0">
                  <img src={PdfIcon} alt="PDF" className="w-4 h-4 mr-2" />
                  Export as PDF
              </button>
          </div>
        </div>

        {/* Filter Toolbar (Inline) */}
        <div className="mb-4">
          <form className="flex flex-wrap items-end gap-4" onSubmit={(e) => { e.preventDefault(); filterData(); }}>
              <div className="w-[180px]">
                  <label className="text-sm text-black block mb-1">Filter</label>
                  <select 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value)}
                    className="w-full border border-black rounded p-2 text-sm bg-white focus:outline-none focus:border-red-500 text-black"
                  >
                      <option value="">Choose filter</option>
                      {activeReport === REPORT_TYPES.EXPO_ALL ? (
                        <>
                          <option value="expo_name">Expo Name</option>
                          <option value="location">Venue</option>
                        </>
                      ) : (
                        <>
                          <option value="name">Employee Name</option>
                          <option value="designation">Designation</option>
                          <option value="email">Email</option>
                        </>
                      )}
                  </select>
              </div>

              <div className="flex-1 max-w-[280px]">
                  <input 
                    placeholder="Type here..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full border border-black rounded p-2 text-sm bg-white focus:outline-none focus:border-red-500 text-black placeholder:text-black/50" 
                  />
              </div>

              {activeReport === REPORT_TYPES.EXPO_ALL && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-black rounded p-2 text-sm bg-white focus:outline-none w-full sm:w-auto text-black" />
                    <span className="hidden sm:block text-sm font-bold text-black text-center">TO</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-black rounded p-2 text-sm bg-white focus:outline-none w-full sm:w-auto text-black" />
                </div>
              )}

              <button type="submit" className="px-6 py-2 bg-[#f04b4c] hover:bg-red-600 text-white font-medium rounded text-sm transition-colors cursor-pointer tracking-wide shadow-sm">
                  Submit
              </button>
          </form>
        </div>

        <hr className="border-t border-black w-full mb-3" />
        <h1 className="text-center font-bold text-lg text-black mb-3">Total records found : {filteredData.length}</h1>

        {/* Dynamic Table Space with Pagination */}
        <div className="overflow-hidden bg-white rounded border border-black mb-6 min-h-[65vh] max-h-[65vh] flex flex-col relative shadow-sm">
            <div className="flex-1 overflow-auto">
              <table className="min-w-full table-auto border-collapse">
                  <thead className="sticky top-0 z-10 shadow-sm relative after:absolute after:bottom-0 after:left-0 after:w-full after:border-b-2 after:border-black">
                      {renderTableHead()}
                  </thead>
                  <tbody className="divide-y divide-black">
                      {renderTableRows()}
                  </tbody>
              </table>
            </div>

            {/* Pagination Implementation */}
            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center p-3 bg-white border-t border-black mt-auto shrink-0 z-10 sticky bottom-0">
                 <span className="text-sm text-black">
                    Showing <span className="text-black font-bold">{filteredData.length === 0 ? 0 : indexOfFirstItem + 1}</span> to <span className="text-black font-bold">{Math.min(indexOfLastItem, filteredData.length)}</span> of <span className="text-black font-bold">{filteredData.length}</span> Entries
                 </span>
                 
                 <div className="flex gap-2 mt-2 sm:mt-0  max-w-full">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded bg-white border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold hover:bg-gray-100 transition-colors uppercase tracking-wider shadow-sm cursor-pointer"
                    >
                       Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                       <button
                         key={i + 1}
                         onClick={() => setCurrentPage(i + 1)}
                         className={`min-w-[32px] px-2 py-1.5 rounded border text-xs font-bold transition-all shadow-sm ${
                            currentPage === i + 1 
                              ? "bg-red-500 text-white border-red-500 scale-105" 
                              : "bg-white border-gray-300 hover:bg-gray-100 text-gray-700 cursor-pointer"
                         }`}
                       >
                          {i + 1}
                       </button>
                    ))}
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded bg-white border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold hover:bg-gray-100 transition-colors uppercase tracking-wider shadow-sm cursor-pointer"
                    >
                       Next
                    </button>
                 </div>
              </div>
            )}
        </div>

      </div>

      {/* Member Popup Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 animate-in fade-in">
          <div className="bg-white p-6 rounded shadow-2xl w-96 transform scale-100 animate-in zoom-in">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                <h2 className="text-xl font-bold text-gray-800">Allocated Members</h2>
              </div>
              <p className="text-gray-600 leading-relaxed font-medium">
                  {modalMembers || "No staff allocations exist."}
              </p>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setIsTeamModalOpen(false)} 
                  className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded transition-colors cursor-pointer shadow-sm text-sm font-semibold"
                >
                  Close
                </button>
              </div>
          </div>
        </div>
      )}

    </div>
  );
}
