import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ViewUtilizationReport = () => {

    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [dailyReports, setDailyReports] = useState([]);
    const today = useMemo(() => new Date(), []);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const totalRequiredHours = 7.5;
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const REQUIRED_PRODUCTIVE_HOURS = 7.5;
    const WORK_DAY_HOURS = 8.5;
    const MINUTES_PER_HOUR = 60;
    const isAdmin = currentUser?.role === "admin";

    // Derive selected user directly from the already-loaded users array — no extra state needed
    const selectedUserObj = selectedUser ? users.find(u => String(u.id) === String(selectedUser)) : null;

    const name = selectedUserObj
        ? `${selectedUserObj.first_name} ${selectedUserObj.last_name}`
        : isAdmin
            ? 'All Users'
            : currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : '';

    const employeeCode = selectedUserObj
        ? (selectedUserObj.id_number || '')
        : isAdmin ? 'ALL' : (currentUser?.id_number || '');
    const months = useMemo(
        () =>
            Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: new Date(0, i).toLocaleString("default", {
                    month: "long",
                }),
            })),
        []
    );

    useEffect(() => {
        const stored = localStorage.getItem("user");

        if (!stored) return;

        const user = JSON.parse(stored);
        setCurrentUser(user);

        if (user.role === "admin") {
            fetchUsers();
        }
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        fetchReports(
            currentUser,
            selectedYear,
            selectedMonth,
            selectedUser
        );
    }, [currentUser, selectedMonth, selectedYear, selectedUser]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/users/`);
            if (Array.isArray(res.data)) {
                setUsers(res.data.filter(u => u.role === 'employee'));
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchReports = async (user, year, month, userId = "") => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ year, month });

            if (user.role === "admin" && userId) {
                params.append("user_id", userId);
            }

            const url = user.role === "admin"
                ? `${API_BASE_URL}/daily-reports/?${params}`
                : `${API_BASE_URL}/users/${user.id}/reports/?${params}`;

            const res = await axios.get(url);
            setDailyReports(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching reports:", error);
            setDailyReports([]);
        } finally {
            setLoading(false);
        }
    };

    const groupedReports = useMemo(() => {
        return Object.values(
            dailyReports.reduce((acc, report) => {
                const key = report.date;

                if (!acc[key]) {
                    acc[key] = {
                        ...report,
                        working_minutes:
                            Number(report.number_of_tasks) *
                            Number(report.time_spent || 0),
                        meeting_minutes: Number(report.meeting_minutes || 0),
                    };
                } else {
                    acc[key].working_minutes +=
                        Number(report.number_of_tasks) *
                        Number(report.time_spent || 0);

                    acc[key].meeting_minutes +=
                        Number(report.meeting_minutes || 0);
                }

                return acc;
            }, {})
        ).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [dailyReports]);

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
                        working_minutes: 0,
                        meeting_minutes: 0,
                        isWeekend: true
                    });
                }
            }
        }

        return [
            ...reports,
            ...weekendRows
        ].sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
    };

    const displayReports = useMemo(
        () => addWeekendRows(groupedReports),
        [groupedReports, selectedMonth, selectedYear]
    );

    const workedDays = displayReports.filter(report => {
        const isHoliday = report.task_category === 'Holiday';
        const isPTO = report.task_category === 'PTO';

        return !report.isWeekend && !isHoliday && !isPTO;
    });

    const totalProductiveHours = workedDays.reduce((sum, report) => {
        const workingHours = Number(report.working_minutes || 0) / MINUTES_PER_HOUR;
        const meetingHours = Number(report.meeting_minutes || 0) / MINUTES_PER_HOUR;

        return sum + workingHours + meetingHours;
    }, 0);

    const averageProductivity =
        workedDays.length > 0
            ? workedDays.reduce((sum, report) => {
                const workingHours = Number(report.working_minutes || 0) / MINUTES_PER_HOUR;
                const meetingHours = Number(report.meeting_minutes || 0) / MINUTES_PER_HOUR;

                const productiveHours = workingHours + meetingHours;

                return sum + (productiveHours / totalRequiredHours) * 100;
            }, 0) / workedDays.length
            : 0;

    const daysWorked = workedDays.length;

    const holidaysOrPTOs = displayReports.filter(report => {
        return (
            report.task_category === 'Holiday' ||
            report.task_category === 'PTO'
        );
    }).length;

    const exportUtilizationReport = () => {
        const REQUIRED_PRODUCTIVE_HOURS = 7.5;
        const WORK_DAY_HOURS = 8.5;
        const MINUTES_PER_HOUR = 60;

        const personName = selectedUserObj
            ? `${selectedUserObj.first_name}_${selectedUserObj.last_name}`
            : currentUser ? `${currentUser.first_name}_${currentUser.last_name}` : 'User';

        const monthName = new Date(selectedYear, selectedMonth - 1, 1)
            .toLocaleString('default', { month: 'short' });

        // Title / header info rows
        const titleRows = [
            ['EMPLOYEE UTILIZATION REPORT'],
            [],
            ['Employee Name', name || '', '', 'Employee Code', employeeCode || '', '', 'Month', new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long' }).toUpperCase(), '', 'Year', selectedYear],
            [],
            [
                'Date', 'Day', 'Week Offs', 'Holidays',
                'Working Hours (mins)', 'Meetings/Training (mins)',
                'Working Hours (hrs)', 'Meetings/Training (hrs)',
                'Total Hours w/o Break', 'Total Hours',
                'Productive Hours', 'Productive Hours %',
                'Break Hours', 'Break Hours %',
                'Over/Down time', 'Over/Downtime %'
            ]
        ];

        const dataRows = displayReports.map(report => {
            const [year, month, day] = report.date.split('-');
            const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
            const dateLabel = `${day}-${dateObj.toLocaleString('en-US', { month: 'short' })}-${String(year).slice(-2)}`;
            const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

            const isHoliday = report.task_category === 'Holiday';
            const isPTO = report.task_category === 'PTO';
            const isWeekend = report.isWeekend;
            const isSpecialDay = isWeekend || isHoliday || isPTO;

            const workingMins = Number(report.working_minutes || 0);
            const meetingMins = Number(report.meeting_minutes || 0);
            const workingHrs = Number((workingMins / MINUTES_PER_HOUR).toFixed(2));
            const meetingHrs = Number((meetingMins / MINUTES_PER_HOUR).toFixed(2));
            const productiveHours = isSpecialDay ? '' : workingHrs + meetingHrs;
            const breakHours = isSpecialDay ? '' : 1;
            const totalHoursNoBreak = isSpecialDay ? '' : REQUIRED_PRODUCTIVE_HOURS;
            const totalHours = isSpecialDay ? '' : WORK_DAY_HOURS;
            const prodPct = isSpecialDay ? '' : `${Math.round((productiveHours / REQUIRED_PRODUCTIVE_HOURS) * 100)}%`;
            const breakPct = isSpecialDay ? '' : `${Math.round((1 / WORK_DAY_HOURS) * 100)}%`;
            const overDownTime = isSpecialDay ? '' : Number((REQUIRED_PRODUCTIVE_HOURS - productiveHours).toFixed(2));
            const overDownPct = isSpecialDay ? '' : `${Math.round(((REQUIRED_PRODUCTIVE_HOURS - productiveHours) / REQUIRED_PRODUCTIVE_HOURS) * 100)}%`;

            return [
                dateLabel,
                dayLabel,
                isWeekend ? 'Weekend' : '',
                isHoliday ? (report.task_list?.[0] || 'Holiday') : isPTO ? 'PTO' : '',
                isSpecialDay ? '' : workingMins,
                isSpecialDay ? '' : meetingMins,
                isSpecialDay ? '' : workingHrs,
                isSpecialDay ? '' : meetingHrs,
                totalHoursNoBreak,
                totalHours,
                productiveHours,
                prodPct,
                breakHours,
                breakPct,
                overDownTime,
                overDownPct
            ];
        });

        // Footer summary row
        const footerRow = [
            `Average Productivity %`, `${Math.round(averageProductivity)}%`,
            '', '',
            `Total Productive Hours`, totalProductiveHours.toFixed(2),
            '', '', '',
            `Days Worked`, daysWorked,
            '', '', '',
            `Holidays or PTOs`, holidaysOrPTOs
        ];

        const allRows = [...titleRows, ...dataRows, [], footerRow];

        const ws = XLSX.utils.aoa_to_sheet(allRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Utilization Report');
        XLSX.writeFile(wb, `Utilization_Report_${personName}_${monthName}_${selectedYear}.xlsx`);
    };

    return (
        <div className="container-fluid px-4 mt-4 mb-5">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h2 className="fw-bold mb-1" style={{ color: '#08060d', letterSpacing: '-0.5px' }}>
                        <i className="bi bi-graph-up-arrow me-2" style={{ color: '#055d47' }}></i>
                        Utilization Report
                    </h2>
                    <p className="text-muted mb-0">Analyze productivity, attendance, and time allocation.</p>
                </div>

                <div className="d-flex align-items-center gap-3 bg-white p-3 rounded-4 shadow-sm">
                    {isAdmin && (
                        <div className="d-flex align-items-center">
                            <i className="bi bi-person-badge text-muted me-2"></i>
                            <select className="form-select border-0 bg-light rounded-3" value={selectedUser}
                                onChange={e => setSelectedUser(e.target.value)}
                            >
                                <option value="">All Users</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.first_name} {user.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    <div className="d-flex align-items-center border-start ps-3">
                        <i className="bi bi-calendar2-month text-muted me-2"></i>
                        <select className="form-select border-0 bg-light rounded-3" value={selectedMonth}
                            onChange={e => setSelectedMonth(Number(e.target.value))}
                        >
                            {months.map((month) => (
                                <option key={month.value} value={month.value}>{month.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="d-flex align-items-center border-start ps-3">
                        <i className="bi bi-calendar-event text-muted me-2"></i>
                        <select className="form-select border-0 bg-light rounded-3" value={selectedYear}
                            onChange={e => setSelectedYear(Number(e.target.value))}
                        >
                            {Array.from({ length: 4 }, (_, i) => 2025 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div className="d-flex align-items-center border-start ps-3">
                        <button onClick={exportUtilizationReport} className="btn btn-sm" style={{ backgroundColor: '#065d48', color: 'white', fontWeight: '600', padding: '7px 16px', whiteSpace: 'nowrap' }}>
                            ⬇ Export to Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            {!loading && (
                <div className="row g-4 mb-4">
                    <div className="col-md-3">
                        <div className="card border-0 rounded-4 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #055d47 0%, #2F8F83 100%)', color: 'white' }}>
                            <div className="card-body p-4 d-flex flex-column justify-content-center">
                                <h6 className="opacity-75 fw-semibold mb-2 text-uppercase" style={{ letterSpacing: '1px' }}>Avg. Productivity</h6>
                                <h2 className="fw-bold mb-0 display-6">{Math.round(averageProductivity)}%</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card border-0 rounded-4 shadow-sm h-100 bg-white">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center mb-2">
                                    <div className="rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47' }}>
                                        <i className="bi bi-clock-history fs-5"></i>
                                    </div>
                                    <h6 className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '1px' }}>Productive Hours</h6>
                                </div>
                                <h3 className="fw-bold mb-0 text-dark ps-5 ms-2">{totalProductiveHours.toFixed(2)} <span className="fs-6 text-muted fw-normal">hrs</span></h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card border-0 rounded-4 shadow-sm h-100 bg-white">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center mb-2">
                                    <div className="rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47' }}>
                                        <i className="bi bi-calendar-check fs-5"></i>
                                    </div>
                                    <h6 className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '1px' }}>Days Worked</h6>
                                </div>
                                <h3 className="fw-bold mb-0 text-dark ps-5 ms-2">{daysWorked} <span className="fs-6 text-muted fw-normal">days</span></h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card border-0 rounded-4 shadow-sm h-100 bg-white">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center mb-2">
                                    <div className="rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(220, 53, 69, 0.1)', color: '#dc3545' }}>
                                        <i className="bi bi-cup-hot fs-5"></i>
                                    </div>
                                    <h6 className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '1px' }}>Holidays / PTO</h6>
                                </div>
                                <h3 className="fw-bold mb-0 text-dark ps-5 ms-2">{holidaysOrPTOs} <span className="fs-6 text-muted fw-normal">days</span></h3>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                <div className="card-body p-0">


                    <div className="row">
                        <div className="col-12">
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <p className="mt-2">Loading reports...</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                <table className="table table-hover table-sm mb-0 font-12 align-middle">
                                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                                        <tr className='middle border-bottom'>
                                            <th className='text-muted fw-semibold py-3 ps-4' colSpan={3}>EMPLOYEE NAME</th>
                                            <th className='fw-bold text-dark py-3' colSpan={3}>{name ? name.toUpperCase() : 'N/A'}</th>
                                            <th>&nbsp;</th>
                                            <th className='text-muted fw-semibold py-3' colSpan={2}>EMPLOYEE CODE</th>
                                            <th className='fw-bold text-dark py-3' colSpan={2}>{employeeCode || 'N/A'}</th>
                                            <th>&nbsp;</th>
                                            <th className='text-muted fw-semibold py-3' colSpan={2}>PERIOD</th>
                                            <th className='fw-bold text-dark py-3' colSpan={4}>
                                                {new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long' }).toUpperCase()} {selectedYear}
                                            </th>
                                        </tr>
                                        <tr className='middle text-muted' style={{ fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                            <th className="ps-4 py-2 border-0">Date</th>
                                            <th className="py-2 border-0">Day</th>
                                            <th className="py-2 border-0">Status</th>
                                            <th className="py-2 border-0"></th>
                                            <th className="py-2 border-0"></th>
                                            <th className="py-2 border-0 text-center">Work<br />(mins)</th>
                                            <th className="py-2 border-0 text-center">Meetings<br />(mins)</th>
                                            <th className="py-2 border-0 text-center">Work<br />(hrs)</th>
                                            <th className="py-2 border-0 text-center">Meetings<br />(hrs)</th>
                                            <th className="py-2 border-0"></th>
                                            <th className="py-2 border-0 text-center">Req. Hrs<br />w/o Break</th>
                                            <th className="py-2 border-0 text-center">Req. Hrs<br />Total</th>
                                            <th className="py-2 border-0"></th>
                                            <th className="py-2 border-0 text-center">Prod.<br />Hrs</th>
                                            <th className="py-2 border-0 text-center">Prod.<br />%</th>
                                            <th className="py-2 border-0 text-center">Break<br />Hrs</th>
                                            <th className="py-2 border-0 text-center">Break<br />%</th>
                                            <th className="py-2 border-0 text-center text-nowrap">Var. Hrs</th>
                                            <th className="py-2 border-0 text-center text-nowrap pe-4">Var. %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            displayReports.map((report, index) => {

                                                const [year, month, day] = report.date.split('-');

                                                const date = new Date(
                                                    year,
                                                    month - 1,
                                                    day
                                                );
                                                const isHoliday = report.task_category === 'Holiday';
                                                const isPTO = report.task_category === 'PTO';
                                                const isSpecialDay = report.isWeekend || isHoliday || isPTO;
                                                const previousReport = displayReports[index - 1];

                                                const showDate =
                                                    !previousReport ||
                                                    previousReport.date !== report.date;

                                                const workingHours =
                                                    report.working_minutes
                                                        ? Number((report.working_minutes / MINUTES_PER_HOUR).toFixed(2))
                                                        : 0;

                                                const meetingHours =
                                                    report.meeting_minutes
                                                        ? Number((report.meeting_minutes / MINUTES_PER_HOUR).toFixed(2))
                                                        : 0;
                                                const totalRequiredHours = WORK_DAY_HOURS;
                                                const productiveHours = isSpecialDay
                                                    ? 0
                                                    : workingHours + meetingHours;

                                                const breakHours = isSpecialDay
                                                    ? 0
                                                    : 1;

                                                const overDownTime = isSpecialDay
                                                    ? 0
                                                    : productiveHours - REQUIRED_PRODUCTIVE_HOURS;
                                                const totalHoursNoBreak = isSpecialDay ? '' : REQUIRED_PRODUCTIVE_HOURS;
                                                const overTime = overDownTime > 0 ? overDownTime : 0;
                                                const downTime = overDownTime < 0 ? Math.abs(overDownTime) : 0;
                                                const breakPercentage =
                                                    breakHours > 0
                                                        ? (breakHours / totalRequiredHours) * 100
                                                        : 0;
                                                return (
                                                    <tr key={`${report.date}-${index}`}
                                                        className={
                                                            report.isWeekend
                                                                ? "table-warning middle"
                                                                : isHoliday
                                                                    ? "table-danger middle"
                                                                    : isPTO
                                                                        ? "table-info middle"
                                                                        : "middle"
                                                        }
                                                    >
                                                        <td className='fitcell ps-4 fw-medium text-dark'>
                                                            {showDate &&
                                                                `${date.getDate()}-${date.toLocaleString(
                                                                    'en-US',
                                                                    { month: 'short' }
                                                                )}-${String(date.getFullYear()).slice(-2)}`
                                                            }
                                                        </td>
                                                        <td className="text-muted">
                                                            {showDate &&
                                                                date.toLocaleDateString(
                                                                    'en-US',
                                                                    { weekday: 'short' }
                                                                )
                                                            }
                                                        </td>
                                                        <td>
                                                            {report.isWeekend ? <span className="badge bg-warning text-dark">Weekend</span> : ''}
                                                            {isHoliday ? <span className="badge bg-danger">Holiday</span> : ''}
                                                            {isPTO ? <span className="badge bg-info">PTO</span> : ''}
                                                        </td>
                                                        <td></td>
                                                        <td></td>
                                                        <td className="text-center">
                                                            {!isSpecialDay ? report.working_minutes ?? '' : ''}
                                                        </td>
                                                        <td className="text-center">
                                                            {!isSpecialDay ? report.meeting_minutes ?? '' : ''}
                                                        </td>
                                                        <td className="text-center fw-medium">
                                                            {!isSpecialDay ? workingHours.toFixed(2) : ''}
                                                        </td>
                                                        <td className="text-center fw-medium">
                                                            {!isSpecialDay ? meetingHours.toFixed(2) : ''}
                                                        </td>
                                                        <td></td>
                                                        <td className="text-center text-muted">
                                                            {!isSpecialDay ? totalHoursNoBreak : ''}
                                                        </td>
                                                        <td className="text-center text-muted">
                                                            {!isSpecialDay ? totalRequiredHours : ''}
                                                        </td>
                                                        <td></td>
                                                        <td className="text-center fw-bold" style={{ color: '#055d47' }}>
                                                            {!isSpecialDay ? productiveHours.toFixed(2) : ''}
                                                        </td>
                                                        <td className="text-center fw-bold">
                                                            {
                                                                !isSpecialDay ? (
                                                                    <span className={productiveHours >= REQUIRED_PRODUCTIVE_HOURS ? 'text-success' : 'text-danger'}>
                                                                        {Math.round((productiveHours / REQUIRED_PRODUCTIVE_HOURS) * 100)}%
                                                                    </span>
                                                                ) : ''
                                                            }
                                                        </td>
                                                        <td className="text-center text-muted">
                                                            {!isSpecialDay ? (breakHours > 0 ? breakHours : 0) : ''}
                                                        </td>
                                                        <td className="text-center text-muted">
                                                            {!isSpecialDay ? (Math.round(breakPercentage * 100) / 100).toFixed(0) + '%' : ''}
                                                        </td>
                                                        <td className="text-center">
                                                            {!isSpecialDay ? (
                                                                <span className={productiveHours >= REQUIRED_PRODUCTIVE_HOURS ? 'text-success' : 'text-danger'}>
                                                                    {(totalHoursNoBreak - productiveHours).toFixed(2)}
                                                                </span>
                                                            ) : ''}
                                                        </td>

                                                        <td className="text-center pe-4">
                                                            {!isSpecialDay ? (
                                                                <span className={productiveHours >= REQUIRED_PRODUCTIVE_HOURS ? 'text-success fw-semibold' : 'text-danger fw-semibold'}>
                                                                    {Math.round(((totalHoursNoBreak - productiveHours) / totalHoursNoBreak) * 100)}% <i className={productiveHours >= REQUIRED_PRODUCTIVE_HOURS ? "bi bi-arrow-up-short" : "bi bi-arrow-down-short"}></i>
                                                                </span>
                                                            ) : ''}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        }
                                    </tbody>
                                    <tfoot style={{ backgroundColor: '#4a6b5d', color: 'white' }}>
                                        <tr className="align-middle text-center" style={{ height: '50px' }}>
                                            <td colSpan={5} className="text-end pe-3 fw-bold">Average Productivity %</td>
                                            <td colSpan={2} className="bg-white text-danger fw-bold fs-6 border-start border-end border-2 border-dark">{Math.round(averageProductivity)}%</td>
                                            
                                            <td colSpan={3} className="text-end pe-3 fw-bold">Total Productive Hours</td>
                                            <td colSpan={2} className="bg-white text-danger fw-bold fs-6 border-start border-end border-2 border-dark">{totalProductiveHours.toFixed(2)}</td>

                                            <td colSpan={2} className="text-end pe-3 fw-bold">Days Worked</td>
                                            <td colSpan={2} className="bg-white text-danger fw-bold fs-6 border-start border-end border-2 border-dark">{daysWorked}</td>

                                            <td colSpan={2} className="text-end pe-3 fw-bold">Holidays or PTOs</td>
                                            <td colSpan={1} className="bg-white text-danger fw-bold fs-6 border-start border-end border-2 border-dark">{holidaysOrPTOs}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewUtilizationReport;