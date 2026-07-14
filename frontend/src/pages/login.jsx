import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Login = () => {
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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
                navigate("/dashboard");
            } else {
                setError(data.error || "Login failed");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: "100%",
        boxSizing: "border-box",
        padding: "13px 15px",
        border: "1px solid #d9d9d9",
        borderRadius: "10px",
        fontSize: "15px",
        outline: "none",
        transition: "all .2s ease",
        background: "#fff",
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
                overflow: "hidden",
                background: "linear-gradient(135deg, #055d47, #0a8a69)",
                padding: "20px",
                fontFamily: "Arial, sans-serif",
            }}
        >
            {/* Background Circles */}
            <div
                style={{
                    position: "absolute",
                    width: "300px",
                    height: "300px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.12)",
                    top: "-120px",
                    left: "-100px",
                }}
            />

            <div
                style={{
                    position: "absolute",
                    width: "380px",
                    height: "380px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    bottom: "-180px",
                    right: "-150px",
                }}
            />

            <div
                style={{
                    position: "absolute",
                    width: "130px",
                    height: "130px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)",
                    top: "15%",
                    right: "10%",
                }}
            />

            <div
                style={{
                    position: "absolute",
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    bottom: "25%",
                    left: "10%",
                }}
            />
            <div
                style={{
                    position: "relative",
                    zIndex: 1,
                    backgroundColor: "#fff",
                    width: "100%",
                    maxWidth: "430px",
                    padding: "40px",
                    borderRadius: "18px",
                    border: "1px solid rgba(0,0,0,.05)",
                    boxShadow: "0 15px 40px rgba(0,0,0,.18)",
                    boxSizing: "border-box",
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        textAlign: "center",
                        marginBottom: "30px",
                    }}
                >
                    <img
                        src="/images/NeitClem Sticker.png"
                        alt="Logo"
                        style={{
                            width: "90px",
                            height: "90px",
                            objectFit: "contain",
                        }}
                    />

                    <h2
                        style={{
                            color: "#065d48",
                            marginTop: "15px",
                            marginBottom: "8px",
                            fontWeight: "700",
                        }}
                    >
                        Productivity Report
                    </h2>

                    <p
                        style={{
                            color: "#666",
                            margin: 0,
                            fontSize: "14px",
                        }}
                    >
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
                            style={inputStyle}
                            onFocus={(e) => {
                                e.target.style.borderColor = "#065d48";
                                e.target.style.boxShadow =
                                    "0 0 0 3px rgba(6,93,72,.15)";
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#d9d9d9";
                                e.target.style.boxShadow = "none";
                            }}
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
                                style={{
                                    ...inputStyle,
                                    paddingRight: "48px",
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = "#065d48";
                                    e.target.style.boxShadow =
                                        "0 0 0 3px rgba(6,93,72,.15)";
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = "#d9d9d9";
                                    e.target.style.boxShadow = "none";
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

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "14px",
                            border: "none",
                            borderRadius: "10px",
                            background: loading ? "#999" : "#065d48",
                            color: "#fff",
                            fontSize: "16px",
                            fontWeight: "600",
                            cursor: loading ? "not-allowed" : "pointer",
                            transition: "all .2s ease",
                        }}
                        onMouseOver={(e) => {
                            if (!loading) {
                                e.target.style.background = "#0a7a5e";
                                e.target.style.transform = "translateY(-2px)";
                                e.target.style.boxShadow =
                                    "0 6px 18px rgba(6,93,72,.25)";
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!loading) {
                                e.target.style.background = "#065d48";
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                            }
                        }}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;