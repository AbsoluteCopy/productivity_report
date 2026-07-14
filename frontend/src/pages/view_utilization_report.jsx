import { useState, useEffect, useMemo } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ViewUtilizationReport = () => {

    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [dailyReports, setDailyReports] = useState([]);
    const today = useMemo(() => new Date(), []);
    const [currentUser, setCurrentUser] = useState(null);
    const totalRequiredHours = 7.5;
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    const isAdmin = currentUser?.role === "admin";
    const name = currentUser
        ? `${currentUser.first_name} ${currentUser.last_name}`
        : "";
    const employeeCode = currentUser?.id_number ?? "";
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

            const response = await fetch(
                `${API_BASE_URL}/users/`
            );

            const data = await response.json();

            const employees = data.filter(
                user => user.role === "employee"
            );

            setUsers(employees);

        } catch (error) {

            console.error(
                "Error fetching users:",
                error
            );

        }
    };

    const fetchReports = async (user, year, month, userId = "") => {
        try {
            const params = new URLSearchParams({
                year,
                month,
            });

            if (user.role === "admin" && userId) {
                params.append("user_id", userId);
            }

            const url =
                user.role === "admin"
                    ? `${API_BASE_URL}/daily-reports/?${params}`
                    : `${API_BASE_URL}/users/${user.id}/reports/?${params}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("Failed to fetch reports");
            }

            setDailyReports(await response.json());
        } catch (error) {
            console.error("Error fetching reports:", error);
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

    // Only actual working days (exclude weekends, holidays, PTO)
    const workedDays = displayReports.filter(report => {
        const isHoliday = report.task_category === 'Holiday';
        const isPTO = report.task_category === 'PTO';

        return !report.isWeekend && !isHoliday && !isPTO;
    });

    // Total productive hours
    const totalProductiveHours = workedDays.reduce((sum, report) => {
        const workingHours = Number(report.working_minutes || 0) / 60;
        const meetingHours = Number(report.meeting_minutes || 0) / 60;

        return sum + workingHours + meetingHours;
    }, 0);

    // Average Productivity %
    const averageProductivity =
        workedDays.length > 0
            ? workedDays.reduce((sum, report) => {
                const workingHours = Number(report.working_minutes || 0) / 60;
                const meetingHours = Number(report.meeting_minutes || 0) / 60;

                const productiveHours = workingHours + meetingHours;

                return sum + (productiveHours / totalRequiredHours) * 100;
            }, 0) / workedDays.length
            : 0;

    // Days Worked
    const daysWorked = workedDays.length;

    // Holidays + PTO
    const holidaysOrPTOs = displayReports.filter(report => {
        return (
            report.task_category === 'Holiday' ||
            report.task_category === 'PTO'
        );
    }).length;
    return (
        <div className="px-4 mt-4">
            <div className="card shadow-sm">
                <div className="card-body">

                    <div className="d-flex align-items-center justify-content-between gap-3 p-3 bg-light rounded shadow-sm">

                        <h3 className="mb-0">
                            Employee Utilization Report
                        </h3>

                        <div className="d-flex align-items-center gap-2">
                            {isAdmin && (

                                <select
                                    className="form-select w-auto"
                                    value={selectedUser}
                                    onChange={e => setSelectedUser(e.target.value)}
                                >

                                    <option value="">
                                        All Users
                                    </option>

                                    {users.map(user => (

                                        <option key={user.id} value={user.id}>
                                            {user.first_name} {user.last_name}
                                        </option>

                                    ))}

                                </select>

                            )}
                            <select className="form-select w-auto" value={selectedMonth}
                                onChange={e => setSelectedMonth(Number(e.target.value))}
                            >
                                {months.map((month) => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}{selectedYear}
                                    </option>
                                ))}
                            </select>

                            <select className="form-select w-auto" value={selectedYear}
                                onChange={e => setSelectedYear(Number(e.target.value))}
                            >
                                {Array.from({ length: 4 }, (_, i) => 2025 + i).map(year => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-12">
                            <table className="table table-bordered table-striped table-hover table-sm mt-3 font-12">
                                <thead>
                                    <tr className='middle'>
                                        <th className='main-background text-white' colSpan={3}>Employee Name</th>
                                        <th colSpan={3}>{name ? name.toUpperCase() : 'N/A'}</th>
                                        <th>&nbsp;</th>
                                        <th className='main-background text-white' colSpan={2}>Employee Code</th>
                                        <th colSpan={2}>{employeeCode || 'N/A'}</th>
                                        <th>&nbsp;</th>
                                        <th className='main-background text-white' colSpan={2}>Month</th>
                                        <th colSpan={2}>{new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long' }).toUpperCase()}</th>
                                        <th>&nbsp;</th>
                                        <th className='main-background text-white'>Year</th>
                                        <th>{selectedYear}</th>
                                    </tr>
                                    <tr className='middle'>
                                        <th>Date</th>
                                        <th>Day</th>
                                        <th>Week Offs</th>
                                        <th>Holidays</th>
                                        <th></th>
                                        <th>Working Hours
                                            <br />(mins)</th>
                                        <th>Meeting/Trainings
                                            <br />(mins)</th>
                                        <th>Working Hours
                                            <br />(hrs)</th>
                                        <th>Meeting/Trainings
                                            <br />(hrs)</th>
                                        <th></th>
                                        <th>Total Hours w/o Break</th>
                                        <th>Total Hours</th>
                                        <th></th>
                                        <th>Productive Hours</th>
                                        <th>Productive Hours %</th>
                                        <th>Break Hours</th>
                                        <th>Break Hours %</th>
                                        <th>Over/Down time</th>
                                        <th>Over/Down time %</th>
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
                                                    ? Number((report.working_minutes / 60).toFixed(2))
                                                    : 0;

                                            const meetingHours =
                                                report.meeting_minutes
                                                    ? Number((report.meeting_minutes / 60).toFixed(2))
                                                    : 0;
                                            const totalRequiredHours = 8.5;
                                            const productiveHours = isSpecialDay
                                                ? 0
                                                : workingHours + meetingHours;

                                            const breakHours = isSpecialDay
                                                ? 0
                                                : totalRequiredHours - productiveHours;

                                            const overDownTime = isSpecialDay
                                                ? 0
                                                : productiveHours - 7.5;
                                            const totalHoursNoBreak = isSpecialDay ? '' : 7.5;
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
                                                    <td className='fitcell'>
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
                                                        {report.isWeekend ? 'Weekend' : ''}
                                                    </td>
                                                    <td>
                                                        {isHoliday ? 'Holiday' : ''}
                                                    </td>
                                                    <td> </td>
                                                    <td>
                                                        {!isSpecialDay ? report.working_minutes ?? '' : ''}
                                                    </td>
                                                    <td>
                                                        {!isSpecialDay ? report.meeting_minutes ?? '' : ''}
                                                    </td>
                                                    <td>
                                                        {!isSpecialDay ? workingHours : ''}
                                                    </td>
                                                    <td>
                                                        {!isSpecialDay ? meetingHours : ''}
                                                    </td>
                                                    <td></td>
                                                    <td>
                                                        {!isSpecialDay ? totalHoursNoBreak : ''}
                                                    </td>
                                                    <td>
                                                        {!isSpecialDay ? totalRequiredHours.toFixed(2) : ''}
                                                    </td>
                                                    <td></td>
                                                    <td>
                                                        {!isSpecialDay ? productiveHours.toFixed(2) : ''}
                                                    </td>
                                                    <td>
                                                        {
                                                            !isSpecialDay ? ((productiveHours / 7.5) * 100).toFixed(2) + '%' : ''
                                                        }
                                                    </td>
                                                    <td>
                                                        {!isSpecialDay ? (breakHours > 0 ? breakHours.toFixed(2) : 0) : ''}
                                                    </td>
                                                    <td>
                                                        {!isSpecialDay ? breakPercentage.toFixed(2) : ''}
                                                    </td>
                                                    <td>
                                                        {!isSpecialDay ? overTime.toFixed(2) : ''}
                                                    </td>

                                                    <td>
                                                        {!isSpecialDay ? ((overTime / 7.5) * 100).toFixed(2) + '%' : ''}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    }
                                    <tr className="fw-bold middle">
                                        <td className='main-background text-white' colSpan={3}>Average Productivity %</td>
                                        <td colSpan={2}>
                                            {averageProductivity.toFixed(2)}%
                                        </td>

                                        <td>&nbsp;</td>

                                        <td className='main-background text-white' colSpan={2}>Total Productive Hours</td>
                                        <td colSpan={2}>
                                            {totalProductiveHours.toFixed(2)}
                                        </td>

                                        <td>&nbsp;</td>

                                        <td className='main-background text-white' colSpan={2}>Days Worked</td>
                                        <td>
                                            {daysWorked}
                                        </td>

                                        <td>&nbsp;</td>

                                        <td className='main-background text-white' colSpan={3}>Holidays or PTOs</td>
                                        <td>
                                            {holidaysOrPTOs}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewUtilizationReport;