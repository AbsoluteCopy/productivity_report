import React from "react";
import { useNavigate } from "react-router-dom";
import "../css/initial.css";

const Initial = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: "⏱️",
            title: "Time Tracking",
            description: "Track work hours and task duration accurately"
        },
        {
            icon: "📈",
            title: "Analytics",
            description: "Generate detailed productivity reports"
        },
        {
            icon: "👥",
            title: "Team Management",
            description: "Monitor team performance and attendance"
        }
    ];

    return (
        <div className="initial-page">
            {/* Decorative Background Elements */}
            <div className="initial-glow"></div>
            <div className="initial-blob one"></div>
            <div className="initial-blob two"></div>
            <div className="initial-blob three"></div>
            <div className="initial-blob four"></div>

            {/* Feature Cards (Right Side) */}
            <div className="initial-features">
                {features.map((feature, index) => (
                    <div
                        key={index}
                        className="feature-card"
                        style={{ animationDelay: `${index * 0.15}s` }}
                    >
                        <div className="feature-icon">{feature.icon}</div>
                        <div className="feature-content">
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Card */}
            <div className="initial-card">
                {/* Logo/Icon */}
                <div className="initial-logo-wrapper">
                    <div className="initial-logo">
                        <svg viewBox="0 0 100 100" className="logo-svg">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.3"/>
                            <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.5"/>
                            <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="3"/>
                            <path d="M50 25 L50 75 M25 50 L75 50" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                    </div>
                </div>

                {/* Badge */}
                <div className="initial-badge">
                    Productivity Solution
                </div>

                {/* Title */}
                <h1 className="initial-title">
                    Productivity Report
                </h1>

                {/* Subtitle */}
                <p className="initial-subtitle">
                    Monitor employee productivity, analyze performance,
                    and generate insightful reports—all in one place.
                </p>

                {/* Stats Row */}
                <div className="initial-stats">
                    <div className="stat-item">
                        <div className="stat-value">24/7</div>
                        <div className="stat-label">Access</div>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                        <div className="stat-value">Real-time</div>
                        <div className="stat-label">Reports</div>
                    </div>
                </div>

                {/* Button */}
                <button className="initial-btn" onClick={() => navigate("/login")}>
                    <span>Get Started</span>
                    <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </button>

            </div>

            {/* Footer */}
            <div className="initial-footer">
                © {new Date().getFullYear()} Productivity Report System
            </div>
        </div>
    );
};

export default Initial;