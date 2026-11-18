import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from "chart.js";
import API_BASE_URL from "../config";
import { parseNaiveDateTime, formatNaiveTime, formatNaiveDate } from "../utils/dateUtils";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const API_URL = `${API_BASE_URL}/attendance/`;

const customStyles = {
    rows: {
        style: {
            minHeight: "60px",
        },
    },
};

const formatTime = (value) => formatNaiveTime(value, { seconds: true });
const formatDate = (value) => formatNaiveDate(value);

// Compare two MySQL DATETIME strings as wall-clock values so sorting is
// chronological rather than alphabetical on the formatted display string.
const compareNaiveDateTime = (a, b) => {
    const pa = parseNaiveDateTime(a);
    const pb = parseNaiveDateTime(b);
    if (!pa && !pb) return 0;
    if (!pa) return 1;
    if (!pb) return -1;
    return Date.UTC(pa.year, pa.month - 1, pa.day, pa.hour, pa.minute, pa.second)
         - Date.UTC(pb.year, pb.month - 1, pb.day, pb.hour, pb.minute, pb.second);
};

const formatDuration = (clockIn, clockOut) => {
    const inParts = parseNaiveDateTime(clockIn);
    const outParts = parseNaiveDateTime(clockOut);
    if (!inParts || !outParts) return "—";
    // Both are wall-clock components in the same configured timezone, so a
    // same-zone UTC diff gives the correct elapsed duration.
    const inMs = Date.UTC(inParts.year, inParts.month - 1, inParts.day, inParts.hour, inParts.minute, inParts.second);
    const outMs = Date.UTC(outParts.year, outParts.month - 1, outParts.day, outParts.hour, outParts.minute, outParts.second);
    const mins = Math.max(0, Math.round((outMs - inMs) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function Attendance() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dateSearch, setDateSearch] = useState("");  // YYYY-MM-DD filter

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(API_URL);
            setRecords(data);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.response?.data?.error || "Unable to load attendance records.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, []);

    const columns = [
        {
            name: "Employee",
            selector: row => `${row.first_name} ${row.last_name}`,
            sortable: true,
            wrap: true,
        },
        {
            name: "Company",
            selector: row => row.company || "—",
            sortable: true,
        },
        {
            name: "Date",
            selector: row => formatDate(row.clock_in),
            sortable: true,
            sortFunction: (a, b) => compareNaiveDateTime(a.clock_in, b.clock_in),
        },
        {
            name: "Clock In",
            selector: row => formatTime(row.clock_in),
            sortable: true,
            sortFunction: (a, b) => compareNaiveDateTime(a.clock_in, b.clock_in),
        },
        {
            name: "Clock Out",
            selector: row => formatTime(row.clock_out),
            sortable: true,
            sortFunction: (a, b) => compareNaiveDateTime(a.clock_out, b.clock_out),
            cell: row => row.clock_out
                ? formatTime(row.clock_out)
                : <span className="badge bg-success">Clocked In</span>,
        },
        {
            name: "Duration",
            selector: row => formatDuration(row.clock_in, row.clock_out),
        },
    ];

    const filtered = records.filter(r => {
        const matchesSearch = `${r.first_name} ${r.last_name} ${r.id_number || ""}`
            .toLowerCase().includes(search.toLowerCase());
        const matchesDate = !dateSearch || String(r.clock_in || "").slice(0, 10) === dateSearch;
        return matchesSearch && matchesDate;
    });

    // Clock-ins / clock-outs per day, most recent 14 days with activity.
    // Each user counts at most once per day, even with multiple records.
    const chartData = useMemo(() => {
        const byDay = {};
        const keyFor = (d) => `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
        const userKey = (r) => r.user_id ?? `${r.first_name} ${r.last_name}`;
        records.forEach(r => {
            const uid = userKey(r);
            const inParts = parseNaiveDateTime(r.clock_in);
            if (inParts) {
                const key = keyFor(inParts);
                byDay[key] = byDay[key] || { ins: new Set(), outs: new Set() };
                byDay[key].ins.add(uid);
            }
            const outParts = parseNaiveDateTime(r.clock_out);
            if (outParts) {
                const key = keyFor(outParts);
                byDay[key] = byDay[key] || { ins: new Set(), outs: new Set() };
                byDay[key].outs.add(uid);
            }
        });
        const days = Object.keys(byDay).sort().slice(-14);
        return {
            labels: days.map(d => formatNaiveDate(`${d} 00:00:00`)),
            datasets: [
                {
                    label: 'Clock Ins',
                    data: days.map(d => byDay[d].ins.size),
                    backgroundColor: '#055d47',
                },
                {
                    label: 'Clock Outs',
                    data: days.map(d => byDay[d].outs.size),
                    backgroundColor: '#6c757d',
                },
            ],
        };
    }, [records]);

    return (
        <div className="container mt-4">
            <div className="card shadow mb-4">
                <div className="card-header main-background text-white">
                    <h5 className="mb-0"><i className="bi bi-bar-chart-line me-2"></i>Clock Ins &amp; Outs (last 14 days)</h5>
                </div>
                <div className="card-body">
                    {chartData.labels.length === 0 ? (
                        <p className="text-muted mb-0">No attendance data yet to chart.</p>
                    ) : (
                        <div className="h-280">
                            <Bar
                                data={chartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'top' } },
                                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="card shadow">
                <div className="card-header main-background text-white d-flex justify-content-between align-items-center">
                    <h3 className="mb-0">Attendance</h3>
                    <button className="btn btn-light btn-sm" onClick={fetchAttendance}>
                        <i className="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>

                <div className="card-body">
                    <div className="d-flex gap-2 mb-3">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search employee..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <input
                            type="date"
                            className="form-control"
                            style={{ maxWidth: "180px" }}
                            value={dateSearch}
                            onChange={(e) => setDateSearch(e.target.value)}
                            title="Filter by date"
                        />
                        {dateSearch && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setDateSearch("")}
                                title="Clear date filter"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        )}
                    </div>

                    <DataTable
                        columns={columns}
                        data={filtered}
                        pagination
                        highlightOnHover
                        striped
                        responsive
                        persistTableHead
                        noDataComponent="No attendance records found."
                        customStyles={customStyles}
                        progressPending={loading}
                        progressComponent={<div className="py-3">Loading attendance...</div>}
                        defaultSortFieldId={3}
                        defaultSortAsc={false}
                    />
                </div>
            </div>
        </div>
    );
}
