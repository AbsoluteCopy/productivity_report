import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function NotFound() {
    return (
        <div
            className="min-vh-100 d-flex align-items-center justify-content-center overflow-hidden position-relative text-white"
            style={{ backgroundColor: "#055d47" }}
        >
            {/* Decorative circles */}
            <div
                className="position-absolute rounded-circle"
                style={{
                    width: "220px",
                    height: "220px",
                    top: "-70px",
                    left: "-70px",
                    background: "rgba(255,255,255,0.1)",
                }}
            />

            <div
                className="position-absolute rounded-circle"
                style={{
                    width: "250px",
                    height: "250px",
                    bottom: "-80px",
                    right: "-80px",
                    background: "rgba(255,255,255,0.1)",
                }}
            />

            <div
                className="position-absolute rounded-circle"
                style={{
                    width: "100px",
                    height: "100px",
                    top: "20%",
                    right: "15%",
                    background: "rgba(255,255,255,0.1)",
                }}
            />

            {/* Content */}
            <div className="container text-center position-relative">
                <h1
                    className="fw-bold display-1 mb-2"
                    style={{ letterSpacing: "-5px" }}
                >
                    404
                </h1>

                <h2 className="fw-semibold mb-3">
                    Oops! Page Not Found
                </h2>

                <p className="lead text-white-50 mx-auto mb-4" style={{ maxWidth: "550px" }}>
                    The page you're looking for doesn't exist or may have been moved.
                    Let's get you back to the homepage.
                </p>

                <a
                    href="/"
                    className="btn btn-light rounded-pill px-4 py-3 fw-bold shadow"
                    style={{ color: "#055d47" }}
                >
                    ← Back to Home
                </a>
            </div>
        </div>
    );
}