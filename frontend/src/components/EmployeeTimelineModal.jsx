import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { getCurrentDateInTimezone, formatNaiveTime } from '../utils/dateUtils';

const EmployeeTimelineModal = ({ user, onClose }) => {
    const [date, setDate] = useState(getCurrentDateInTimezone());
    const [tasks, setTasks] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const fetchTimeline = async () => {
            setLoading(true);
            try {
                const [tasksRes, attendanceRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/users/${user.id}/reports/`, { params: { date } }),
                    axios.get(`${API_BASE_URL}/attendance/`, { params: { user_id: user.id, start_date: date, end_date: date } }),
                ]);
                if (cancelled) return;
                const sortedTasks = [...tasksRes.data].sort((a, b) => {
                    if (a.time_added && b.time_added) return new Date(a.time_added) - new Date(b.time_added);
                    if (a.time_added) return -1;
                    if (b.time_added) return 1;
                    return 0;
                });
                setTasks(sortedTasks);
                setAttendance(attendanceRes.data);
            } catch (err) {
                console.error('Error fetching employee timeline:', err);
                if (!cancelled) { setTasks([]); setAttendance([]); }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchTimeline();
        return () => { cancelled = true; };
    }, [user.id, date]);

    const taskLabel = (task) => task.task_category === 'Others' && task.sub_category
        ? task.sub_category
        : task.task_category;

    const displayName = user.displayName || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Employee';

    return (
        <div
            className="modal fade show"
            role="dialog"
            aria-modal="true"
            style={{ display: 'block', backgroundColor: 'rgba(0,0,0,.6)' }}
            tabIndex="-1"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header main-background text-white">
                        <h5 className="modal-title fw-bold">
                            <i className="bi bi-clock-history me-2"></i>
                            {displayName}'s Timeline
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close" />
                    </div>
                    <div className="modal-body bg-light">
                        <input
                            type="date"
                            className="form-control mb-3"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />

                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-success" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="card border-0 shadow-sm mb-3">
                                    <div className="card-body">
                                        <h6 className="fw-bold mb-2 text-green">
                                            <i className="bi bi-door-open me-2"></i>Attendance
                                        </h6>
                                        {attendance.length === 0 ? (
                                            <p className="text-muted mb-0">No clock in/out recorded for this date.</p>
                                        ) : (
                                            <ul className="list-unstyled mb-0">
                                                {attendance.map(a => (
                                                    <li key={a.id} className="d-flex align-items-center gap-2 mb-1">
                                                        <i className="bi bi-record-circle-fill text-success" style={{ fontSize: '0.6rem' }}></i>
                                                        <span>
                                                            {formatNaiveTime(a.clock_in)} {' → '}
                                                            {a.clock_out ? formatNaiveTime(a.clock_out) : <span className="badge bg-success">Still clocked in</span>}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                <div className="card border-0 shadow-sm">
                                    <div className="card-body">
                                        <h6 className="fw-bold mb-3 text-green">
                                            <i className="bi bi-list-task me-2"></i>Tasks
                                        </h6>
                                        {tasks.length === 0 ? (
                                            <p className="text-muted mb-0">No tasks logged for this date.</p>
                                        ) : (
                                            <ul className="list-group list-group-flush">
                                                {tasks.map(task => (
                                                    <li key={task.id} className="list-group-item d-flex justify-content-between align-items-start px-0">
                                                        <div>
                                                            <div className="fw-semibold">{taskLabel(task)}</div>
                                                            <small className="text-muted">
                                                                {task.time_added
                                                                    ? `${formatNaiveTime(task.time_added)} – ${task.time_finished ? formatNaiveTime(task.time_finished) : '…'}`
                                                                    : 'No start/end time recorded'}
                                                            </small>
                                                        </div>
                                                        <span className="badge bg-secondary">{task.number_of_tasks} task{task.number_of_tasks === 1 ? '' : 's'}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeTimelineModal;
