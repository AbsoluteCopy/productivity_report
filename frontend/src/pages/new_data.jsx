import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import API_BASE_URL from "../config";

const categoryOptions = [
    'Accounting Unapplied Payments',
    'Accounting Cash Receipts',
    'Checked/Reviewed Accounting Posted Payments',
    'Check Deposits to Cash Receipts & UAP',
    'Checked & Cleared 2025 ePay Transactions',
    'Process Offset on Accounting from Matt/UW Team',
    'Meeting',
    'Others',
];

const NewData = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const editId = searchParams.get('edit');
    const [isEditMode, setIsEditMode] = useState(false);
    const [hasTimeSpent, setHasTimeSpent] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        work_type: 'Working'
    });
    const [categories, setCategories] = useState([
        { id: 1, category: '', tasks: [], currentTask: '', timeSpent: '15', meetingCount: 0, work_type: '', sub_category: '', meetingTitle: '' }
    ]);
    const [taskCategories, setTaskCategories] = useState([]);

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

            // If admin, hr, or user has no specific task list assigned, allow all categories
            if (userData.role === 'admin' || userData.role === 'hr' || userTaskList.length === 0) {
                setTaskCategories(allCategories);
            } else {
                const filteredCategories = allCategories.filter(category =>
                    userTaskList.includes(category.id)
                );
                setTaskCategories(filteredCategories);
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

            if (data.work_type === 'Working') {
                setCategories([
                    {
                        id: 1,
                        category: data.task_category,
                        sub_category: data.sub_category || '',
                        tasks: Array.isArray(data.task_list) ? data.task_list : [],
                        currentTask: '',
                        timeSpent: data.time_spent ? Number(data.time_spent) : 15,
                        meetingCount: data.meeting_count || 0,
                        meetingTitle: data.task_category === 'Meeting' && data.task_list?.[0] ? data.task_list[0] : ''
                    }
                ]);
            }
        } catch (error) {
            console.error('Error fetching report for edit:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Unable to load report data for editing.',
            });
        }
    };

    const isWeekend = (dateString) => {
        // Parse as a calendar date
        const date = new Date(`${dateString}T12:00:00`);

        const weekday = new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            timeZone: "America/Anchorage",
        }).format(date);

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

    const handleCategoryChange = (id, value) => {
        setCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, category: value } : cat
        ));
    };

    const handleTaskKeyDown = (e, id) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault();
            setCategories(prev => prev.map(cat => {
                if (cat.id === id) {
                    const newTasks = [...cat.tasks, e.target.value.trim()];
                    return { ...cat, tasks: newTasks, currentTask: '' };
                }
                return cat;
            }));
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
        if (val === '' || val === null || val === undefined) return { valid: true, value: '' };
        const strVal = String(val).trim();
        // Disallow leading zeros on multi-digit numbers (e.g. "020", "007") or non-numeric/negative strings
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
        const check = validateMinutes(value);
        if (!check.valid && value !== '') {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Input',
                text: check.error,
                confirmButtonColor: '#065d48',
                confirmButtonText: 'Edit Input'
            });
        }
        setCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, timeSpent: value } : cat
        ));
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
            { id: Date.now(), category: '', tasks: [], currentTask: '', timeSpent: '0', meetingCount: 0, sub_category: '', meetingTitle: '' }
        ]);
    };

    const removeCategory = (id) => {
        if (categories.length > 1) {
            setCategories(prev => prev.filter(cat => cat.id !== id));
        }
    };

    const resetForm = () => {
        const user = JSON.parse(localStorage.getItem('user'));

        setHasTimeSpent(false);
        setFormData({
            date: new Date().toISOString().split('T')[0],
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
                timeSpent: '15',
                meetingCount: 0,
                sub_category: '',
                meetingTitle: ''
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
                if (!check.valid || cat.timeSpent === '' || cat.timeSpent === null || cat.timeSpent === undefined) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Invalid Time Spent',
                        text: `Please enter a valid time in minutes for the Meeting category. ${check.error || 'Value cannot be empty.'}`,
                        confirmButtonColor: '#065d48',
                        confirmButtonText: 'Edit Input'
                    });
                    return;
                }
            } else if (cat.category && cat.category !== 'Others') {
                const check = validateMinutes(cat.timeSpent);
                if (!check.valid) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Invalid Time Spent',
                        text: `Invalid time for ${cat.category}: ${check.error}`,
                        confirmButtonColor: '#065d48',
                        confirmButtonText: 'Edit Input'
                    });
                    return;
                }
            }
        }

        console.log(categories);
        const reports = categories
            .filter(cat =>
                cat.category &&
                (
                    cat.tasks.length > 0 ||
                    cat.category === 'Others' ||
                    (cat.category === 'Meeting' && cat.meetingTitle.trim() !== '')
                )
            )
            .map(cat => ({
                user: formData.user_id,
                date: formData.date,
                task_category: cat.category,
                task_list: cat.category === 'Meeting'
                    ? [cat.meetingTitle]
                    : (cat.category === 'Others' && cat.tasks.length === 0
                        ? ['']
                        : cat.tasks),
                number_of_tasks: cat.category === 'Meeting'
                    ? (cat.meetingTitle.trim() ? 1 : 0)
                    : cat.category === 'Others'
                        ? (cat.tasks.length === 0 ? 0 : cat.tasks.length)
                        : cat.tasks.length,
                time_spent: hasTimeSpent && cat.category === 'Others'
                    ? 0
                    : parseInt(cat.timeSpent, 10) || 0,
                meeting_count: cat.category === 'Meeting'
                    ? (cat.meetingCount || 0)
                    : 0,
                work_type: 'Working',
                sub_category: cat.sub_category
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

        try {
            if (isEditMode) {
                // Update the original report with the first category
                await axios.put(`${API_BASE_URL}/daily-reports/${editId}/`, reports[0]);

                // If the user added extra categories, POST them as new reports
                if (reports.length > 1) {
                    const newReports = reports.slice(1).map(report =>
                        axios.post(`${API_BASE_URL}/daily-reports/`, report)
                    );
                    await Promise.all(newReports);
                }

                await Swal.fire({
                    title: 'Success',
                    text: 'Daily report updated successfully!',
                    icon: 'success',
                });
                // Navigate back so the list refreshes and user can't re-submit
                navigate('/daily_report');
            } else {
                // Create new reports
                const promises = reports.map(report =>
                    axios.post(`${API_BASE_URL}/daily-reports/`, report)
                );

                await Promise.all(promises);

                await Swal.fire({
                    title: 'Success',
                    text: 'All daily reports submitted successfully!',
                    icon: 'success',
                });
                resetForm();
            }
        } catch (error) {
            console.error('Error:', error);
            const errMsg = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || `Error ${isEditMode ? 'updating' : 'submitting'} report. Please try again.`;
            Swal.fire({
                title: 'Submission Error',
                text: errMsg,
                icon: 'error',
            });
        }
    };
    const handleBack = () => {
        navigate('/daily_report');
    };

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

                                <div></div>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="row mb-4">
                                    <div className="mb-3 col-lg-6">
                                        <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                            Date *
                                        </label>
                                        <input
                                            type="date"
                                            name="date"
                                            value={formData.date}
                                            onChange={handleChange}
                                            required
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="col-lg-6 col-sm-12">
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                Option *
                                            </label>
                                            <br />
                                            <div className="form-check form-check-inline">
                                                <input className="form-check-input" type="radio" name="work_type" id="working" value="Working" checked={!formData.work_type || formData.work_type === "Working"} onChange={handleChange} required />
                                                <label className="form-check-label" htmlFor="working">Working</label>
                                            </div>
                                            <div className="form-check form-check-inline">
                                                <input className="form-check-input" type="radio" name="work_type" id="pto" value="PTO" checked={formData.work_type === "PTO"} onChange={handleChange} required />
                                                <label className="form-check-label" htmlFor="pto">PTO</label>
                                            </div>
                                            <div className="form-check form-check-inline">
                                                <input className="form-check-input" type="radio" name="work_type" id="holiday" value="Holiday" checked={formData.work_type === "Holiday"} onChange={handleChange} required />
                                                <label className="form-check-label" htmlFor="holiday">Holiday</label>
                                            </div>
                                            <div className="form-check form-check-inline">
                                                <input className="form-check-input" type="radio" name="work_type" id="company_event" value="Company Event" checked={formData.work_type === "Company Event"} onChange={handleChange} required />
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
                                        {categories.map((cat, index) => (
                                            <div key={cat.id} className="card mb-3" style={{ border: '2px solid #e0e0e0' }}>
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <h5 className="card-title mb-0" style={{ color: '#065d48' }}>
                                                            Category {index + 1}
                                                        </h5>
                                                        {categories.length > 1 && (
                                                            <button type="button"
                                                                className="btn btn-sm btn-outline-danger"
                                                                onClick={() => removeCategory(cat.id)}
                                                            >
                                                                Remove Category
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="row">
                                                        <div className="mb-3 col-lg-6">
                                                            <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                Task Category *
                                                            </label>
                                                            <select value={cat.category}
                                                                onChange={(e) => handleCategoryChange(cat.id, e.target.value)}
                                                                required
                                                                className="form-select"
                                                            >
                                                                <option value="" disabled>Select a category</option>
                                                                {taskCategories.map(category => (
                                                                    <option key={category.id} value={category.name}>{category.name}</option>
                                                                ))}
                                                                {cat.category && !taskCategories.some(c => c.name === cat.category) && !['Meeting', 'Others'].includes(cat.category) && (
                                                                    <option value={cat.category}>{cat.category}</option>
                                                                )}
                                                                <option value="Meeting">Meeting</option>
                                                                <option value="Others">Others</option>
                                                            </select>
                                                        </div>
                                                        {cat.category === 'Others' && (
                                                            <div className="col-6">
                                                                <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                    Other Category
                                                                </label>
                                                                <input type="text" name='sub_category' value={cat.sub_category}
                                                                    onChange={(e) => handleSubCategoryChange(cat.id, e.target.value)}
                                                                    className="form-control" placeholder="Enter other category"
                                                                />
                                                            </div>
                                                        )}
                                                        {cat.category === 'Others' && (
                                                            <div className="col-6">
                                                                <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                    No Time Spent
                                                                </label>
                                                                <br />
                                                                <input
                                                                    type="checkbox"
                                                                    checked={hasTimeSpent}
                                                                    onChange={(e) => setHasTimeSpent(e.target.checked)}
                                                                    className="form-check-input"
                                                                />
                                                            </div>
                                                        )}
                                                        {cat.category !== 'Meeting' && (
                                                            <div className="mb-3 col-lg-6">
                                                                <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                    Time Spent (Minutes)
                                                                </label>
                                                                <select value={cat.timeSpent}
                                                                    onChange={(e) => handleTimeSpentChange(cat.id, e.target.value)}
                                                                    className="form-select"
                                                                    disabled={hasTimeSpent}
                                                                >
                                                                    <option value="">Select</option>
                                                                    <option value="0">0</option>
                                                                    <option value="15">15</option>
                                                                    <option value="30">30</option>
                                                                    <option value="45">45</option>
                                                                    <option value="60">60</option>
                                                                    <option value="90">90</option>
                                                                    <option value="120">120</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                        {cat.category === 'Meeting' && (
                                                            <>
                                                                <div className="mb-3 col-lg-6">
                                                                    <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                        Time Spent (Minutes)
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        value={cat.timeSpent}
                                                                        onChange={(e) => handleTimeSpentChange(cat.id, e.target.value)}
                                                                        min="0"
                                                                        placeholder="0"
                                                                        className="form-control"
                                                                    />
                                                                </div>
                                                                {/* <div className="mb-3 col-lg-3">
                                                                    <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                        No. of Meetings
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        value={cat.meetingCount}
                                                                        onChange={(e) => handleMeetingCountChange(cat.id, e.target.value)}
                                                                        min="0"
                                                                        placeholder="0"
                                                                        className="form-control"
                                                                    />
                                                                </div> */}
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
                                                                <div className="mb-3 col-lg-8">
                                                                    <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                        Task List *
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={cat.currentTask}
                                                                        onChange={(e) => handleTaskChange(cat.id, e.target.value)}
                                                                        onKeyDown={(e) => handleTaskKeyDown(e, cat.id)}
                                                                        placeholder="Type task and press Enter to add"
                                                                        className="form-control"
                                                                    />
                                                                    {cat.tasks.length > 0 && (
                                                                        <div className="mt-2">
                                                                            <ul className="list-group">
                                                                                {cat.tasks.map((task, taskIndex) => (
                                                                                    <li key={taskIndex} className="list-group-item d-flex justify-content-between align-items-center">
                                                                                        {task}
                                                                                        <button
                                                                                            type="button"
                                                                                            className="btn btn-sm btn-outline-danger"
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

                                                                <div className="mb-3 col-lg-4">
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
                                        ))}

                                        <button type="button" className="btn btn-outline-success w-100 mb-3" onClick={addCategory} >
                                            + Add Another Category
                                        </button>
                                    </>
                                )}
                                <button type="submit" className="btn btn-success w-100 fw-bold">
                                    Submit Report
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewData;