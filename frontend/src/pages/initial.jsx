import React from "react";
import { useNavigate } from "react-router-dom";

const Initial = () => {
    const navigate = useNavigate();

    const buttonStyle = {
        backgroundColor: "#ffffff",
        color: "#065d48",
        border: "none",
        padding: "16px 42px",
        fontSize: "1rem",
        fontWeight: "700",
        borderRadius: "50px",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
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
                padding: "20px",
                background:
                    "linear-gradient(135deg, #065d48 0%, #0b8a6f 100%)",
            }}
        >
            {/* Decorative Background Circles */}
            <div
                style={{
                    position: "absolute",
                    width: "350px",
                    height: "350px",
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "50%",
                    top: "-120px",
                    right: "-120px",
                }}
            />

            <div
                style={{
                    position: "absolute",
                    width: "250px",
                    height: "250px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "50%",
                    bottom: "-80px",
                    left: "-80px",
                }}
            />

            {/* Main Card */}
            <div
                style={{
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "24px",
                    padding: "60px 50px",
                    maxWidth: "550px",
                    width: "100%",
                    textAlign: "center",
                    color: "#ffffff",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                    animation: "fadeIn 0.8s ease",
                }}
            >
                {/* Icon */}
                <div
                    style={{
                        fontSize: "70px",
                        marginBottom: "20px",
                    }}
                >
                    📊
                </div>

                {/* Title */}
                <h1
                    style={{
                        fontSize: "3rem",
                        fontWeight: "800",
                        marginBottom: "15px",
                        letterSpacing: "-1px",
                    }}
                >
                    Productivity Report
                </h1>

                {/* Subtitle */}
                <p
                    style={{
                        fontSize: "1.15rem",
                        lineHeight: "1.7",
                        opacity: 0.9,
                        marginBottom: "40px",
                    }}
                >
                    Monitor employee productivity, analyze performance,
                    and generate insightful reports—all in one place.
                </p>

                {/* Button */}
                <button
                    style={buttonStyle}
                    onClick={() => navigate("/login")}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow =
                            "0 15px 35px rgba(0,0,0,0.25)";
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                            "0 8px 20px rgba(0,0,0,0.15)";
                    }}
                >
                    Login →
                </button>
            </div>

            {/* Footer */}
            <div
                style={{
                    position: "absolute",
                    bottom: "20px",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "14px",
                    textAlign: "center",
                }}
            >
                © {new Date().getFullYear()} Productivity Report System
            </div>

            {/* Animation */}
            <style>
                {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
            </style>
        </div>
    );
};

export default Initial;