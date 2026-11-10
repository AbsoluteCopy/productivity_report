import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js'; import API_BASE_URL from "../config";
import { getCurrentDateTimeInTimezone, getCurrentDateInTimezone, formatDateString, parseDateInTimezone, formatNaiveTime } from '../utils/dateUtils';
import AnalogClock from '../components/AnalogClock'
import Announcement, { getAnnouncementVersion, getUpdatesForRole } from '../components/Announcement'
import EmployeeTimelineModal from '../components/EmployeeTimelineModal'
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const getAnnouncementKey = (userId) => `announcement_seen_${userId || 'guest'}`;

const Home = () => {
    const [user, setUser] = useState(null);
    const [currentTime, setCurrentTime] = useState(getCurrentDateTimeInTimezone());
    const [recentReports, setRecentReports] = useState([]);
    const [allReports, setAllReports] = useState([]);
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
    const [showAnnouncements, setShowAnnouncements] = useState(false);
    const [selectedTimelineUser, setSelectedTimelineUser] = useState(null);
    const [teamTab, setTeamTab] = useState('active');
    const [allUsers, setAllUsers] = useState([]);

    // Team Insights filters
    const [insightsPeriod, setInsightsPeriod] = useState('30d');
    const [insightsEmployee, setInsightsEmployee] = useState('all');
    const [insightsTask, setInsightsTask] = useState('all');
    const [insightsCustomDate, setInsightsCustomDate] = useState(() => getCurrentDateInTimezone());
    const [allUsersLoading, setAllUsersLoading] = useState(true);

    // Clock in / clock out
    const [attendance, setAttendance] = useState(null);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const [clockActionLoading, setClockActionLoading] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setRole(parsedUser.role);
        }
    }, []);

    useEffect(() => {
        if (!user) return;

        let seenVersion = null;
        try {
            seenVersion = localStorage.getItem(getAnnouncementKey(user.id));
        } catch (e) {
            console.error('Unable to read announcement status:', e);
        }

        if (getUpdatesForRole(user.role).length === 0) return; // nothing to show this role
        if (seenVersion === getAnnouncementVersion(user.role)) return; // already seen

        const timer = setTimeout(() => {
            setShowAnnouncements(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, [user]);

    const handleCloseAnnouncements = () => {
        setShowAnnouncements(false);
        try {
            localStorage.setItem(getAnnouncementKey(user?.id), getAnnouncementVersion(user?.role));
        } catch (e) {
            console.error('Unable to save announcement status:', e);
        }
    };

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

    const fetchAllUsers = async () => {
        try {
            const { data } = await axios.get(`${API_BASE_URL}/users/`);
            setAllUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching all users:', err);
        } finally {
            setAllUsersLoading(false);
        }
    };

    useEffect(() => {
        if (['admin', 'hr', 'supervisor', 'viewer'].includes(role)) {
            fetchAllUsers();
        }
    }, [role]);

    const inactiveUsers = allUsers.filter(u => !onlineUsers.some(o => o.id === u.id));

    useEffect(() => {
        if (['admin', 'hr', 'supervisor', 'viewer'].includes(role)) {
            fetchOnlineUsers();
            const interval = setInterval(fetchOnlineUsers, 15000);
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



    useEffect(() => {
        if (user) {
            fetchRecentReports(user);
            if ((user.role || role) === 'employee') {
                fetchMonthlyData(user.id);
            }
        }
    }, [user, role]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(getCurrentDateTimeInTimezone());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const fetchRecentReports = async (currentUser) => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const userRole = currentUser?.role || role;
            const userId = currentUser?.id || user?.id;
            let response;
            if (['admin', 'hr', 'supervisor', 'viewer'].includes(userRole)) {
                response = await fetch(`${API_BASE_URL}/daily-reports/`, { headers });
            } else {
                response = await fetch(`${API_BASE_URL}/users/${userId}/reports/`, { headers });
            }
            if (response.ok) {
                const data = await response.json();
                const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
                    const diff = parseDateInTimezone(b.date || 0) - parseDateInTimezone(a.date || 0);
                    return diff !== 0 ? diff : (Number(b.id || 0) - Number(a.id || 0));
                });
                setRecentReports(sorted.slice(0, 3));
                if (['admin', 'hr', 'supervisor', 'viewer'].includes(userRole)) {
                    setAllReports(sorted);
                }
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceStatus = async () => {
        try {
            const { data } = await axios.get(`${API_BASE_URL}/attendance/current/`);
            setAttendance(data);
        } catch (err) {
            console.error('Error fetching attendance status:', err);
        } finally {
            setAttendanceLoading(false);
        }
    };

    useEffect(() => {
        if (user && !['admin', 'viewer'].includes(role)) fetchAttendanceStatus();
    }, [user, role]);

    const handleClockIn = async () => {
        setClockActionLoading(true);
        try {
            const { data } = await axios.post(`${API_BASE_URL}/attendance/clock-in/`);
            setAttendance(data);
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Could not clock in',
                text: err.response?.data?.error || 'Something went wrong.',
            });
        } finally {
            setClockActionLoading(false);
        }
    };

    const handleClockOut = async () => {
        setClockActionLoading(true);
        try {
            const { data } = await axios.post(`${API_BASE_URL}/attendance/clock-out/`);
            setAttendance(data);
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Could not clock out',
                text: err.response?.data?.error || 'Something went wrong.',
            });
        } finally {
            setClockActionLoading(false);
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
            const reportDate = parseDateInTimezone(report.date);
            if (reportDate.getMonth() === currentMonth && reportDate.getFullYear() === currentYear) {
                timeSpentData[reportDate.getDate() - 1] = report.time_spent;
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



    const { date, time } = currentTime;
    const isManager = ['admin', 'hr', 'supervisor'].includes(role);
    // Viewer gets the same Team Status/Team Insights analytics as managers
    // (company-scoped server-side), but keeps their own report pages/links
    // rather than the manager ones used inside recentReportsCard.
    const canSeeAnalytics = ['admin', 'hr', 'supervisor', 'viewer'].includes(role);
    // TEMP PROD-ONLY: viewer loses access to real-time data (live Team Status
    // + actual-time tracking elsewhere) until reverted. Remove this flag and
    // its usages below to restore.
    const canSeeLiveStatus = canSeeAnalytics && role !== 'viewer';

    // Team insights (management only): most common tasks & top contributors, last 30 days.
    // Dropdown option lists stay stable regardless of the active filters/period.
    const insightsFilterOptions = useMemo(() => {
        const employees = new Set();
        const tasks = new Set();
        allReports.forEach(r => {
            if (r.user_name) employees.add(r.user_name);
            const label = r.task_category === 'Others' && r.sub_category ? r.sub_category : r.task_category;
            if (label) tasks.add(label);
        });
        return {
            employees: Array.from(employees).sort(),
            tasks: Array.from(tasks).sort(),
        };
    }, [allReports]);

    const teamInsights = useMemo(() => {
        if (!canSeeAnalytics || allReports.length === 0) return null;

        let inRange;
        if (insightsPeriod === 'custom') {
            inRange = insightsCustomDate ? allReports.filter(r => r.date === insightsCustomDate) : [];
        } else {
            const cutoff = new Date();
            if (insightsPeriod === 'today') {
                cutoff.setHours(0, 0, 0, 0);
            } else if (insightsPeriod === 'week') {
                cutoff.setDate(cutoff.getDate() - 7);
            } else if (insightsPeriod === '90d') {
                cutoff.setDate(cutoff.getDate() - 90);
            } else {
                cutoff.setDate(cutoff.getDate() - 30); // default: last 30 days ('month' / '30d')
            }
            inRange = allReports.filter(r => parseDateInTimezone(r.date) >= cutoff);
        }
        if (insightsEmployee !== 'all') {
            inRange = inRange.filter(r => r.user_name === insightsEmployee);
        }
        if (insightsTask !== 'all') {
            inRange = inRange.filter(r => {
                const label = r.task_category === 'Others' && r.sub_category ? r.sub_category : r.task_category;
                return label === insightsTask;
            });
        }
        const working = inRange.filter(r => !['PTO', 'Holiday', 'Company Event'].includes(r.work_type || r.task_category));

        const taskCounts = {};
        const contributorStats = {};
        const workTypeCounts = {};
        const dailyMinutes = {};
        let totalMinutes = 0;
        let totalTasks = 0;

        inRange.forEach(r => {
            const wt = r.work_type || r.task_category || 'Working';
            workTypeCounts[wt] = (workTypeCounts[wt] || 0) + 1;
        });

        working.forEach(r => {
            const label = r.task_category === 'Others' && r.sub_category ? r.sub_category : r.task_category;
            if (label) {
                taskCounts[label] = (taskCounts[label] || 0) + (Number(r.number_of_tasks) || 1);
            }
            const name = r.user_name || `User #${r.user}`;
            if (!contributorStats[name]) contributorStats[name] = { tasks: 0, minutes: 0 };
            const taskCount = Number(r.number_of_tasks) || 0;
            const minutes = Number(r.time_spent) || 0;
            const reportMinutes = taskCount > 0 ? taskCount * minutes : minutes;
            contributorStats[name].tasks += taskCount;
            contributorStats[name].minutes += reportMinutes;
            totalMinutes += reportMinutes;
            totalTasks += taskCount;

            if (r.date) {
                dailyMinutes[r.date] = (dailyMinutes[r.date] || 0) + reportMinutes;
            }
        });

        const topTasks = Object.entries(taskCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const topContributors = Object.entries(contributorStats).sort((a, b) => b[1].minutes - a[1].minutes).slice(0, 8);
        const workTypeBreakdown = Object.entries(workTypeCounts).sort((a, b) => b[1] - a[1]);

        const sortedDays = Object.keys(dailyMinutes).sort();
        const dailyTrend = {
            labels: sortedDays.map(d => formatDateString(d, { month: 'short', day: 'numeric' })),
            values: sortedDays.map(d => Math.round((dailyMinutes[d] / 60) * 10) / 10),
        };

        return { topTasks, topContributors, workTypeBreakdown, dailyTrend, totalMinutes, totalTasks, reportCount: inRange.length };
    }, [canSeeAnalytics, allReports, insightsPeriod, insightsEmployee, insightsTask, insightsCustomDate]);

    const recentReportsCard = (
        <div className="card shadow-sm h-100 border-0 rounded-4">
            <div className="card-header bg-white border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0" style={{ color: '#055d47' }}>
                    <i className="bi bi-journal-text me-2"></i>Recent Reports
                </h5>
                {isManager ? (
                    <Link to="/daily_report" className="btn btn-sm" style={{ backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47', fontWeight: '600', borderRadius: '8px' }}>
                        View All <i className="bi bi-arrow-right ms-1"></i>
                    </Link>
                ) : role === 'employee' ? (
                    <Link to="/new_data" className="btn btn-sm" style={{ backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47', fontWeight: '600', borderRadius: '8px' }}>
                        <i className="bi bi-plus-lg me-1"></i> New
                    </Link>
                ) : null}
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
                                        <h6 className="mb-1 fw-bold text-dark">{report.task_category === 'Others' && report.sub_category ? report.sub_category : report.task_category}</h6>
                                        <small className="text-muted fw-medium">
                                            {isManager && report.user_name && (
                                                <span className="me-2">
                                                    <i className="bi bi-person me-1"></i>
                                                    {report.user_name}
                                                </span>
                                            )}
                                            <i className="bi bi-calendar3 me-1"></i>
                                            {formatDateString(report.date, {
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
                        {role === 'employee' && (
                            <Link to="/new_data" className="btn btn-primary rounded-pill px-4 py-2 fw-semibold">
                                Create your first report
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const formatPlainDate = (dateStr) => {
        // dateStr is an unambiguous "YYYY-MM-DD" calendar date already — format its
        // components directly rather than reinterpreting through a timezone, which
        // would shift it to the previous day (Anchorage is behind UTC).
        const [y, m, d] = dateStr.split('-').map(Number);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[m - 1]} ${d}, ${y}`;
    };

    const insightsPeriodLabel = insightsPeriod === 'custom'
        ? (insightsCustomDate ? formatPlainDate(insightsCustomDate) : 'Pick a day')
        : {
            today: 'Today',
            week: 'Last 7 days',
            month: 'Last 30 days',
            '30d': 'Last 30 days',
            '90d': 'Last 90 days',
        }[insightsPeriod];

    const teamInsightsCard = (
        <div className="card shadow-sm h-100 border-0 rounded-4">
            <div className="card-header bg-white border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0" style={{ color: '#055d47' }}>
                    <i className="bi bi-graph-up-arrow me-2"></i>Team Insights
                </h5>
                <span className="text-muted" style={{ fontSize: '0.78rem' }}>{insightsPeriodLabel}</span>
            </div>
            <div className="card-body p-4">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-4 pb-3 border-bottom">
                    <div className="btn-group" role="group" aria-label="Period">
                        {[
                            { key: 'today', label: 'Today' },
                            { key: 'week', label: 'Weekly' },
                            { key: '30d', label: 'Monthly' },
                            { key: '90d', label: '90 Days' },
                            { key: 'custom', label: 'Pick a Day' },
                        ].map(opt => (
                            <button
                                key={opt.key}
                                type="button"
                                className={`btn btn-sm ${insightsPeriod === opt.key ? '' : 'btn-outline-secondary'}`}
                                style={insightsPeriod === opt.key ? { backgroundColor: '#055d47', borderColor: '#055d47', color: '#fff' } : {}}
                                onClick={() => setInsightsPeriod(opt.key)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {insightsPeriod === 'custom' && (
                        <input
                            type="date"
                            className="form-control form-control-sm"
                            style={{ width: 'auto' }}
                            value={insightsCustomDate}
                            onChange={(e) => setInsightsCustomDate(e.target.value)}
                        />
                    )}

                    <select
                        className="form-select form-select-sm"
                        style={{ width: 'auto', maxWidth: '180px' }}
                        value={insightsEmployee}
                        onChange={(e) => setInsightsEmployee(e.target.value)}
                    >
                        <option value="all">All Employees</option>
                        {insightsFilterOptions.employees.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>

                    <select
                        className="form-select form-select-sm text-truncate"
                        style={{ width: 'auto', maxWidth: '200px' }}
                        title={insightsTask !== 'all' ? insightsTask : undefined}
                        value={insightsTask}
                        onChange={(e) => setInsightsTask(e.target.value)}
                    >
                        <option value="all">All Task Categories</option>
                        {insightsFilterOptions.tasks.map(task => (
                            <option key={task} value={task}>{task}</option>
                        ))}
                    </select>

                    {(insightsEmployee !== 'all' || insightsTask !== 'all' || insightsPeriod !== '30d') && (
                        <button
                            type="button"
                            className="btn btn-sm btn-link text-muted text-decoration-none"
                            onClick={() => { setInsightsPeriod('30d'); setInsightsEmployee('all'); setInsightsTask('all'); }}
                        >
                            Reset
                        </button>
                    )}
                </div>

                {!teamInsights ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-success" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : teamInsights.reportCount === 0 ? (
                    <div className="text-center py-5">
                        <i className="bi bi-bar-chart text-muted" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                        <h6 className="text-muted fw-medium mt-3 mb-0">No report activity for this filter.</h6>
                    </div>
                ) : (
                    <div className="row g-4">
                        <div className="col-12">
                            <div className="p-3 rounded-3 d-flex flex-wrap gap-4" style={{ backgroundColor: 'rgba(5, 93, 71, 0.06)' }}>
                                <div>
                                    <div className="text-muted small fw-semibold mb-1">Total Logged</div>
                                    <div className="fw-bold" style={{ color: '#055d47', fontSize: '1.4rem' }}>
                                        {Math.floor(teamInsights.totalMinutes / 60)}h {teamInsights.totalMinutes % 60}m
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted small fw-semibold mb-1">Tasks Completed</div>
                                    <div className="fw-bold" style={{ color: '#055d47', fontSize: '1.4rem' }}>{teamInsights.totalTasks}</div>
                                </div>
                                <div>
                                    <div className="text-muted small fw-semibold mb-1">Reports Filed</div>
                                    <div className="fw-bold" style={{ color: '#055d47', fontSize: '1.4rem' }}>{teamInsights.reportCount}</div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-8">
                            <div className="text-muted small fw-semibold mb-2">
                                <i className="bi bi-activity me-1"></i>Daily Activity Trend (hours logged)
                            </div>
                            {teamInsights.dailyTrend.labels.length === 0 ? (
                                <div className="text-muted small">No data yet.</div>
                            ) : (
                                <div style={{ height: '220px' }}>
                                    <Line
                                        data={{
                                            labels: teamInsights.dailyTrend.labels,
                                            datasets: [{
                                                label: 'Hours Logged',
                                                data: teamInsights.dailyTrend.values,
                                                borderColor: '#055d47',
                                                backgroundColor: 'rgba(5, 93, 71, 0.15)',
                                                fill: true,
                                                tension: 0.3,
                                                pointRadius: 2,
                                            }]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: { y: { beginAtZero: true, title: { display: true, text: 'Hours' } } },
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="col-md-4">
                            <div className="text-muted small fw-semibold mb-2">
                                <i className="bi bi-bar-chart-steps me-1"></i>Hours Logged by Employee
                            </div>
                            {teamInsights.topContributors.length === 0 ? (
                                <div className="text-muted small">No data yet.</div>
                            ) : (
                                <div style={{ height: `${Math.max(180, teamInsights.topContributors.length * 32)}px` }}>
                                    <Bar
                                        data={{
                                            labels: teamInsights.topContributors.map(([name]) => name),
                                            datasets: [{
                                                label: 'Hours',
                                                data: teamInsights.topContributors.map(([, stats]) => Math.round((stats.minutes / 60) * 10) / 10),
                                                backgroundColor: '#055d47',
                                                borderRadius: 4,
                                            }]
                                        }}
                                        options={{
                                            indexAxis: 'y',
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: { x: { beginAtZero: true, title: { display: true, text: 'Hours' } } },
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="col-md-6">
                            <div className="text-muted small fw-semibold mb-2">
                                <i className="bi bi-list-check me-1"></i>Most Common Tasks
                            </div>
                            {teamInsights.topTasks.length === 0 ? (
                                <div className="text-muted small">No data yet.</div>
                            ) : (
                                <div style={{ height: `${Math.max(180, teamInsights.topTasks.length * 32)}px` }}>
                                    <Bar
                                        data={{
                                            labels: teamInsights.topTasks.map(([label]) => label),
                                            datasets: [{
                                                label: 'Tasks',
                                                data: teamInsights.topTasks.map(([, count]) => count),
                                                backgroundColor: '#2F8F83',
                                                borderRadius: 4,
                                            }]
                                        }}
                                        options={{
                                            indexAxis: 'y',
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="col-md-6">
                            <div className="text-muted small fw-semibold mb-2">
                                <i className="bi bi-pie-chart me-1"></i>Work Type Breakdown
                            </div>
                            {teamInsights.workTypeBreakdown.length === 0 ? (
                                <div className="text-muted small">No data yet.</div>
                            ) : (
                                <div style={{ height: '220px' }}>
                                    <Doughnut
                                        data={{
                                            labels: teamInsights.workTypeBreakdown.map(([label]) => label),
                                            datasets: [{
                                                data: teamInsights.workTypeBreakdown.map(([, count]) => count),
                                                backgroundColor: ['#055d47', '#0dcaf0', '#8b5cf6', '#f97316', '#6c757d'],
                                            }]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const statusDotColor = (status) => status === 'active' ? '#28a745' : status === 'away' ? '#ffc107' : '#adb5bd';
    const statusLabel = (status) => status === 'active' ? 'Active' : status === 'away' ? 'Away' : 'Offline';

    const teamStatusCard = (
        <div className="card shadow-sm h-100 border-0 rounded-4">
            <div className="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="d-flex align-items-center gap-2">
                    <span className="spinner-grow spinner-grow-sm text-success" role="status" style={{ width: '10px', height: '10px' }} />
                    <h5 className="fw-bold mb-0" style={{ color: '#055d47' }}>
                        <i className="bi bi-people me-2"></i>Team Status
                    </h5>
                    <span className="badge rounded-pill" style={{ backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47', fontSize: '0.8rem', fontWeight: 600 }}>
                        {onlineUsers.filter(u => u.status !== 'offline').length} Online {selectedCompanies.length > 0 ? `(${allOnlineCount} total across all)` : ''}
                    </span>
                </div>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 rounded-3"
                    onClick={fetchOnlineUsers}
                    title="Refresh status"
                >
                    <i className="bi bi-arrow-clockwise"></i> Refresh
                </button>
            </div>

            <div className="card-body px-4 pt-2 pb-4">
                <ul className="nav nav-tabs mb-3" style={{ borderBottom: '1px solid #e9ecef' }}>
                    <li className="nav-item">
                        <button
                            type="button"
                            className={`nav-link ${teamTab === 'active' ? 'active fw-semibold' : 'text-muted'}`}
                            style={teamTab === 'active' ? { color: '#055d47', borderColor: '#dee2e6 #dee2e6 #fff' } : {}}
                            onClick={() => setTeamTab('active')}
                        >
                            Active ({onlineUsers.length})
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            type="button"
                            className={`nav-link ${teamTab === 'inactive' ? 'active fw-semibold' : 'text-muted'}`}
                            style={teamTab === 'inactive' ? { color: '#055d47', borderColor: '#dee2e6 #dee2e6 #fff' } : {}}
                            onClick={() => setTeamTab('inactive')}
                        >
                            Inactive ({inactiveUsers.length})
                        </button>
                    </li>
                </ul>

                <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {teamTab === 'active' && (
                        <div className="mb-3 p-2 rounded-3 border" style={{ backgroundColor: '#f9fafb' }}>
                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <button
                                    type="button"
                                    className={`btn btn-sm rounded-pill fw-semibold ${selectedCompanies.length === 0 ? 'btn-success' : 'btn-outline-secondary'}`}
                                    style={selectedCompanies.length === 0 ? { backgroundColor: '#055d47', borderColor: '#055d47', fontSize: '0.75rem' } : { fontSize: '0.75rem' }}
                                    onClick={() => setSelectedCompanies([])}
                                >
                                    All ({allOnlineCount})
                                </button>
                                {availableCompanies.map(comp => {
                                    const count = companyCounts[comp] || 0;
                                    const isSelected = selectedCompanies.includes(comp);
                                    return (
                                        <button
                                            key={comp}
                                            type="button"
                                            className={`btn btn-sm rounded-pill fw-semibold d-flex align-items-center gap-1 ${isSelected ? 'btn-success' : 'btn-outline-secondary'}`}
                                            style={isSelected ? { backgroundColor: '#055d47', borderColor: '#055d47', fontSize: '0.75rem' } : { fontSize: '0.75rem' }}
                                            onClick={() => toggleCompanySelection(comp)}
                                        >
                                            {comp}
                                            <span className={`badge rounded-pill ms-1 ${isSelected ? 'bg-light text-dark' : 'bg-secondary'}`} style={{ fontSize: '0.65rem' }}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {teamTab === 'active' ? (
                        onlineLoading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-success" role="status">
                                    <span className="visually-hidden">Loading status...</span>
                                </div>
                            </div>
                        ) : onlineUsers.length > 0 ? (
                            <div className="d-flex flex-column gap-2">
                                {onlineUsers.map(u => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        className="btn btn-light text-start p-2 border rounded-3 d-flex align-items-center gap-2"
                                        onClick={() => setSelectedTimelineUser(u)}
                                        title="View timeline"
                                    >
                                        <div className="position-relative flex-shrink-0">
                                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: '38px', height: '38px', fontSize: '0.85rem', backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47' }}>
                                                {`${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase()}
                                            </div>
                                            <span
                                                className="position-absolute bottom-0 end-0 border border-white rounded-circle"
                                                style={{ width: '11px', height: '11px', backgroundColor: statusDotColor(u.status) }}
                                                title={statusLabel(u.status)}
                                            ></span>
                                        </div>
                                        <div className="text-truncate flex-grow-1" style={{ lineHeight: 1.25 }}>
                                            <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.88rem' }}>
                                                {u.first_name} {u.last_name}
                                            </div>
                                            <div className="text-muted text-truncate" style={{ fontSize: '0.72rem' }}>
                                                {statusLabel(u.status)} <span className="mx-1">&bull;</span> {u.company || 'General'}
                                                {u.clocked_in && (
                                                    <span className="ms-2 badge bg-success" style={{ fontSize: '0.62rem' }}>
                                                        <i className="bi bi-clock me-1"></i>Clocked in {formatNaiveTime(u.attendance_clock_in)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-people fs-1 d-block mb-2 text-secondary opacity-50"></i>
                                <p className="mb-0 fw-medium">
                                    No team activity {selectedCompanies.length > 0 ? `in selected companies (${selectedCompanies.join(', ')})` : ''}.
                                </p>
                            </div>
                        )
                    ) : (
                        allUsersLoading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-success" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : inactiveUsers.length > 0 ? (
                            <div className="d-flex flex-column gap-2">
                                {inactiveUsers.map(u => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        className="btn btn-light text-start p-2 border rounded-3 d-flex align-items-center gap-2"
                                        onClick={() => setSelectedTimelineUser(u)}
                                        title="View timeline"
                                    >
                                        <div className="position-relative flex-shrink-0">
                                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: '38px', height: '38px', fontSize: '0.85rem', backgroundColor: '#f1f3f5', color: '#6c757d' }}>
                                                {`${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase()}
                                            </div>
                                            <span
                                                className="position-absolute bottom-0 end-0 border border-white rounded-circle"
                                                style={{ width: '11px', height: '11px', backgroundColor: '#adb5bd' }}
                                                title="Offline"
                                            ></span>
                                        </div>
                                        <div className="text-truncate flex-grow-1" style={{ lineHeight: 1.25 }}>
                                            <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.88rem' }}>
                                                {u.first_name} {u.last_name}
                                            </div>
                                            <div className="text-muted text-truncate" style={{ fontSize: '0.72rem' }}>
                                                {u.company || 'General'} <span className="mx-1">&bull;</span>
                                                {u.last_active_at
                                                    ? ` Last seen ${new Date(u.last_active_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                                                    : ' Never logged in'}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-person-check fs-1 d-block mb-2 text-secondary opacity-50"></i>
                                <p className="mb-0 fw-medium">Everyone's active right now.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="container mt-5">
            <div className="row mb-1">
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
            {/* <div className="row mb-4">
                <div className="col-12">
                    <div
                        className="d-flex flex-wrap justify-content-between align-items-center p-3 rounded-3 shadow-sm"
                        style={{
                            backgroundColor: '#f0f8f5',
                            border: '1px solid rgba(5, 93, 71, 0.15)'
                        }}
                    >
                        <div className="d-flex align-items-center gap-3">
                            <div
                                className="rounded-circle d-flex align-items-center justify-content-center"
                                style={{
                                    width: '45px',
                                    height: '45px',
                                    backgroundColor: 'rgba(5, 93, 71, 0.12)',
                                    color: '#055d47'
                                }}
                            >
                                <i className="bi bi-megaphone-fill fs-5"></i>
                            </div>

                            <div>
                                <h6 className="fw-bold mb-1" style={{ color: '#055d47' }}>
                                    What's New?
                                </h6>
                                <small className="text-muted">
                                    Check out the latest application updates and announcements.
                                </small>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn btn-success rounded-pill px-4 mt-2 mt-md-0"
                            style={{ backgroundColor: '#055d47', borderColor: '#055d47' }}
                            onClick={() => setShowAnnouncements(true)}
                        >
                            <i className="bi bi-eye me-2"></i>
                            View Updates
                        </button>
                    </div>
                </div>
            </div> */}

            <div className="row g-4">
                <div className="col-md-5 col-lg-4">
                    <div className="card shadow-sm h-100 border-0 rounded-4 overflow-hidden" style={{ transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div className="card-body text-center p-5 d-flex flex-column justify-content-center">
                            <div className="mb-3">
                                <AnalogClock />
                            </div>
                            <div className="display-5 fw-bold mb-2" style={{ color: '#08060d', letterSpacing: '-1px' }}>
                                {time}
                            </div>
                            <p className="text-muted fw-medium mb-3">{date}</p>

                            {!attendanceLoading && !['admin', 'viewer'].includes(role) && (
                                <div className="pt-3 border-top">
                                    {attendance && !attendance.clock_out ? (
                                        <>
                                            <p className="text-success fw-semibold mb-2">
                                                <i className="bi bi-record-circle-fill me-1"></i>
                                                Clocked in at {formatNaiveTime(attendance.clock_in)}
                                            </p>
                                            <button
                                                className="btn btn-danger w-100"
                                                onClick={handleClockOut}
                                                disabled={clockActionLoading}
                                            >
                                                <i className="bi bi-box-arrow-right me-1"></i>
                                                {clockActionLoading ? 'Clocking out...' : 'Clock Out'}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="btn w-100 text-white"
                                            style={{ backgroundColor: '#055d47' }}
                                            onClick={handleClockIn}
                                            disabled={clockActionLoading}
                                        >
                                            <i className="bi bi-box-arrow-in-right me-1"></i>
                                            {clockActionLoading ? 'Clocking in...' : 'Clock In'}
                                        </button>
                                    )}
                                    {attendance?.clock_out && (
                                        <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.85rem' }}>
                                            Last clocked out at {formatNaiveTime(attendance.clock_out)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {canSeeLiveStatus ? (
                    <div className="col-md-7 col-lg-8">
                        {teamStatusCard}
                    </div>
                ) : (
                    <div className="col-md-7 col-lg-8">
                        {recentReportsCard}
                    </div>
                )}

                {canSeeAnalytics && (
                    <div className="col-12 mt-4">
                        {teamInsightsCard}
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
            {showAnnouncements && (
                <Announcement onClose={handleCloseAnnouncements} role={user?.role} />
            )}
            {selectedTimelineUser && (
                <EmployeeTimelineModal user={selectedTimelineUser} onClose={() => setSelectedTimelineUser(null)} />
            )}
        </div>
    );
};

export default Home;