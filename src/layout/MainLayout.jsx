import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const userData = localStorage.getItem("userData");
    if (!userData) {
      navigate("/");
    }
  }, [navigate]);

  const isRegisterPage = location.pathname.includes("employeeRegister");
  const isReportsPage = location.pathname.toLowerCase().includes("reports") || location.pathname.toLowerCase().includes("analysis");

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">

      {/* Sticky Global Navbar */}
      <div className="sticky top-0 z-[100] w-full shrink-0">
         <Navbar />
      </div>

      {/* Scrollable Content Area */}
      <div
        id="mainContent"
        className={`flex-1 ${isRegisterPage ? "overflow-hidden" : "overflow-y-auto"}`}
      >
        <div className="min-h-full">
            <Outlet />
        </div>
        {!isRegisterPage && !isReportsPage && <Footer />}
      </div>

    </div>
  );
}