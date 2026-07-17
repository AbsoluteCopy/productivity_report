import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

function Navbar() {

    const [userName, setUserName] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {

        const userData = localStorage.getItem("user");

        if (userData) {
            const user = JSON.parse(userData);

            setUserName(
                `${user.first_name} ${user.last_name}`
            );

            setIsAdmin(user.role === "admin");
        }

    }, []);

    const handleLogout = (e) => {
        e.preventDefault();
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
    };


    return (
        <nav className="navbar navbar-expand-lg navbar-dark main-background shadow">
            <div className="container">

                <Link className="navbar-brand fw-bold" to="/dashboard">
                    Productivity Report
                </Link>

                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav ms-4">
                        <li className="nav-item">
                            <Link className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`} to="/dashboard">
                                Home
                            </Link>
                        </li>

                        <li className="nav-item">
                            <Link className={`nav-link ${location.pathname === '/daily_report' ? 'active' : ''}`} to="/daily_report">
                                Daily Report
                            </Link>
                        </li>

                        {isAdmin && (
                            <>
                                <li className="nav-item">
                                    <Link className={`nav-link ${location.pathname === '/view_utilization_report' ? 'active' : ''}`} to="/view_utilization_report">
                                        Utilization Report
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className={`nav-link ${location.pathname === '/manage_accounts' ? 'active' : ''}`} to="/manage_accounts">
                                        Manage Accounts
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