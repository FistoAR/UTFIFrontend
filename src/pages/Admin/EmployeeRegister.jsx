import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { useLoading } from "../../context/LoadingContext";
import logo from "../../assets/images/logo.png";
import regBg from "../../assets/images/registration_bg.png";

export default function EmployeeRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { startLoading, stopLoading } = useLoading();

  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    designation_id: "",
    contact: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "Employee"
  });

  const [fetchedDesignations, setFetchedDesignations] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingEmployees, setExistingEmployees] = useState([]);
  const [errors, setErrors] = useState({ name: "", contact: "" });

  useEffect(() => {
    const fetchDesignations = async () => {
      startLoading();
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
        const url = `${baseUrl}/designations`;
        
        const [desigRes, empRes] = await Promise.all([
          fetch(url, { headers: { "ngrok-skip-browser-warning": "any" } }),
          fetch(`${baseUrl}/employee`, { headers: { "ngrok-skip-browser-warning": "any" } })
        ]);
        
        if (desigRes.ok) setFetchedDesignations(await desigRes.json());
        if (empRes.ok) setExistingEmployees(await empRes.json());
        
      } catch (err) {
        console.error("Error fetching form data:", err);
        showToast("Backend connection failed.", "error");
      } finally {
        stopLoading();
      }
    };
    fetchDesignations();
  }, []);

  const validateName = (val) => {
    if (existingEmployees.some(emp => emp.name && emp.name.toLowerCase() === val.toLowerCase())) {
      setErrors(prev => ({ ...prev, name: "Name already exists" }));
      return false;
    }
    setErrors(prev => ({ ...prev, name: "" }));
    return true;
  };

  const validateContact = (val) => {
    if (existingEmployees.some(emp => emp.phone === val || emp.contact === val)) {
      setErrors(prev => ({ ...prev, contact: "Mobile number already exists" }));
      return false;
    }
    setErrors(prev => ({ ...prev, contact: "" }));
    return true;
  };

  const roles = ["Employee", "Admin", "Team Lead", "Super Admin"];

  const handleRegister = async (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.designation_id ||
      !formData.contact ||
      !formData.username ||
      !formData.password
    ) {
      showToast("Please fill all mandatory fields", "error");
      return;
    }
    if (errors.name || errors.contact) {
      showToast("Please fix the errors before submitting", "error");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        designation_id: parseInt(formData.designation_id),
        username: formData.username,
        password: formData.password,
        phone: formData.contact,
        role: formData.role,
        email: formData.email,
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/employee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "any"
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        showToast("Registration successful!", "success");

        setFormData({
          name: "",
          designation: "",
          designation_id: "",
          contact: "",
          email: "",
          username: "",
          password: "",
          confirmPassword: "",
          role: "Employee"
        });
      } else {
        showToast(data.error || "Registration failed", "error");
      }
    } catch (err) {
      console.error("Backend connection error:", err);
      showToast("Could not contact server. Please ensure the backend is running.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] w-screen h-screen flex flex-col lg:flex-row bg-[#111111] overflow-hidden font-sans relative">
      <style>{`
        @media (min-width: 1024px) {
          #regForm::-webkit-scrollbar {
            width: 0.5vw;
          }
          #regForm::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.2);
          }
          #regForm::-webkit-scrollbar-thumb {
            background: #dc2626;
            border-radius: 1vw;
          }
          #regForm::-webkit-scrollbar-thumb:hover {
            background: #ef4444;
          }
          #regForm {
            scrollbar-width: thin;
            scrollbar-color: #dc2626 transparent;
          }
        }
      `}</style>

      {/* Left Side Section - Image with Convex Curve */}
      <div className="relative w-full h-[25vh] lg:w-[60%] lg:h-full z-10 overflow-hidden rounded-bl-[10vw] rounded-br-[10vw] lg:rounded-none lg:rounded-r-[50vh] shadow-2xl shrink-0">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{
            backgroundImage: `url(${regBg})`,
          }}
        />

        {/* Red Overlay */}
        <div className="absolute inset-0 bg-red-600/60" />

        {/* Floating Promo Text */}
        <div className="absolute inset-0 z-30 flex flex-col justify-center px-[2.5vw] lg:px-[6vw] pointer-events-none">
          <h2 className="text-[6vw] lg:text-[4vw] font-black text-white leading-tight max-w-[80vw] lg:max-w-[35vw] drop-shadow-2xl uppercase italic text-center">
            JOIN US TO <br className="hidden lg:block" />
            SHAPE THE <br className="hidden lg:block" />
            <span className="text-red-100/90 NOT-italic">FUTURE OF</span> <br className="hidden lg:block" />
            TRADE...
          </h2>
        </div>
      </div>



      {/* Right Side - Form Container */}
      <div className="flex-1 bg-[#111111] flex flex-col relative z-20 min-h-0 overflow-hidden">

        {/* Sticky Back Button Container */}
        <div className="p-[4vw] lg:p-[2vw] flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-[10vw] h-[10vw] lg:w-[2.5vw] lg:h-[2.5vw] bg-red-600 rounded-[2vw] lg:rounded-[0.5vw] flex items-center justify-center text-white hover:bg-red-700 transition-all shadow-lg group active:scale-95 cursor-pointer"
          >
            <svg className="w-[5vw] h-[5vw] lg:w-[1.5vw] lg:h-[1.5vw]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div id="regForm" className="flex-1 overflow-y-auto px-[6vw] lg:px-[4vw] pb-[10vw] lg:pb-[5vw] overscroll-contain">
          <div className="max-w-full lg:max-w-[48vw] mx-auto w-full flex flex-col items-center">

            {/* Logo Section */}
            <div className="mb-[6vw] lg:mb-[2.5vw] text-center">
              <img src={logo} alt="UTFI Logo" className="h-[15vw] lg:h-[5vw] w-auto drop-shadow-md mx-auto" />
            </div>

            <h1 className="text-[6vw] lg:text-[2vw] font-semibold text-white mb-[6vw] lg:mb-[2.5vw] text-center ">Register Your Account</h1>

            <form onSubmit={handleRegister} className="w-full space-y-[4vw] lg:space-y-[1.5vw]">
              {/* Fields Grid */}
              <div className="space-y-[3vw] lg:space-y-[1vw]">
                {/* Name */}
                <div className="space-y-[1vw] lg:space-y-[0.4vw]">
                  <label className="text-[3.5vw] lg:text-[1vw] font-bold text-white  ml-[0.2vw]">Name <span className="text-red-500">*</span></label>
                  <div className="mt-[1vw] lg:mt-[0.7vw]">
                    <input
                      type="text"
                      placeholder="Enter your name"
                      className={`w-full h-[12vw] lg:h-[3vw] px-[5vw] lg:px-[1.5vw] rounded-full bg-white text-gray-900 focus:ring-4 focus:ring-red-600/20 outline-none font-semibold placeholder:text-gray-400 shadow-inner text-[3.5vw] lg:text-[0.8vw] transition-all ${errors.name ? 'border-[0.2vw] border-red-500 bg-red-50' : 'border-none'}`}
                      value={formData.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, name: val });
                        validateName(val);
                      }}
                    />
                    {errors.name && <p className="text-red-500 text-[3vw] lg:text-[0.8vw] mt-2 ml-4 font-bold tracking-wide">{errors.name}</p>}
                  </div>
                </div>

                {/* Designation */}
                <div className="space-y-[1vw] lg:space-y-[0.4vw]">
                  <label className="text-[3.5vw] lg:text-[1vw] font-bold text-white  ml-[0.2vw]">Designation <span className="text-red-500">*</span></label>
                  <div className="relative mt-[1vw] lg:mt-[0.7vw]">
                    <select
                      className="w-full h-[12vw] lg:h-[3vw] px-[5vw] lg:px-[1.5vw] rounded-full bg-white border-none text-gray-900 focus:ring-4 focus:ring-red-600/20 outline-none font-semibold appearance-none cursor-pointer shadow-inner text-[3.5vw] lg:text-[0.8vw]"
                      value={formData.designation_id}
                      onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                    >
                      <option value="" disabled>Select a designation</option>
                      {fetchedDesignations.map(d => <option key={d.id} value={d.id}>{d.designation}</option>)}
                    </select>
                    <div className="absolute right-[4vw] lg:right-[1vw] top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg className="w-[5vw] lg:w-[1.2vw] h-[5vw] lg:h-[1.2vw]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-[1vw] lg:space-y-[0.4vw]">
                  <label className="text-[3.5vw] lg:text-[1vw] font-bold text-white  ml-[0.2vw]">Contact Number <span className="text-red-500">*</span></label>
                  <div className="mt-[1vw] lg:mt-[0.7vw]">
                    <input
                      type="text"
                      placeholder="Enter your phone number"
                      className={`w-full h-[12vw] lg:h-[3vw] px-[5vw] lg:px-[1.5vw] rounded-full bg-white text-gray-900 focus:ring-4 focus:ring-red-600/20 outline-none font-semibold placeholder:text-gray-400 shadow-inner text-[3.5vw] lg:text-[0.8vw] transition-all ${errors.contact ? 'border-[0.2vw] border-red-500 bg-red-50' : 'border-none'}`}
                      value={formData.contact}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, contact: val });
                        validateContact(val);
                      }}
                    />
                    {errors.contact && <p className="text-red-500 text-[3vw] lg:text-[0.8vw] mt-2 ml-4 font-bold tracking-wide">{errors.contact}</p>}
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-[1vw] lg:space-y-[0.4vw]">
                  <label className="text-[3.5vw] lg:text-[1vw] font-bold text-white  ml-[0.2vw]">Email ID </label>
                  <div className="mt-[1vw] lg:mt-[0.7vw]">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="w-full h-[12vw] lg:h-[3vw] px-[5vw] lg:px-[1.5vw] rounded-full bg-blue-50/90 border-none text-gray-900 focus:ring-4 focus:ring-red-600/20 outline-none font-semibold placeholder:text-gray-400 shadow-inner text-[3.5vw] lg:text-[0.8vw]"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-[1vw] lg:space-y-[0.4vw]">
                  <label className="text-[3.5vw] lg:text-[1vw] font-bold text-white  ml-[0.2vw]">User name <span className="text-red-500">*</span></label>
                  <div className="mt-[1vw] lg:mt-[0.7vw]">
                    <input
                      type="text"
                      placeholder="Enter your user name"
                      className="w-full h-[12vw] lg:h-[3vw] px-[5vw] lg:px-[1.5vw] rounded-full bg-white border-none text-gray-900 focus:ring-4 focus:ring-red-600/20 outline-none font-semibold placeholder:text-gray-400 shadow-inner text-[3.5vw] lg:text-[0.8vw]"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-[1vw] lg:space-y-[0.4vw] relative">
                  <label className="text-[3.5vw] lg:text-[1vw] font-bold text-white  ml-[0.2vw]">Password <span className="text-red-500">*</span></label>
                  <div className="relative mt-[1vw] lg:mt-[0.7vw]">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className="w-full h-[12vw] lg:h-[3vw] px-[5vw] lg:px-[1.5vw] rounded-full bg-blue-50/90 border-none text-gray-900 focus:ring-4 focus:ring-red-600/20 outline-none font-semibold shadow-inner text-[3.5vw] lg:text-[0.8vw]"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-[4vw] lg:right-[1.2vw] top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <svg className="w-[5vw] lg:w-[1.2vw] h-[5vw] lg:h-[1.2vw]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543-7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-[1vw] lg:space-y-[0.4vw] relative">
                  <label className="text-[3.5vw] lg:text-[1vw] font-bold text-white  ml-[0.2vw]">Confirm Password <span className="text-red-500">*</span></label>
                  <div className="relative mt-[1vw] lg:mt-[0.7vw]">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="w-full h-[12vw] lg:h-[3vw] px-[5vw] lg:px-[1.5vw] rounded-full bg-white border-none text-gray-900 focus:ring-4 focus:ring-red-600/20 outline-none font-semibold placeholder:text-gray-400 shadow-inner text-[3.5vw] lg:text-[0.8vw]"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-[4vw] lg:right-[1.2vw] top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <svg className="w-[5vw] lg:w-[1.2vw] h-[5vw] lg:h-[1.2vw]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showConfirmPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543-7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Choose Role */}
              <div className="py-[3vw] lg:py-[1vw]">
                <label className="text-[4vw] lg:text-[1.2vw] font-black text-white  ml-[0.2vw] mb-[3vw] lg:mb-[1.2vw] block ">Choose Role <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-y-[4vw] lg:gap-y-[1.5vw]">
                  {roles.map(role => (
                    <label key={role} className="flex items-center gap-[3vw] lg:gap-[1vw] cursor-pointer group">
                      <div className="relative flex items-center justify-center text-white">
                        <input
                          type="radio"
                          name="role"
                          className="peer appearance-none w-[5vw] lg:w-[1.5vw] h-[5vw] lg:h-[1.5vw] rounded-full border-[0.4vw] lg:border-[0.15vw] border-white/20 checked:border-red-600 transition-all cursor-pointer"
                          checked={formData.role === role}
                          onChange={() => setFormData({ ...formData, role })}
                        />
                        <div className="absolute w-[2.5vw] lg:w-[0.7vw] h-[2.5vw] lg:h-[0.7vw] bg-red-600 rounded-full scale-0 peer-checked:scale-100 transition-transform duration-300 pointer-events-none" />
                      </div>
                      <span className="text-white text-[3.5vw] lg:text-[1vw] group-hover:text-red-500 transition-colors  font-bold">{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sign Up Button */}
              <div className="pt-[4vw] lg:pt-[1.5vw] pb-[8vw] lg:pb-[3vw]">
                <button
                  type="submit"
                  disabled={isSubmitting || !!errors.name || !!errors.contact}
                  className="w-full h-[14vw] lg:h-[4vw] rounded-[3vw] lg:rounded-[1vw] bg-red-600 hover:bg-black text-white font-black uppercase tracking-[0.2vw] text-[5vw] lg:text-[1.5vw] shadow-2xl shadow-red-900/40 transform active:scale-[0.98] transition-all cursor-pointer mb-[6vw] lg:mb-[2vw] italic disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-4"
                >
                  {isSubmitting && <svg className="animate-spin h-[6vw] lg:h-[2vw] w-[6vw] lg:w-[2vw] text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                  SIGN UP
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
