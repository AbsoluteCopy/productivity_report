import React from "react";
import { useNavigate } from "react-router-dom";
import "../css/initial.css";

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
        <div className="initial-page">
            {/* Decorative Background Circles */}
            <div className="initial-glow"></div>

            <div className="initial-blob one"></div>
            <div className="initial-blob two"></div>

            {/* Main Card */}
            <div className="initial-card">
                {/* Icon */}
                <div className="initial-icon">📊</div>

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
                <button className="initial-btn" onClick={() => navigate("/login")}>
                    Login →
                </button>
            </div>

            {/* Footer */}
            <div className="initial-footer">
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