import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import API_BASE_URL from "../config";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import axios from 'axios';
import Swal from 'sweetalert2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const ViewReport = () => {
    const navigate = useNavigate();

    const today = new Date();

    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedUser, setSelectedUser] = useState('');

    const [dailyReports, setDailyReports] = useState([]);
    const [expandedRows, setExpandedRows] = useState({});
    const [role, setRole] = useState('');
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [taskCategories, setTaskCategories] = useState([]);


    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));

        if (!user) return;

        setCurrentUser(user);
        setRole(user.role);
    }, []);

    useEffect(() => {
        if ((role === 'admin' || role === 'viewer' || role === 'hr' || role === 'supervisor')) {
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

        fetchCategories(selectedUser);
    }, [currentUser, selectedYear, selectedMonth, selectedUser]);


    const fetchCategories = async (userId = '') => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;

            const selectedReportUser = users.find(user => String(user.id) === String(userId));
            let userTaskList = selectedReportUser?.task_list || [];
            if (!selectedReportUser) {
                const userRes = await axios.get(
                    userId ? `${API_BASE_URL}/users/${userId}/` : `${API_BASE_URL}/users/me/`,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                );
                userTaskList = userRes.data.task_list || [];
            }

            // Fetch all task categories
            const categoriesRes = await axios.get(`${API_BASE_URL}/task-categories/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const allCategories = categoriesRes.data;

            // Filter categories to only include those in user's task_list
            const filteredCategories = allCategories.filter(category =>
                userTaskList.includes(category.id)
            );

            setTaskCategories(filteredCategories);
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.response?.data?.detail || "Something went wrong.",
            });
        }
    };

    const toggleTaskList = (key) => {
        setExpandedRows(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const data = await response.json();

            let filteredUsers = data.filter(u => u.role === 'employee');

            const userData = localStorage.getItem("user");
            const loggedInUser = userData ? JSON.parse(userData) : null;

            // Viewer, HR, and Supervisor roles can only see employees from their own company
            if ((loggedInUser?.role === 'hr' || loggedInUser?.role === 'viewer' || loggedInUser?.role === 'supervisor') && loggedInUser?.company) {
                filteredUsers = filteredUsers.filter(u => u.company === loggedInUser.company);
            }

            setUsers(filteredUsers);

        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchReports = async (user, year, month, userId = '') => {
        setLoading(true);
        try {
            let url;

            if (role === 'admin' || role === 'viewer' || role === 'hr' || role === 'supervisor') {
                if (userId === '') {
                    return;
                }
                url = `${API_BASE_URL}/daily-reports/?year=${year}&month=${month}${userId ? `&user_id=${userId}` : ''}`;
            } else {
                url = `${API_BASE_URL}/users/${user.id}/reports/?year=${year}&month=${month}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

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

    const getReportCategory = (report) => {
        if (!report) return '';
        if (report.task_category === 'Others' && report.sub_category && report.sub_category.trim()) {
            return report.sub_category.trim();
        }
        return report.task_category === 'Other' ? 'Others' : (report.task_category || '');
    };

    const groupedReports = (dailyReports || []).map(report => {
        const catName = getReportCategory(report);
        return {
            ...report,
            display_category: catName,
            number_of_tasks: Number(report.number_of_tasks || 0),
            meeting_count: Number(report.meeting_count || 0),
            task_list: [...(report.task_list || [])]
        };
    }).sort((a, b) => {
        const [aYear, aMonth, aDay] = a.date.split('-');
        const [bYear, bMonth, bDay] = b.date.split('-');
        const dateCompare = new Date(Number(aYear), Number(aMonth) - 1, Number(aDay)) - new Date(Number(bYear), Number(bMonth) - 1, Number(bDay));

        if (dateCompare !== 0) {
            return dateCompare;
        }

        const catA = a.display_category || a.task_category || '';
        const catB = b.display_category || b.task_category || '';
        return catA.localeCompare(catB);
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
                        display_category: 'Weekend',
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

            const [aYear, aMonth, aDay] = a.date.split('-');
            const [bYear, bMonth, bDay] = b.date.split('-');
            const dateCompare =
                new Date(Number(aYear), Number(aMonth) - 1, Number(aDay)) - new Date(Number(bYear), Number(bMonth) - 1, Number(bDay));

            if (dateCompare !== 0) {
                return dateCompare;
            }

            const catA = a.display_category || a.task_category || '';
            const catB = b.display_category || b.task_category || '';
            return catA.localeCompare(catB);
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
                report.task_category === 'PTO' ||
                report.task_category === 'Company Event';

            if (!report.isWeekend && !isLeave) {
                if (report.task_category === 'Meeting') {
                    dailyMeetings += Number(report.meeting_count || report.number_of_tasks || 0) * Number(report.time_spent || 0);
                } else {
                    dailyWorkingHours += Number(report.number_of_tasks || 0) * Number(report.time_spent || 0);
                }

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
    const categoryColors = [
        'rgba(5, 93, 71, 0.8)',
        'rgba(47, 143, 131, 0.8)',
        'rgba(52, 152, 219, 0.8)',
        'rgba(155, 89, 182, 0.8)',
        'rgba(230, 126, 34, 0.8)',
        'rgba(231, 76, 60, 0.8)',
        'rgba(241, 196, 15, 0.8)',
        'rgba(26, 188, 156, 0.8)',
    ];

    const categoryNames = [...taskCategories.map(cat => cat.name), 'Meeting'];

    const allReportCategories = Array.from(new Set([
        ...taskCategories.map(cat => cat.name),
        ...dailyReports.map(r => getReportCategory(r)).filter(c => c && !['Weekend', 'Daily Total', 'Holiday', 'PTO', 'Company Event'].includes(c)),
        'Meeting'
    ]));

    const initialCategoryMap = allReportCategories.reduce((acc, cat) => {
        acc[cat] = { tasks: 0, minutes: 0 };
        return acc;
    }, {});

    const categoryMap = groupedReports.reduce((acc, report) => {
        const cat = getReportCategory(report);
        if (!cat || cat === 'Weekend' || cat === 'Daily Total' || cat === 'PTO' || cat === 'Holiday' || cat === 'Company Event') return acc;
        if (!acc[cat]) acc[cat] = { tasks: 0, minutes: 0 };

        acc[cat].tasks += Number(report.number_of_tasks || 0);
        acc[cat].minutes += Number(report.number_of_tasks || 0) * Number(report.time_spent || 0);
        return acc;
    }, initialCategoryMap);

    const summaryReports = Object.keys(categoryMap).filter(task => task !== 'Meeting').map(task => ({
        task,
        totalTasks: categoryMap[task].tasks,
        totalTime: categoryMap[task].minutes
    })).sort((a, b) => b.totalTime - a.totalTime); // Sort by time spent descending

    const taskChartLabels = [];
    const taskChartCounts = [];
    const taskChartColors = [];

    const timeChartLabels = [];
    const timeChartMinutes = [];
    const timeChartColors = [];

    Object.keys(categoryMap).forEach((c, i) => {
        if (c === 'Meeting') return; // Skip Meeting in charts
        const color = categoryColors[i % categoryColors.length];

        if (categoryMap[c].tasks > 0) {
            taskChartLabels.push(c);
            taskChartCounts.push(categoryMap[c].tasks);
            taskChartColors.push(color);
        }

        if (categoryMap[c].minutes > 0) {
            timeChartLabels.push(c);
            timeChartMinutes.push(categoryMap[c].minutes);
            timeChartColors.push(color);
        }
    });

    const tasksPieChartData = {
        labels: taskChartLabels,
        datasets: [{
            data: taskChartCounts,
            backgroundColor: taskChartColors,
            borderWidth: 2,
            borderColor: '#fff',
        }]
    };

    const tasksPieChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: { font: { family: 'Inter', size: 12 }, padding: 16 }
            },
            tooltip: {
                callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} tasks` },
                backgroundColor: '#08060d',
                padding: 10,
                cornerRadius: 8,
            }
        }
    };

    const pieChartData = {
        labels: timeChartLabels,
        datasets: [{
            data: timeChartMinutes,
            backgroundColor: timeChartColors,
            borderWidth: 2,
            borderColor: '#fff',
        }]
    };

    const exportDailyReport = async (reportType = 'dailyreport') => {
        const personName = (() => {
            if (selectedUser) {
                const u = users.find(u => String(u.id) === String(selectedUser));
                return u ? `${u.first_name}_${u.last_name}` : "User";
            }
            return currentUser ? `${currentUser.first_name}_${currentUser.last_name}` : "User";
        })();

        const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString("en-US", { month: "short" });

        const workbook = new ExcelJS.Workbook();

        // ---------- Shared styling ----------
        const mainGreen = 'FF065D48';
        const darkGreen = 'FF044334';
        const thin = { style: 'thin', color: { argb: 'FFD0D5DD' } };
        const borders = { top: thin, left: thin, bottom: thin, right: thin };
        const centerAlign = { horizontal: 'center', vertical: 'middle', wrapText: true };
        const leftAlign = { horizontal: 'left', vertical: 'middle', wrapText: true };
        const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

        const setHdr = (row, colIdx, text, bg = mainGreen) => {
            const cell = row.getCell(colIdx);
            cell.value = text;
            cell.fill = solid(bg);
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' };
            cell.alignment = centerAlign;
            cell.border = borders;
        };

        const formatLabel = (dateStr) => {
            const [year, month, day] = dateStr.split("-");
            const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
            return {
                dateObj,
                dateLabel: `${day}-${dateObj.toLocaleString("en-US", { month: "short" })}-${String(year).slice(-2)}`,
                dayLabel: dateObj.toLocaleDateString("en-US", { weekday: "long" })
            };
        };

        const excluded = ['Weekend', 'Daily Total', 'Holiday', 'PTO', 'Company Event'];

        // ---------- 1. DAILY REPORT ----------
        const buildDailyReport = () => {
            const ws = workbook.addWorksheet("Daily Report");
            ws.columns = [
                { key: 'date', width: 14 },
                { key: 'day', width: 13 },
                { key: 'task', width: 36 },
                { key: 'count', width: 12 },
                { key: 'time', width: 18 },
                { key: 'working', width: 22 },
                { key: 'meeting', width: 24 },
            ];

            const row1 = ws.getRow(1);
            row1.height = 28;
            ['Date', 'Day', 'Tasks', '# of Tasks', 'Time Spent (mins)', 'Working Hours (mins)', 'Meetings/Training (mins)']
                .forEach((h, i) => setHdr(row1, i + 1, h));

            let currentRow = 2;

            displayReports.forEach(report => {
                const isWeekend = report.isWeekend;
                const isLeave =
                    report.task_category === "Holiday" ||
                    report.task_category === "PTO" ||
                    report.task_category === "Company Event";
                const isDailyTotal = report.isTotal || report.task_category === "Daily Total";

                const r = ws.getRow(currentRow);
                r.height = 20;

                if (isDailyTotal) {
                    r.getCell(3).value = "Daily Total";
                    r.getCell(6).value = report.working_hours_total ?? "";
                    r.getCell(7).value = report.meeting_total ?? "";

                    for (let c = 1; c <= 7; c++) {
                        const cell = r.getCell(c);
                        cell.font = { bold: true, size: 10, name: 'Calibri' };
                        cell.fill = solid('FFD1FAE5');
                        cell.border = borders;
                        cell.alignment = c >= 4 ? centerAlign : leftAlign;
                    }
                    currentRow++;
                    return;
                }

                const { dateLabel, dayLabel } = formatLabel(report.date);

                if (isWeekend) {
                    r.getCell(1).value = dateLabel;
                    r.getCell(2).value = dayLabel;
                    r.getCell(3).value = "Weekend";

                    for (let c = 1; c <= 7; c++) {
                        const cell = r.getCell(c);
                        cell.fill = solid('FFF2F4F7');
                        cell.border = borders;
                        cell.font = { size: 10, name: 'Calibri' };
                        cell.alignment = c <= 2 ? centerAlign : leftAlign;
                    }
                    currentRow++;
                } else if (isLeave) {
                    r.getCell(1).value = dateLabel;
                    r.getCell(2).value = dayLabel;
                    r.getCell(3).value = report.task_category + (report.task_list?.[0] ? ` - ${report.task_list[0]}` : "");

                    for (let c = 1; c <= 7; c++) {
                        const cell = r.getCell(c);
                        cell.fill = solid('FFE8F8F5');
                        cell.border = borders;
                        cell.font = { size: 10, name: 'Calibri' };
                        cell.alignment = c <= 2 ? centerAlign : leftAlign;
                    }
                    currentRow++;
                } else {
                    const numTasks = Number(report.number_of_tasks || 0);
                    const timeSpent = Number(report.time_spent || 0);
                    const isMeeting = report.task_category === "Meeting";

                    r.getCell(1).value = dateLabel;
                    r.getCell(2).value = dayLabel;
                    r.getCell(3).value = getReportCategory(report);
                    r.getCell(4).value = numTasks || "";
                    r.getCell(5).value = timeSpent || "";
                    r.getCell(6).value = isMeeting ? "" : (numTasks * timeSpent || "");
                    r.getCell(7).value = isMeeting
                        ? (Number(report.meeting_count || 0) * timeSpent || "")
                        : "";

                    for (let c = 1; c <= 7; c++) {
                        const cell = r.getCell(c);
                        cell.border = borders;
                        cell.font = { size: 10, name: 'Calibri' };
                        cell.alignment = (c <= 2 || c >= 4) ? centerAlign : leftAlign;
                    }
                    currentRow++;

                    if (Array.isArray(report.task_list) && report.task_list.length > 0) {
                        report.task_list.forEach(item => {
                            if (!item) return;
                            const itemRow = ws.getRow(currentRow);
                            itemRow.height = 18;
                            itemRow.getCell(3).value = item;

                            for (let c = 1; c <= 7; c++) {
                                const cell = itemRow.getCell(c);
                                cell.border = borders;
                                cell.font = { size: 9, italic: true, color: { argb: 'FF475467' }, name: 'Calibri' };
                                cell.fill = solid('FFFAFAFA');
                                cell.alignment = c === 3 ? leftAlign : centerAlign;
                            }
                            currentRow++;
                        });
                    }
                }
            });

            ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
        };

        // ---------- 2. SUMMARY OF TASKS ----------
        const buildSummaryReport = () => {
            const ws = workbook.addWorksheet("Summary of Tasks");
            ws.columns = [
                { key: 'task', width: 34 },
                { key: 'total_tasks', width: 22 },
                { key: 'total_time', width: 26 },
            ];

            const row1 = ws.getRow(1);
            row1.height = 28;
            setHdr(row1, 1, 'List of Task');
            setHdr(row1, 2, 'Total # of Tasks Done');
            setHdr(row1, 3, 'Total Time Spent (mins)');

            summaryReports.forEach((summary, idx) => {
                const r = ws.getRow(2 + idx);
                r.getCell(1).value = summary.task;
                r.getCell(2).value = summary.totalTasks || 0;
                r.getCell(3).value = summary.totalTime || 0;

                [1, 2, 3].forEach(c => {
                    const cell = r.getCell(c);
                    cell.border = borders;
                    cell.font = { size: 10, name: 'Calibri' };
                    cell.fill = solid('FFFFFFFF');
                    cell.alignment = c === 1 ? leftAlign : centerAlign;
                });
            });

            // Total row (matches the on-screen table)
            const totalRow = ws.getRow(2 + summaryReports.length);
            totalRow.getCell(1).value = 'Total';
            totalRow.getCell(2).value = summaryReports.reduce((s, i) => s + i.totalTasks, 0);
            totalRow.getCell(3).value = summaryReports.reduce((s, i) => s + i.totalTime, 0);
            [1, 2, 3].forEach(c => {
                const cell = totalRow.getCell(c);
                cell.border = borders;
                cell.font = { bold: true, size: 10, name: 'Calibri' };
                cell.fill = solid('FFD1FAE5');
                cell.alignment = c === 1 ? leftAlign : centerAlign;
            });

            ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
        };

        // ---------- 3. ITEMS PER TASK ----------
        const buildItemsReport = () => {
            const ws = workbook.addWorksheet("Items per Task");

            const seenCats = new Set();
            const catTaskTotals = {};
            groupedReports.forEach(r => {
                const cat = getReportCategory(r);
                if (cat && !excluded.includes(cat)) {
                    seenCats.add(cat);
                    catTaskTotals[cat] = (catTaskTotals[cat] || 0) + Number(r.number_of_tasks || 0);
                }
            });
            let dynamicCategories = Array.from(seenCats).sort(
                (a, b) => (catTaskTotals[b] || 0) - (catTaskTotals[a] || 0)
            );
            if (dynamicCategories.length === 0) {
                dynamicCategories = [...allReportCategories];
            }

            const columns = [];
            dynamicCategories.forEach((cat, idx) => {
                columns.push(
                    { key: `p3_${idx}_date`, width: 14 },
                    { key: `p3_${idx}_item`, width: 32 },
                    { key: `p3_${idx}_cnt`, width: 12 },
                    { key: `p3_${idx}_time`, width: 20 }
                );
            });
            ws.columns = columns;

            const row1 = ws.getRow(1);
            row1.height = 28;
            const row2 = ws.getRow(2);
            row2.height = 24;

            dynamicCategories.forEach((cat, i) => {
                const startCol = 1 + (i * 4);
                setHdr(row1, startCol, 'Date');
                setHdr(row1, startCol + 1, 'Items per Task');
                setHdr(row1, startCol + 2, '# of Tasks');
                setHdr(row1, startCol + 3, 'Working Hours (mins)');

                setHdr(row2, startCol, '', darkGreen);
                setHdr(row2, startCol + 1, cat, darkGreen);
                setHdr(row2, startCol + 2, '', darkGreen);
                setHdr(row2, startCol + 3, '', darkGreen);
            });

            dynamicCategories.forEach((cat, catIdx) => {
                const startCol = 1 + (catIdx * 4);
                let p3Row = 3;

                groupedReports.forEach(report => {
                    if (getReportCategory(report) !== cat) return;
                    if (!Array.isArray(report.task_list) || report.task_list.length === 0) return;

                    const { dateLabel } = formatLabel(report.date);
                    const numTasks = Number(report.number_of_tasks || 0);
                    const timeSpent = Number(report.time_spent || 0);
                    const isMeeting = report.task_category === "Meeting";
                    const workingHours = isMeeting ? "" : (numTasks * timeSpent || "");

                    report.task_list.forEach((item, itemIdx) => {
                        const targetRow = ws.getRow(p3Row);

                        targetRow.getCell(startCol).value = itemIdx === 0 ? dateLabel : "";
                        targetRow.getCell(startCol + 1).value = item;
                        targetRow.getCell(startCol + 2).value = itemIdx === 0 ? (numTasks || "") : "";
                        targetRow.getCell(startCol + 3).value = itemIdx === 0 ? (workingHours || "") : "";

                        for (let c = 0; c < 4; c++) {
                            const cell = targetRow.getCell(startCol + c);
                            cell.border = borders;
                            cell.font = { size: 10, name: 'Calibri' };
                            cell.fill = solid('FFFFFFFF');
                            cell.alignment = c === 1 ? leftAlign : centerAlign;
                        }
                        p3Row++;
                    });
                });
            });

            ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
        };

        // ---------- Pick what to export ----------
        let filePrefix;
        switch (reportType) {
            case 'summaryreport':
                buildSummaryReport();
                filePrefix = 'Summary_of_Task';
                break;
            case 'itemsreport':
                buildItemsReport();
                filePrefix = 'Items_per_Task';
                break;
            case 'dailyreport':
            default:
                buildDailyReport();
                filePrefix = 'Daily_Report';
                break;
        }

        const output = await workbook.xlsx.writeBuffer();
        saveAs(
            new Blob([output]),
            `${filePrefix}_${personName}_${monthName}_${selectedYear}.xlsx`
        );
    };

    const pieChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: { font: { family: 'Inter', size: 12 }, padding: 16 }
            },
            tooltip: {
                callbacks: {
                    label: (ctx) => ` ${ctx.label}: ${ctx.parsed} mins`
                },
                backgroundColor: '#08060d',
                padding: 10,
                cornerRadius: 8,
            }
        }
    };

    const formatDate = (date) => {
        if (!date) return '';

        const [year, month, day] = date.split('-');
        const monthName = new Date(year, month - 1, day).toLocaleString('en-US', {
            month: 'long'
        });

        return `${day}-${monthName}-${year.slice(2)}`;
    };

    const itemsReportColumns = [
        { key: 'date', label: 'Date' },
        ...allReportCategories.flatMap(category => [
            {
                key: `${category}_tasks`,
                label: `${category}`
            },
            ...(category !== 'Meeting' ? [{
                key: `${category}_count`,
                label: `# of Task`
            }] : []),
            {
                key: `${category}_time`,
                label: `Working Hours(mins)`
            }
        ])
    ];

    const filteredReports = Object.values(
        (dailyReports ?? [])
            .filter(report => report.task_category !== 'Holiday')
            .reduce((acc, report) => {
                if (!acc[report.date]) {
                    acc[report.date] = {
                        date: formatDate(report.date),
                    };

                    allReportCategories.forEach(category => {
                        acc[report.date][`${category}_tasks`] = [];
                        if (category !== 'Meeting') {
                            acc[report.date][`${category}_count`] = 0;
                        }
                        acc[report.date][`${category}_time`] = 0;
                    });
                }

                const category = getReportCategory(report);

                if (acc[report.date][`${category}_tasks`]) {
                    acc[report.date][`${category}_tasks`].push(
                        ...(report.task_list ?? [])
                    );

                    if (category !== 'Meeting') {
                        acc[report.date][`${category}_count`] +=
                            Number(report.number_of_tasks) || 0;
                    }

                    acc[report.date][`${category}_time`] +=
                        Number(report.time_spent) || 0;
                }

                return acc;
            }, {})
    );
    const getColumnClass = (key) => {
        if (key === 'date') return 'fitcell';
        return '';
    };
    const renderItemsReportTable = () => {
        if (filteredReports.length === 0) {
            return (
                <div className="text-center text-muted py-4">
                    No items report data available
                </div>
            );
        }

        return (
            <div className="table-responsive">
                <table className="table table-hover table-bordered table-striped font-12">
                    <thead className="table-light">
                        <tr>
                            {itemsReportColumns.map(col => (
                                <th className='main-background text-white fitcell' key={col.key}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReports.map(report => (
                            <tr key={report.date}>
                                {itemsReportColumns.map(col => {
                                    const value = report[col.key];

                                    // Task list columns
                                    if (Array.isArray(value)) {
                                        return (
                                            <td key={col.key}>
                                                {value.length > 0 &&
                                                    value.map((task, index) => (
                                                        <div key={index}>{task}</div>
                                                    ))}
                                            </td>
                                        );
                                    }

                                    // Count/time columns
                                    const isCategoryValue =
                                        col.key.endsWith('_count') ||
                                        col.key.endsWith('_time');

                                    const taskKey = col.key.replace(/_(count|time)$/, '_tasks');

                                    return (
                                        <td key={col.key} className={`${getColumnClass(col.key)} middle`}>
                                            {isCategoryValue && report[taskKey]?.length === 0
                                                ? ''
                                                : value}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="px-4 mt-4">
            <div className="card shadow-sm">
                <div className="card-body">

                    <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 p-3 bg-light rounded shadow-sm">
                        <h3 className="mb-0">Daily Reports</h3>

                        <div className="d-flex flex-column flex-sm-row gap-2 w-100">
                            {(role === 'admin' || role === 'viewer' || role === 'hr' || role === 'supervisor') && (
                                <select
                                    className="form-select flex-fill"
                                    value={selectedUser}
                                    onChange={e => {
                                        setDailyReports([]);
                                        setSelectedUser(e.target.value);
                                    }}
                                >
                                    <option value="">Select User</option>

                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.first_name} {user.last_name}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <select
                                className="form-select flex-fill"
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(Number(e.target.value))}
                            >
                                {months.map(month => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>

                            <select
                                className="form-select flex-fill"
                                value={selectedYear}
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


                    <ul className="nav nav-tabs custom-report-tabs mt-3" id="reportTabs" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button
                                className="nav-link active"
                                id="daily-tab"
                                data-bs-toggle="tab"
                                data-bs-target="#daily-report"
                                type="button"
                                role="tab"
                                aria-selected="true"
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

                        <li className="nav-item" role="presentation">
                            <button
                                className="nav-link"
                                id="items-tab"
                                data-bs-toggle="tab"
                                data-bs-target="#items-report"
                                type="button"
                                role="tab"
                            >
                                Items per Task
                            </button>
                        </li>
                    </ul>


                    <div className="tab-content" id="reportTabsContent">
                        <div className="tab-pane fade show active" id="daily-report" role="tabpanel">
                            <div className="d-flex justify-content-end mt-3 me-2">
                                {dailyReports.length === 0 ? null : (
                                    <button onClick={() => exportDailyReport('dailyreport')} className="btn btn-sm shadow-sm" style={{ backgroundColor: '#065d48', color: 'white', fontWeight: '600', padding: '6px 16px' }}>
                                        <i className="bi bi-file-earmark-excel"></i> Export to Excel
                                    </button>
                                )}
                            </div>
                            <div className="table-responsive">
                                {loading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="mt-2">Loading reports...</p>
                                    </div>
                                ) : dailyReports.length === 0 ? (
                                    <div className="text-center py-5">
                                        <p className="text-muted">No reports available for the selected period.</p>
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
                                                            <tr key={report.id} className="fw-bold table-success">
                                                                <td></td>
                                                                <td></td>
                                                                <td>Daily Total</td>
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
                                                        report.task_category === 'PTO' ||
                                                        report.task_category === 'Company Event';
                                                    const isMeeting = report.task_category === 'Meeting';
                                                    const displayCat = getReportCategory(report);
                                                    const rowKey = `${report.date}-${displayCat}-${report.id || index}`;
                                                    return (
                                                        <tr key={rowKey} className={`
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
                                                                    {displayCat}
                                                                    {(report.task_category === 'Holiday' || report.task_category === 'Company Event') && report.task_list?.[0] ? ` - ${report.task_list[0]}` : ''}
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
                                                                                    toggleTaskList(rowKey)
                                                                                }
                                                                            >
                                                                                {expandedRows[rowKey]
                                                                                    ? 'Hide Tasks'
                                                                                    : `Show Tasks (${report.task_list.length})`
                                                                                }
                                                                            </button>


                                                                            {expandedRows[rowKey] && (
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
                                                                {isLeave || report.number_of_tasks === 0 || isMeeting
                                                                    ? ''
                                                                    : (Number(report.number_of_tasks || 0) * Number(report.time_spent || 0) || '')
                                                                }
                                                            </td>

                                                            <td>{isMeeting ? (Number(report.meeting_count || 0) * Number(report.time_spent || 0) || '') : (report.meeting_count || '')}</td>

                                                        </tr>
                                                    );
                                                })
                                            }
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        <div className="tab-pane fade" id="summary-report" role="tabpanel">
                            <div className="d-flex justify-content-end mt-3 me-2">
                                {dailyReports.length === 0 ? null : (
                                    <button onClick={() => exportDailyReport('summaryreport')} className="btn btn-sm shadow-sm" style={{ backgroundColor: '#065d48', color: 'white', fontWeight: '600', padding: '6px 16px' }}>
                                        <i className="bi bi-file-earmark-excel"></i> Export to Excel
                                    </button>
                                )}
                            </div>
                            <div className="p-3">
                                {dailyReports.length > 0 && (taskChartLabels.length > 0 || timeChartLabels.length > 0) && (
                                    <div className="row g-4 mb-4">
                                        <div className="col-md-6">
                                            <div className="card shadow-sm border-0 rounded-4 h-100" style={{ backgroundColor: '#fdfdfd' }}>
                                                <div className="card-body p-4">
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <h6 className="fw-bold mb-0" style={{ color: '#08060d' }}>Total Tasks by Category</h6>
                                                        <span className="badge" style={{ backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47', fontSize: '12px' }}>
                                                            {taskChartCounts.reduce((a, b) => a + b, 0)} total tasks
                                                        </span>
                                                    </div>
                                                    <div style={{ height: '280px' }}>
                                                        <Pie data={tasksPieChartData} options={tasksPieChartOptions} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="card shadow-sm border-0 rounded-4 h-100" style={{ backgroundColor: '#fdfdfd' }}>
                                                <div className="card-body p-4">
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <h6 className="fw-bold mb-0" style={{ color: '#08060d' }}>Time Spent by Category</h6>
                                                        <span className="badge" style={{ backgroundColor: 'rgba(5, 93, 71, 0.1)', color: '#055d47', fontSize: '12px' }}>
                                                            {timeChartMinutes.reduce((a, b) => a + b, 0)} total mins
                                                        </span>
                                                    </div>
                                                    <div style={{ height: '280px' }}>
                                                        <Pie data={pieChartData} options={pieChartOptions} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

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

                        <div className="tab-pane fade" id="items-report" role="tabpanel">
                            <div className="d-flex justify-content-end mt-3 me-2 mb-2">
                                {dailyReports.length === 0 ? null : (
                                    <button onClick={() => exportDailyReport('itemsreport')} className="btn btn-sm shadow-sm" style={{ backgroundColor: '#065d48', color: 'white', fontWeight: '600', padding: '6px 16px' }}>
                                        <i className="bi bi-file-earmark-excel"></i> Export to Excel
                                    </button>
                                )}
                            </div>
                            <div className="row">
                                {renderItemsReportTable()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewReport;