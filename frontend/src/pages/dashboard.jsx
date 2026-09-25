import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';import API_BASE_URL from "../config";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const Home = () => {
    const [user, setUser] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [recentReports, setRecentReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState('');
    const [monthlyData, setMonthlyData] = useState([]);
    const [chartData, setChartData] = useState(null);

    // Online users tracking (Admin & HR)
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [onlineLoading, setOnlineLoading] = useState(true);
    const [allOnlineCount, setAllOnlineCount] = useState(0);
    const [companyCounts, setCompanyCounts] = useState({});
    const [availableCompanies, setAvailableCompanies] = useState([]);
    const [selectedCompanies, setSelectedCompanies] = useState([]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setRole(parsedUser.role);
        }
    }, []);

    const fetchOnlineUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            let url = `${API_BASE_URL}/users/online/`;
            if (selectedCompanies.length > 0) {
                url += `?companies=${encodeURIComponent(selectedCompanies.join(','))}`;
            }
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOnlineUsers(data.users || []);
                setAllOnlineCount(data.all_online_count || 0);
                setCompanyCounts(data.company_counts || {});
                setAvailableCompanies(data.companies || []);
            }
        } catch (err) {
            console.error('Error fetching online users:', err);
        } finally {
            setOnlineLoading(false);
        }
    };

    useEffect(() => {
        if (role === 'admin' || role === 'hr') {
            fetchOnlineUsers();
            const interval = setInterval(fetchOnlineUsers, 30000);
            return () => clearInterval(interval);
        }
    }, [role, selectedCompanies]);

    const toggleCompanySelection = (comp) => {
        setSelectedCompanies(prev => {
            if (prev.includes(comp)) {
                return prev.filter(c => c !== comp);
            } else {
                return [...prev, comp];
            }
        });
    };

    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return '';
        const now = new Date();
        const past = new Date(dateStr);
        const diffSec = Math.floor((now - past) / 1000);
        if (diffSec < 60) return 'Active just now';
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin === 1) return 'Active 1m ago';
        if (diffMin < 60) return `Active ${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        return `Active ${diffHr}h ago`;
    };

    useEffect(() => {
        if (user) {
            fetchRecentReports(user.id);
            if (role === 'employee') {
                fetchMonthlyData(user.id);
            }
        }
    }, [user, role]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const fetchRecentReports = async (userId) => {
        try {
            let response;
            if (role === 'admin') {
                response = await fetch(`${API_BASE_URL}/daily-reports/`);
            } else {
                response = await fetch(`${API_BASE_URL}/users/${userId}/reports/`);
            }
            if (response.ok) {
                const data = await response.json();
                const lastThree = data.slice(0, 3);
                setRecentReports(lastThree);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyData = async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}/reports/`);
            if (response.ok) {
                const data = await response.json();
                setMonthlyData(data);
                prepareChartData(data);
            }
        } catch (error) {
            console.error('Error fetching monthly data:', error);
        }
    };

    const prepareChartData = (reports) => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Get all days in current month
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        // Initialize data array with zeros
        const timeSpentData = new Array(daysInMonth).fill(0);

        // Fill in actual data from reports
        reports.forEach(report => {
            // Parse date properly to avoid timezone issues
            const [year, month, day] = report.date.split('-');
            const reportDate = new Date(Number(year), Number(month) - 1, Number(day));
            if (reportDate.getMonth() === currentMonth && reportDate.getFullYear() === currentYear) {
                timeSpentData[day - 1] = report.time_spent;
            }
        });

        setChartData({
            labels: labels,
            datasets: [
                {
                    label: 'Time Spent (minutes)',
                    data: timeSpentData,
                    borderColor: '#055d47',
                    backgroundColor: 'rgba(5, 93, 71, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: '#055d47',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.3,
                    fill: true,
                }
            ]
        });
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
                <div className="col-12">
                    <div className="p-4 rounded-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #055d47 0%, #2F8F83 100%)', color: 'white' }}>
                        <h2 className="fw-bold mb-1">
                            Welcome back, {user ? `${user.first_name}` : 'User'}!
                        </h2>
                        {(role === 'admin' || role === 'viewer' || role === 'hr') ? <p className="mb-0 opacity-75">Track your team's productivity with ease.</p> :
                            <p className="mb-0 opacity-75">Ready to track your productivity today?</p>}
                    </div>
                </div>
            </div>

            <div className="row g-4">
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

                <div className="col-md-7 col-lg-8">
                    <div className="card shadow-sm h-100 border-0 rounded-4">
                        <div className="card-header bg-white border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold mb-0" style={{ color: '#055d47' }}>
                                <i className="bi bi-journal-text me-2"></i>Recent Reports
                            </h5>
                            {role === 'employee' && (
                                <Link to="/new_data" className="btn btn-sm" style={{ backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47', fontWeight: '600', borderRadius: '8px' }}>
                                    <i className="bi bi-plus-lg me-1"></i> New
                                </Link>
                            )}
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
                                                        {role === 'admin' && report.user_name && (
                                                            <span className="me-2">
                                                                <i className="bi bi-person me-1"></i>
                                                                {report.user_name}
                                                            </span>
                                                        )}
                                                        <i className="bi bi-calendar3 me-1"></i>
                                                        {(() => {
                                                            const [year, month, day] = report.date.split('-');
                                                            const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
                                                            return dateObj.toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            });
                                                        })()}
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
                                    {role === 'employee' && (
                                        <Link to="/new_data" className="btn btn-primary rounded-pill px-4 py-2 fw-semibold">
                                            Create your first report
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Online Users Tracker (Admin & HR) */}
                {(role === 'admin' || role === 'hr') && (
                    <div className="col-12 mt-4">
                        <div className="card shadow-sm border-0 rounded-4">
                            <div className="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="spinner-grow spinner-grow-sm text-success" role="status" style={{ width: '10px', height: '10px' }} />
                                    <h5 className="fw-bold mb-0" style={{ color: '#055d47' }}>
                                        <i className="bi bi-people me-2"></i>Who's Online Now
                                    </h5>
                                    <span className="badge rounded-pill" style={{ backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47', fontSize: '0.8rem', fontWeight: 600 }}>
                                        {onlineUsers.length} Online {selectedCompanies.length > 0 ? `(${allOnlineCount} total across all)` : ''}
                                    </span>
                                </div>
                                <div>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 rounded-3"
                                        onClick={fetchOnlineUsers}
                                        title="Refresh online status"
                                    >
                                        <i className="bi bi-arrow-clockwise"></i> Refresh
                                    </button>
                                </div>
                            </div>

                            <div className="card-body px-4 pt-2 pb-4">
                                {/* Multi-Company Filter Bar */}
                                <div className="mb-4 p-3 rounded-3 border" style={{ backgroundColor: '#f9fafb' }}>
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                                        <div className="d-flex align-items-center gap-1 text-muted small fw-semibold">
                                            <i className="bi bi-funnel"></i>
                                            <span>Filter by Company (click multiple to monitor at the same time):</span>
                                        </div>
                                        {selectedCompanies.length > 0 && (
                                            <button
                                                type="button"
                                                className="btn btn-link btn-sm text-decoration-none p-0 text-muted"
                                                style={{ fontSize: '0.78rem' }}
                                                onClick={() => setSelectedCompanies([])}
                                            >
                                                Clear filter (show all)
                                            </button>
                                        )}
                                    </div>

                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                        {/* All Companies option */}
                                        <button
                                            type="button"
                                            className={`btn btn-sm rounded-pill fw-semibold ${selectedCompanies.length === 0 ? 'btn-success' : 'btn-outline-secondary'}`}
                                            style={selectedCompanies.length === 0 ? { backgroundColor: '#055d47', borderColor: '#055d47', fontSize: '0.8rem' } : { fontSize: '0.8rem' }}
                                            onClick={() => setSelectedCompanies([])}
                                        >
                                            All Companies ({allOnlineCount})
                                        </button>

                                        {/* Company chips */}
                                        {availableCompanies.map(comp => {
                                            const count = companyCounts[comp] || 0;
                                            const isSelected = selectedCompanies.includes(comp);
                                            return (
                                                <button
                                                    key={comp}
                                                    type="button"
                                                    className={`btn btn-sm rounded-pill fw-semibold d-flex align-items-center gap-1 ${isSelected ? 'btn-success' : 'btn-outline-secondary'}`}
                                                    style={isSelected ? { backgroundColor: '#055d47', borderColor: '#055d47', fontSize: '0.8rem' } : { fontSize: '0.8rem' }}
                                                    onClick={() => toggleCompanySelection(comp)}
                                                >
                                                    {isSelected && <i className="bi bi-check-lg"></i>}
                                                    {comp}
                                                    <span className={`badge rounded-pill ms-1 ${isSelected ? 'bg-light text-dark' : 'bg-secondary'}`} style={{ fontSize: '0.7rem' }}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Active users grid */}
                                {onlineLoading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-success" role="status">
                                            <span className="visually-hidden">Loading online users...</span>
                                        </div>
                                    </div>
                                ) : onlineUsers.length > 0 ? (
                                    <div className="row g-3">
                                        {onlineUsers.map(u => (
                                            <div key={u.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                                                <div className="p-3 border rounded-3 h-100 d-flex flex-column justify-content-between" style={{ backgroundColor: '#ffffff', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                                                    <div className="d-flex align-items-start gap-2 mb-2">
                                                        <div className="position-relative flex-shrink-0">
                                                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: '40px', height: '40px', fontSize: '0.9rem', backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47' }}>
                                                                {`${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase()}
                                                            </div>
                                                            <span className="position-absolute bottom-0 end-0 p-1 bg-success border border-white rounded-circle" style={{ width: '10px', height: '10px' }} title="Online"></span>
                                                        </div>
                                                        <div className="text-truncate flex-grow-1" style={{ lineHeight: 1.2 }}>
                                                            <div className="fw-bold text-dark text-truncate" title={`${u.first_name} ${u.last_name}`} style={{ fontSize: '0.9rem' }}>
                                                                {u.first_name} {u.last_name}
                                                            </div>
                                                            <span className="badge mt-1" style={{
                                                                fontSize: '0.65rem',
                                                                backgroundColor: u.role === 'admin' ? '#fff3cd' : u.role === 'hr' ? '#cff4fc' : '#d1e7dd',
                                                                color: u.role === 'admin' ? '#664d03' : u.role === 'hr' ? '#055160' : '#0f5132',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {u.role}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="border-top pt-2 mt-2 d-flex justify-content-between align-items-center" style={{ fontSize: '0.75rem' }}>
                                                        <span className="text-muted text-truncate me-1" title={u.company || 'No Company'}>
                                                            <i className="bi bi-building me-1"></i>{u.company || 'General'}
                                                        </span>
                                                        <span className="text-success fw-semibold flex-shrink-0">
                                                            {formatRelativeTime(u.last_active_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-5 text-muted">
                                        <i className="bi bi-people fs-1 d-block mb-2 text-secondary opacity-50"></i>
                                        <p className="mb-0 fw-medium">
                                            No users currently online {selectedCompanies.length > 0 ? `in selected companies (${selectedCompanies.join(', ')})` : ''}.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {role === 'employee' && chartData && (
                    <div className="col-12 mt-4">
                        <div className="card shadow-sm border-0 rounded-4">
                            <div className="card-header bg-white border-0 pt-4 pb-0 px-4">
                                <h5 className="fw-bold mb-0" style={{ color: '#055d47' }}>
                                    <i className="bi bi-graph-up me-2"></i>Monthly Overview
                                </h5>
                            </div>
                            <div className="card-body p-4">
                                <div style={{ height: '300px' }}>
                                    <Line
                                        data={chartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    display: true,
                                                    position: 'top',
                                                    labels: {
                                                        font: {
                                                            size: 12,
                                                            weight: '600'
                                                        },
                                                        usePointStyle: true,
                                                        padding: 20
                                                    }
                                                },
                                                tooltip: {
                                                    backgroundColor: '#055d47',
                                                    titleFont: {
                                                        size: 14,
                                                        weight: 'bold'
                                                    },
                                                    bodyFont: {
                                                        size: 13
                                                    },
                                                    padding: 12,
                                                    cornerRadius: 8,
                                                    displayColors: false,
                                                    callbacks: {
                                                        label: function (context) {
                                                            const value = context.parsed.y;
                                                            if (value === 0) {
                                                                return 'No data recorded';
                                                            }
                                                            return `Time spent: ${value} minutes`;
                                                        }
                                                    }
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    title: {
                                                        display: true,
                                                        text: 'Day of Month',
                                                        font: {
                                                            size: 12,
                                                            weight: '600'
                                                        }
                                                    },
                                                    grid: {
                                                        display: false
                                                    },
                                                    ticks: {
                                                        font: {
                                                            size: 11
                                                        }
                                                    }
                                                },
                                                y: {
                                                    title: {
                                                        display: true,
                                                        text: 'Time (minutes)',
                                                        font: {
                                                            size: 12,
                                                            weight: '600'
                                                        }
                                                    },
                                                    beginAtZero: true,
                                                    grid: {
                                                        color: 'rgba(0, 0, 0, 0.05)'
                                                    },
                                                    ticks: {
                                                        font: {
                                                            size: 11
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;