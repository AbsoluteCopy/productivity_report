import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import DataTable from 'react-data-table-component';
import { EyeIcon, PencilIcon, TrashIcon } from "../icons/Icons";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DailyReport = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dailyReports, setDailyReports] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const userData = localStorage.getItem("user");

        if (userData) {
            const user = JSON.parse(userData);

            if (user.role === 'admin') {
                setIsAdmin(true);
                fetchAllReports();
            } else {
                setIsAdmin(false);
                fetchRecentReports(user.id);
            }
        }
    }, []);

    const filteredReports = useMemo(() => {
        return dailyReports.filter((report) => {
            const text = search.toLowerCase();

            return (
                report.user_name?.toLowerCase().includes(text) ||
                report.date?.toLowerCase().includes(text) ||
                report.task_category?.toLowerCase().includes(text) ||
                report.task_list?.join(" ").toLowerCase().includes(text) ||
                String(report.number_of_tasks).includes(text) ||
                String(report.time_spent).includes(text)
            );
        });
    }, [search, dailyReports]);

    const fetchAllReports = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/daily-reports/`);
            setDailyReports(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentReports = async (userId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/users/${userId}/reports/`);
            setDailyReports(response.data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = async (id) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/daily-reports/${id}/`);
            setSelectedReport(response.data);
            setShowModal(true);
        } catch (error) {
            console.error('Error fetching report:', error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Unable to fetch report details.",
            });
        }
    };

    const handleEdit = (id) => {
        navigate(`/new_data?edit=${id}`);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "rgb(180, 65, 65)",
            confirmButtonText: "Yes, delete it!",
        });

        if (!result.isConfirmed) return;

        try {
            await axios.delete(`${API_BASE_URL}/daily-reports/${id}/`);

            setDailyReports((prev) =>
                prev.filter((report) => report.id !== id)
            );

            Swal.fire({
                icon: "success",
                title: "Deleted!",
                text: "The report has been deleted.",
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error(error);

            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Unable to delete report.",
            });
        }
    };
    const columns = [
        ...(isAdmin
            ? [
                {
                    name: 'User',
                    selector: row => row.user_name,
                    sortable: true,
                },
            ]
            : []),

        {
            name: 'Date',
            selector: row => row.date,
            sortable: true,
            sortDirection: 'desc',
        },

        {
            name: 'Category',
            selector: row =>
                row.task_category === 'Others'
                    ? `${row.task_category} - ${row.sub_category}`
                    : row.task_category,
            sortable: true,
        },

        {
            name: 'Task List',
            selector: row => row.task_list?.join(", "),
            wrap: true,
        },

        {
            name: 'Task Count',
            selector: row =>
                row.task_category !== 'Holiday' &&
                row.task_category !== 'PTO' &&
                row.task_category !== 'Company Event'
                    ? (row.number_of_tasks !== 0 ? row.number_of_tasks : '')
                    : '',
            sortable: true,
        },

        {
            name: 'Time Spent',
            selector: row =>
                row.task_category !== 'Holiday' &&
                row.task_category !== 'PTO' &&
                row.task_category !== 'Company Event'
                    ? (row.time_spent !== 0 ? row.time_spent : '')
                    : '',
            sortable: true,
        },

        {
            name: 'Options',
            cell: row => (
                <div className="btn-group">
                    <button className="btn btn-primary btn-sm" onClick={() => handleView(row.id)}>
                        <EyeIcon />
                    </button>
                    {!isAdmin && (
                        <button className="btn btn-info btn-sm" onClick={() => handleEdit(row.id)}>
                            <PencilIcon />
                        </button>
                    )}
                    {!isAdmin && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)}>
                            <TrashIcon />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const customStyles = {
        headCells: {
            style: {
                fontWeight: "bold",
                backgroundColor: "#f8f9fa",
            },
        },
        cells: {
            style: {
                fontSize: "14px",
            },
        },
    };
    return (
        <div className="mt-4 px-4">
            <div className="row">
                <div className="col-12">
                    <div className="card shadow-sm">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5>Daily Report</h5>
                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-primary" onClick={() => navigate('/view_report')}>
                                    View Summary
                                </button>
                                {!isAdmin && (
                                    <button type="button" className="btn btn-primary" onClick={() => navigate('/new_data')}>
                                        Add Report
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-12">
                                    <div className="d-flex justify-content-end mb-3">
                                        <input type="text" className="form-control" style={{ maxWidth: "300px" }}
                                            placeholder="Search reports..." value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                    {loading ? (
                                        <div className="text-center py-4">
                                            <div className="spinner-border text-success" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                        </div>
                                    ) : dailyReports.length > 0 ? (
                                        <DataTable
                                            columns={columns}
                                            data={filteredReports}
                                            customStyles={customStyles}
                                            pagination
                                            striped
                                            responsive
                                            highlightOnHover
                                            fixedHeader
                                            reorderableColumns
                                            defaultSortFieldId="date"
                                            defaultSortAsc={false}
                                            noDataComponent="No daily reports found"
                                            progressPending={loading}
                                            progressComponent={
                                                <div className="text-center py-4">
                                                    <div className="spinner-border text-success" role="status">
                                                        <span className="visually-hidden">Loading...</span>
                                                    </div>
                                                </div>
                                            }
                                        />
                                    ) : (
                                        <div className="text-center py-4">
                                            <p>No daily reports found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showModal && selectedReport && (
                <div
                    className="modal fade show"
                    style={{
                        display: "block",
                        backgroundColor: "rgba(0,0,0,.6)",
                    }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content border-0 shadow-lg">

                            <div className="modal-header main-background text-white">
                                <h5 className="modal-title fw-bold">
                                    Report Details
                                </h5>

                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowModal(false)}
                                />
                            </div>

                            <div className="modal-body bg-light">
                                {/* Header Information */}
                                <div className="card border-0 shadow-sm mb-3">
                                    <div className="card-body">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <small className="text-muted d-block">Date</small>
                                                <div className="fw-semibold">{selectedReport.date}</div>
                                            </div>

                                            <div className="col-md-6">
                                                <small className="text-muted d-block">Category</small>
                                                <span className="badge bg-primary fs-6">
                                                    {selectedReport.task_category}
                                                </span>
                                            </div>

                                            {selectedReport.task_category === "Others" && (
                                                <div className="col-md-6">
                                                    <small className="text-muted d-block">Sub Category</small>
                                                    <div className="fw-semibold">
                                                        {selectedReport.sub_category}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="col-md-6">
                                                <small className="text-muted d-block">Work Type</small>
                                                <span className="badge bg-success fs-6">
                                                    {selectedReport.work_type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Statistics */}
                                {selectedReport.task_category !== "Holiday" &&
                                    selectedReport.task_category !== "PTO" &&
                                    selectedReport.task_category !== "Company Event" &&
                                    (
                                        selectedReport.number_of_tasks > 0 ||
                                        selectedReport.time_spent > 0 ||
                                        selectedReport.meeting_count > 0
                                    ) && (
                                        <div className="row g-3 mb-3">

                                            {selectedReport.number_of_tasks > 0 && (
                                                <div className="col-md-4">
                                                    <div className="card text-center border-primary shadow-sm h-100">
                                                        <div className="card-body">
                                                            <h3 className="text-primary mb-1">
                                                                {selectedReport.number_of_tasks}
                                                            </h3>
                                                            <small className="text-muted">
                                                                Tasks Completed
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedReport.time_spent > 0 && (
                                                <div className="col-md-4">
                                                    <div className="card text-center border-success shadow-sm h-100">
                                                        <div className="card-body">
                                                            <h3 className="text-success mb-1">
                                                                {selectedReport.time_spent}
                                                            </h3>
                                                            <small className="text-muted">
                                                                Minutes Spent
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedReport.meeting_count > 0 && (
                                                <div className="col-md-4">
                                                    <div className="card text-center border-warning shadow-sm h-100">
                                                        <div className="card-body">
                                                            <h3 className="text-warning mb-1">
                                                                {selectedReport.meeting_count}
                                                            </h3>
                                                            <small className="text-muted">
                                                                Meetings
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    )}

                                {/* Task List */}
                                {selectedReport.task_category !== "Holiday" &&
                                    selectedReport.task_category !== "PTO" &&
                                    selectedReport.task_category !== "Company Event" &&
                                    selectedReport.task_list?.length > 0 && (
                                        <div className="card shadow-sm border-0">
                                            <div className="card-header bg-white">
                                                <h6 className="mb-0 fw-bold">
                                                    Task List
                                                </h6>
                                            </div>

                                            <div className="card-body p-0">
                                                <ul className="list-group list-group-flush">
                                                    {selectedReport.task_list.map((task, index) => (
                                                        <li
                                                            key={index}
                                                            className="list-group-item d-flex align-items-center"
                                                        >
                                                            <span className="badge bg-secondary me-3">
                                                                {index + 1}
                                                            </span>
                                                            {task}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Close
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyReport;