import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";


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
    const role = currentUser?.role;

    // Derive selected user directly from the already-loaded users array — no extra state needed
    const selectedUserObj = selectedUser ? users.find(u => String(u.id) === String(selectedUser)) : null;
    const name = selectedUserObj
        ? `${selectedUserObj.first_name} ${selectedUserObj.last_name}`
        : (role === 'admin' || role === 'viewer' || role === 'hr')
            ? 'All Users'
            : currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : '';

    const employeeCode = selectedUserObj
        ? (selectedUserObj.id_number || '')
        : (role === 'admin' || role === 'viewer' || role === 'hr') ? 'ALL' : (currentUser?.id_number || '');
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
        if (role === "admin" || role === 'viewer' || role === 'hr') {
            fetchUsers();
        }
    }, [role]);

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
                let filteredUsers = res.data.filter(u => u.role === 'employee');
                
                const userData = localStorage.getItem("user");
                const user = userData ? JSON.parse(userData) : null;
                
                // If HR role, filter by company
                if (user?.role === 'hr' && user?.company) {
                    filteredUsers = filteredUsers.filter(u => u.company === user.company);
                }
                setUsers(filteredUsers);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchReports = async (user, year, month, userId = "") => {
        if (userId === '') {
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams({ year, month });

            if ((role === "admin" || role === "viewer" || role === "hr") && userId) {
                params.append("user_id", userId);
            }

            const url = (role === "admin" || role === "viewer" || role === "hr")
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
        ).sort((a, b) => {
            const [aYear, aMonth, aDay] = a.date.split('-');
            const [bYear, bMonth, bDay] = b.date.split('-');
            return new Date(Number(aYear), Number(aMonth) - 1, Number(aDay)) - new Date(Number(bYear), Number(bMonth) - 1, Number(bDay));
        });
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

    const exportUtilizationReport = async () => {
        const REQUIRED_PRODUCTIVE_HOURS = 7.5;
        const WORK_DAY_HOURS = 8.5;
        const MINUTES_PER_HOUR = 60;

        const personName = selectedUserObj
            ? `${selectedUserObj.first_name}_${selectedUserObj.last_name}`
            : currentUser
                ? `${currentUser.first_name}_${currentUser.last_name}`
                : "User";

        const displayName = selectedUserObj
            ? `${selectedUserObj.first_name} ${selectedUserObj.last_name}`.toUpperCase()
            : currentUser
                ? `${currentUser.first_name} ${currentUser.last_name}`.toUpperCase()
                : "USER";

        const monthName = new Date(selectedYear, selectedMonth - 1, 1)
            .toLocaleString("default", { month: "long" }).toUpperCase();

        const monthNameShort = new Date(selectedYear, selectedMonth - 1, 1)
            .toLocaleString("default", { month: "short" });

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet("Sheet1");

        ws.columns = [
            { key: 'A', width: 11 }, { key: 'B', width: 12 }, { key: 'C', width: 9 },
            { key: 'D', width: 10 }, { key: 'E', width: 10 }, { key: 'F', width: 10 },
            { key: 'G', width: 10 }, { key: 'H', width: 10 }, { key: 'I', width: 9 },
            { key: 'J', width: 9 },  { key: 'K', width: 2 },  { key: 'L', width: 10 },
            { key: 'M', width: 11 }, { key: 'N', width: 8 },  { key: 'O', width: 9 },
            { key: 'P', width: 11 }, { key: 'Q', width: 11 },
        ];

        const darkGreen  = 'FF3D6B27';
        const hdrGreen   = 'FF4F7942';
        const weekendClr = 'FFF4CCCC';
        const holidayClr = 'FFFFF2CC';
        const footerClr  = 'FFD9EAD3';
        const goldClr    = 'FFF6C026';
        const thin       = { style: 'thin', color: { argb: 'FF000000' } };
        const borders    = { top: thin, left: thin, bottom: thin, right: thin };
        const ctr        = { horizontal: 'center', vertical: 'middle', wrapText: true };

        const fill = (cell, argb) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
        };
        const font = (cell, { bold=false, color='FF000000', size=9 }={}) => {
            cell.font = { bold, color: { argb: color }, size, name: 'Calibri' };
        };
        const style = (cell, bgArgb, fontOpts={}, align=ctr) => {
            fill(cell, bgArgb); font(cell, fontOpts);
            cell.alignment = align; cell.border = borders;
        };

        // ROW 1 — Title
        ws.mergeCells('A1:Q1');
        style(ws.getCell('A1'), hdrGreen, { bold:true, color:'FFFFFFFF', size:13 });
        ws.getCell('A1').value = 'Employee Utilization Report';
        ws.getRow(1).height = 22;

        // ROW 2 — Info
        ws.getRow(2).height = 18;
        ws.mergeCells('A2:C2'); style(ws.getCell('A2'), hdrGreen, { color:'FFFFFFFF' });
        ws.getCell('A2').value = 'Employee Name';
        ws.mergeCells('D2:G2'); style(ws.getCell('D2'), 'FFFFFFFF', { bold:true, color:darkGreen, size:10 });
        ws.getCell('D2').value = displayName;
        ws.mergeCells('H2:I2'); style(ws.getCell('H2'), hdrGreen, { color:'FFFFFFFF' });
        ws.getCell('H2').value = 'Employee Code';
        ws.mergeCells('J2:K2'); style(ws.getCell('J2'), 'FFFFFFFF', { bold:true, color:darkGreen, size:10 });
        ws.getCell('J2').value = employeeCode || '';
        style(ws.getCell('L2'), hdrGreen, { color:'FFFFFFFF' }); ws.getCell('L2').value = 'Month';
        ws.mergeCells('M2:O2'); style(ws.getCell('M2'), 'FFFFFFFF', { bold:true, color:darkGreen, size:10 });
        ws.getCell('M2').value = monthName;
        style(ws.getCell('P2'), hdrGreen, { color:'FFFFFFFF' }); ws.getCell('P2').value = 'Year';
        style(ws.getCell('Q2'), 'FFFFFFFF', { bold:true, color:darkGreen, size:10 }); ws.getCell('Q2').value = selectedYear;

        // ROW 3 — Column headers
        ws.getRow(3).height = 40;
        ['Date','Day','Week\nOffs','Holidays',
         'Working\nHours\n(mins)','Meetings/\nTraining\n(mins)',
         'Working\nHours\n(hrs)','Meetings/\nTraining\n(hrs)',
         'Total\nHours w/o\nBreak','Total Hours','',
         'Productive\nHours','Productive\nHours %',
         'Break\nHours','Break\nHours %',
         'Over/Down\ntime','Over/Downti\nme %'
        ].forEach((h, i) => {
            const c = ws.getRow(3).getCell(i+1);
            style(c, hdrGreen, { bold:true, color:'FFFFFFFF' }); c.value = h;
        });

        // DATA ROWS from row 4
        let rowNumber = 4;
        // (data loop continues below)
        displayReports.forEach((report) => {
            const [year, month, day] = report.date.split("-");
            const dateObj = new Date(Number(year), Number(month) - 1, Number(day));

            const dateLabel = `${day}-${dateObj.toLocaleString("en-US", {
                month: "short",
            })}-${String(year).slice(-2)}`;

            const dayLabel = dateObj.toLocaleDateString("en-US", {
                weekday: "long",
            });

            const isHoliday = report.task_category === "Holiday";
            const isPTO = report.task_category === "PTO";
            const isCompanyEvent = report.task_category === "Company Event";
            const isWeekend = report.isWeekend;
            const isSpecialDay = isWeekend || isHoliday || isPTO || isCompanyEvent;

            const workingMins = Number(report.working_minutes || 0);
            const meetingMins = Number(report.meeting_minutes || 0);

            const workingHrs = Number(
                (workingMins / MINUTES_PER_HOUR).toFixed(2)
            );

            const meetingHrs = Number(
                (meetingMins / MINUTES_PER_HOUR).toFixed(2)
            );

            const productiveHours = isSpecialDay
                ? ""
                : workingHrs + meetingHrs;

            const breakHours = isSpecialDay ? "" : 1;
            const totalHoursNoBreak = isSpecialDay
                ? ""
                : REQUIRED_PRODUCTIVE_HOURS;

            const totalHours = isSpecialDay ? "" : WORK_DAY_HOURS;

            const prodPct = isSpecialDay
                ? ""
                : `${Math.round(
                    (productiveHours / REQUIRED_PRODUCTIVE_HOURS) * 100
                )}%`;

            const breakPct = isSpecialDay
                ? ""
                : `${Math.round((1 / WORK_DAY_HOURS) * 100)}%`;

            const overDownTime = isSpecialDay
                ? ""
                : Number(
                    (
                        REQUIRED_PRODUCTIVE_HOURS -
                        productiveHours
                    ).toFixed(2)
                );

            const overDownPct = isSpecialDay
                ? ""
                : `${Math.round(
                    ((REQUIRED_PRODUCTIVE_HOURS - productiveHours) /
                        REQUIRED_PRODUCTIVE_HOURS) *
                    100
                )}%`;

            const row = ws.getRow(rowNumber);
            row.height = 16;

            const vals = [
                dateLabel, dayLabel,
                isWeekend ? 'Weekend' : '',
                isHoliday ? (report.task_list?.[0] || 'Holiday') : isPTO ? 'PTO' : isCompanyEvent ? 'Company Event' : '',
                isSpecialDay ? '' : workingMins,
                isSpecialDay ? '' : meetingMins,
                isSpecialDay ? '' : workingHrs,
                isSpecialDay ? '' : meetingHrs,
                totalHoursNoBreak, totalHours, '',
                isSpecialDay ? '' : productiveHours,
                prodPct, breakHours, breakPct, overDownTime, overDownPct,
            ];

            const rowBg = isWeekend ? weekendClr : (isHoliday || isPTO || isCompanyEvent) ? holidayClr : 'FFFFFFFF';

            vals.forEach((val, idx) => {
                const c = row.getCell(idx + 1);
                c.value = val;
                c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
                c.font = { name: 'Calibri', size: 9 };
                c.border = borders;
                fill(c, rowBg);
            });

            rowNumber++;
        });

        // FOOTER
        rowNumber++;
        const fRow = rowNumber;
        ws.getRow(fRow).height = 18;

        ws.mergeCells(`A${fRow}:C${fRow}`);
        style(ws.getCell(`A${fRow}`), footerClr, { bold:true }); ws.getCell(`A${fRow}`).value = 'Average Productivity %';
        style(ws.getCell(`D${fRow}`), goldClr, { bold:true }); ws.getCell(`D${fRow}`).value = `${Math.round(averageProductivity)}%`;
        ws.mergeCells(`E${fRow}:G${fRow}`);
        style(ws.getCell(`E${fRow}`), footerClr, { bold:true }); ws.getCell(`E${fRow}`).value = 'Total Productive Hours';
        style(ws.getCell(`H${fRow}`), goldClr, { bold:true }); ws.getCell(`H${fRow}`).value = Number(totalProductiveHours.toFixed(2));
        ws.mergeCells(`I${fRow}:J${fRow}`);
        style(ws.getCell(`I${fRow}`), footerClr, { bold:true }); ws.getCell(`I${fRow}`).value = 'Days Worked';
        ws.mergeCells(`K${fRow}:L${fRow}`);
        style(ws.getCell(`K${fRow}`), goldClr, { bold:true }); ws.getCell(`K${fRow}`).value = daysWorked;
        ws.mergeCells(`M${fRow}:P${fRow}`);
        style(ws.getCell(`M${fRow}`), footerClr, { bold:true }); ws.getCell(`M${fRow}`).value = 'Holidays or PTOs';
        style(ws.getCell(`Q${fRow}`), goldClr, { bold:true }); ws.getCell(`Q${fRow}`).value = holidaysOrPTOs;

        // DOWNLOAD
        const output = await workbook.xlsx.writeBuffer();
        saveAs(
            new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `Utilization_Report_${personName}_${monthNameShort}_${selectedYear}.xlsx`
        );
    };

    return (
        <div className="container-fluid px-4 mt-4 mb-5">
            <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3 mb-4">
                <div>
                    <h2
                        className="fw-bold mb-1"
                        style={{ color: "#08060d", letterSpacing: "-0.5px" }}
                    >
                        <i
                            className="bi bi-graph-up-arrow me-2"
                            style={{ color: "#055d47" }}
                        ></i>
                        Utilization Report
                    </h2>
                </div>

                <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 bg-white p-3 rounded-4 shadow-sm w-100 w-lg-auto">

                    {(role === 'admin' || role === 'viewer' || role === 'hr') && (
                        <div className="d-flex align-items-center flex-grow-1">
                            <i className="bi bi-person-badge text-muted me-2"></i>
                            <select
                                className="form-select bg-light rounded-3"
                                value={selectedUser}
                                onChange={(e) => {
                                    setDailyReports([]);
                                    setSelectedUser(e.target.value);
                                }}
                            >
                                <option value="">Select User</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.first_name} {user.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="d-flex align-items-center flex-grow-1 border-md-start ps-md-3">
                        <i className="bi bi-calendar2-month text-muted me-2"></i>
                        <select
                            className="form-select bg-light rounded-3"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        >
                            {months.map((month) => (
                                <option key={month.value} value={month.value}>
                                    {month.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="d-flex align-items-center flex-grow-1 border-md-start ps-md-3">
                        <i className="bi bi-calendar-event text-muted me-2"></i>
                        <select
                            className="form-select bg-light rounded-3"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {Array.from({ length: 4 }, (_, i) => 2025 + i).map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                    {dailyReports.length > 0 && (
                        <button
                            onClick={exportUtilizationReport}
                            className="btn"
                            style={{
                                backgroundColor: "#065d48",
                                color: "white",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                            }}
                        >
                            <i className="bi bi-file-earmark-excel me-1"></i>
                            Export to Excel
                        </button>
                    )}
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
                            ) : dailyReports.length === 0 ? (
                                <div className="text-center py-5">
                                    <p className="text-muted">No reports available for this period.</p>
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