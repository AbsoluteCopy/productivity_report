import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DailyReport = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dailyReports, setDailyReports] = useState([]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            fetchRecentReports(parsedUser.id);
        }
    }, []);

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
                                                                <button type="button" className="btn btn-primary">View</button>
                                                                <button type="button" className="btn btn-info">Edit</button>
                                                                <button type="button" className="btn btn-danger">Delete</button>
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
        </div>
    );
};

export default DailyReport;