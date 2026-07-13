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
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState({});
    const [isAdmin, setIsAdmin] = useState(false);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const userData = localStorage.getItem('user');

        if (userData) {
            const parsedUser = JSON.parse(userData);

            const admin = parsedUser.role === "admin";

            setIsAdmin(admin);

            if (admin) {
                fetchUsers();
            }

            fetchReports(
                parsedUser,
                selectedYear,
                selectedMonth,
                selectedUser
            );
        }

    }, [selectedMonth, selectedYear, selectedUser]);

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
        try {
            let url;

            if (user.role === 'admin') {
                // Admin gets all reports
                url = `${API_BASE_URL}/daily-reports/?year=${year}&month=${month}${userId ? `&user_id=${userId}` : ''}`;
            } else {
                // Normal user gets own reports
                url = `${API_BASE_URL}/users/${user.id}/reports/?year=${year}&month=${month}`;
            }

            const response = await fetch(url);

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

        // Sort by date first
        const dateCompare = new Date(a.date) - new Date(b.date);

        if (dateCompare !== 0) {
            return dateCompare;
        }

        // If same date, sort by task category
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

            // Saturday = 6, Sunday = 0
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
                                <select
                                    className="form-select w-auto"
                                    value={selectedUser}
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
                                        {month.label}{selectedYear}
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
                            <button
                                className="nav-link active"
                                id="daily-tab"
                                data-bs-toggle="tab"
                                data-bs-target="#daily-report"
                                type="button"
                                role="tab"
                            >
                                Daily Report
                            </button>
                        </li>

                        <li className="nav-item" role="presentation">
                            <button
                                className="nav-link"
                                id="summary-tab"
                                data-bs-toggle="tab"
                                data-bs-target="#summary-report"
                                type="button"
                                role="tab"
                            >
                                Summary of Task
                            </button>
                        </li>
                    </ul>


                    <div className="tab-content" id="reportTabsContent">

                        {/* Daily Report Tab */}
                        <div
                            className="tab-pane fade show active"
                            id="daily-report"
                            role="tabpanel"
                        >

                            <table className="table table-bordered table-striped table-hover table-sm mt-3 font-12">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Day</th>
                                        <th>Task</th>
                                        <th># of Task</th>
                                        <th>Time Spent(mins)</th>
                                        <th>Working Hours(mins)</th>
                                        <th>Meeting Trainings(mins)</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {
                                        displayReports.map((report, index) => {
                                            if (report.isTotal) {
                                                return (
                                                    <tr
                                                        key={report.id}
                                                        className="fw-bold"
                                                    >
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
                                                <tr
                                                    key={`${report.date}-${report.task_category}-${index}`}
                                                    className={`
        ${report.isWeekend ? "table-warning" : ""}
        ${isLeave ? "table-info" : ""}
        middle
    `}
                                                >
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
                                                            {report.task_category}
                                                            {report.task_category === 'Holiday' && report.task_list?.[0] ? ` - ${report.task_list[0]}` : ''}
                                                        </div>

                                                        {!report.isWeekend &&
                                                            !isLeave &&
                                                            report.task_list &&
                                                            report.task_list.length > 0 && (
                                                                <>
                                                                    <button
                                                                        type="button"
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

                                                    <td>{isLeave ? '' : report.number_of_tasks}</td>

                                                    <td>{isLeave ? '' : report.time_spent}</td>

                                                    <td>
                                                        {isLeave
                                                            ? ''
                                                            : report.number_of_tasks && report.time_spent
                                                                ? report.number_of_tasks * report.time_spent
                                                                : ''
                                                        }
                                                    </td>

                                                    <td>{isLeave ? '' : report.meeting_count}</td>

                                                </tr>
                                            );
                                        })
                                    }
                                </tbody>
                            </table>

                        </div>


                        <div
                            className="tab-pane fade"
                            id="summary-report"
                            role="tabpanel"
                        >

                            <div className="p-3">

                                <table className="table table-bordered table-striped table-hover table-sm font-12">

                                    <thead>
                                        <tr>
                                            <th>List of Task</th>
                                            <th>Total # of Task Done</th>
                                            <th>Total Time Spent (mins)</th>
                                        </tr>
                                    </thead>


                                    <tbody>

                                        {summaryReports.map((item, index) => (

                                            <tr key={index}>

                                                <td>
                                                    {item.task}
                                                </td>

                                                <td>
                                                    {item.totalTasks}
                                                </td>

                                                <td>
                                                    {item.totalTime}
                                                </td>

                                            </tr>

                                        ))}

                                        <tr className="fw-bold table-secondary">

                                            <td>
                                                Total
                                            </td>

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