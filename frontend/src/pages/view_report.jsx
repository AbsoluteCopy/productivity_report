import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ViewReport = () => {
    const navigate = useNavigate();

    const today = new Date();

    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedUser, setSelectedUser] = useState('');

    const [dailyReports, setDailyReports] = useState([]);
    const [expandedRows, setExpandedRows] = useState({});
    const [isAdmin, setIsAdmin] = useState(false);
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));

        if (!user) return;

        setCurrentUser(user);
        setIsAdmin(user.role === "admin");
    }, []);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    useEffect(() => {
        if (!currentUser) return;

        fetchReports(
            currentUser,
            selectedYear,
            selectedMonth,
            selectedUser
        );
    }, [currentUser, selectedYear, selectedMonth, selectedUser]);


    const toggleTaskList = (key) => {
        setExpandedRows(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/`);
            const data = await response.json();

            const filteredUsers = data.filter(user => user.role === 'employee');

            setUsers(filteredUsers);

        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };
    const fetchReports = async (user, year, month, userId = '') => {
        setLoading(true);
        try {
            let url;

            if (user.role === 'admin') {
                url = `${API_BASE_URL}/daily-reports/?year=${year}&month=${month}${userId ? `&user_id=${userId}` : ''}`;
            } else {
                url = `${API_BASE_URL}/users/${user.id}/reports/?year=${year}&month=${month}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("Failed to fetch reports");
            }

            const data = await response.json();

            setDailyReports(data);

        } catch (error) {
            console.error('Error fetching reports:', error);

        } finally {
            setLoading(false);
        }
    };

    const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(i);

        return {
            value: i + 1,
            label: date.toLocaleString('default', {
                month: 'long'
            })
        };
    });

    const groupedReports = Object.values(
        dailyReports.reduce((acc, report) => {

            const key = `${report.date}-${report.task_category}-${report.time_spent}`;

            if (!acc[key]) {
                acc[key] = {
                    ...report,
                    number_of_tasks: Number(report.number_of_tasks),
                    meeting_count: Number(report.meeting_count || 0),
                    task_list: [...(report.task_list || [])]
                };
            } else {
                acc[key].number_of_tasks += Number(report.number_of_tasks);
                acc[key].meeting_count += Number(report.meeting_count || 0);

                acc[key].task_list.push(...(report.task_list || []));
            }

            return acc;

        }, {})
    ).sort((a, b) => {

        const dateCompare = new Date(a.date) - new Date(b.date);

        if (dateCompare !== 0) {
            return dateCompare;
        }

        return a.task_category.localeCompare(b.task_category);

    });
    const addWeekendRows = (reports) => {
        const weekendRows = [];

        const daysInMonth = new Date(
            selectedYear,
            selectedMonth,
            0
        ).getDate();

        for (let day = 1; day <= daysInMonth; day++) {

            const date = new Date(
                selectedYear,
                selectedMonth - 1,
                day
            );

            const dayOfWeek = date.getDay();

            if (dayOfWeek === 0 || dayOfWeek === 6) {

                const dateString =
                    `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                const exists = reports.some(
                    report => report.date === dateString
                );

                if (!exists) {
                    weekendRows.push({
                        id: `weekend-${dateString}`,
                        date: dateString,
                        task_category: 'Weekend',
                        number_of_tasks: '',
                        time_spent: '',
                        meeting_count: '',
                        task_list: [],
                        isWeekend: true
                    });
                }
            }
        }

        return [
            ...reports,
            ...weekendRows
        ].sort((a, b) => {

            const dateCompare =
                new Date(a.date) - new Date(b.date);

            if (dateCompare !== 0) {
                return dateCompare;
            }

            return a.task_category.localeCompare(
                b.task_category
            );
        });
    };

    const addDailyTotalRows = (reports) => {
        const rows = [];

        let currentDate = null;
        let dailyWorkingHours = 0;
        let dailyMeetings = 0;
        let hasWorkData = false;

        const addTotalRow = () => {
            if (hasWorkData) {
                rows.push({
                    id: `total-${currentDate}`,
                    date: currentDate,
                    task_category: 'Daily Total',
                    working_hours_total: dailyWorkingHours,
                    meeting_total: dailyMeetings,
                    isTotal: true
                });
            }
        };

        reports.forEach((report, index) => {

            if (currentDate && currentDate !== report.date) {
                addTotalRow();

                dailyWorkingHours = 0;
                dailyMeetings = 0;
                hasWorkData = false;
            }

            currentDate = report.date;

            const isLeave =
                report.task_category === 'Holiday' ||
                report.task_category === 'PTO';

            if (!report.isWeekend && !isLeave) {
                dailyWorkingHours +=
                    Number(report.number_of_tasks || 0) *
                    Number(report.time_spent || 0);

                dailyMeetings += Number(report.meeting_count || 0);

                hasWorkData = true;
            }

            rows.push(report);

            // last record
            if (index === reports.length - 1) {
                addTotalRow();
            }
        });

        return rows;
    };
    const displayReports = addDailyTotalRows(
        addWeekendRows(groupedReports)
    );
    const summaryTaskList = [
        "Accounting Unapplied Payments",
        "Accounting Cash Receipts",
        "Checked/Reviewed Accounting Posted Payments",
        "Check Deposits to Cash Receipts & UAP",
        "Checked & Cleared 2025 ePay Transactions",
        "Process Offset on Accounting from Matt/UW Team"
    ];


    const summaryReports = summaryTaskList.map(task => {

        const taskReports = groupedReports.filter(
            report => report.task_category === task
        );

        const totalTasks = taskReports.reduce(
            (sum, report) =>
                sum + Number(report.number_of_tasks || 0),
            0
        );

        const totalTime = taskReports.reduce(
            (sum, report) =>
                sum +
                (
                    Number(report.number_of_tasks || 0) *
                    Number(report.time_spent || 0)
                ),
            0
        );

        return {
            task,
            totalTasks,
            totalTime
        };

    });
    return (
        <div className="px-4 mt-4">
            <div className="card shadow-sm">
                <div className="card-body">

                    <div className="d-flex align-items-center justify-content-between gap-3 p-3 bg-light rounded shadow-sm">

                        <h3 className="mb-0">
                            Daily Reports
                        </h3>

                        <div className="d-flex align-items-center gap-2">
                            {isAdmin && (
                                <select className="form-select w-auto" value={selectedUser}
                                    onChange={(e) =>
                                        setSelectedUser(e.target.value)
                                    }
                                >
                                    <option value="">All Users</option>

                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.first_name} {user.last_name}
                                        </option>
                                    ))}

                                </select>
                            )}

                            <select className="form-select w-auto" value={selectedMonth}
                                onChange={(e) =>
                                    setSelectedMonth(Number(e.target.value))
                                }
                            >
                                {months.map((month) => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>

                            <select className="form-select w-auto" value={selectedYear}
                                onChange={(e) =>
                                    setSelectedYear(Number(e.target.value))
                                }
                            >
                                {Array.from({ length: 4 }, (_, i) => 2025 + i).map(year => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <ul className="nav nav-tabs mt-3" id="reportTabs" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button className="nav-link active" id="daily-tab" data-bs-toggle="tab" data-bs-target="#daily-report" type="button" role="tab" aria-selected>{''}
                                Daily Report
                            </button>
                        </li>

                        <li className="nav-item" role="presentation">
                            <button className="nav-link" id="summary-tab" data-bs-toggle="tab" data-bs-target="#summary-report" type="button" role="tab">
                                Summary of Task
                            </button>
                        </li>
                    </ul>

                    <div className="tab-content" id="reportTabsContent">
                        <div className="tab-pane fade show active" id="daily-report" role="tabpanel">
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <p className="mt-2">Loading reports...</p>
                                </div>
                            ) : (
                                <table className="table table-bordered table-striped table-hover table-sm mt-3 font-12">
                                <thead>
                                    <tr>
                                        <th className='main-background text-white py-2'>Date</th>
                                        <th className='main-background text-white py-2'>Day</th>
                                        <th className='main-background text-white py-2'>Task</th>
                                        <th className='main-background text-white py-2'># of Task</th>
                                        <th className='main-background text-white py-2'>Time Spent(mins)</th>
                                        <th className='main-background text-white py-2'>Working Hours(mins)</th>
                                        <th className='main-background text-white py-2'>Meeting Trainings(mins)</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {
                                        displayReports.map((report, index) => {
                                            if (report.isTotal) {
                                                return (
                                                    <tr key={report.id} className="fw-bold">
                                                        <td></td>
                                                        <td></td>
                                                        <td></td>
                                                        <td></td>
                                                        <td></td>
                                                        <td>{report.working_hours_total}</td>
                                                        <td>{report.meeting_total}</td>
                                                    </tr>
                                                );
                                            }
                                            const [year, month, day] = report.date.split('-');
                                            const date = new Date(year, month - 1, day);
                                            const previousReport = displayReports[index - 1];
                                            const showDate =
                                                !previousReport ||
                                                previousReport.date !== report.date;
                                            const isLeave =
                                                report.task_category === 'Holiday' ||
                                                report.task_category === 'PTO';
                                            return (
                                                <tr key={`${report.date}-${report.task_category}-${report.time_spent}`} className={`
                                                            ${report.isWeekend ? "table-warning" : ""}
                                                            ${isLeave ? "table-info" : ""}
                                                            middle
                                                        `}>
                                                    <td>
                                                        {showDate &&
                                                            `${date.getDate()}-${date.toLocaleString(
                                                                'en-US',
                                                                { month: 'short' }
                                                            )}-${String(date.getFullYear()).slice(-2)}`
                                                        }
                                                    </td>

                                                    <td>
                                                        {showDate &&
                                                            date.toLocaleDateString(
                                                                'en-US',
                                                                { weekday: 'long' }
                                                            )
                                                        }
                                                    </td>
                                                    <td>
                                                        <div>
                                                            {report.task_category === 'Others' ? report.sub_category : report.task_category}
                                                            {report.task_category === 'Holiday' && report.task_list?.[0] ? ` - ${report.task_list[0]}` : ''}
                                                        </div>

                                                        {!report.isWeekend &&
                                                            !isLeave &&
                                                            report.task_list &&
                                                            report.task_list.length > 0 &&
                                                            report.number_of_tasks > 0 && (
                                                                <>
                                                                    <button type="button"
                                                                        className="btn btn-sm btn-outline-success mt-2"
                                                                        onClick={() =>
                                                                            toggleTaskList(
                                                                                `${report.date}-${report.task_category}-${report.time_spent}`
                                                                            )
                                                                        }
                                                                    >
                                                                        {expandedRows[
                                                                            `${report.date}-${report.task_category}-${report.time_spent}`
                                                                        ]
                                                                            ? 'Hide Tasks'
                                                                            : `Show Tasks (${report.task_list.length})`
                                                                        }
                                                                    </button>


                                                                    {expandedRows[
                                                                        `${report.date}-${report.task_category}-${report.time_spent}`
                                                                    ] && (
                                                                            <ul className="mt-2 mb-0 ps-3">
                                                                                {report.task_list.map((task, i) => (
                                                                                    <li key={`${task}-${i}`}>
                                                                                        {task}
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        )}
                                                                </>
                                                            )
                                                        }
                                                    </td>

                                                    <td>{isLeave || report.number_of_tasks === 0 ? '' : report.number_of_tasks}</td>

                                                    <td>{isLeave || report.number_of_tasks === 0 ? '' : report.time_spent}</td>

                                                    <td>
                                                        {isLeave || report.number_of_tasks === 0
                                                            ? ''
                                                            : report.number_of_tasks && report.time_spent
                                                                ? report.number_of_tasks * report.time_spent
                                                                : ''
                                                        }
                                                    </td>

                                                    <td>{isLeave || report.number_of_tasks === 0 ? '' : report.meeting_count}</td>

                                                </tr>
                                            );
                                        })
                                    }
                                </tbody>
                            </table>
                            )}
                        </div>

                        <div className="tab-pane fade" id="summary-report" role="tabpanel">
                            <div className="p-3">
                                <table className="table table-bordered table-striped table-hover table-sm font-12">

                                    <thead>
                                        <tr>
                                            <th className='main-background text-white py-2'>List of Task</th>
                                            <th className='main-background text-white py-2'>Total # of Task Done</th>
                                            <th className='main-background text-white py-2'>Total Time Spent (mins)</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {summaryReports.map((item, index) => (

                                            <tr key={index}>
                                                <td>{item.task}</td>
                                                <td>{item.totalTasks}</td>
                                                <td>{item.totalTime}</td>
                                            </tr>

                                        ))}

                                        <tr className="fw-bold table-secondary">

                                            <td> Total </td>

                                            <td>
                                                {
                                                    summaryReports.reduce(
                                                        (sum, item) =>
                                                            sum + item.totalTasks,
                                                        0
                                                    )
                                                }
                                            </td>

                                            <td>
                                                {
                                                    summaryReports.reduce(
                                                        (sum, item) =>
                                                            sum + item.totalTime,
                                                        0
                                                    )
                                                }
                                            </td>

                                        </tr>

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewReport;