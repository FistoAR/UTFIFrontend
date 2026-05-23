import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import "./Login.css";

// Assuming these images exist in src/assets/images based on previous listing
import backgroundImage from "../assets/images/registration_bg.png";
import logoImage from "../assets/images/logo.png";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [userData, setUserData] = useState(null);
    
    const navigate = useNavigate();
    const { showToast } = useToast();

    useEffect(() => {
        // Session check on load
        const storedData = localStorage.getItem("userData");
        if (storedData) {
            const sessionData = JSON.parse(storedData);
            const userRole = (sessionData.user.role || "").toLowerCase();
            if (userRole === "super admin") {
                navigate("/SuperAdmin/home");
            } else if (userRole === "admin") {
                navigate("/Admin/home");
            } else {
                navigate("/Employee/home");
            }
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        
        if (!username || !password) {
            showToast("Both fields are required!", "error");
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);

        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
            const response = await fetch(`${apiBaseUrl}/login`, {
                method: "POST",
                headers: {
                    "ngrok-skip-browser-warning": "true"
                },
                body: formData
            });
            const data = await response.json();

            if (data.status === "success") {
                setUserData(data.data);
                localStorage.setItem("userData", JSON.stringify({ user: data.data }));
                showToast("Login successful!", "success");
                setTimeout(() => {
                    const role = (data.data.role || "").toLowerCase();
                    if (role === "super admin") {
                        navigate("/SuperAdmin/home");
                    } else if (role === "admin") {
                        navigate("/Admin/home");
                    } else {
                        navigate("/Employee/home");
                    }
                }, 1000);
            } else {
                showToast("Invalid credentials. Please try again.", "error");
            }
        } catch (error) {
            console.error("Error:", error);
            showToast("An error occurred while processing your request.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Redirection is handled in handleLogin

    return (
        <div className="login-page-container">
            {/* Main Container */}
            <div className="flex min-h-screen main-container">

                {/* Left Side (50%) */}
                <div className="w-[50%] relative overflow-hidden radius-right-side left-side h-screen">
                    <img src={backgroundImage} alt="Background" className="w-full h-full object-cover" />
                    <div className="absolute background-red-overlay"></div>
                    <h1 className="absolute text-white uppercase center-text-left leading-tight">
                        <span>join us to shape the</span>
                        <span>future of</span>
                        <span>trade together...</span>
                    </h1>
                </div>

                <div className="w-[8%]"></div>
                
                {/* Right Side (42%) */}
                <div className="w-[42%] p-8 flex flex-col justify-center items-center bgColor-black right-side">
                    <form onSubmit={handleLogin} className="w-[90%] p-8 flex flex-col justify-center items-center bgColor-black form-container">
                        
                        {/* Logo */}
                        <div className="mb-12 flex flex-col justify-center items-center">
                            <img src={logoImage} alt="Logo" className="w-3/4 h-auto" />
                        </div>

                        {/* Heading */}
                        <h2 className="text-2xl text-white font-semibold mb-6 text-center">Login To Your Account!</h2>

                        {/* Username Input */}
                        <div className="mb-4 w-full">
                            <label className="block text-md font-medium text-white">User name</label>
                            <input 
                                type="text"
                                className="w-full px-6 py-3 mt-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Enter your User name"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        {/* Password Input */}
                        <div className="mb-1 w-full relative">
                            <label className="block text-md font-medium text-white">Password</label>
                            <input 
                                type={showPassword ? "text" : "password"}
                                className="w-full px-6 py-3 mt-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <i 
                                className={`eye-icon fa-solid ${showPassword ? "fa-eye" : "fa-eye-slash"}`}
                                onClick={() => setShowPassword(!showPassword)}
                            ></i>
                        </div>

                        {/* Forgot Password */}
                        <div className="w-full text-right mb-8">
                            <a href="#" className="text-sm text-white hover:underline hidden">Forgot password?</a>
                        </div>

                        {/* Login Button */}
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 mb-4 text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors uppercase button-text"
                        >
                            {isLoading ? "Logging in..." : "Login"}
                        </button>
                    </form>
                </div>

                <div className="w-[2%]"></div>
            </div>

        </div>
    );
};

export default Login;
