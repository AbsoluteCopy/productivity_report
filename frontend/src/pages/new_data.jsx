import React, { useState, useEffect } from 'react';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const categoryOptions = [
    'Accounting Unapplied Payments',
    'Accounting Cash Receipts',
    'Checked/Reviewed Accounting Posted Payments',
    'Check Deposits to Cash Receipts & UAP',
    'Checked & Cleared 2025 ePay Transactions',
    'Process Offset on Accounting from Matt/UW Team',
    'Meeting'
];

const NewData = () => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        work_type: 'Working'
    });
    const [categories, setCategories] = useState([
        { id: 1, category: '', tasks: [], currentTask: '', timeSpent: '15', meetingCount: 0, work_type: '' }
    ]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            setFormData(prev => ({
                ...prev,
                user_id: user.id
            }));
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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

    const handleTimeSpentChange = (id, value) => {
        setCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, timeSpent: value } : cat
        ));
    };

    const handleMeetingCountChange = (id, value) => {
        setCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, meetingCount: parseInt(value) || 0 } : cat
        ));
    };

    const addCategory = () => {
        setCategories(prev => [
            ...prev,
            { id: Date.now(), category: '', tasks: [], currentTask: '', timeSpent: '0', meetingCount: 0 }
        ]);
    };

    const removeCategory = (id) => {
        if (categories.length > 1) {
            setCategories(prev => prev.filter(cat => cat.id !== id));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Handle PTO and Holiday submissions
        if (formData.work_type === 'PTO' || formData.work_type === 'Holiday') {
            const report = {
                user: formData.user_id,
                date: formData.date,
                task_category: formData.work_type,
                task_list: formData.work_type === 'Holiday' ? [formData.holiday_name] : ['PTO'],
                number_of_tasks: 1,
                time_spent: 0,
                meeting_count: 0,
                work_type: formData.work_type
            };

            try {
                const response = await fetch(`${API_BASE_URL}/daily-reports/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(report)
                });

                if (response.ok) {
                    alert(`${formData.work_type} submitted successfully!`);
                    setFormData({
                        date: new Date().toISOString().split('T')[0],
                        work_type: 'Working'
                    });
                } else {
                    alert('Error submitting report');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error submitting report');
            }
            return;
        }

        // Handle Working submissions
        const reports = categories
            .filter(cat => cat.category && cat.tasks.length > 0)
            .map(cat => ({
                user: formData.user_id,
                date: formData.date,
                task_category: cat.category,
                task_list: cat.tasks,
                number_of_tasks: cat.tasks.length,
                time_spent: cat.timeSpent,
                meeting_count: cat.category === 'Meeting' ? (cat.meetingCount || 0) : 0,
                work_type: 'Working'
            }));

        if (reports.length === 0) {
            alert('Please add at least one category with tasks');
            return;
        }

        try {
            const promises = reports.map(report =>
                fetch(`${API_BASE_URL}/daily-reports/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(report)
                })
            );

            const responses = await Promise.all(promises);

            if (responses.every(r => r.ok)) {
                alert('All daily reports submitted successfully!');
                setFormData({
                    date: new Date().toISOString().split('T')[0],
                    work_type: 'Working'
                });
                setCategories([
                    { id: 1, category: '', tasks: [], currentTask: '', timeSpent: '15', meetingCount: 0 }
                ]);
            } else {
                alert('Error submitting some reports');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error submitting reports');
        }
    };

    return (
        <div className="container py-4" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
            <div className="row justify-content-center">
                <div className="col-md-12 col-lg-12">
                    <div className="card shadow-sm">
                        <div className="card-body p-4">
                            <h2 className="text-center fw-bold mb-4" style={{ color: '#065d48' }}>
                                New Daily Report
                            </h2>

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
                                    <div className="col-6">
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
                                        </div>
                                    </div>
                                    {formData.work_type === "Holiday" && (
                                        <div className="col-12">
                                            <div className="col-12">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                        Holiday Name *
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
                                                            <button
                                                                type="button"
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
                                                            <select
                                                                value={cat.category}
                                                                onChange={(e) => handleCategoryChange(cat.id, e.target.value)}
                                                                required
                                                                className="form-select"
                                                            >
                                                                <option value="" disabled>Select a category</option>
                                                                {categoryOptions.map(option => (
                                                                    <option key={option} value={option}>{option}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="mb-3 col-lg-6">
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
                                                        <div className="mb-3 col-lg-12">
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
                                                        {cat.category !== 'Meeting' && (
                                                            <div className="mb-3 col-lg-6">
                                                                <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                    Time Spent (Minutes)
                                                                </label>
                                                                <select
                                                                    value={cat.timeSpent}
                                                                    onChange={(e) => handleTimeSpentChange(cat.id, e.target.value)}
                                                                    className="form-select"
                                                                >
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
                                                            <div className="mb-3 col-lg-6">
                                                                <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                                    Time Spent (Minutes)
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    value={cat.meetingCount}
                                                                    onChange={(e) => handleMeetingCountChange(cat.id, e.target.value)}
                                                                    min="0"
                                                                    placeholder="0"
                                                                    className="form-control"
                                                                />
                                                            </div>
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