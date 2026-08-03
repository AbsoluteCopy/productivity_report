import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Collapse from "bootstrap/js/dist/collapse";

function Navbar() {
    const [userName, setUserName] = useState("");
    const [role, setRole] = useState('');

    const navigate = useNavigate();
    const location = useLocation();
    const navbarRef = useRef(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");

        if (userData) {
            const user = JSON.parse(userData);
            setUserName(`${user.first_name} ${user.last_name}`);
            setRole(user.role);
        }
    }, []);

    const closeNavbar = () => {
        if (window.innerWidth < 992 && navbarRef.current) {
            const bsCollapse = Collapse.getOrCreateInstance(navbarRef.current);
            bsCollapse.hide();
        }
    };

    const handleLogout = (e) => {
        e.preventDefault();
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
    };
    useEffect(() => {
        if (window.innerWidth < 992 && navbarRef.current) {
            const bsCollapse = Collapse.getOrCreateInstance(navbarRef.current);
            bsCollapse.hide();
        }
    }, [location.pathname]);
    return (
        <nav className="navbar navbar-expand-lg navbar-dark main-background shadow">
            <div className="container">

                {(role === 'viewer') ? (
                    <span className="navbar-brand fw-bold">
                        Productivity Report
                    </span>
                ) : (
                    <Link className="navbar-brand fw-bold" to="/dashboard">
                        Productivity Report
                    </Link>
                )}

                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarNav" ref={navbarRef}>
                    <ul className="navbar-nav ms-4">

                        {role === 'admin' || role === 'employee' || role === 'hr' && (
                            <>
                                <li className="nav-item">
                                    <Link
                                        className={`nav-link ${location.pathname === "/dashboard" ? "active" : ""}`}
                                        to="/dashboard"
                                    >
                                        <i className="bi bi-house"></i> Home
                                    </Link>
                                </li>
                            </>
                        )}

                        {role === 'viewer' && (
                            <>
                                <li className="nav-item">
                                    <Link
                                        className={`nav-link ${location.pathname === "/view_report" ? "active" : ""}`}
                                        to="/view_report"
                                    >
                                        <i className="bi bi-pie-chart"></i> Daily Report
                                    </Link>
                                </li>
                            </>
                        )}
                        {(role === 'admin' || role === 'employee' || role === 'hr') && (
                            <>
                                <li className="nav-item">
                                    <Link
                                        className={`nav-link ${location.pathname === "/daily_report" ? "active" : ""}`}
                                        to="/daily_report"
                                    >
                                        <i className="bi bi-pie-chart"></i> Daily Report
                                    </Link>
                                </li>
                            </>
                        )}

                        {(role === 'admin' || role === 'viewer' || role === 'hr') && (
                            <>
                                <li className="nav-item">
                                    <Link className={`nav-link ${location.pathname === '/view_utilization_report' ? 'active' : ''}`} to="/view_utilization_report">
                                        <i className="bi bi-clipboard-data"></i> Utilization Report
                                    </Link>
                                </li>
                            </>
                        )}
                        {(role === 'admin' || role === 'hr') && (
                            <>
                                <li className="nav-item">
                                    <Link className={`nav-link ${location.pathname === '/manage_accounts' ? 'active' : ''}`} to="/manage_accounts">
                                        <i className="bi bi-person-gear"></i> Accounts
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className={`nav-link ${location.pathname === '/manage_task_category' ? 'active' : ''}`} to="/manage_task_category">
                                        <i className="bi bi-tags"></i> Task Category
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className={`nav-link ${location.pathname === '/manage_holiday' ? 'active' : ''}`} to="/manage_holiday">
                                        <i className="bi bi-calendar-event"></i> Holiday
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>
                    <ul className="navbar-nav ms-auto">
                        <li className="nav-item dropdown">
                            <a href="#" className="nav-link dropdown-toggle d-flex align-items-center" role="button" data-bs-toggle="dropdown">
                                <i className="bi bi-person-circle me-2"></i>
                                {userName || "User"}
                            </a>

                            <ul className="dropdown-menu dropdown-menu-end shadow">
                                <li>
                                    <a href="/change_password" className="dropdown-item"><i className="bi bi-key me-2"></i> Change Password</a>
                                </li>
                                <li>
                                    <button className="dropdown-item text-danger" onClick={handleLogout}>
                                        <i className="bi bi-box-arrow-right me-2"></i>
                                        Logout
                                    </button>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
