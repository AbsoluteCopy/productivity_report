import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Collapse from "bootstrap/js/dist/collapse";

function Navbar() {
    const [userName, setUserName] = useState("");
    const [role, setRole] = useState('');
    const [company, setCompany] = useState('');
    const [idNumber, setIdNumber] = useState('');

    const navigate = useNavigate();
    const location = useLocation();
    const navbarRef = useRef(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");

        if (userData) {
            const user = JSON.parse(userData);
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            setUserName(fullName || user.email || "User");
            setRole(user.role || '');
            setCompany(user.company || '');
            setIdNumber(user.id_number || '');
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
                    <ul className="navbar-nav ms-auto align-items-lg-center">
                        <li className="nav-item dropdown">
                            <a
                                href="#"
                                className="nav-link dropdown-toggle d-flex align-items-center gap-2 py-1 px-2 rounded"
                                role="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                            >
                                <div
                                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm flex-shrink-0"
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        fontSize: '0.82rem',
                                        backgroundColor: '#ffffff',
                                        color: '#055d47'
                                    }}
                                >
                                    {userName
                                        ? userName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                        : <i className="bi bi-person"></i>
                                    }
                                </div>

                                <div className="d-flex flex-column text-start" style={{ lineHeight: '1.2' }}>
                                    <span className="fw-semibold text-white" style={{ fontSize: '0.88rem' }}>
                                        {userName || "User"}
                                    </span>
                                    <div className="d-flex align-items-center gap-1 flex-wrap">
                                        <span
                                            className="badge"
                                            style={{
                                                fontSize: '0.65rem',
                                                padding: '0.15em 0.45em',
                                                backgroundColor: role === 'admin'
                                                    ? '#ffc107'
                                                    : role === 'hr'
                                                        ? '#0dcaf0'
                                                        : role === 'viewer'
                                                            ? '#adb5bd'
                                                            : '#d1e7dd',
                                                color: role === 'admin' || role === 'hr' ? '#000' : '#0f5132',
                                                fontWeight: 700,
                                                letterSpacing: '0.3px',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            {role === 'admin' ? 'Admin' : role === 'hr' ? 'HR' : role === 'viewer' ? 'Viewer' : 'Employee'}
                                        </span>
                                        {company && (
                                            <span className="text-white-50 text-truncate" style={{ fontSize: '0.72rem', maxWidth: '140px' }} title={company}>
                                                • {company}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </a>

                            <ul className="dropdown-menu dropdown-menu-end shadow border-0 p-2 mt-2" style={{ minWidth: '240px', borderRadius: '12px' }}>
                                <li className="px-3 py-2 border-bottom mb-2">
                                    <div className="fw-bold text-dark fs-6">{userName || "User"}</div>
                                    <div className="d-flex align-items-center gap-1 mt-1 mb-2">
                                        <span
                                            className="badge"
                                            style={{
                                                fontSize: '0.72rem',
                                                backgroundColor: role === 'admin'
                                                    ? '#fff3cd'
                                                    : role === 'hr'
                                                        ? '#cff4fc'
                                                        : role === 'viewer'
                                                            ? '#e2e3e5'
                                                            : '#d1e7dd',
                                                color: role === 'admin'
                                                    ? '#664d03'
                                                    : role === 'hr'
                                                        ? '#055160'
                                                        : role === 'viewer'
                                                            ? '#41464b'
                                                            : '#0f5132',
                                                fontWeight: 600
                                            }}
                                        >
                                            {role === 'admin' ? 'Administrator' : role === 'hr' ? 'HR' : role === 'viewer' ? 'Viewer' : 'Employee'}
                                        </span>
                                    </div>
                                    {company && (
                                        <div className="text-muted small d-flex align-items-center mb-1">
                                            <i className="bi bi-building me-2 text-secondary"></i>
                                            <span className="fw-semibold text-dark">{company}</span>
                                        </div>
                                    )}
                                    {idNumber && (
                                        <div className="text-muted small d-flex align-items-center">
                                            <i className="bi bi-person-badge me-2 text-secondary"></i>
                                            <span>ID: {idNumber}</span>
                                        </div>
                                    )}
                                </li>
                                <li>
                                    <Link to="/change_password" className="dropdown-item py-2 rounded">
                                        <i className="bi bi-key me-2 text-primary"></i> Change Password
                                    </Link>
                                </li>
                                <li>
                                    <button className="dropdown-item text-danger py-2 rounded" onClick={handleLogout}>
                                        <i className="bi bi-box-arrow-right me-2"></i> Logout
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
