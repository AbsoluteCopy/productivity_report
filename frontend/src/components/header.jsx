import React from "react";

function Navbar() {
    return (
        <nav className="navbar navbar-expand-lg navbar-dark main-background shadow">
            <div className="container">
                {/* Logo */}
                <a className="navbar-brand fw-bold" href="/">
                    <i className="bi bi-bootstrap-fill me-2"></i>
                    Productivity Report
                </a>

                {/* Mobile Toggle */}
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Navbar Content */}
                <div className="collapse navbar-collapse" id="navbarNav">
                    {/* Left Links */}
                    <ul className="navbar-nav ms-4">
                        <li className="nav-item">
                            <a className="nav-link active" href="/">
                                Home
                            </a>
                        </li>

                        <li className="nav-item">
                            <a className="nav-link" href="/new_data">
                                Daily Report
                            </a>
                        </li>
                    </ul>

                    {/* Right Profile Dropdown */}
                    <ul className="navbar-nav ms-auto">
                        <li className="nav-item dropdown">
                            <a
                                href="#"
                                className="nav-link dropdown-toggle d-flex align-items-center"
                                role="button"
                                data-bs-toggle="dropdown"
                            >
                                <img
                                    src="https://i.pravatar.cc/40"
                                    alt="Profile"
                                    className="rounded-circle me-2"
                                    width="35"
                                    height="35"
                                />
                                John Doe
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