import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import API_BASE_URL from "../config";
import { getCurrentDateInTimezone, parseDateInTimezone, formatDateString } from '../utils/dateUtils';
import { fmtClock } from '../utils/timeUtils';
import RunFinishedSummary from '../components/new_data/RunFinishedSummary';
import ActiveRunView from '../components/new_data/ActiveRunView';
import ReportForm from '../components/new_data/ReportForm';
import CopyPreviousDayModal from '../components/new_data/CopyPreviousDayModal';
import { isDarkMode } from '../utils/darkMode';

const NewData = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const editId = searchParams.get('edit');
    const resumeId = searchParams.get('resume');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingUserName, setEditingUserName] = useState('');
    const [editingIsPaused, setEditingIsPaused] = useState(false);
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
    const [nameInsured, setNameInsured] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [saving, setSaving] = useState(false);
    const warnedRef = useRef(null), alarmPlayedRef = useRef(null);

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

    const current = run && !run.finished ? run.queue[run.index] : null;
    const elapsedSec = timerActive
        ? Math.max(0, Math.floor((now - run.startedAt) / 1000)) + (current?.baseSeconds || 0)
        : 0;
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
    }, [overtime]);

    // play alarm once when the timer reaches zero (goes overtime)
    useEffect(() => {
        if (!overtime || !timerActive) return;
        const key = `${run.index}-${run.queue[run.index].label}`;
        if (alarmPlayedRef.current === key) return;
        alarmPlayedRef.current = key;
        const audio = new Audio('/audio/alarm.wav');
        audio.play().catch(() => {});
    }, [overtime]);

    const reportCurrentTask = (label) => {
        axios.post(`${API_BASE_URL}/users/current-task/`, { label }).catch(() => {});
    };
    const clearCurrentTask = () => reportCurrentTask(null);

    const isBackDatedItem = (item) => {
        const d = item?.payload?.date;
        const wt = item?.payload?.work_type;
        return !!d && (!wt || wt === 'Working') && d < new Date().toISOString().split('T')[0];
    };

    const startNext = () => {
        const cur = run.queue[run.index];
        if (cur && isBackDatedItem(cur)) {
            saveRunTask(false);
            return;
        }
        setRun(prev => {
            reportCurrentTask(prev.queue[prev.index]?.label);
            return { ...prev, startedAt: Date.now() };
        });
    };

    const cancelRun = async () => {
        const r = await Swal.fire({
            title: 'Cancel remaining tasks?',
            text: 'Categories already ended are saved. The current timer and unstarted categories will be discarded.',
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, cancel'
        });
        if (r.isConfirmed) { setRun(null); setDescription(''); setNameInsured(''); setAttachment(null); clearCurrentTask(); }
    };

    const clearCategoryInputs = () => {
        setCategories([
            { id: 1, category: '', tasks: [], currentTask: '', timeSpent: '', meetingCount: 0, work_type: '', sub_category: '', meetingTitle: '', hasTimeSpent: false }
        ]);
    };

    const saveRunTask = async (paused) => {
        const cur = run.queue[run.index];
        const backDated = isBackDatedItem(cur);
        const actualSeconds = backDated
            ? 0
            : Math.max(
                1,
                Math.floor((Date.now() - (run.startedAt || Date.now())) / 1000)
            );

        if (cur.resumeReportId) {
            setSaving(true);
            try {
                const body = {
                    date: cur.payload.date,
                    task_category: cur.payload.task_category,
                    sub_category: cur.payload.sub_category || null,
                    work_type: cur.payload.work_type || 'Working',
                    task_list: cur.payload.task_list,
                    number_of_tasks: cur.payload.number_of_tasks || 0,
                    time_spent: cur.payload.time_spent || 0,
                    meeting_count: cur.payload.meeting_count || 0,
                    ...(backDated ? {} : { actual_time: (Number(cur.resumePrevActual) || 0) + actualSeconds }),
                    is_paused: paused ? 1 : 0,
                    ...(paused ? { paused_time: (Number(cur.resumePrevActual) || 0) + actualSeconds } : {}),
                };
                if (!paused) {
                    body.time_finished = new Date().toISOString();
                }
                if (description.trim()) {
                    body.description = description.trim();
                }
                body.name_insured = nameInsured.trim();

                await axios.put(`${API_BASE_URL}/daily-reports/${cur.resumeReportId}/`, body);

                setRun(null);
                setDescription('');
                setNameInsured('');
                setAttachment(null);
                clearCurrentTask();
                if (paused) {
                    clearCategoryInputs();
                    fetchExistingDayReports(formData.date, formData.user_id || cur.payload.user);
                }

                Swal.fire({
                    title: 'Saved!',
                    text: paused
                        ? 'Task has been paused and saved successfully.'
                        : 'Paused task resumed and completed successfully.',
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
            return;
        }

        const timeAdded = run.startedAt
            ? new Date(run.startedAt).toISOString()
            : new Date().toISOString();
        const timeFinished = paused ? null : new Date().toISOString();
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
            fd.append('actual_time', backDated ? '' : actualSeconds);
            fd.append('description', description.trim());
            fd.append('name_insured', nameInsured.trim());
            fd.append('time_added', timeAdded);
            fd.append('time_finished', timeFinished ?? '');
            fd.append('is_paused', paused ? '1' : '0');
            fd.append('paused_time', paused ? String(actualSeconds) : '0');

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
            setNameInsured('');
            setAttachment(null);
            clearCurrentTask();
            if (paused) {
                clearCategoryInputs();
                fetchExistingDayReports(formData.date, formData.user_id || cur.payload.user);
            }

            setRun(
                paused
                    ? null
                    : isLast
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
                text: paused
                    ? 'Task has been paused and saved successfully.'
                    : 'Task has been completed successfully.',
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

    // Back-dated Working items are saved as soon as they become current,
    // without ever showing the timer.
    const autoSavedRef = useRef(null);
    useEffect(() => {
        if (!run || run.finished || run.startedAt) return;
        const cur = run.queue[run.index];
        if (!cur || !isBackDatedItem(cur)) return;
        const key = `${run.id}:${run.index}:${run.results.length}`;
        if (autoSavedRef.current === key) return;
        autoSavedRef.current = key;
        saveRunTask(false);
    }, [run]); // eslint-disable-line

    const endTask = async () => {
        const result = await Swal.fire({
            title: 'Finish Task?',
            text: `This task took ${Math.floor(elapsedSec / 60)} minute(s). Do you want to end it?`,
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

        await saveRunTask(false);
    };

    const pauseTask = async () => {
        const r = await Swal.fire({
            title: 'Pause Task?',
            text: 'This will save the current task and stop the remaining tasks. Do you want to pause?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Pause it',
            cancelButtonText: 'Continue Working',
            reverseButtons: true,
            confirmButtonColor: '#055d47',
        });
        if (r.isConfirmed) {
            await saveRunTask(true);
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
        let currentActual = 0;

        categories.forEach((cat) => {
            const actual = Number(cat.actualTime);
            if (cat.actualTime !== '' && cat.actualTime !== null && cat.actualTime !== undefined && !isNaN(actual)) {
                currentActual += actual;
            }
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

        const actualMinutes = priorTotals.priorActual + currentActual;
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
            currentActual,
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
        } else if (resumeId) {
            startResumeTask(resumeId);
        }
    }, [editId, resumeId]);

    useEffect(() => {
        let cancelled = false;

        const checkClockInStatus = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user || ['admin', 'viewer', 'hr', 'supervisor'].includes(user.role)) return;

                const { data } = await axios.get(`${API_BASE_URL}/attendance/current/`);
                if (cancelled || (data && !data.clock_out)) return;

                const result = await Swal.fire({
                    icon: 'warning',
                    title: 'Not Clocked In',
                    text: 'You have not clocked in yet. Would you like to go back to the dashboard and clock in before continuing?',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed Anyway',
                    cancelButtonText: 'Go to Dashboard',
                    confirmButtonColor: '#065d48',
                    cancelButtonColor: '#d33',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                });

                if (!cancelled && !result.isConfirmed) {
                    navigate('/dashboard');
                }
            } catch (err) {
                console.error('Error checking clock-in status:', err);
            }
        };

        checkClockInStatus();

        return () => {
            cancelled = true;
        };
    }, [navigate]);

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
            setEditingIsPaused(Number(data.is_paused) === 1);
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

    const startResumeTask = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get(`${API_BASE_URL}/daily-reports/${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (Number(data.is_paused) !== 1) {
                Swal.fire({
                    icon: 'info',
                    title: 'Not Paused',
                    text: 'This task is not paused.',
                });
                return;
            }

            const isMeeting = data.task_category === 'Meeting';
            const taskCount = Number(data.number_of_tasks || 0);
            const units = isMeeting ? Math.max(Number(data.meeting_count) || 1, 1) : taskCount;
            const prevActual = Number(data.paused_time) || Number(data.actual_time) || 0;
            const item = {
                payload: {
                    user: data.user,
                    date: data.date,
                    task_category: data.task_category,
                    task_list: Array.isArray(data.task_list) ? data.task_list : [],
                    number_of_tasks: taskCount,
                    time_spent: Number(data.time_spent) || 0,
                    meeting_count: Number(data.meeting_count) || 0,
                    work_type: data.work_type || 'Working',
                    sub_category: data.sub_category || '',
                },
                label: data.sub_category && data.task_category === 'Others' ? data.sub_category : data.task_category,
                expectedSeconds: (Number(data.time_spent) || 0) * units * 60,
                resumeReportId: data.id,
                resumePrevActual: prevActual,
                baseSeconds: prevActual,
            };

            warnedRef.current = null;
            setNameInsured(data.name_insured || '');
            reportCurrentTask(item.label);
            setRun({ queue: [item], index: 0, startedAt: isBackDatedItem(item) ? null : Date.now(), results: [], finished: false, id: Date.now() });
        } catch (err) {
            console.error('Error loading paused task:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Unable to load the paused task.',
            });
        }
    };

    const isWeekend = (dateString) => {
        const date = parseDateInTimezone(dateString);

        const weekday = date.toLocaleDateString("en-US", {
            weekday: "short",
            timeZone: 'UTC'
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
                    repeatable: Number(matchedCategory?.repeatable) === 1 ? 1 : 0,
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

    const isRepeatableCategory = (cat) => {
        if (!cat || !cat.category) return false;
        if (Number(cat.repeatable) === 1) return true;
        const names = new Set([cat.category, getEffectiveCatName(cat)]);
        return [...names].some(n =>
            taskCategories.some(c => c.name === n && Number(c.repeatable) === 1)
        );
    };

    const DUPLICATE_SKIP_CATEGORIES = ['Meeting', 'PTO', 'Holiday', 'Company Event'];

    const DUPLICATE_SUFFIX_FORMATS = {
        endorsement: { label: 'Endorsement', prefix: 'Endorsement #', match: 'Endorsement\\s*#?' },
        intakes_update: { label: 'Intakes Update', prefix: 'Intakes Update #', match: 'Intakes\\s+Update\\s*#?' },
        number: { label: 'Number', prefix: '#', match: '#' },
        payment: { label: 'Payment', prefix: 'Payment #', match: 'Payment\\s*#?' },
        revision: { label: 'Revision', prefix: 'Rev.', match: 'Rev\\.?' },
        update: { label: 'Update', prefix: 'Update #', match: 'Update\\s*#?' },
    };

    const getDuplicateTaskPool = (extraTasks = []) => [
        ...categories.flatMap(c => c.tasks || []),
        ...extraTasks
    ];

    const buildSuffixedTaskName = (taskName, kind, num) =>
        `${taskName} (${DUPLICATE_SUFFIX_FORMATS[kind].prefix} ${num})`;

    const getNextTaskSuffixNumber = async (taskName, kind, pool, existsRemote = null) => {
        const format = DUPLICATE_SUFFIX_FORMATS[kind];
        const escaped = taskName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`^${escaped}\\s*\\(\\s*${format.match}\\s*(\\d+)\\s*\\)$`, 'i');
        let max = 0;
        for (const t of pool) {
            const match = (t || '').trim().match(pattern);
            if (match) max = Math.max(max, parseInt(match[1], 10) || 0);
        }
        let next = max + 1;
        // Skip numbers already used by suffixed variants in the database
        if (existsRemote) {
            while (await existsRemote(buildSuffixedTaskName(taskName, kind, next))) {
                next++;
            }
        }
        return next;
    };

    const checkRemoteTaskDuplicate = async (taskName, cat) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/daily-reports/check-duplicate/`, {
                params: {
                    task: taskName,
                    category: cat.category,
                    sub_category: cat.sub_category || undefined,
                    exclude_id: editId || undefined
                },
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            return res.data && res.data.duplicate ? res.data : null;
        } catch (err) {
            console.error('Error checking duplicate task with server:', err);
            return null;
        }
    };

    const promptDuplicateTaskFormat = async (taskName, title, message, extraPool = [], existsRemote = null) => {
        const first = await Swal.fire({
            icon: 'warning',
            title,
            text: message,
            showCancelButton: true,
            confirmButtonColor: '#065d48',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Continue Anyway',
            cancelButtonText: 'Cancel'
        });
        if (!first.isConfirmed) return null;

        const second = await Swal.fire({
            title: 'Rename Duplicate Task',
            input: 'select',
            inputLabel: `Choose a format for "${taskName}"`,
            inputOptions: Object.fromEntries(
                Object.entries(DUPLICATE_SUFFIX_FORMATS).map(([key, fmt]) => [key, fmt.label])
            ),
            inputPlaceholder: 'Select format',
            showCancelButton: true,
            confirmButtonText: 'Apply',
            cancelButtonText: 'Back',
            inputValidator: (value) => !value && 'Please select a format',
            confirmButtonColor: '#065d48',
            cancelButtonColor: '#6c757d'
        });
        if (!second.isConfirmed || !second.value) return null;

        const nextNum = await getNextTaskSuffixNumber(taskName, second.value, getDuplicateTaskPool(extraPool), existsRemote);
        return buildSuffixedTaskName(taskName, second.value, nextNum);
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
        const skipDuplicates = isRepeatableCategory(targetCat);
        const checkServerDuplicate = !skipDuplicates && targetCat.category && !DUPLICATE_SKIP_CATEGORIES.includes(targetCat.category);
        const existsRemote = checkServerDuplicate
            ? async (name) => !!(await checkRemoteTaskDuplicate(name, targetCat))
            : null;

        let finalTask = newTask;
        while (!skipDuplicates) {
            const isLocalDuplicate = allTasksInCat.some(
                t => t.trim().toLowerCase() === finalTask.toLowerCase()
            );

            if (isLocalDuplicate) {
                const formatted = await promptDuplicateTaskFormat(
                    finalTask,
                    'Duplicate Task',
                    `"${finalTask}" has already been added for "${targetCatName}" in this form.`,
                    [],
                    existsRemote
                );
                if (formatted === null) return;
                finalTask = formatted;
                continue;
            }

            // 2. Check system-wide database duplicate across all users and dates
            if (checkServerDuplicate) {
                const dup = await checkRemoteTaskDuplicate(finalTask, targetCat);
                if (dup) {
                    const formatted = await promptDuplicateTaskFormat(
                        finalTask,
                        'Duplicate Task (System-Wide)',
                        `"${finalTask}" was already submitted for category "${dup.category}" by ${dup.submitted_by} on ${dup.date}. Duplicates are not allowed across the system.`,
                        [],
                        existsRemote
                    );
                    if (formatted === null) return;
                    finalTask = formatted;
                    continue;
                }
            }
            break;
        }

        // Add task to category and clear currentTask
        setCategories(prev => prev.map(cat => {
            if (cat.id === id) {
                return {
                    ...cat,
                    tasks: [...cat.tasks, finalTask],
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

    const handleHasTimeSpentChange = (id, checked) => {
        setCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, hasTimeSpent: checked } : cat
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
                let pendingTask = cat.currentTask.trim();
                if (cat.category && !DUPLICATE_SKIP_CATEGORIES.includes(cat.category)) {
                    const skipDuplicates = isRepeatableCategory(cat);
                    const existsRemote = async (name) => !!(await checkRemoteTaskDuplicate(name, cat));
                    while (!skipDuplicates) {
                        // Check duplicate in local form
                        const isLocalDup = catTasks.some(t => t.trim().toLowerCase() === pendingTask.toLowerCase());
                        if (isLocalDup) {
                            const formatted = await promptDuplicateTaskFormat(
                                pendingTask,
                                'Duplicate Task Detected',
                                `"${pendingTask}" in category "${getEffectiveCatName(cat)}" is already added. Please remove it before submitting.`,
                                catTasks,
                                existsRemote
                            );
                            if (formatted === null) return;
                            pendingTask = formatted;
                            continue;
                        }

                        // Check system-wide duplicate
                        const dup = await checkRemoteTaskDuplicate(pendingTask, cat);
                        if (dup) {
                            const formatted = await promptDuplicateTaskFormat(
                                pendingTask,
                                'Duplicate Task Detected (System-Wide)',
                                `Cannot Start: "${pendingTask}" was already submitted for category "${dup.category}" by ${dup.submitted_by} on ${dup.date}. Duplicates are not allowed across the system.`,
                                catTasks,
                                existsRemote
                            );
                            if (formatted === null) return;
                            pendingTask = formatted;
                            continue;
                        }
                        break;
                    }

                    catTasks.push(pendingTask);
                }
            }
            processedCategories.push({ ...cat, tasks: catTasks });
        }

        // Check for duplicate tasks across rows of the same category
        const catTaskMap = {};
        for (let cat of processedCategories) {
            if (cat.category && !DUPLICATE_SKIP_CATEGORIES.includes(cat.category) && !isRepeatableCategory(cat)) {
                const catKey = getEffectiveCatName(cat).toLowerCase();
                if (!catTaskMap[catKey]) catTaskMap[catKey] = new Set();
                for (let ti = 0; ti < cat.tasks.length; ti++) {
                    const t = cat.tasks[ti];
                    const taskKey = t.trim().toLowerCase();
                    if (catTaskMap[catKey].has(taskKey)) {
                        const formatted = await promptDuplicateTaskFormat(
                            t,
                            'Duplicate Task Detected',
                            `Duplicate task "${t}" found in category "${getEffectiveCatName(cat)}". Please remove the duplicate before submitting.`,
                            cat.tasks,
                            async (name) => !!(await checkRemoteTaskDuplicate(name, cat))
                        );
                        if (formatted === null) return;
                        cat.tasks[ti] = formatted;
                        catTaskMap[catKey].add(formatted.trim().toLowerCase());
                        continue;
                    }
                    catTaskMap[catKey].add(taskKey);
                }
            }
        }

        // System-wide duplicate check for all tasks in all categories
        for (let cat of processedCategories) {
            if (cat.category && !DUPLICATE_SKIP_CATEGORIES.includes(cat.category) && !isRepeatableCategory(cat)) {
                for (let ti = 0; ti < cat.tasks.length; ti++) {
                    let t = cat.tasks[ti];
                    while (true) {
                        const dup = await checkRemoteTaskDuplicate(t, cat);
                        if (dup) {
                            const formatted = await promptDuplicateTaskFormat(
                                t,
                                'Duplicate Task Detected (System-Wide)',
                                `Cannot submit: "${t}" was already submitted for category "${dup.category}" by ${dup.submitted_by} on ${dup.date}. Duplicates are not allowed across the system.`,
                                cat.tasks,
                                async (name) => !!(await checkRemoteTaskDuplicate(name, cat))
                            );
                            if (formatted === null) return;
                            t = formatted;
                            cat.tasks[ti] = t;
                            continue;
                        }
                        break;
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
            reportCurrentTask(queue[0]?.label);
            setRun({ queue, index: 0, startedAt: isBackDatedItem(queue[0]) ? null : Date.now(), results: [], finished: false, id: Date.now() });
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
        if (run.finished) {
            return (
                <RunFinishedSummary
                    run={run}
                    onLogAnother={() => { setRun(null); resetForm(); }}
                />
            );
        }

        return (
            <ActiveRunView
                run={run}
                elapsedSec={elapsedSec}
                overtime={overtime}
                description={description}
                onDescriptionChange={setDescription}
                nameInsured={nameInsured}
                onNameInsuredChange={setNameInsured}
                onAttachmentChange={setAttachment}
                saving={saving}
                onCancel={cancelRun}
                onStartNext={startNext}
                onEndTask={endTask}
                onPauseTask={pauseTask}
            />
        );
    }

    return (
        <div className="container py-4" style={{ minHeight: '100vh', backgroundColor: isDarkMode() ? '#0f1513' : '#f5f5f5' }}>
            <div className="row justify-content-center">
                <div className="col-md-12 col-lg-12">
                    <div className="card shadow-sm">
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <button type="button" className="btn btn-outline-secondary" onClick={handleBack}>
                                    ← Back
                                </button>

                                <h2 className="text-center fw-bold mb-0 text-green-dark">
                                    {isEditMode ? 'Edit Daily Report' : 'New Daily Report'}
                                    {isEditMode && editingIsPaused && (
                                        <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.55em', verticalAlign: 'middle' }}>
                                            Paused
                                        </span>
                                    )}
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

                            <ReportForm
                                formData={formData}
                                onFieldChange={handleChange}
                                onSubmit={handleSubmit}
                                isEditMode={isEditMode}
                                editingUserName={editingUserName}
                                dailyTotals={dailyTotals}
                                categories={categories}
                                taskCategories={taskCategories}
                                onDeleteReport={handleDeleteReport}
                                onAddCategory={addCategory}
                                onFetchPreviousReports={fetchPreviousReports}
                                copyLoading={copyLoading}
                                setTaskListRef={setTaskListRef}
                                onRemoveCategory={removeCategory}
                                onRenameOther={promptForOtherName}
                                onCategoryChange={handleCategoryChange}
                                onTimeSpentChange={handleTimeSpentChange}
                                onTimeSpentBlur={handleTimeSpentBlur}
                                onMeetingTitleChange={handleMeetingTitleChange}
                                onTaskChange={handleTaskChange}
                                onTaskKeyDown={handleTaskKeyDown}
                                onAddTask={addTask}
                                onRemoveTask={removeTask}
                                onHasTimeSpentChange={handleHasTimeSpentChange}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {showCopyModal && (
                <CopyPreviousDayModal
                    onClose={() => setShowCopyModal(false)}
                    previousReports={previousReports}
                    selectedCopyIds={selectedCopyIds}
                    selectedCopyDate={selectedCopyDate}
                    availableDates={availableDates}
                    onCopyDateChange={handleCopyDateChange}
                    onToggleSelect={toggleCopySelection}
                    onToggleAll={toggleSelectAll}
                    onCopySelected={handleCopySelected}
                    formatDateLabel={formatDateLabel}
                />
            )}
        </div>
    );
};

export default NewData;