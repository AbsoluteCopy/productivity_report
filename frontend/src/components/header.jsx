import React, { useEffect, useState } from "react";

function Navbar() {

    const [userName, setUserName] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);

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


    return (
        <nav className="navbar navbar-expand-lg navbar-dark main-background shadow">
            <div className="container">

                <a className="navbar-brand fw-bold" href="/">
                    <i className="bi bi-bootstrap-fill me-2"></i>
                    Productivity Report
                </a>


                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>


                <div className="collapse navbar-collapse" id="navbarNav">

                    <ul className="navbar-nav ms-4">

                        <li className="nav-item">
                            <a className="nav-link active" href="/dashboard">
                                Home
                            </a>
                        </li>


                        <li className="nav-item">
                            <a className="nav-link" href="/daily_report">
                                Daily Report
                            </a>
                        </li>


                        {isAdmin && (
                            <li className="nav-item">
                                <a className="nav-link" href="/view_utilization_report">
                                    Utilization Report
                                </a>
                            </li>
                        )}

                    </ul>


                    <ul className="navbar-nav ms-auto">

                        <li className="nav-item dropdown">

                            <a
                                href="#"
                                className="nav-link dropdown-toggle d-flex align-items-center"
                                role="button"
                                data-bs-toggle="dropdown"
                            >
                                <i className="bi bi-person-circle me-2"></i>
                                {userName || "User"}
                            </a>


                            <ul className="dropdown-menu dropdown-menu-end shadow">

                                <li>
                                    <a className="dropdown-item" href="/settings">
                                        <i className="bi bi-gear me-2"></i>
                                        Settings
                                    </a>
                                </li>


                                <li>
                                    <hr className="dropdown-divider" />
                                </li>


                                <li>
                                    <a className="dropdown-item text-danger" href="/logout">
                                        <i className="bi bi-box-arrow-right me-2"></i>
                                        Logout
                                    </a>
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