import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import MainLayout from "./layout/MainLayout";
import ScrollToTop from "./ScrollToTop";

import Login from "./components/Login";
import Home from "./pages/Home";

import EmployeeHome from "./pages/Employee/EmployeeHome";
import NewLead from "./pages/Employee/Newlead";
import CustomerData from "./pages/Employee/Customerdata";
import CustomerFollowup from "./pages/Employee/Customerfollowup";
import CustomerRegister from "./pages/Employee/Customerregister";
import FollowupMainPage from "./pages/Employee/Followupmainpage";
import EditFollowupMainPage from "./pages/Employee/Editfollowupmainpage";
import FollowupReports from "./pages/Employee/Followupreports";
import DateWiseAnalysis from "./pages/Employee/Datewiseanalysis";
import ExpoReports from "./pages/Employee/ExpoReports";
import Notifications from "./pages/Notifications";

// admin login
import AdminHome from "./pages/Admin/AdminHome";
import AdminLeadRequests from "./pages/Admin/AdminLeadRequests";
import ExpoCreation from "./pages/Admin/ExpoCreation";
import EmployeeRegister from "./pages/Admin/EmployeeRegister";
import EmployeeAllocate from "./pages/Admin/EmployeeAllocate";
import AdminReports from "./pages/Admin/AdminReports";
import EditEmployeeData from "./pages/Admin/EditEmployeeData";
import DesignationManagement from "./pages/Admin/DesignationManagement";
import DeleteAllData from "./pages/Admin/DeleteAllData";
import RestoreDelete from "./pages/Admin/RestoreDelete";
import MasterDataManagement from "./pages/Admin/MasterDataManagement";
import DataChanges from "./pages/Admin/DataChanges";
import SegmentManagement from "./pages/Admin/SegmentManagement";
import EmployeeLocation from "./pages/Admin/EmployeeLocation";
import AdminFollowupReports from "./pages/Admin/AdminFollowupReports";
import AdminDatewiseAnalysis from "./pages/Admin/AdminDatewiseAnalysis";
import LeadReuse from "./pages/Admin/LeadReuse";

import { ToastProvider } from "./context/ToastContext";
import { LoadingProvider } from "./context/LoadingContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { loadingWorker } from "./workers/loadingWorker";

function App() {
  const [showSpinner, setShowSpinner] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);

  useEffect(() => {
    const handleWheel = (e) => {
      if (document.activeElement?.type === "number") {
        document.activeElement.blur();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useEffect(() => {
    if (!loadingWorker.shouldShowErrorSpinner()) {
      setShowSpinner(false);
      return;
    }

    setShowSpinner(true);
    const config = loadingWorker.getSpinnerConfig();
    
    const spinnerInterval = setInterval(() => {
      setIsOnBreak((prev) => !prev);
    }, config.spinnerDuration);

    return () => clearInterval(spinnerInterval);
  }, []);

  return (
    <LoadingProvider>
      <ConfirmProvider>
        <ToastProvider>
          {showSpinner && !isOnBreak && (
            <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center">
                <svg
                  className="animate-spin h-12 w-12 text-red-500 mx-auto mb-4"
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
                    className="opacity-100"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-lg font-bold text-red-600 mt-4">
                  {loadingWorker.getLoadingMessage()}
                </p>
              </div>
            </div>
          )}
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<MainLayout />}>
              <Route path="Home" element={<Home />} />

              {/* Employee Parent Route */}
              <Route path="Employee">
                <Route path="home" element={<EmployeeHome />} />
                <Route path="newLead" element={<NewLead />} />
                <Route path="CustomerData" element={<CustomerData />} />
                <Route path="followup" element={<CustomerFollowup />} />
                <Route path="ConfirmedFollowup" element={<CustomerRegister />} />
                <Route path="followupMainPage" element={<FollowupMainPage />} />
                <Route path="followupEditPage" element={<EditFollowupMainPage />} />
                <Route path="dateWiseAnalysis" element={<DateWiseAnalysis />} />
                <Route path="followupReports" element={<FollowupReports />} />
                <Route path="expoReports" element={<ExpoReports />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>
              
              <Route path="Admin">
                <Route path="home" element={<AdminHome />} />
                <Route path="leadRequest" element={<AdminLeadRequests />} />
                <Route path="expoCreation" element={<ExpoCreation />} />
                <Route path="employeeRegister" element={<EmployeeRegister />} />
                <Route path="employeeAllocate" element={<EmployeeAllocate />} />
                <Route path="adminReports" element={<AdminReports />} />
                <Route path="editEmployee" element={<EditEmployeeData />} />
                <Route path="designation" element={<DesignationManagement />} />
                <Route path="segments" element={<SegmentManagement />} />
                <Route path="masterData" element={<MasterDataManagement />} />
                <Route path="newLeads" element={<AdminLeadRequests />} />
                <Route path="dataChanges" element={<DataChanges />} />
                <Route path="leadReuse" element={<LeadReuse />} />
                <Route path="employeeLocation" element={<EmployeeLocation />} />
                <Route path="followupReports" element={<AdminFollowupReports />} />
                <Route path="dateWiseAnalysis" element={<AdminDatewiseAnalysis />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>
              
              <Route path="SuperAdmin">
                <Route path="home" element={<AdminHome />} />
                <Route path="leadRequest" element={<AdminLeadRequests />} />
                <Route path="expoCreation" element={<ExpoCreation />} />
                <Route path="employeeRegister" element={<EmployeeRegister />} />
                <Route path="employeeAllocate" element={<EmployeeAllocate />} />
                <Route path="adminReports" element={<AdminReports />} />
                <Route path="editEmployee" element={<EditEmployeeData />} />
                <Route path="designation" element={<DesignationManagement />} />
                <Route path="segments" element={<SegmentManagement />} />
                <Route path="deleteAll" element={<DeleteAllData />} />
                <Route path="restoreDelete" element={<RestoreDelete />} />
                <Route path="masterData" element={<MasterDataManagement />} />
                <Route path="newLeads" element={<AdminLeadRequests />} />
                <Route path="dataChanges" element={<DataChanges />} />
                <Route path="leadReuse" element={<LeadReuse />} />
                <Route path="employeeLocation" element={<EmployeeLocation />} />
                <Route path="followupReports" element={<AdminFollowupReports />} />
                <Route path="dateWiseAnalysis" element={<AdminDatewiseAnalysis />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </ConfirmProvider>
    </LoadingProvider>
  );
}

export default App;
