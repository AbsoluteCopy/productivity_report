import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DailyReport = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dailyReports, setDailyReports] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

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

    const fetchAllReports = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/daily-reports/`);
            const data = await response.json();
            setDailyReports(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentReports = async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}/reports/`);
            const data = await response.json();
            setDailyReports(data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };
    const handleView = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/daily-reports/${id}/`);
            const data = await response.json();
            setSelectedReport(data);
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
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!",
        });

        if (!result.isConfirmed) return;

        try {
            const response = await fetch(`${API_BASE_URL}/daily-reports/${id}/`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete report");
            }

            // Remove deleted report from state
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
                                <button type="button" className="btn btn-primary" onClick={() => navigate('/new_data')}>
                                    Add Report
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-12">
                                    {loading ? (
                                        <div className="text-center py-4">
                                            <div className="spinner-border text-success" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                        </div>
                                    ) : dailyReports.length > 0 ? (
                                        <table className='table table-sm table-bordered table-striped'>
                                            <thead>
                                                <tr>
                                                    {isAdmin && <th>User</th>}
                                                    <th>Date</th>
                                                    <th>Category</th>
                                                    <th>Task List</th>
                                                    <th>Task Count</th>
                                                    <th>Time Spent</th>
                                                    <th>Options</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dailyReports.map((report) => (
                                                    <tr className='middle' key={report.id}>
                                                        {isAdmin && <td>{report.user_name}</td>}
                                                        <td>{report.date}</td>
                                                        <td>{report.task_category}</td>
                                                        <td>{report.task_list.join(", ")}</td>
                                                        {report.task_category !== 'Holiday' && report.task_category !== 'PTO' ? (
                                                            <td>{report.number_of_tasks}</td>
                                                        ) : (
                                                            <td></td>
                                                        )}
                                                        {report.task_category !== 'Holiday' && report.task_category !== 'PTO' ? (
                                                            <td>{report.time_spent}</td>
                                                        ) : (
                                                            <td></td>
                                                        )}
                                                        <td>
                                                            <div className="btn-group" role="group">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary btn-sm"
                                                                    onClick={() => handleView(report.id)}
                                                                >
                                                                    View
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-info btn-sm"
                                                                    onClick={() => handleEdit(report.id)}
                                                                >
                                                                    Edit
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-danger btn-sm"
                                                                    onClick={() => handleDelete(report.id)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
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

            {/* Modal for viewing report details */}
            {showModal && selectedReport && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Report Details</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <strong>Date:</strong> {selectedReport.date}
                                </div>
                                <div className="mb-3">
                                    <strong>Category:</strong> {selectedReport.task_category}
                                </div>
                                <div className="mb-3">
                                    <strong>Task List:</strong>
                                    <ul className="mt-2 mb-0">
                                        {selectedReport.task_list && selectedReport.task_list.map((task, index) => (
                                            <li key={index}>{task}</li>
                                        ))}
                                    </ul>
                                </div>
                                {selectedReport.task_category !== 'Holiday' && selectedReport.task_category !== 'PTO' && (
                                    <>
                                        <div className="mb-3">
                                            <strong>Number of Tasks:</strong> {selectedReport.number_of_tasks}
                                        </div>
                                        <div className="mb-3">
                                            <strong>Time Spent (minutes):</strong> {selectedReport.time_spent}
                                        </div>
                                        {selectedReport.meeting_count > 0 && (
                                            <div className="mb-3">
                                                <strong>Meeting Count:</strong> {selectedReport.meeting_count}
                                            </div>
                                        )}
                                    </>
                                )}
                                <div className="mb-3">
                                    <strong>Work Type:</strong> {selectedReport.work_type}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyReport;