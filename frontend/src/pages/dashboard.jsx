import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Home = () => {
    const [user, setUser] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [recentReports, setRecentReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get user from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            fetchRecentReports(parsedUser.id);
        }
    }, []);

    useEffect(() => {
        // Update time every second
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const fetchRecentReports = async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}/reports/`);
            if (response.ok) {
                const data = await response.json();
                // Get last 3 reports
                const lastThree = data.slice(0, 3);
                setRecentReports(lastThree);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (date) => {
        return {
            date: date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            time: date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: true 
            })
        };
    };

    const { date, time } = formatDateTime(currentTime);

    return (
        <div className="container mt-5">
            <div className="row mb-5">
                {/* Welcome Message */}
                <div className="col-12">
                    <div className="p-4 rounded-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #055d47 0%, #2F8F83 100%)', color: 'white' }}>
                        <h2 className="fw-bold mb-1">
                            Welcome back, {user ? `${user.first_name}` : 'User'}!
                        </h2>
                        <p className="mb-0 opacity-75">Ready to track your productivity today?</p>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Current Time Card */}
                <div className="col-md-5 col-lg-4">
                    <div className="card shadow-sm h-100 border-0 rounded-4 overflow-hidden" style={{ transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div className="card-body text-center p-5 d-flex flex-column justify-content-center">
                            <div className="mb-3">
                                <i className="bi bi-clock-history" style={{ fontSize: '3rem', color: '#055d47' }}></i>
                            </div>
                            <div className="display-5 fw-bold mb-2" style={{ color: '#08060d', letterSpacing: '-1px' }}>
                                {time}
                            </div>
                            <p className="text-muted fw-medium mb-0">{date}</p>
                        </div>
                    </div>
                </div>

                {/* Recent Reports Card */}
                <div className="col-md-7 col-lg-8">
                    <div className="card shadow-sm h-100 border-0 rounded-4">
                        <div className="card-header bg-white border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold mb-0" style={{ color: '#055d47' }}>
                                <i className="bi bi-journal-text me-2"></i>Recent Reports
                            </h5>
                            <Link to="/new_data" className="btn btn-sm" style={{ backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47', fontWeight: '600', borderRadius: '8px' }}>
                                <i className="bi bi-plus-lg me-1"></i> New
                            </Link>
                        </div>
                        <div className="card-body p-4">
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-success" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : recentReports.length > 0 ? (
                                <div className="list-group list-group-flush gap-2">
                                    {recentReports.map((report) => (
                                        <div key={report.id} className="list-group-item border rounded-3 p-3 d-flex justify-content-between align-items-center" style={{ transition: 'all 0.2s' }}>
                                            <div className="d-flex align-items-center">
                                                <div className="rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47' }}>
                                                    <i className="bi bi-check2-all fs-5"></i>
                                                </div>
                                                <div>
                                                    <h6 className="mb-1 fw-bold text-dark">{report.task_category}</h6>
                                                    <small className="text-muted fw-medium">
                                                        <i className="bi bi-calendar3 me-1"></i>
                                                        {new Date(report.date).toLocaleDateString('en-US', { 
                                                            month: 'short', 
                                                            day: 'numeric', 
                                                            year: 'numeric' 
                                                        })}
                                                    </small>
                                                </div>
                                            </div>
                                            <div className="text-end d-flex flex-column gap-1">
                                                <span className="badge rounded-pill" style={{ backgroundColor: '#2F8F83', fontSize: '0.75rem', padding: '0.4em 0.8em' }}>
                                                    {report.number_of_tasks} tasks
                                                </span>
                                                <span className="badge rounded-pill" style={{ backgroundColor: '#6c757d', fontSize: '0.75rem', padding: '0.4em 0.8em' }}>
                                                    <i className="bi bi-hourglass-split me-1"></i>{report.time_spent}m
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-5">
                                    <div className="mb-3">
                                        <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                                    </div>
                                    <h6 className="text-muted fw-medium mb-3">No recent reports found</h6>
                                    <Link to="/new_data" className="btn btn-primary rounded-pill px-4 py-2 fw-semibold">
                                        Create your first report
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;