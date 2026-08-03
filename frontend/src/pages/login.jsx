import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/login.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Login = () => {
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        // Clear any stuck/invalid tokens from previous sessions/databases
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Load remembered email if exists
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/login/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("token", data.token);
                
                // Handle remember me functionality
                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }
                if (data.user.role === 'viewer') {
                    navigate("/view_report");
                } else {
                    navigate("/dashboard");
                }
            } else {
                setError(data.error || "Login failed");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="glow"></div>

            <div className="blob blob1"></div>
            <div className="blob blob2"></div>
            <div className="blob blob3"></div>
            <div className="blob blob4"></div>
            <div className="login-card">
                {/* Logo */}
                <div>
                    <img
                        src="/images/gratus.png"
                        alt="Logo"
                        style={{
                            width: "250px",
                            height: "auto",
                            marginBottom: "15px",
                            objectFit: "contain",
                        }}
                        className="logo"
                    />

                    <h2 className="login-title">
                        Productivity Report
                    </h2>

                    <p className="login-subtitle">
                        Sign in to continue
                    </p>
                </div>

                {error && (
                    <div
                        style={{
                            background: "#fff2f2",
                            color: "#d32f2f",
                            border: "1px solid #ffcdd2",
                            borderRadius: "10px",
                            padding: "12px",
                            textAlign: "center",
                            marginBottom: "20px",
                            fontSize: "14px",
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "20px" }}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: "8px",
                                color: "#065d48",
                                fontWeight: "600",
                            }}
                        >
                            Email
                        </label>

                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            required
                            onChange={(e) => setEmail(e.target.value)}
                            className="login-input"
                        />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: "28px" }}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: "8px",
                                color: "#065d48",
                                fontWeight: "600",
                            }}
                        >
                            Password
                        </label>

                        <div style={{ position: "relative" }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                required
                                onChange={(e) => setPassword(e.target.value)}
                                className="login-input"
                                style={{
                                    paddingRight: "48px",
                                }}
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
                                style={{
                                    position: "absolute",
                                    right: "12px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    padding: 0,
                                }}
                            >
                                {showPassword ? (
                                    <svg
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#065d48"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#065d48"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Remember Me Checkbox */}
                    <div style={{ marginBottom: "20px", display: "flex", alignItems: "center" }}>
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            style={{
                                width: "18px",
                                height: "18px",
                                marginRight: "10px",
                                cursor: "pointer",
                                accentColor: "#065d48",
                            }}
                        />
                        <label
                            htmlFor="rememberMe"
                            style={{
                                color: "#065d48",
                                fontWeight: "500",
                                cursor: "pointer",
                                fontSize: "14px",
                            }}
                        >
                            Remember me
                        </label>
                    </div>

                    {/* Login Button */}
                    <button type="submit" disabled={loading} className="login-btn">
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;