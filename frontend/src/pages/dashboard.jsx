import React, { useState, useEffect } from 'react';
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
            const data = await response.json();
            // Get last 3 reports
            const lastThree = data.slice(0, 3);
            setRecentReports(lastThree);
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
        <div className="container mt-4">
            <div className="row">
                {/* Welcome Message */}
                <div className="col-12 mb-4">
                    <h2 className="fw-bold" style={{ color: '#065d48' }}>
                        Welcome, {user ? `${user.first_name} ${user.last_name}` : 'User'}!
                    </h2>
                    <p className="text-muted">Here's your productivity overview</p>
                </div>

                {/* Current Time Card */}
                <div className="col-md-4 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body text-center">
                            <h5 className="card-title mb-3" style={{ color: '#065d48' }}>
                                <i className="bi bi-clock me-2"></i>Current Time
                            </h5>
                            <div className="display-4 fw-bold mb-2" style={{ color: '#065d48' }}>
                                {time}
                            </div>
                            <p className="text-muted mb-0">{date}</p>
                        </div>
                    </div>
                </div>

                {/* Recent Reports Card */}
                <div className="col-md-8 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <h5 className="card-title mb-3" style={{ color: '#065d48' }}>
                                <i className="bi bi-file-earmark-text me-2"></i>Recent Daily Reports
                            </h5>
                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-success" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : recentReports.length > 0 ? (
                                <div className="list-group list-group-flush">
                                    {recentReports.map((report) => (
                                        <div key={report.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 className="mb-1">{report.task_category}</h6>
                                                <small className="text-muted">
                                                    {new Date(report.date).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric', 
                                                        year: 'numeric' 
                                                    })}
                                                </small>
                                            </div>
                                            <div className="text-end">
                                                <span className="badge bg-success rounded-pill me-2">
                                                    {report.number_of_tasks} tasks
                                                </span>
                                                <span className="badge bg-info rounded-pill">
                                                    {report.time_spent}h
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-muted mb-0">No recent reports found</p>
                                    <a href="/new_data" className="btn btn-sm btn-outline-success mt-2">
                                        Create your first report
                                    </a>
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