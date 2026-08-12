import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import DataTable from 'react-data-table-component';
import { EyeIcon, PencilIcon, TrashIcon } from "../icons/Icons";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const RESTRICTED_CATEGORIES = new Set(["Holiday", "PTO", "Company Event",]);
const ADMIN_ROLES = new Set(["admin", "hr"]);

const DailyReport = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dailyReports, setDailyReports] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [search, setSearch] = useState("");

    const isAdminOrHR = useMemo(() => { return ADMIN_ROLES.has(currentUser?.role); }, [currentUser]);
    const isEmployee = useMemo(() => { return currentUser && !isAdminOrHR; }, [currentUser, isAdminOrHR]);
    const isRestrictedCategory = useCallback((category) => { return RESTRICTED_CATEGORIES.has(category); }, []);

    // Check if date is more than 1 month old
    const isMoreThanOneMonthOld = useCallback((dateString) => { 
        if (!dateString) return false; 
        const reportDate = new Date(dateString); 
        if (Number.isNaN(reportDate.getTime())) { 
            return false; 
        } 
        const oneMonthAgo = new Date(); 
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1); 
        return reportDate < oneMonthAgo; 
    }, []);
    const getDisplayCategory = useCallback((report) => { 
        if (report.task_category === "Others" && report.sub_category) { 
            return `${report.task_category} - ${report.sub_category}`; 
        } 
        return report.task_category || ""; 
    }, []);


    const fetchReports = useCallback(
        async (user) => {
            if (!user) return; setLoading(true);
            try { 
                const endpoint = ADMIN_ROLES.has(user.role) ? `${API_BASE_URL}/daily-reports/` : `${API_BASE_URL}/users/${user.id}/reports/`; 
                const response = await axios.get(endpoint); 
                setDailyReports(Array.isArray(response.data) ? response.data : []); 
            } catch (error) { 
                console.error("Error fetching reports:", error); 
                setDailyReports([]); 
                Swal.fire({ 
                    icon: "error", 
                    title: "Unable to Load Reports", 
                    text: "There was a problem loading the daily reports.", 
                }); 
            } finally { 
                setLoading(false); 
            }
        }, []); 
        useEffect(() => { 
            const loadUserAndReports = async () => { 
                try { 
                    const userData = localStorage.getItem("user"); 
                    if (!userData) { 
                        setLoading(false); 
                        return; 
                    } 
                    const user = JSON.parse(userData); 
                    setCurrentUser(user); 
                    await fetchReports(user); 
                } catch (error) { 
                    console.error("Error loading user:", error); 
                    setLoading(false); 
                    Swal.fire({ 
                        icon: "error", 
                        title: "Session Error", 
                        text: "Unable to load your user information.", 
                    }); 
                } 
            }; 
            loadUserAndReports(); 
        }, [fetchReports]);

    const filteredReports = useMemo(() => {
        const searchText = search.trim().toLowerCase(); 
        if (!searchText) { 
            return dailyReports; 
        } 
        return dailyReports.filter((report) => { 
            const searchableText = [report.user_name, report.date, report.task_category, report.sub_category, Array.isArray(report.task_list) ? report.task_list.join(" ") : report.task_list, report.number_of_tasks, report.time_spent, report.work_type,].filter((value) => value !== null && value !== undefined).join(" ").toLowerCase(); 
            return searchableText.includes(searchText); 
        });
    }, [search, dailyReports]);

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

    const handleEdit = useCallback((id) => { const report = dailyReports.find((item) => item.id === id); if (!report) { return; } if (isMoreThanOneMonthOld(report.date)) { Swal.fire({ icon: "warning", title: "Cannot Edit", text: "Records older than 1 month cannot be edited.", }); return; } navigate(`/new_data?edit=${id}`); }, [dailyReports, isMoreThanOneMonthOld, navigate]); /** * --------------------------------------------------------- * Delete Report * --------------------------------------------------------- */ const handleDeleteReport = useCallback(async (id) => { const report = dailyReports.find((item) => item.id === id); if (!report) { return; } if (isMoreThanOneMonthOld(report.date)) { Swal.fire({ icon: "warning", title: "Cannot Delete", text: "Records older than 1 month cannot be deleted.", }); return; } const result = await Swal.fire({ title: "Delete Report?", text: "This action cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonColor: "#3085d6", cancelButtonColor: "#b44141", confirmButtonText: "Yes, delete it!", reverseButtons: true, }); if (!result.isConfirmed) { return; } try { await axios.delete(`${API_BASE_URL}/daily-reports/${id}/`); setDailyReports((previousReports) => previousReports.filter((item) => item.id !== id)); Swal.fire({ icon: "success", title: "Deleted!", text: "The report has been deleted.", timer: 1500, showConfirmButton: false, }); } catch (error) { console.error("Error deleting report:", error); Swal.fire({ icon: "error", title: "Delete Failed", text: "Unable to delete the report.", }); } }, [dailyReports, isMoreThanOneMonthOld]);

    const columns = useMemo(() => { const baseColumns = []; if (isAdminOrHR) { baseColumns.push({ name: "User", selector: (row) => row.user_name || "", sortable: true, grow: 1.2, }); } baseColumns.push({ name: "Date", selector: (row) => row.date || "", sortable: true, sortFunction: (rowA, rowB) => { return (new Date(rowA.date || 0) - new Date(rowB.date || 0)); }, }, { name: "Category", selector: (row) => getDisplayCategory(row), sortable: true, wrap: true, }, { name: "Task List", selector: (row) => Array.isArray(row.task_list) ? row.task_list.join(", ") : "", wrap: true, grow: 2, }, { name: "Task Count", selector: (row) => { if (isRestrictedCategory(row.task_category)) { return ""; } return row.number_of_tasks > 0 ? row.number_of_tasks : ""; }, sortable: true, center: true, }, { name: "Time Spent", selector: (row) => { if (isRestrictedCategory(row.task_category)) { return ""; } return row.time_spent > 0 ? row.time_spent : ""; }, sortable: true, center: true, }, { name: "Options", cell: (row) => { const isOldRecord = isMoreThanOneMonthOld(row.date); return (<div className="d-flex gap-1"> {/* View */} <button type="button" className="btn btn-primary btn-sm" title="View Report" aria-label="View Report" onClick={() => handleView(row.id)} > <EyeIcon /> </button> {/* Edit */} {isEmployee && (<button type="button" className="btn btn-info btn-sm" title={isOldRecord ? "Cannot edit records older than 1 month" : "Edit Report"} aria-label="Edit Report" onClick={() => handleEdit(row.id)} disabled={isOldRecord} style={{ opacity: isOldRecord ? 0.5 : 1, cursor: isOldRecord ? "not-allowed" : "pointer", }} > <PencilIcon /> </button>)} {/* Delete */} {isEmployee && (<button type="button" className="btn btn-danger btn-sm" title={isOldRecord ? "Cannot delete records older than 1 month" : "Delete Report"} aria-label="Delete Report" onClick={() => handleDeleteReport(row.id)} disabled={isOldRecord} style={{ opacity: isOldRecord ? 0.5 : 1, cursor: isOldRecord ? "not-allowed" : "pointer", }} > <TrashIcon /> </button>)} </div>); }, ignoreRowClick: true, allowOverflow: true, button: true, width: "130px", }); return baseColumns; }, [getDisplayCategory, handleDeleteReport, handleEdit, handleView, isAdminOrHR, isEmployee, isMoreThanOneMonthOld, isRestrictedCategory,]);

    const customStyles = useMemo(() => ({ headCells: { style: { fontWeight: "700", backgroundColor: "#f8f9fa", fontSize: "14px", }, }, cells: { style: { fontSize: "14px", }, }, rows: { style: { minHeight: "55px", }, }, }), []);

    const closeModal = useCallback(() => { setShowModal(false); setSelectedReport(null); }, []);

    useEffect(() => {
        if (!showModal) return;
        const handleEscape = (event) => {
            if (event.key === "Escape") {
                closeModal();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [showModal, closeModal]);

    return (
        <div className="mt-4 px-4">
            <div className="row">
                <div className="col-12">
                    <div className="card shadow-sm"> {/* Header */}
                        <div className="card-header main-background text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <h5 className="mb-0"> Daily Report </h5> <div className="d-flex gap-2"> <button type="button" className="btn btn-secondary" onClick={() => navigate("/view_report")} > View Summary </button> {isEmployee && (
                                <button type="button" className="btn btn-secondary" onClick={() => navigate("/new_data")} > Add Report </button>)}
                            </div>
                        </div> {/* Body */}
                        <div className="card-body"> {/* Search */}
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                                <div className="text-muted small"> {loading ? "Loading reports..." : `${filteredReports.length} report${filteredReports.length !== 1 ? "s" : ""} found`} </div>
                                <input type="search" className="form-control" style={{ maxWidth: "300px", }} placeholder="Search reports..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search reports" />
                            </div>
                            {/* Table */}
                            <DataTable columns={columns} data={filteredReports} customStyles={customStyles} pagination striped responsive highlightOnHover fixedHeader fixedHeaderScrollHeight="600px" defaultSortFieldId="date" defaultSortAsc={false} persistTableHead noDataComponent={<div className="py-4 text-muted"> {search ? "No reports match your search." : "No daily reports found."} </div>} progressPending={loading} progressComponent={<div className="text-center py-4"> <div className="spinner-border text-success" role="status" > <span className="visually-hidden"> Loading... </span> </div> <div className="mt-2 text-muted"> Loading reports... </div> </div>} />
                        </div>
                    </div>
                </div>
            </div>
            {/* Report Details Modal */}
            {showModal && selectedReport && (<ReportDetailsModal report={selectedReport} onClose={closeModal} isRestrictedCategory={isRestrictedCategory} />)}
        </div>);
}; /** * ============================================================= * Report Details Modal * ============================================================= */
const ReportDetailsModal = ({ report, onClose, isRestrictedCategory, }) => {
    const showStatistics = !isRestrictedCategory(report.task_category) && (Number(report.number_of_tasks) > 0 || Number(report.time_spent) > 0 || Number(report.meeting_count) > 0);
    const hasTasks = !isRestrictedCategory(report.task_category) && Array.isArray(report.task_list) && report.task_list.length > 0;
    return (
        <div className="modal fade show" role="dialog" aria-modal="true" aria-labelledby="report-details-title" style={{ display: "block", backgroundColor: "rgba(0,0,0,.6)", }} tabIndex="-1" onMouseDown={(event) => { if (event.target === event.currentTarget) { onClose(); } }} > <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"> <div className="modal-content border-0 shadow-lg"> {/* Header */} <div className="modal-header main-background text-white"> <h5 id="report-details-title" className="modal-title fw-bold" > Report Details </h5> <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close" /> </div> {/* Body */} <div className="modal-body bg-light"> {/* Basic Information */}
            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-6">
                            <small className="text-muted d-block"> Date </small>
                            <div className="fw-semibold"> {report.date || "—"} </div>
                        </div>
                        <div className="col-md-6">
                            <small className="text-muted d-block"> Category </small>
                            <span className="badge bg-primary fs-6"> {report.task_category || "—"} </span>
                        </div>
                        {report.task_category === "Others" && (
                            <div className="col-md-6">
                                <small className="text-muted d-block"> Sub Category </small>
                                <div className="fw-semibold"> {report.sub_category || "—"} </div>
                            </div>
                        )}
                        <div className="col-md-6">
                            <small className="text-muted d-block"> Work Type </small>
                            <span className="badge bg-success fs-6"> {report.work_type || "—"} </span>
                        </div>
                        {report.user_name && (
                            <div className="col-md-6">
                                <small className="text-muted d-block"> Employee </small>
                                <div className="fw-semibold"> {report.user_name} </div>
                            </div>
                        )}
                    </div>
                </div>
            </div> {/* Statistics */}
            {showStatistics && (
                <div className="row g-3 mb-3">
                    {Number(report.number_of_tasks) > 0 && (
                        <div className="col-md-4">
                            <div className="card text-center border-primary shadow-sm h-100">
                                <div className="card-body">
                                    <h3 className="text-primary mb-1"> {report.number_of_tasks} </h3>
                                    <small className="text-muted"> Tasks Completed </small>
                                </div>
                            </div>
                        </div>
                    )}
                    {Number(report.time_spent) > 0 && (
                        <div className="col-md-4">
                            <div className="card text-center border-success shadow-sm h-100">
                                <div className="card-body">
                                    <h3 className="text-success mb-1"> {report.time_spent} </h3>
                                    <small className="text-muted"> Minutes Spent </small>
                                </div>
                            </div>
                        </div>
                    )}
                    {Number(report.meeting_count) > 0 && (
                        <div className="col-md-4">
                            <div className="card text-center border-warning shadow-sm h-100">
                                <div className="card-body">
                                    <h3 className="text-warning mb-1"> {report.meeting_count} </h3>
                                    <small className="text-muted"> Meetings </small>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Task List */}
            {hasTasks && (
                <div className="card shadow-sm border-0">
                    <div className="card-header bg-white">
                        <h6 className="mb-0 fw-bold"> Task List </h6>
                    </div>
                    <div className="card-body p-0">
                        <ul className="list-group list-group-flush">
                            {report.task_list.map((task, index) => (
                                <li key={`${report.id}-task-${index}`} className="list-group-item d-flex align-items-start">
                                    <span className="badge bg-secondary me-3 mt-1"> {index + 1} </span>
                                    <span> {task} </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            {/* No task details */}
            {!showStatistics && !hasTasks && (
                <div className="card border-0 shadow-sm">
                    <div className="card-body text-center text-muted py-4"> No additional task details available. </div>
                </div>
            )}
        </div>
            {/* Footer */}
            <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
        </div>
        </div>
    );
};

export default DailyReport;