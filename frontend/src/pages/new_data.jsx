import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import API_BASE_URL from "../config";
import { getCurrentDateInTimezone, parseDateInTimezone, formatDateString } from '../utils/dateUtils';

const CategorySelect = ({ cat, taskCategories, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayLabel = cat.category === 'Others'
        ? (cat.sub_category || 'Others')
        : (cat.category || '');

    const filteredCategories = taskCategories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="position-relative" ref={dropdownRef}>
            <div
                className={`form-select d-flex justify-content-between align-items-center ${!displayLabel ? 'text-muted' : ''}`}
                style={{
                    backgroundColor: '#fff',
                    backgroundImage: 'none',
                    minHeight: '38px',
                    borderColor: isOpen ? '#065d48' : '#dee2e6',
                    boxShadow: isOpen ? '0 0 0 0.25rem rgba(6, 93, 72, 0.25)' : 'none',
                    userSelect: 'none'
                }}
                onClick={() => setIsOpen(prev => !prev)}
            >
                <span className="text-truncate me-2" style={{ color: displayLabel ? '#212529' : '#6c757d' }}>
                    {displayLabel || 'Select a category'}
                </span>
                <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} text-muted`} style={{ fontSize: '0.85rem' }}></i>
            </div>

            {/* Hidden input for HTML5 form required validation */}
            <input
                type="text"
                value={cat.category || ''}
                required
                tabIndex={-1}
                aria-hidden="true"
                style={{ opacity: 0, position: 'absolute', height: 0, width: 0, pointerEvents: 'none' }}
                onChange={() => { }}
            />

            {isOpen && (
                <div
                    className="dropdown-menu show shadow-lg w-100 p-2 mt-1 pointer"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1050,
                        borderRadius: '8px',
                        border: '1px solid #ced4da',
                        backgroundColor: '#ffffff'
                    }}
                >
                    {taskCategories.length > 5 && (
                        <div className="mb-2">
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Search category..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    )}

                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredCategories.map(category => {
                            const isSelected = cat.category === category.name;
                            return (
                                <div
                                    key={category.id}
                                    className={`dropdown-item rounded px-3 py-2 d-flex justify-content-between align-items-center ${isSelected ? 'active text-white' : ''}`}
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? '#065d48' : undefined,
                                        fontSize: '0.9rem'
                                    }}
                                    onClick={() => {
                                        onSelect(category.name);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    <span>{category.name}</span>
                                    <div className="d-flex align-items-center gap-2">
                                        {category.default_time ? (
                                            <span
                                                className="badge rounded-pill"
                                                style={{
                                                    backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(6, 93, 72, 0.1)',
                                                    color: isSelected ? '#ffffff' : '#065d48',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                <i className="bi bi-clock me-1"></i>{category.default_time} min{category.default_time > 1 ? 's' : ''}
                                            </span>
                                        ) : null}
                                        {isSelected && <i className="bi bi-check-lg"></i>}
                                    </div>
                                </div>
                            );
                        })}

                        {filteredCategories.length === 0 && searchTerm && (
                            <div className="text-muted small px-3 py-2 text-center">
                                No matching categories
                            </div>
                        )}

                        {cat.category && !taskCategories.some(c => c.name === cat.category) && !['Meeting', 'Others'].includes(cat.category) && (
                            <div
                                className="dropdown-item rounded px-3 py-2 d-flex justify-content-between align-items-center active text-white"
                                style={{ cursor: 'pointer', backgroundColor: '#065d48', fontSize: '0.9rem' }}
                                onClick={() => {
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                            >
                                <span>{cat.category}</span>
                                <i className="bi bi-check-lg ms-2"></i>
                            </div>
                        )}

                        <hr className="my-1 dropdown-divider" />

                        {(!searchTerm || 'meeting'.includes(searchTerm.toLowerCase())) && (
                            <div
                                className={`pointer dropdown-item rounded px-3 py-2 d-flex justify-content-between align-items-center ${cat.category === 'Meeting' ? 'active text-white' : ''}`}
                                style={{
                                    backgroundColor: cat.category === 'Meeting' ? '#065d48' : undefined,
                                    fontSize: '0.9rem'
                                }}
                                onClick={() => {
                                    onSelect('Meeting');
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                            >
                                <span><i className="bi bi-people me-2"></i>Meeting</span>
                                {cat.category === 'Meeting' && <i className="bi bi-check-lg ms-2"></i>}
                            </div>
                        )}

                        {(!searchTerm || 'others'.includes(searchTerm.toLowerCase()) || (cat.sub_category && cat.sub_category.toLowerCase().includes(searchTerm.toLowerCase()))) && (
                            <div
                                className={`dropdown-item rounded px-3 py-2 d-flex justify-content-between align-items-center ${cat.category === 'Others' ? 'active text-white' : ''}`}
                                style={{
                                    cursor: 'pointer',
                                    backgroundColor: cat.category === 'Others' ? '#065d48' : undefined,
                                    fontSize: '0.9rem'
                                }}
                                onClick={() => {
                                    onSelect('Others');
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                            >
                                <span>
                                    <i className="bi bi-plus-circle me-2"></i>
                                    {cat.category === 'Others' && cat.sub_category ? cat.sub_category : 'Others (Custom Task...)'}
                                </span>
                                {cat.category === 'Others' && <i className="bi bi-check-lg ms-2"></i>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const NewData = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const editId = searchParams.get('edit');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingUserName, setEditingUserName] = useState('');
    const [formData, setFormData] = useState({
        date: getCurrentDateInTimezone(),
        work_type: 'Working'
    });
    const [categories, setCategories] = useState([
        { id: 1, category: '', tasks: [], currentTask: '', timeSpent: '', meetingCount: 0, work_type: '', sub_category: '', meetingTitle: '', hasTimeSpent: false }
    ]);
    const [taskCategories, setTaskCategories] = useState([]);
    const [existingDayReports, setExistingDayReports] = useState([]);
    const taskListRefs = useRef({});

    const setTaskListRef = useCallback((id, el) => {
        if (el) {
            taskListRefs.current[id] = el;
        }
    }, []);

    const fetchExistingDayReports = useCallback(async (date, targetUserId) => {
        if (!date) return;
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const uid = targetUserId || user?.id;
            if (!uid) return;

            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/users/${uid}/reports/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                params: { date }
            });
            const reports = Array.isArray(res.data) ? res.data : [];
            const dayReports = reports.filter(r => {
                const rDate = r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : r.date) : '';
                return rDate === date;
            });
            setExistingDayReports(dayReports);
        } catch (err) {
            console.error("Error fetching day's existing reports:", err);
            setExistingDayReports([]);
        }
    }, []);
    const RUN_KEY = 'task_run_v1';
    const [run, setRun] = useState(() => {
        try { const r = JSON.parse(localStorage.getItem(RUN_KEY)); return r && r.queue ? r : null; }
        catch { return null; }
    });
    const [now, setNow] = useState(Date.now());
    const [description, setDescription] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [saving, setSaving] = useState(false);
    const warnedRef = useRef(null);

    // survive page refresh (timer uses a start timestamp, so it stays accurate)
    useEffect(() => {
        if (run) localStorage.setItem(RUN_KEY, JSON.stringify(run));
        else localStorage.removeItem(RUN_KEY);
    }, [run]);

    const timerActive = !!(run && !run.finished && run.startedAt);
    useEffect(() => {
        if (!timerActive) return;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [timerActive, run?.index]);

    const elapsedSec = timerActive ? Math.max(0, Math.floor((now - run.startedAt) / 1000)) : 0;
    const current = run && !run.finished ? run.queue[run.index] : null;
    const overtime = !!(current && current.expectedSeconds > 0 && elapsedSec > current.expectedSeconds);

    // one-time warning when going beyond (time per task × number of tasks)
    useEffect(() => {
        if (!overtime) return;
        const key = `${run.index}-${run.queue[run.index].label}`;
        if (warnedRef.current === key) return;
        warnedRef.current = key;
        Swal.fire({
            toast: true, position: 'top-end', icon: 'warning', timer: 7000, showConfirmButton: false,
            title: 'Time exceeded',
            text: `You've gone past the allotted ${fmtClock(current.expectedSeconds)} for "${current.label}".`
        });
    }, [overtime]); // eslint-disable-line

    const fmtClock = (s) => {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':');
    };

    const compareText = (actual, expected) => {
        if (!expected) return { text: 'No time target set', cls: 'text-muted' };
        const pct = Math.round((Math.abs(actual - expected) / expected) * 100);
        if (actual <= expected) return { text: `${pct}% faster than selected time`, cls: 'text-success' };
        return { text: `${pct}% slower than selected time`, cls: 'text-danger' };
    };

    const startNext = () => setRun(prev => ({ ...prev, startedAt: Date.now() }));

    const cancelRun = async () => {
        const r = await Swal.fire({
            title: 'Cancel remaining tasks?',
            text: 'Categories already ended are saved. The current timer and unstarted categories will be discarded.',
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, cancel'
        });
        if (r.isConfirmed) { setRun(null); setDescription(''); setAttachment(null); }
    };

    const endTask = async () => {

        const actualSeconds = Math.max(
            1,
            Math.floor((Date.now() - run.startedAt) / 1000)
        );

        const result = await Swal.fire({
            title: 'Finish Task?',
            text: `This task took ${Math.floor(actualSeconds / 60)} minute(s). Do you want to end it?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, End it',
            cancelButtonText: 'Continue Working',
            reverseButtons: true,
            confirmButtonColor: '#28a745',
        });

        if (!result.isConfirmed) {
            return;
        }

        const cur = run.queue[run.index];
        const timeAdded = new Date(run.startedAt).toISOString();
        const timeFinished = new Date().toISOString();
        setSaving(true);

        try {
            const fd = new FormData();

            [
                'user',
                'date',
                'task_category',
                'sub_category',
                'work_type',
                'number_of_tasks',
                'time_spent',
                'meeting_count'
            ].forEach(k => fd.append(k, cur.payload[k] ?? ''));

            fd.append('task_list', JSON.stringify(cur.payload.task_list));
            fd.append('actual_time', actualSeconds);
            fd.append('description', description.trim());
            fd.append('time_added', timeAdded);
            fd.append('time_finished', timeFinished);

            if (attachment) {
                fd.append('attachment', attachment);
            }

            await axios.post(`${API_BASE_URL}/daily-reports/`, fd);

            const results = [
                ...run.results,
                {
                    label: cur.label,
                    expectedSeconds: cur.expectedSeconds,
                    actualSeconds,
                    timeAdded: timeAdded,
                    timeFinished: timeFinished
                }
            ];

            const isLast = run.index + 1 >= run.queue.length;

            setDescription('');
            setAttachment(null);

            setRun(
                isLast
                    ? { ...run, results, startedAt: null, finished: true }
                    : {
                        ...run,
                        results,
                        index: run.index + 1,
                        startedAt: null
                    }
            );

            Swal.fire({
                title: 'Saved!',
                text: 'Task has been completed successfully.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error:', error);

            Swal.fire({
                title: 'Could not save',
                text:
                    error.response?.data?.error ||
                    'Error saving this task. Your timer is still running, please try again.',
                icon: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        const uid = formData.user_id || user?.id;
        if (formData.date && uid) {
            fetchExistingDayReports(formData.date, uid);
        }
    }, [formData.date, formData.user_id, fetchExistingDayReports]);

    const priorTotals = useMemo(() => {
        let priorTasks = 0;
        let priorMinutes = 0;
        let priorActual = 0;

        existingDayReports.forEach((r) => {
            if (editId && String(r.id) === String(editId)) {
                return;
            }

            const isLeave = ['Holiday', 'PTO', 'Company Event'].includes(r.task_category);
            if (isLeave) return;

            if (r.task_category === 'Meeting') {
                const mCount = Number(r.meeting_count || r.number_of_tasks || 1);
                const mTime = Number(r.time_spent || 0);
                priorMinutes += mCount * mTime;
                priorTasks += mCount;
            } else {
                const count = Number(r.number_of_tasks || (Array.isArray(r.task_list) ? r.task_list.length : 0));
                const time = Number(r.time_spent || 0);
                const actual = Number(r.actual_time || 0);
                priorTasks += count;
                priorMinutes += count > 0 ? (count * time) : time;
                priorActual += actual;
            }
        });

        return { priorTasks, priorMinutes, priorActual };
    }, [existingDayReports, editId]);

    const dailyTotals = useMemo(() => {
        let currentTasks = 0;
        let currentMinutes = 0;

        categories.forEach((cat) => {
            if (cat.category === 'Meeting') {
                const mCount = Number(cat.meetingCount) || 1;
                const mTime = Number(cat.timeSpent) || 0;
                currentMinutes += mCount * mTime;
                currentTasks += mCount;
            } else if (cat.category === 'Others' && cat.hasTimeSpent) {
                currentTasks += (cat.tasks || []).length;
            } else {
                const count = (cat.tasks || []).length;
                const perTask = Number(cat.timeSpent) || 0;
                currentTasks += count;
                currentMinutes += count * perTask;
            }
        });

        const tasksCount = priorTotals.priorTasks + currentTasks;
        const minutes = priorTotals.priorMinutes + currentMinutes;
        const targetMinutes = 450;
        const totalHours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        const percent = Math.min(Math.round((minutes / targetMinutes) * 100), 999);

        const actualMinutes = priorTotals.priorActual + currentMinutes;
        const totalActualHours = Math.floor(actualMinutes / 60);
        const remainingActualMins = actualMinutes % 60;
        const actualPercent = Math.min(Math.round((actualMinutes / targetMinutes) * 100), 999);

        return {
            tasksCount,
            minutes,
            actualMinutes,
            totalHours,
            remainingMins,
            percent,
            targetMinutes,
            priorTasks: priorTotals.priorTasks,
            priorMinutes: priorTotals.priorMinutes,
            priorActual: priorTotals.priorActual,
            currentTasks,
            currentMinutes,
            actualPercent,
            totalActualHours,
            remainingActualMins,
        };
    }, [categories, priorTotals]);

    // Copy from previous day
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [previousReports, setPreviousReports] = useState([]);
    const [selectedCopyIds, setSelectedCopyIds] = useState(new Set());
    const [copyLoading, setCopyLoading] = useState(false);
    const [copyFromDate, setCopyFromDate] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            setFormData(prev => ({
                ...prev,
                user_id: user.id
            }));
        }

        if (editId) {
            setIsEditMode(true);
            fetchReportForEdit(editId);
        }
    }, [editId]);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;

            // Fetch current user data to get their task_list
            const userRes = await axios.get(`${API_BASE_URL}/users/me/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const userData = userRes.data;
            const userTaskList = Array.isArray(userData.task_list) ? userData.task_list : [];

            // Fetch all task categories
            const categoriesRes = await axios.get(`${API_BASE_URL}/task-categories/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const allCategories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];

            // If admin, hr, supervisor, or user has no specific task list assigned, allow all categories
            if (userData.role === 'admin' || userData.role === 'hr' || userData.role === 'supervisor' || userTaskList.length === 0) {
                setTaskCategories(allCategories);
            } else {
                const filteredCategories = allCategories.filter(category =>
                    userTaskList.includes(category.id)
                );
                // If the user's assigned categories don't match any active categories (e.g. stale/deleted IDs), fallback to all categories
                setTaskCategories(filteredCategories.length > 0 ? filteredCategories : allCategories);
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.response?.data?.detail || err.response?.data?.error || "Something went wrong.",
            });
        }
    };

    const fetchReportForEdit = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/daily-reports/${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data;

            setFormData({
                date: data.date,
                work_type: data.work_type,
                user_id: data.user,
                holiday_name: (data.task_category === 'Holiday' || data.task_category === 'Company Event')
                    ? (data.task_list?.[0] || '')
                    : ''
            });

            setEditingUserName(data.user_name || '');
            if (data.date && data.user) {
                fetchExistingDayReports(data.date, data.user);
            }

            if (data.work_type === 'Working') {
                const actualMins = (data.actual_time != null && data.actual_time !== '')
                    ? Number((Number(data.actual_time) / 60).toFixed(2))
                    : '';
                setCategories([
                    {
                        id: 1,
                        category: data.task_category,
                        sub_category: data.sub_category || '',
                        tasks: Array.isArray(data.task_list) ? data.task_list : [],
                        currentTask: '',
                        timeSpent: (data.time_spent !== undefined && data.time_spent !== null) ? String(data.time_spent) : '',
                        actualTime: actualMins,
                        meetingCount: data.meeting_count || 0,
                        meetingTitle: data.task_category === 'Meeting' && data.task_list?.[0] ? data.task_list[0] : '',
                        hasTimeSpent: data.task_category === 'Others' && data.time_spent === 0
                    }
                ]);
            }
        } catch (error) {
            console.error('Error fetching report for edit:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Unable to load selected report data for editing.',
            });
            navigate('/daily_report');
            return;
        }
    };

    const isWeekend = (dateString) => {
        // Parse as a calendar date in the configured timezone
        const date = parseDateInTimezone(dateString);

        const weekday = date.toLocaleDateString("en-US", {
            weekday: "short",
            timeZone: import.meta.env.VITE_DEFAULT_TIMEZONE || 'UTC'
        });

        return weekday === "Sat" || weekday === "Sun";
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'date' && isWeekend(value)) {
            Swal.fire({
                title: 'Weekend Warning',
                text: 'The selected date is a weekend. Do you want to continue?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, continue',
                cancelButtonText: 'No, change date',
                confirmButtonColor: '#065d48',
                cancelButtonColor: '#d33',
            }).then((result) => {
                if (result.isConfirmed) {
                    setFormData(prev => ({
                        ...prev,
                        [name]: value
                    }));
                }
            });
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const promptForOtherName = async (id, currentVal = '') => {
        const { value: taskName, isConfirmed } = await Swal.fire({
            title: 'Name This Task / Category',
            input: 'text',
            inputValue: currentVal,
            inputLabel: 'Please enter the name of this task or category:',
            inputPlaceholder: 'e.g. Special Project, Inventory Audit, etc.',
            showCancelButton: true,
            confirmButtonColor: '#065d48',
            confirmButtonText: 'Save',
            cancelButtonColor: '#6c757d',
            inputValidator: (val) => {
                if (!val || !val.trim()) {
                    return 'Task / Category name cannot be empty!';
                }
            }
        });

        if (isConfirmed && taskName && taskName.trim()) {
            const trimmed = taskName.trim();
            setCategories(prev => prev.map(cat =>
                cat.id === id ? { ...cat, category: 'Others', sub_category: trimmed } : cat
            ));
            return trimmed;
        }
        return null;
    };

    const handleCategoryChange = async (id, value) => {
        if (value === 'Others') {
            const currentSub = categories.find(c => c.id === id)?.sub_category || '';
            const newName = await promptForOtherName(id, currentSub);
            if (!newName && !currentSub) {
                // If cancelled and no existing custom name, do not change category
                return;
            }
            return;
        }

        const matchedCategory = taskCategories.find(c => c.name === value);
        const defaultTime = matchedCategory?.default_time;

        setCategories(prev => prev.map(cat => {
            if (cat.id === id) {
                return {
                    ...cat,
                    category: value,
                    sub_category: '',
                    timeSpent: (defaultTime !== null && defaultTime !== undefined && defaultTime !== '')
                        ? String(defaultTime)
                        : cat.timeSpent
                };
            }
            return cat;
        }));
    };

    const getEffectiveCatName = (c) => {
        if (!c) return '';
        if (c.category === 'Others' && c.sub_category && c.sub_category.trim()) {
            return c.sub_category.trim();
        }
        return (c.category || '').trim();
    };

    const addTask = async (id, taskValue) => {
        if (!taskValue || !taskValue.trim()) return;
        const newTask = taskValue.trim();

        const targetCat = categories.find(cat => cat.id === id);
        if (!targetCat) return;

        if (!targetCat.category) {
            Swal.fire({
                icon: 'warning',
                title: 'Category Required',
                text: 'Please select a Task Category before adding tasks.',
                confirmButtonColor: '#065d48',
                confirmButtonText: 'OK'
            });
            return;
        }

        const targetCatName = getEffectiveCatName(targetCat);

        // 1. Check duplicate in current form state (across rows sharing this category)
        const sameCatRows = categories.filter(c =>
            c.id === id || (targetCatName && getEffectiveCatName(c).toLowerCase() === targetCatName.toLowerCase())
        );
        const allTasksInCat = sameCatRows.flatMap(c => c.tasks);

        const isLocalDuplicate = allTasksInCat.some(
            t => t.trim().toLowerCase() === newTask.toLowerCase()
        );

        if (isLocalDuplicate) {
            Swal.fire({
                icon: 'warning',
                title: 'Duplicate Task',
                text: `"${newTask}" has already been added for "${targetCatName}" in this form.`,
                confirmButtonColor: '#065d48',
                confirmButtonText: 'OK'
            });
            return;
        }

        // 2. Check system-wide database duplicate across all users and dates
        if (targetCat.category && !['Meeting', 'PTO', 'Holiday', 'Company Event'].includes(targetCat.category)) {
            try {
                const token = localStorage.getItem('token');
                const checkRes = await axios.get(`${API_BASE_URL}/daily-reports/check-duplicate/`, {
                    params: {
                        task: newTask,
                        category: targetCat.category,
                        sub_category: targetCat.sub_category || undefined,
                        exclude_id: editId || undefined
                    },
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });

                if (checkRes.data && checkRes.data.duplicate) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Duplicate Task (System-Wide)',
                        text: `"${newTask}" was already submitted for category "${checkRes.data.category}" by ${checkRes.data.submitted_by} on ${checkRes.data.date}. Duplicates are not allowed across the system.`,
                        confirmButtonColor: '#065d48',
                        confirmButtonText: 'OK'
                    });
                    return;
                }
            } catch (err) {
                console.error('Error checking duplicate task with server:', err);
            }
        }

        // Add task to category and clear currentTask
        setCategories(prev => prev.map(cat => {
            if (cat.id === id) {
                return {
                    ...cat,
                    tasks: [...cat.tasks, newTask],
                    currentTask: ''
                };
            }
            return cat;
        }));

        // Scroll to bottom of task list after DOM update
        requestAnimationFrame(() => {
            const taskListRef = taskListRefs.current[id];
            if (taskListRef) {
                taskListRef.scrollTop = taskListRef.scrollHeight;
            }
        });
    };

    const handleTaskKeyDown = (e, id) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.target.value && e.target.value.trim()) {
                addTask(id, e.target.value);
            }
        }
    };

    const handleTaskChange = (id, value) => {
        setCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, currentTask: value } : cat
        ));
    };

    const removeTask = (categoryId, taskIndex) => {
        setCategories(prev => prev.map(cat => {
            if (cat.id === categoryId) {
                const newTasks = cat.tasks.filter((_, i) => i !== taskIndex);
                return { ...cat, tasks: newTasks };
            }
            return cat;
        }));
    };

    const validateMinutes = (val) => {
        if (val === '' || val === null || val === undefined) return { valid: false, error: 'Value cannot be empty.' };
        const strVal = String(val).trim();
        if (/^0\d+/.test(strVal)) {
            return { valid: false, error: `Invalid number "${strVal}". Numbers cannot start with a leading zero (e.g., use "20" instead of "${strVal}").` };
        }
        const num = Number(strVal);
        if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
            return { valid: false, error: `"${strVal}" is not a valid positive whole number of minutes.` };
        }
        return { valid: true, value: strVal };
    };

    const handleTimeSpentChange = (id, value) => {
        setCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, timeSpent: value } : cat
        ));
    };

    const handleTimeSpentBlur = (id, value) => {
        if (!value || typeof value !== 'string') return;
        const trimmed = value.trim();
        if (/^0\d+/.test(trimmed)) {
            const sanitized = String(parseInt(trimmed, 10));
            setCategories(prev => prev.map(cat =>
                cat.id === id ? { ...cat, timeSpent: sanitized } : cat
            ));
        }
    };

    const handleMeetingTitleChange = (id, value) => {
        setCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, meetingTitle: value } : cat
        ));
    };

    const handleMeetingCountChange = (id, value) => {
        setCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, meetingCount: parseInt(value) || 0 } : cat
        ));
    };

    const handleSubCategoryChange = (id, value) => {
        setCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, sub_category: value } : cat
        ));
    };

    const addCategory = () => {
        setCategories(prev => [
            ...prev,
            { id: Date.now(), category: '', tasks: [], currentTask: '', timeSpent: '', meetingCount: 0, sub_category: '', meetingTitle: '', hasTimeSpent: false }
        ]);
    };

    const removeCategory = (id) => {
        if (categories.length > 1) {
            const categoryToRemove = categories.find(cat => cat.id === id);

            if (categoryToRemove && categoryToRemove.tasks && categoryToRemove.tasks.length > 0) {
                Swal.fire({
                    title: 'Are you sure?',
                    text: 'This category has tasks. Do you want to remove it?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#065d48',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes, remove it'
                }).then((result) => {
                    if (result.isConfirmed) {
                        setCategories(prev => prev.filter(cat => cat.id !== id));
                    }
                });
            } else {
                setCategories(prev => prev.filter(cat => cat.id !== id));
            }
        }
    };

    const resetForm = () => {
        const user = JSON.parse(localStorage.getItem('user'));

        setFormData({
            date: getCurrentDateInTimezone(),
            work_type: 'Working',
            holiday_name: '',
            user_id: user?.id
        });

        setCategories([
            {
                id: 1,
                category: '',
                tasks: [],
                currentTask: '',
                timeSpent: '',
                meetingCount: 0,
                sub_category: '',
                meetingTitle: '',
                hasTimeSpent: false
            }
        ]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Handle PTO, Holiday, and Company Event submissions
        if (formData.work_type === 'PTO' || formData.work_type === 'Holiday' || formData.work_type === 'Company Event') {
            const report = {
                user: formData.user_id,
                date: formData.date,
                task_category: formData.work_type,
                task_list: formData.work_type === 'PTO' ? ['PTO'] : [formData.holiday_name],
                number_of_tasks: 0,
                time_spent: 0,
                meeting_count: 0,
                work_type: formData.work_type,
                sub_category: formData.sub_category
            };

            try {
                const url = isEditMode ? `${API_BASE_URL}/daily-reports/${editId}/` : `${API_BASE_URL}/daily-reports/`;
                const request = isEditMode ? axios.put : axios.post;

                await request(url, report);

                Swal.fire({
                    title: 'Success',
                    text: `${formData.work_type} ${isEditMode ? 'updated' : 'submitted'} successfully!`,
                    icon: 'success',
                });
                if (!isEditMode) {
                    resetForm();
                }
            } catch (error) {
                console.error('Error:', error);
                const errMsg = error.response?.data?.error || error.response?.data?.detail || `Error ${isEditMode ? 'updating' : 'submitting'} report. Please try again.`;
                Swal.fire({
                    title: 'Submission Error',
                    text: errMsg,
                    icon: 'error',
                });
            }
            return;
        }

        // Handle Working submissions
        for (let cat of categories) {
            if (cat.category === 'Meeting') {
                const check = validateMinutes(cat.timeSpent);
                if (!check.valid) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Invalid Time Spent',
                        text: `Please enter a valid time in minutes for the Meeting category. ${check.error}`,
                        confirmButtonColor: '#065d48',
                        confirmButtonText: 'Edit Input'
                    });
                    return;
                }
            } else if (cat.category === 'Others' && cat.hasTimeSpent) {
                // "No Time Spent" checked for Others, skip validation
                continue;
            } else if (cat.category) {
                const check = validateMinutes(cat.timeSpent);
                if (!check.valid) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Invalid Time Spent',
                        text: `Please enter a valid time in minutes for ${cat.category}: ${check.error}`,
                        confirmButtonColor: '#065d48',
                        confirmButtonText: 'Edit Input'
                    });
                    return;
                }
            }
        }

        // Process any pending text typed in currentTask that was not added via Enter/Add button
        const processedCategories = [];
        for (let cat of categories) {
            let catTasks = [...cat.tasks];
            if (cat.currentTask && cat.currentTask.trim()) {
                const pendingTask = cat.currentTask.trim();
                if (cat.category && !['Meeting', 'PTO', 'Holiday', 'Company Event'].includes(cat.category)) {
                    // Check duplicate in local form
                    const isLocalDup = catTasks.some(t => t.trim().toLowerCase() === pendingTask.toLowerCase());
                    if (isLocalDup) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Duplicate Task Detected',
                            text: `"${pendingTask}" in category "${getEffectiveCatName(cat)}" is already added. Please remove it before submitting.`,
                            confirmButtonColor: '#065d48',
                            confirmButtonText: 'OK'
                        });
                        return;
                    }

                    // Check system-wide duplicate
                    try {
                        const token = localStorage.getItem('token');
                        const checkRes = await axios.get(`${API_BASE_URL}/daily-reports/check-duplicate/`, {
                            params: {
                                task: pendingTask,
                                category: cat.category,
                                sub_category: cat.sub_category || undefined,
                                exclude_id: editId || undefined
                            },
                            headers: token ? { Authorization: `Bearer ${token}` } : {}
                        });
                        if (checkRes.data && checkRes.data.duplicate) {
                            Swal.fire({
                                icon: 'warning',
                                title: 'Duplicate Task Detected (System-Wide)',
                                text: `Cannot submit: "${pendingTask}" was already submitted for category "${checkRes.data.category}" by ${checkRes.data.submitted_by} on ${checkRes.data.date}. Duplicates are not allowed across the system.`,
                                confirmButtonColor: '#065d48',
                                confirmButtonText: 'OK'
                            });
                            return;
                        }
                    } catch (err) {
                        console.error('Error checking duplicate in handleSubmit:', err);
                    }

                    catTasks.push(pendingTask);
                }
            }
            processedCategories.push({ ...cat, tasks: catTasks });
        }

        // Check for duplicate tasks across rows of the same category
        const catTaskMap = {};
        for (let cat of processedCategories) {
            if (cat.category && !['Meeting', 'PTO', 'Holiday', 'Company Event'].includes(cat.category)) {
                const catKey = getEffectiveCatName(cat).toLowerCase();
                if (!catTaskMap[catKey]) catTaskMap[catKey] = new Set();
                for (let t of cat.tasks) {
                    const taskKey = t.trim().toLowerCase();
                    if (catTaskMap[catKey].has(taskKey)) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Duplicate Task Detected',
                            text: `Duplicate task "${t}" found in category "${getEffectiveCatName(cat)}". Please remove the duplicate before submitting.`,
                            confirmButtonColor: '#065d48',
                            confirmButtonText: 'OK'
                        });
                        return;
                    }
                    catTaskMap[catKey].add(taskKey);
                }
            }
        }

        // System-wide duplicate check for all tasks in all categories
        for (let cat of processedCategories) {
            if (cat.category && !['Meeting', 'PTO', 'Holiday', 'Company Event'].includes(cat.category)) {
                for (let t of cat.tasks) {
                    try {
                        const token = localStorage.getItem('token');
                        const checkRes = await axios.get(`${API_BASE_URL}/daily-reports/check-duplicate/`, {
                            params: {
                                task: t,
                                category: cat.category,
                                sub_category: cat.sub_category || undefined,
                                exclude_id: editId || undefined
                            },
                            headers: token ? { Authorization: `Bearer ${token}` } : {}
                        });
                        if (checkRes.data && checkRes.data.duplicate) {
                            Swal.fire({
                                icon: 'warning',
                                title: 'Duplicate Task Detected (System-Wide)',
                                text: `Cannot submit: "${t}" was already submitted for category "${checkRes.data.category}" by ${checkRes.data.submitted_by} on ${checkRes.data.date}. Duplicates are not allowed across the system.`,
                                confirmButtonColor: '#065d48',
                                confirmButtonText: 'OK'
                            });
                            return;
                        }
                    } catch (err) {
                        console.error('Error checking duplicate in handleSubmit:', err);
                    }
                }
            }
        }

        // Ensure every working category has at least one task (unless Others with "No Time Spent")
        for (let cat of processedCategories) {
            if (cat.category && cat.category !== 'Meeting') {
                if (cat.category === 'Others' && cat.hasTimeSpent) {
                    // No Time Spent checked for Others, allowed without tasks
                    continue;
                }
                if (cat.tasks.length === 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Tasks Required',
                        text: `Please add at least one valid task for "${cat.category}". Tasks cannot be empty.`,
                        confirmButtonColor: '#065d48',
                        confirmButtonText: 'OK'
                    });
                    return;
                }
            }
        }

        console.log(processedCategories);
        const reports = processedCategories
            .filter(cat =>
                cat.category &&
                (
                    cat.tasks.length > 0 ||
                    (cat.category === 'Others' && cat.hasTimeSpent) ||
                    (cat.category === 'Meeting' && cat.meetingTitle.trim() !== '')
                )
            )
            .map(cat => ({
                user: formData.user_id,
                date: formData.date,
                task_category: cat.category,
                task_list: cat.category === 'Meeting'
                    ? [cat.meetingTitle]
                    : cat.tasks,
                number_of_tasks: cat.category === 'Meeting'
                    ? (cat.meetingTitle.trim() ? 1 : 0)
                    : cat.tasks.length,
                time_spent: cat.hasTimeSpent && cat.category === 'Others'
                    ? 0
                    : parseInt(cat.timeSpent, 10) || 0,
                meeting_count: cat.category === 'Meeting'
                    ? (cat.meetingCount || 0)
                    : 0,
                work_type: 'Working',
                sub_category: cat.sub_category,
                actual_time: (cat.actualTime !== undefined && cat.actualTime !== null && cat.actualTime !== '' && !isNaN(Number(cat.actualTime)))
                    ? Math.round(Number(cat.actualTime) * 60)
                    : (cat.actualTime === '' ? null : undefined)
            }));
        if (reports.length === 0) {
            console.log(reports);
            Swal.fire({
                title: 'Error',
                text: 'Please add at least one category with tasks',
                icon: 'error',
            });
            return;
        }

        if (formData.work_type === 'Working' && dailyTotals.minutes > 600) {
            const confirmResult = await Swal.fire({
                title: 'High Work Hours Warning',
                html: `This entry brings the total logged time for this day to <b>${dailyTotals.totalHours} hrs ${dailyTotals.remainingMins} mins (${dailyTotals.minutes} mins)</b>.<br/><br/>Please confirm if <b>Time per Task</b> was entered correctly (not total minutes for the whole day).<br/><br/>Do you want to proceed and submit anyway?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#065d48',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, Submit',
                cancelButtonText: 'Let me double check'
            });
            if (!confirmResult.isConfirmed) {
                return;
            }
        }

        if (!isEditMode) {
            const queue = reports.map(r => {
                const isMeeting = r.task_category === 'Meeting';
                const units = isMeeting ? Math.max(Number(r.meeting_count) || 1, 1) : r.number_of_tasks;
                return {
                    payload: r,
                    label: r.sub_category && r.task_category === 'Others' ? r.sub_category : r.task_category,
                    expectedSeconds: (Number(r.time_spent) || 0) * units * 60   // time per task × number of tasks
                };
            });
            warnedRef.current = null;
            setRun({ queue, index: 0, startedAt: Date.now(), results: [], finished: false });
            return;
        }

        try {
            await axios.put(`${API_BASE_URL}/daily-reports/${editId}/`, reports[0]);
            if (reports.length > 1) {
                await Promise.all(reports.slice(1).map(report => axios.post(`${API_BASE_URL}/daily-reports/`, report)));
            }
            await Swal.fire({ title: 'Success', text: 'Daily report updated successfully!', icon: 'success' });
            const fromPage = searchParams.get('from');
            navigate(fromPage === 'view_report' ? '/view_report' : '/daily_report');
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                title: 'Submission Error',
                text: error.response?.data?.error || error.response?.data?.detail || 'Error updating report. Please try again.',
                icon: 'error',
            });
        }
    };

    // All historical working reports, grouped by date — loaded once when modal opens
    const [allPastReports, setAllPastReports] = useState({});
    const [availableDates, setAvailableDates] = useState([]);
    const [selectedCopyDate, setSelectedCopyDate] = useState('');

    const fetchPreviousReports = async () => {
        setCopyLoading(true);
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await axios.get(`${API_BASE_URL}/daily-reports/`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { user_id: user.id }
            });

            const allReports = Array.isArray(response.data) ? response.data : [];
            // Only working-day reports, exclude the current form date
            const workingReports = allReports.filter(r =>
                r.work_type === 'Working' && r.date < formData.date
            );

            if (workingReports.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'No Previous Reports',
                    text: 'No previous working day reports found to copy from.',
                    confirmButtonColor: '#065d48',
                });
                setCopyLoading(false);
                return;
            }

            // Group by date
            const grouped = workingReports.reduce((acc, r) => {
                if (!acc[r.date]) acc[r.date] = [];
                acc[r.date].push(r);
                return acc;
            }, {});

            // Sort dates descending (most recent first)
            const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

            const mostRecentDate = sortedDates[0];
            const reportsForDate = grouped[mostRecentDate];

            setAllPastReports(grouped);
            setAvailableDates(sortedDates);
            setSelectedCopyDate(mostRecentDate);
            setPreviousReports(reportsForDate);
            setCopyFromDate(formatDateLabel(mostRecentDate));
            setSelectedCopyIds(new Set(reportsForDate.map(r => r.id)));
            setShowCopyModal(true);
        } catch (err) {
            console.error('Error fetching previous reports:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not load previous reports. Please try again.',
                confirmButtonColor: '#065d48',
            });
        } finally {
            setCopyLoading(false);
        }
    };

    const formatDateLabel = (dateStr) => {
        return formatDateString(dateStr, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    const handleCopyDateChange = (newDate) => {
        setSelectedCopyDate(newDate);
        const reports = allPastReports[newDate] || [];
        setPreviousReports(reports);
        setCopyFromDate(formatDateLabel(newDate));
        setSelectedCopyIds(new Set(reports.map(r => r.id)));
    };

    const toggleCopySelection = (id) => {
        setSelectedCopyIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedCopyIds.size === previousReports.length) {
            setSelectedCopyIds(new Set());
        } else {
            setSelectedCopyIds(new Set(previousReports.map(r => r.id)));
        }
    };

    const handleCopySelected = () => {
        const toCopy = previousReports.filter(r => selectedCopyIds.has(r.id));
        if (toCopy.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Nothing selected', text: 'Please select at least one category to copy.', confirmButtonColor: '#065d48' });
            return;
        }

        const newCats = toCopy.map((report, i) => ({
            id: Date.now() + i,
            category: report.task_category,
            sub_category: report.sub_category || '',
            tasks: Array.isArray(report.task_list) ? report.task_list.filter(t => t) : [],
            currentTask: '',
            timeSpent: String(report.time_spent || ''),
            meetingCount: report.meeting_count || 0,
            meetingTitle: report.task_category === 'Meeting' && report.task_list?.[0] ? report.task_list[0] : '',
            hasTimeSpent: report.task_category === 'Others' && report.time_spent === 0
        }));

        setCategories(prev => {
            // If the only existing row is blank, replace it; otherwise append
            const isDefault = prev.length === 1 && !prev[0].category && prev[0].tasks.length === 0;
            return isDefault ? newCats : [...prev, ...newCats];
        });

        setShowCopyModal(false);
    };

    const handleBack = () => {
        const fromPage = searchParams.get('from');
        navigate(fromPage === 'view_report' ? '/view_report' : '/daily_report');
    };

    const handleDeleteReport = async () => {
        if (!editId) return;
        const confirmResult = await Swal.fire({
            title: 'Delete this Report?',
            text: 'Are you sure you want to permanently delete this report? This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel'
        });

        if (!confirmResult.isConfirmed) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/daily-reports/${editId}/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            await Swal.fire({
                title: 'Deleted!',
                text: 'The report has been deleted.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            const fromPage = searchParams.get('from');
            navigate(fromPage === 'view_report' ? '/view_report' : '/daily_report');
        } catch (err) {
            console.error('Error deleting report:', err);
            Swal.fire({
                title: 'Error',
                text: err.response?.data?.error || 'Failed to delete report.',
                icon: 'error'
            });
        }
    };
    if (run && !editId) {
        // ---- Final summary ----
        if (run.finished) {
            const tExp = run.results.reduce((s, r) => s + (r.expectedSeconds || 0), 0);
            const tAct = run.results.filter(r => r.expectedSeconds > 0).reduce((s, r) => s + r.actualSeconds, 0);
            const overall = compareText(tAct, tExp);
            return (
                <div className="container py-4">
                    <div className="card shadow-sm mx-auto" style={{ maxWidth: 720 }}>
                        <div className="card-body p-4">
                            <h3 className="fw-bold text-center mb-3" style={{ color: '#065d48' }}>All Tasks Completed</h3>
                            <ul className="list-group mb-3">
                                {run.results.map((r, i) => {
                                    const c = compareText(r.actualSeconds, r.expectedSeconds);
                                    const startTime = r.timeAdded ? new Date(r.timeAdded).toLocaleTimeString() : '—';
                                    const endTime = r.timeFinished ? new Date(r.timeFinished).toLocaleTimeString() : '—';
                                    return (
                                        <li key={i} className="list-group-item d-flex justify-content-between align-items-start">
                                            <div>
                                                <div className="fw-semibold">{r.label}</div>
                                                <small className="text-muted">
                                                    Selected: {r.expectedSeconds ? fmtClock(r.expectedSeconds) : '—'} • Actual: {fmtClock(r.actualSeconds)}
                                                </small>
                                                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                                                    <i className="bi bi-clock-history me-1"></i>Started: {startTime}
                                                    <span className="mx-2">•</span>
                                                    <i className="bi bi-clock me-1"></i>Finished: {endTime}
                                                </div>
                                            </div>
                                            <span className={`fw-semibold ${c.cls}`}>{c.text}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                            <div className={`text-center fs-5 fw-bold mb-3 ${overall.cls}`}>Overall: {overall.text}</div>
                            <div className="row">
                                <div className="col-6">
                                    <button className="btn btn-success w-100 fw-bold"
                                        style={{ backgroundColor: '#065d48', borderColor: '#065d48' }}
                                        onClick={() => { setRun(null); resetForm(); navigate('/daily_report'); }}>
                                        Done
                                    </button>
                                </div>
                                <div className="col-6">
                                    <button className="btn btn-outline-success w-100 fw-bold"
                                        onClick={() => { setRun(null); resetForm(); navigate('/new_data'); }}>
                                        New Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // ---- Active category ----
        const cur = run.queue[run.index];
        const p = cur.payload;
        const running = !!run.startedAt;
        const pct = cur.expectedSeconds ? Math.min((elapsedSec / cur.expectedSeconds) * 100, 100) : 0;
        return (
            <div className="container py-4 px-5">
                <div className="row g-4 px-5 mx-5 justify-content-center">

                    {/* Main Card */}
                    <div className="col-lg-8">
                        <div className="card shadow-sm h-100">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span className="badge bg-secondary">Category {run.index + 1} of {run.queue.length}</span>
                                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={cancelRun} disabled={saving}>Cancel</button>
                                </div>

                                <h3 className="fw-bold mb-2" style={{ color: '#065d48' }}>{cur.label}</h3>

                                <div className="d-flex justify-content-center my-4">
                                    {(() => {
                                        const size = 220;
                                        const strokeWidth = 12;
                                        const radius = (size - strokeWidth) / 2;
                                        const circumference = 2 * Math.PI * radius;

                                        const progress = Math.min(pct, 100);
                                        const offset =
                                            circumference - (progress / 100) * circumference;

                                        return (
                                            <div style={{ position: 'relative', width: size, height: size }}>
                                                <svg width={size} height={size}>
                                                    {/* Background Circle */}
                                                    <circle
                                                        cx={size / 2}
                                                        cy={size / 2}
                                                        r={radius}
                                                        fill="none"
                                                        stroke="#e5e7eb"
                                                        strokeWidth={strokeWidth}
                                                    />

                                                    {/* Progress Circle */}
                                                    <circle
                                                        cx={size / 2}
                                                        cy={size / 2}
                                                        r={radius}
                                                        fill="none"
                                                        stroke={overtime ? "#b14c4c" : "#065d48"}
                                                        strokeWidth={strokeWidth}
                                                        strokeLinecap="round"
                                                        strokeDasharray={circumference}
                                                        strokeDashoffset={offset}
                                                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                                                        style={{
                                                            transition: "stroke-dashoffset 0.5s ease"
                                                        }}
                                                    />
                                                </svg>

                                                {/* Timer Text */}
                                                <div
                                                    className="position-absolute top-50 start-50 translate-middle text-center"
                                                    style={{ width: "100%" }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: "2.8rem",
                                                            fontWeight: 700,
                                                            fontVariantNumeric: "tabular-nums",
                                                            color: overtime ? "#b14c4c" : "#065d48",
                                                        }}
                                                    >
                                                        {fmtClock(running ? elapsedSec : 0)}
                                                    </div>

                                                    <small className="text-muted">
                                                        {overtime ? "Beyond planned duration" : "On track"}
                                                    </small>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {overtime && (
                                    <div
                                        className="rounded-3 p-3 mb-3"
                                        style={{
                                            backgroundColor: "#fffbeb",
                                            border: "1px solid #fde68a"
                                        }}
                                    >
                                        <div className="fw-semibold text-warning-emphasis">
                                            Target duration reached
                                        </div>

                                        <small className="text-muted">
                                            You've spent {fmtClock(elapsedSec - cur.expectedSeconds)} &nbsp;
                                            beyond the originally planned duration on this task.
                                            Feel free to continue working and finish when ready.
                                        </small>
                                    </div>
                                )}

                                {p.task_category === 'Meeting' ? (
                                    <p className="mb-3">{p.task_list[0]}</p>
                                ) : (
                                    <ul className="list-group mb-3">
                                        {p.task_list.map((t, i) => <li key={i} className="list-group-item py-2">{t}</li>)}
                                    </ul>
                                )}

                                {running ? (
                                    <>
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold" style={{ color: '#065d48' }}>Description</label>
                                            <textarea className="form-control" rows={3} value={description}
                                                onChange={e => setDescription(e.target.value)}
                                                placeholder="What did you do for this task?" />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold" style={{ color: '#065d48' }}>Attachment (optional, max 10 MB)</label>
                                            <input type="file" className="form-control"
                                                onChange={e => setAttachment(e.target.files[0] || null)} />
                                        </div>
                                        <button className="btn btn-danger w-100 fw-bold py-2" onClick={endTask} disabled={saving}>
                                            {saving ? 'Saving...' : <><i className="bi bi-stop-circle me-1"></i>End Task</>}
                                        </button>
                                    </>
                                ) : (
                                    <button className="btn btn-success w-100 fw-bold py-2" onClick={startNext}
                                        style={{ backgroundColor: '#065d48', borderColor: '#065d48' }}>
                                        <i className="bi bi-play-circle me-1"></i>Start {cur.label}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side Card */}
                    <div className="col-lg-4">
                        <div className="card shadow-sm h-100">
                            <div className="card-body">

                                <h5 className="fw-bold mb-3">
                                    <i className="bi bi-bar-chart me-2"></i>
                                    Task Details
                                </h5>

                                <div className="mb-3">
                                    <small className="text-muted d-block">
                                        Date
                                    </small>
                                    <div className="fw-semibold">
                                        {p.date}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <small className="text-muted d-block">
                                        Current Time
                                    </small>
                                    <div className="fw-semibold">
                                        {new Date().toLocaleTimeString()}
                                    </div>
                                </div>
                                
                                <div className="mb-3">
                                    <small className="text-muted d-block">
                                        Time Started
                                    </small>
                                    <div className="fw-semibold">
                                        {new Date(run.startedAt).toLocaleTimeString()}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <small className="text-muted d-block">
                                        Elapsed Time
                                    </small>
                                    <div className="fw-semibold">
                                        {fmtClock(elapsedSec)}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <small className="text-muted d-block">
                                        Target Time
                                    </small>
                                    <div className="fw-semibold">
                                        {cur.expectedSeconds
                                            ? fmtClock(cur.expectedSeconds)
                                            : "N/A"}
                                    </div>
                                </div>
                                {!overtime && (
                                    <div className="mb-3">
                                        <small className="text-muted d-block">
                                            Time Remaining
                                        </small>
                                        <div className="fw-semibold">
                                            {`${fmtClock(cur.expectedSeconds - elapsedSec)}`}
                                        </div>
                                    </div>

                                )}
                                <div>
                                    <small className="text-muted d-block">
                                        Status
                                    </small>
                                    <span
                                        className={`badge ${overtime
                                            ? "bg-danger"
                                            : "bg-success"
                                            }`}
                                    >
                                        {overtime ? "Beyond planned duration" : "On Track"}
                                    </span>
                                </div>

                            </div>
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div className="container py-4" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
            <div className="row justify-content-center">
                <div className="col-md-12 col-lg-12">
                    <div className="card shadow-sm">
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <button type="button" className="btn btn-outline-secondary" onClick={handleBack}>
                                    ← Back
                                </button>

                                <h2 className="text-center fw-bold mb-0" style={{ color: '#065d48' }}>
                                    {isEditMode ? 'Edit Daily Report' : 'New Daily Report'}
                                </h2>

                                <div>
                                    {isEditMode && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={handleDeleteReport}
                                            title="Delete this report"
                                        >
                                            <i className="bi bi-trash me-1"></i>Delete Report
                                        </button>
                                    )}
                                </div>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="row mb-4">
                                    <div className="mb-3 col-lg-6">
                                        <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                            Date *
                                        </label>
                                        <input type="date" name="date" value={formData.date}
                                            onChange={handleChange} required
                                            className="form-control" disabled={isEditMode}
                                        />
                                    </div>
                                    <div className="col-lg-6 col-sm-12">
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                Option *
                                            </label>
                                            <br />
                                            <div className="form-check form-check-inline">
                                                <input className="form-check-input" type="radio" name="work_type" id="working" value="Working" checked={!formData.work_type || formData.work_type === "Working"} onChange={handleChange} required disabled={isEditMode} />
                                                <label className="form-check-label" htmlFor="working">Working</label>
                                            </div>
                                            <div className="form-check form-check-inline">
                                                <input className="form-check-input" type="radio" name="work_type" id="pto" value="PTO" checked={formData.work_type === "PTO"} onChange={handleChange} required disabled={isEditMode} />
                                                <label className="form-check-label" htmlFor="pto">PTO</label>
                                            </div>
                                            <div className="form-check form-check-inline">
                                                <input className="form-check-input" type="radio" name="work_type" id="holiday" value="Holiday" checked={formData.work_type === "Holiday"} onChange={handleChange} required disabled={isEditMode} />
                                                <label className="form-check-label" htmlFor="holiday">Holiday</label>
                                            </div>
                                            <div className="form-check form-check-inline">
                                                <input className="form-check-input" type="radio" name="work_type" id="company_event" value="Company Event" checked={formData.work_type === "Company Event"} onChange={handleChange} required disabled={isEditMode} />
                                                <label className="form-check-label" htmlFor="company_event">Company Event</label>
                                            </div>
                                        </div>
                                    </div>
                                    {(formData.work_type === "Holiday" || formData.work_type === "Company Event") && (
                                        <div className="col-12">
                                            <div className="col-12">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                        {formData.work_type === "Company Event" ? "Event Name *" : "Holiday Name *"}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="holiday_name"
                                                        value={formData.holiday_name}
                                                        onChange={handleChange}
                                                        className="form-control"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                        </div>
                                    )}
                                </div>
                                {formData.work_type === 'Working' && (
                                    <>
                                        <div
                                            className="card mb-4 border-0 shadow-sm"
                                            style={{
                                                background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                                                border: '1px solid #bbf7d0',
                                                borderRadius: '12px',
                                            }}
                                        >
                                            <div className="card-body p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
                                                {/* Left: Circular Progress Ring + Hours Display */}
                                                <div className="d-flex align-items-center gap-3">
                                                    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                                                        <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                                                            <circle
                                                                cx="28"
                                                                cy="28"
                                                                r="22"
                                                                stroke="#e2e8f0"
                                                                strokeWidth="5"
                                                                fill="transparent"
                                                            />
                                                            <circle
                                                                cx="28"
                                                                cy="28"
                                                                r="22"
                                                                stroke={
                                                                    dailyTotals.minutes > 600
                                                                        ? '#ef4444'
                                                                        : dailyTotals.minutes >= 450
                                                                            ? '#10b981'
                                                                            : '#065d48'
                                                                }
                                                                strokeWidth="5"
                                                                strokeDasharray={138.23}
                                                                strokeDashoffset={
                                                                    138.23 - (138.23 * Math.min(dailyTotals.minutes / dailyTotals.targetMinutes, 1))
                                                                }
                                                                strokeLinecap="round"
                                                                fill="transparent"
                                                                style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
                                                            />
                                                        </svg>
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                width: '56px',
                                                                height: '56px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 700,
                                                                color: dailyTotals.minutes > 600 ? '#dc2626' : '#065d48',
                                                            }}
                                                        >
                                                            {dailyTotals.percent}%
                                                        </div>
                                                    </div>

                                                    <div>
                                                        {isEditMode && editingUserName && (
                                                            <div className="badge bg-light text-success border border-success-subtle px-2 py-1 mb-1 rounded-pill" style={{ fontSize: '0.72rem' }}>
                                                                <i className="bi bi-person-fill me-1"></i>Employee: {editingUserName}
                                                            </div>
                                                        )}
                                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                                            <h5 className="mb-0 fw-bold" style={{ color: dailyTotals.minutes > 600 ? '#dc2626' : '#065d48' }}>
                                                                {dailyTotals.totalHours > 0 ? `${dailyTotals.totalHours} hr${dailyTotals.totalHours > 1 ? 's' : ''} ` : ''}
                                                                {dailyTotals.remainingMins} min{dailyTotals.remainingMins !== 1 ? 's' : ''}
                                                            </h5>
                                                            {dailyTotals.minutes >= 450 && dailyTotals.minutes <= 510 && (
                                                                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill" style={{ fontSize: '0.72rem' }}>
                                                                    <i className="bi bi-check-circle-fill me-1"></i>Full Day (7.5h)
                                                                </span>
                                                            )}
                                                            {dailyTotals.minutes > 600 && (
                                                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 rounded-pill" style={{ fontSize: '0.72rem' }}>
                                                                    <i className="bi bi-exclamation-triangle-fill me-1"></i>Exceeds 7.5h (Check Time per Task)
                                                                </span>
                                                            )}
                                                        </div>
                                                        <small className="text-muted">
                                                            {dailyTotals.priorMinutes > 0 ? (
                                                                <>
                                                                    <span className="fw-semibold text-dark">{dailyTotals.priorMinutes}m</span> already logged today + <span className="fw-semibold text-dark">{dailyTotals.currentMinutes}m</span> this entry &bull; Target: 7.5 hrs
                                                                </>
                                                            ) : (
                                                                `Total Work Hours for ${formData.date} • Target: 7.5 hrs (450 mins)`
                                                            )}
                                                        </small>
                                                    </div>
                                                </div>

                                                {/* Right: Tasks Count */}
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="text-end">
                                                        <div className="fw-bold fs-5" style={{ color: '#065d48' }}>
                                                            {dailyTotals.tasksCount}
                                                        </div>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            {dailyTotals.priorTasks > 0
                                                                ? `${dailyTotals.priorTasks} logged + ${dailyTotals.currentTasks} new`
                                                                : 'Total Tasks'}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {isEditMode && formData.work_type === 'Working' && categories[0] && (
                                            <div className="card mb-4 border-0 shadow-sm" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                                <div className="card-body p-3">
                                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', backgroundColor: 'rgba(6, 93, 72, 0.1)', color: '#065d48' }}>
                                                                <i className="bi bi-clock-history fs-5"></i>
                                                            </div>
                                                            <div>
                                                                <h6 className="mb-0 fw-bold text-dark">Time Comparison Overview</h6>
                                                                <small className="text-muted">Target estimate vs recorded real-time</small>
                                                            </div>
                                                        </div>
                                                        <div className="d-flex align-items-center gap-3 flex-wrap">
                                                            <div className="px-3 py-1 bg-white rounded-3 border text-center">
                                                                <small className="text-muted d-block" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Est. Total</small>
                                                                <span className="fw-bold" style={{ color: '#065d48' }}>
                                                                    {categories.reduce((sum, c) => sum + (c.category === 'Meeting' ? (Number(c.meetingCount) || 1) * (Number(c.timeSpent) || 0) : (c.tasks?.length || 0) * (Number(c.timeSpent) || 0)), 0)} mins
                                                                </span>
                                                            </div>
                                                            <div className="px-3 py-1 bg-white rounded-3 border text-center">
                                                                <small className="text-muted d-block" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actual Time</small>
                                                                <span className="fw-bold text-dark">
                                                                    {categories[0].actualTime !== '' && categories[0].actualTime !== null && categories[0].actualTime !== undefined
                                                                        ? `${categories[0].actualTime} mins`
                                                                        : 'Untimed'}
                                                                </span>
                                                            </div>
                                                            {categories[0].actualTime !== '' && categories[0].actualTime !== null && categories[0].actualTime !== undefined && (
                                                                (() => {
                                                                    const est = categories.reduce((sum, c) => sum + (c.category === 'Meeting' ? (Number(c.meetingCount) || 1) * (Number(c.timeSpent) || 0) : (c.tasks?.length || 0) * (Number(c.timeSpent) || 0)), 0);
                                                                    const act = Number(categories[0].actualTime) || 0;
                                                                    if (est <= 0 || act <= 0) return null;
                                                                    const diff = est - act;
                                                                    const isFaster = diff >= 0;
                                                                    const pct = Math.round((Math.abs(diff) / est) * 100);
                                                                    return (
                                                                        <div className={`px-3 py-1 rounded-3 border text-center ${isFaster ? 'bg-success-subtle text-success border-success-subtle' : 'bg-danger-subtle text-danger border-danger-subtle'}`}>
                                                                            <small className="d-block" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Variance</small>
                                                                            <span className="fw-bold">
                                                                                {isFaster ? `${diff.toFixed(1)}m faster (${pct}%)` : `${Math.abs(diff).toFixed(1)}m over (${pct}%)`}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })()
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {categories.map((cat, index) => {
                                            const taskCount = Array.isArray(cat.tasks) ? cat.tasks.length : 0;
                                            const timePerTask = Number(cat.timeSpent) || 0;
                                            const totalCatEstMinutes = cat.category === 'Meeting'
                                                ? (Number(cat.meetingCount) || 1) * timePerTask
                                                : taskCount * timePerTask;
                                            const catActualMinutes = (cat.actualTime !== undefined && cat.actualTime !== null && cat.actualTime !== '')
                                                ? Number(cat.actualTime)
                                                : null;

                                            return (
                                                <div key={cat.id} className="card mb-3" style={{ border: '2px solid #e0e0e0' }}>
                                                    <div className="card-body">
                                                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                                <h5 className="card-title mb-0" style={{ color: '#065d48' }}>
                                                                    Category {index + 1}
                                                                </h5>
                                                                {cat.category && cat.category !== 'Meeting' && (
                                                                    <span className="badge rounded-pill" style={{ backgroundColor: 'rgba(6, 93, 72, 0.1)', color: '#065d48', fontSize: '0.78rem', fontWeight: 600 }}>
                                                                        <i className="bi bi-clock me-1"></i>Est. Target: {totalCatEstMinutes} mins {taskCount > 0 && `(${timePerTask}m × ${taskCount} task${taskCount > 1 ? 's' : ''})`}
                                                                    </span>
                                                                )}
                                                                {cat.category === 'Meeting' && (
                                                                    <span className="badge rounded-pill" style={{ backgroundColor: 'rgba(6, 93, 72, 0.1)', color: '#065d48', fontSize: '0.78rem', fontWeight: 600 }}>
                                                                        <i className="bi bi-clock me-1"></i>Meeting Est.: {totalCatEstMinutes} mins
                                                                    </span>
                                                                )}
                                                                {isEditMode && catActualMinutes !== null && (
                                                                    <span className="badge rounded-pill bg-light text-dark border" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                                                        <i className="bi bi-stopwatch me-1 text-success"></i>Actual: {catActualMinutes} mins
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {categories.length > 1 && (
                                                                <button type="button"
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    onClick={() => removeCategory(cat.id)}
                                                                >
                                                                    <i className="bi bi-trash me-1"></i>Remove Category
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="row">
                                                            <div className="mb-3 col-lg-6">
                                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                                    <label className="form-label fw-semibold mb-0" style={{ color: '#065d48' }}>
                                                                        Task Category *
                                                                    </label>
                                                                    {cat.category === 'Others' && cat.sub_category && (
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-link p-0 text-decoration-none fw-semibold"
                                                                            style={{ color: '#065d48', fontSize: '0.82rem' }}
                                                                            onClick={() => promptForOtherName(cat.id, cat.sub_category)}
                                                                        >
                                                                            <i className="bi bi-pencil-square me-1"></i>Rename
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <CategorySelect
                                                                    cat={cat}
                                                                    taskCategories={taskCategories}
                                                                    onSelect={(val) => handleCategoryChange(cat.id, val)}
                                                                />
                                                            </div>

                                                            {cat.category !== 'Meeting' && (
                                                                <div className="mb-3 col-lg-6">
                                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                                        <div className="d-flex align-items-center">
                                                                            <label className="form-label fw-semibold mb-0" style={{ color: '#065d48' }}>
                                                                                Time per Task (Minutes) *
                                                                            </label>
                                                                            {(() => {
                                                                                const matched = taskCategories.find(c => c.name === cat.category);
                                                                                if (matched?.default_time) {
                                                                                    return (
                                                                                        <span className="badge rounded-pill ms-2" style={{ backgroundColor: 'rgba(6, 93, 72, 0.1)', color: '#065d48', fontSize: '0.75rem', fontWeight: '600' }}>
                                                                                            <i className="bi bi-clock me-1"></i>Standard: {matched.default_time} min{matched.default_time > 1 ? 's' : ''}
                                                                                        </span>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        </div>
                                                                        {cat.category === 'Others' && (
                                                                            <div className="form-check mb-0">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={cat.hasTimeSpent || false}
                                                                                    onChange={(e) => {
                                                                                        setCategories(prev => prev.map(c =>
                                                                                            c.id === cat.id ? { ...c, hasTimeSpent: e.target.checked } : c
                                                                                        ));
                                                                                    }}
                                                                                    className="form-check-input"
                                                                                    id={`noTimeSpent-${cat.id}`}
                                                                                />
                                                                                <label className="form-check-label small fw-semibold text-muted" htmlFor={`noTimeSpent-${cat.id}`}>
                                                                                    No Time Spent
                                                                                </label>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="d-flex gap-2 align-items-center">
                                                                        <select
                                                                            value={
                                                                                ['15', '30', '45', '60', '90', '120'].includes(String(cat.timeSpent))
                                                                                    ? String(cat.timeSpent)
                                                                                    : (cat.timeSpent !== '' && cat.timeSpent !== null && cat.timeSpent !== undefined ? 'custom' : '')
                                                                            }
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val === 'custom') {
                                                                                    if (['15', '30', '45', '60', '90', '120'].includes(String(cat.timeSpent))) {
                                                                                        handleTimeSpentChange(cat.id, '');
                                                                                    }
                                                                                } else {
                                                                                    handleTimeSpentChange(cat.id, val);
                                                                                }
                                                                            }}
                                                                            className="form-select"
                                                                            style={{ minWidth: '150px' }}
                                                                            disabled={cat.category === 'Others' && cat.hasTimeSpent}
                                                                            required={!(cat.category === 'Others' && cat.hasTimeSpent)}
                                                                        >
                                                                            <option value="">Select Time</option>
                                                                            <option value="15">15 mins</option>
                                                                            <option value="30">30 mins</option>
                                                                            <option value="45">45 mins</option>
                                                                            <option value="60">60 mins</option>
                                                                            <option value="90">90 mins</option>
                                                                            <option value="120">120 mins</option>
                                                                            <option value="custom">Custom Time...</option>
                                                                        </select>
                                                                        {(!['15', '30', '45', '60', '90', '120'].includes(String(cat.timeSpent)) || cat.timeSpent === '') && (
                                                                            <input
                                                                                type="number"
                                                                                value={cat.timeSpent}
                                                                                onChange={(e) => handleTimeSpentChange(cat.id, e.target.value)}
                                                                                onBlur={(e) => handleTimeSpentBlur(cat.id, e.target.value)}
                                                                                min="0"
                                                                                step="1"
                                                                                placeholder="Enter minutes"
                                                                                className="form-control"
                                                                                disabled={cat.category === 'Others' && cat.hasTimeSpent}
                                                                                required={!(cat.category === 'Others' && cat.hasTimeSpent)}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {isEditMode && (
                                                                <div className="mb-3 col-lg-6">
                                                                    <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                        Actual Time Spent (Minutes)
                                                                    </label>
                                                                    <div className="input-group">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            className="form-control"
                                                                            value={cat.actualTime ?? ''}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, actualTime: val } : c));
                                                                            }}
                                                                            placeholder="e.g. 25"
                                                                        />
                                                                        <span className="input-group-text bg-light text-muted">mins</span>
                                                                    </div>
                                                                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                                        Recorded timer time. You can edit this if the timer was stopped late.
                                                                    </small>
                                                                </div>
                                                            )}
                                                            {cat.category === 'Meeting' && (
                                                                <>
                                                                    <div className="mb-3 col-lg-6">
                                                                        <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                            Meeting Duration (Minutes) *
                                                                        </label>
                                                                        <div className="d-flex gap-2 align-items-center">
                                                                            <select
                                                                                value={
                                                                                    ['15', '30', '45', '60', '90', '120'].includes(String(cat.timeSpent))
                                                                                        ? String(cat.timeSpent)
                                                                                        : (cat.timeSpent !== '' && cat.timeSpent !== null && cat.timeSpent !== undefined ? 'custom' : '')
                                                                                }
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    if (val === 'custom') {
                                                                                        if (['15', '30', '45', '60', '90', '120'].includes(String(cat.timeSpent))) {
                                                                                            handleTimeSpentChange(cat.id, '');
                                                                                        }
                                                                                    } else {
                                                                                        handleTimeSpentChange(cat.id, val);
                                                                                    }
                                                                                }}
                                                                                className="form-select"
                                                                                style={{ minWidth: '150px' }}
                                                                                required
                                                                            >
                                                                                <option value="">Select Time</option>
                                                                                <option value="15">15 mins</option>
                                                                                <option value="30">30 mins</option>
                                                                                <option value="45">45 mins</option>
                                                                                <option value="60">60 mins</option>
                                                                                <option value="90">90 mins</option>
                                                                                <option value="120">120 mins</option>
                                                                                <option value="custom">Custom Time...</option>
                                                                            </select>
                                                                            {(!['15', '30', '45', '60', '90', '120'].includes(String(cat.timeSpent)) || cat.timeSpent === '') && (
                                                                                <input
                                                                                    type="number"
                                                                                    value={cat.timeSpent}
                                                                                    onChange={(e) => handleTimeSpentChange(cat.id, e.target.value)}
                                                                                    onBlur={(e) => handleTimeSpentBlur(cat.id, e.target.value)}
                                                                                    min="0"
                                                                                    step="1"
                                                                                    placeholder="Enter minutes"
                                                                                    className="form-control"
                                                                                    required
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="mb-3 col-lg-12">
                                                                        <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                            Meeting Title
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={cat.meetingTitle}
                                                                            onChange={(e) => handleMeetingTitleChange(cat.id, e.target.value)}
                                                                            placeholder="Enter meeting title"
                                                                            className="form-control"
                                                                            name='meeting_title'
                                                                        />
                                                                    </div>
                                                                </>
                                                            )}
                                                            {cat.category !== 'Meeting' && (
                                                                <>
                                                                    <div className="mb-3 col-lg-9">
                                                                        <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                            Task List *
                                                                        </label>
                                                                        <div className="input-group">
                                                                            <input
                                                                                type="text"
                                                                                value={cat.currentTask}
                                                                                onChange={(e) => handleTaskChange(cat.id, e.target.value)}
                                                                                onKeyDown={(e) => handleTaskKeyDown(e, cat.id)}
                                                                                placeholder="Type task and press Enter or click Add"
                                                                                className="form-control"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-outline-success"
                                                                                onClick={() => addTask(cat.id, cat.currentTask)}
                                                                            >
                                                                                <i className="bi bi-patch-plus me-1"></i>Add
                                                                            </button>
                                                                        </div>
                                                                        {cat.tasks.length > 0 && (
                                                                            <div
                                                                                className="mt-2 shadow-sm"
                                                                                style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '6px' }}
                                                                                ref={(el) => setTaskListRef(cat.id, el)}
                                                                            >
                                                                                <ul className="list-group list-group-flush mb-0">
                                                                                    {cat.tasks.map((task, taskIndex) => (
                                                                                        <li key={taskIndex} className="list-group-item d-flex justify-content-between align-items-center py-2 px-3" style={{ backgroundColor: taskIndex % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                                                                                            <span className="text-break" style={{ fontSize: '0.9rem', color: '#333' }}>{task}</span>
                                                                                            <button
                                                                                                type="button"
                                                                                                className="btn btn-sm btn-outline-danger py-0 px-2 ms-2"
                                                                                                style={{ fontSize: '1.1rem', lineHeight: '1.2' }}
                                                                                                title="Remove task"
                                                                                                onClick={() => removeTask(cat.id, taskIndex)}
                                                                                            >
                                                                                                ×
                                                                                            </button>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="mb-3 col-lg-3">
                                                                        <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                            Number of Tasks
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            value={cat.tasks.length}
                                                                            readOnly
                                                                            className="form-control"
                                                                        />
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {!isEditMode && (
                                            <div className="d-flex gap-2 mb-3">
                                                <button type="button" className="btn btn-outline-success flex-grow-1" onClick={addCategory}>
                                                    + Add Another Category
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary d-flex align-items-center"
                                                    onClick={fetchPreviousReports}
                                                    disabled={copyLoading}
                                                    title="Copy tasks from your most recent previous working day"
                                                >
                                                    {copyLoading
                                                        ? <span className="spinner-border spinner-border-sm me-1" role="status" />
                                                        : <i className="bi bi-clipboard-plus me-1"></i>
                                                    }
                                                    {copyLoading ? ' Loading...' : ' Copy from Previous Day'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                                {isEditMode ? (
                                    <div className="d-flex gap-2">
                                        <button type="submit" className="btn btn-success flex-grow-1 fw-bold py-2">
                                            <i className="bi bi-check-circle me-1"></i>Update Report
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger fw-semibold px-4 py-2"
                                            onClick={handleDeleteReport}
                                            title="Permanently remove this report"
                                        >
                                            <i className="bi bi-trash me-1"></i>Delete Report
                                        </button>
                                    </div>
                                ) : (
                                    <button type="submit" className="btn btn-success w-100 fw-bold py-2">
                                        <i className="bi bi-play-circle me-1"></i> {formData.work_type && formData.work_type === 'Working' ? 'Start Task' : 'Save ' + formData.work_type}
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copy from Previous Day Modal */}
            {showCopyModal && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header" style={{ backgroundColor: '#065d48', color: 'white' }}>
                                <h5 className="modal-title">
                                    <i className="bi bi-clipboard-plus me-2"></i>Copy Tasks from a Previous Day
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCopyModal(false)} />
                            </div>
                            <div className="modal-body">
                                {/* Date picker row */}
                                <div className="mb-3">
                                    <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                        Select a date to copy from:
                                    </label>
                                    <select
                                        className="form-select"
                                        value={selectedCopyDate}
                                        onChange={e => handleCopyDateChange(e.target.value)}
                                    >
                                        {availableDates.map(date => (
                                            <option key={date} value={date}>
                                                {formatDateLabel(date)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <small className="text-muted">Select the categories you want to copy into today's report.</small>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={toggleSelectAll}
                                    >
                                        {selectedCopyIds.size === previousReports.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>

                                <div className="d-flex flex-column gap-3">
                                    {previousReports.map(report => {
                                        const isSelected = selectedCopyIds.has(report.id);
                                        const displayCat = report.task_category === 'Others' && report.sub_category
                                            ? report.sub_category
                                            : report.task_category;
                                        const taskList = Array.isArray(report.task_list) ? report.task_list.filter(t => t) : [];

                                        return (
                                            <div
                                                key={report.id}
                                                onClick={() => toggleCopySelection(report.id)}
                                                className="card"
                                                style={{
                                                    cursor: 'pointer',
                                                    border: isSelected ? '2px solid #065d48' : '2px solid #e0e0e0',
                                                    backgroundColor: isSelected ? '#f0faf6' : '#fff',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <div className="card-body py-3 px-3">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div className="d-flex align-items-center gap-2 flex-grow-1">
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input mt-0 flex-shrink-0"
                                                                checked={isSelected}
                                                                onChange={() => toggleCopySelection(report.id)}
                                                                onClick={e => e.stopPropagation()}
                                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                            />
                                                            <div>
                                                                <span className="fw-semibold" style={{ color: '#065d48' }}>{displayCat}</span>
                                                                {taskList.length > 0 && (
                                                                    <div className="mt-1 ps-1 pe-2" style={{ maxHeight: '130px', overflowY: 'auto' }}>
                                                                        <ul className="mb-0 ps-3" style={{ fontSize: '0.875rem', color: '#555' }}>
                                                                            {taskList.map((task, i) => (
                                                                                <li key={i}>{task}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-end ms-3 flex-shrink-0">
                                                            {report.time_spent > 0 && (
                                                                <span className="badge rounded-pill" style={{ backgroundColor: 'rgba(6,93,72,0.1)', color: '#065d48', fontSize: '0.8rem' }}>
                                                                    <i className="bi bi-clock me-1"></i>{report.time_spent} min
                                                                </span>
                                                            )}
                                                            {report.task_category === 'Meeting' && report.meeting_count > 0 && (
                                                                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
                                                                    {report.meeting_count} meeting{report.meeting_count > 1 ? 's' : ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCopyModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success fw-semibold"
                                    onClick={handleCopySelected}
                                    disabled={selectedCopyIds.size === 0}
                                    style={{ backgroundColor: '#065d48', borderColor: '#065d48' }}
                                >
                                    Copy Selected ({selectedCopyIds.size})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewData;