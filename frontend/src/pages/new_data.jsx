import React, { useState } from 'react';

const NewData = () => {
    const [formData, setFormData] = useState({
        user_id: '',
        date: new Date().toISOString().split('T')[0],
        task_category: '',
        task_list: '',
        number_of_tasks: 0,
        time_spent_hours: 0,
        time_spent_minutes: 0,
        meeting_count: 0
    });
    const [currentTask, setCurrentTask] = useState('');
    const [tasks, setTasks] = useState([]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleTaskKeyDown = (e) => {
        if (e.key === 'Enter' && currentTask.trim()) {
            e.preventDefault();
            const newTasks = [...tasks, currentTask.trim()];
            setTasks(newTasks);
            setCurrentTask('');
            setFormData(prev => ({
                ...prev,
                task_list: newTasks.join('\n'),
                number_of_tasks: newTasks.length
            }));
        }
    };

    const removeTask = (index) => {
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks);
        setFormData(prev => ({
            ...prev,
            task_list: newTasks.join('\n'),
            number_of_tasks: newTasks.length
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const timeSpent = `${formData.time_spent_hours}h ${formData.time_spent_minutes}m`;

        const dataToSend = {
            user: formData.user_id,
            date: formData.date,
            task_category: formData.task_category,
            task_list: formData.task_list,
            number_of_tasks: parseInt(formData.number_of_tasks) || 0,
            time_spent: timeSpent,
            meeting_count: parseInt(formData.meeting_count) || 0
        };

        try {
            const response = await fetch('http://localhost:8000/api/daily-reports/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSend)
            });

            if (response.ok) {
                alert('Daily report submitted successfully!');
                setFormData({
                    user_id: '',
                    date: new Date().toISOString().split('T')[0],
                    task_category: '',
                    task_list: '',
                    number_of_tasks: 0,
                    time_spent_hours: 0,
                    time_spent_minutes: 0,
                    meeting_count: 0
                });
                setTasks([]);
                setCurrentTask('');
            } else {
                alert('Error submitting report');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error submitting report');
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
                                <div className="row">
                                    <div className="mb-3 col-lg-4">
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

                                    <div className="mb-3 col-lg-4">
                                        <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                            Task Category *
                                        </label>
                                        <select
                                            name="task_category"
                                            value={formData.task_category}
                                            onChange={handleChange}
                                            required
                                            className="form-select"
                                        >
                                            <option value="" disabled>Select a category</option>
                                            <option value="Accounting Unapplied Payments">Accounting Unapplied Payments</option>
                                            <option value="Accounting Cash Receipts">Accounting Cash Receipts</option>
                                            <option value="Checked/Reviewed Accounting Posted Payments">Checked/Reviewed Accounting Posted Payments</option>
                                            <option value="Check Deposits to Cash Receipts & UAP">Check Deposits to Cash Receipts & UAP</option>
                                            <option value="Checked & Cleared 2025 ePay Transactions">Checked & Cleared 2025 ePay Transactions</option>
                                            <option value="Process Offset on Accounting from Matt/UW Team">Process Offset on Accounting from Matt/UW Team</option>
                                            <option value="Meeting">Meeting</option>
                                        </select>
                                    </div>
                                    <div className="mb-3 col-lg-4">
                                        <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                            Number of Tasks
                                        </label>
                                        <input
                                            type="number"
                                            name="number_of_tasks"
                                            value={formData.number_of_tasks}
                                            onChange={handleChange}
                                            min="0"
                                            placeholder="0"
                                            className="form-control"
                                            readOnly
                                        />
                                    </div>
                                    <div className="mb-3 col-lg-12">
                                        <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                            Task List *
                                        </label>
                                        <input
                                            type="text"
                                            value={currentTask}
                                            onChange={(e) => setCurrentTask(e.target.value)}
                                            onKeyDown={handleTaskKeyDown}
                                            placeholder="Type task and press Enter to add"
                                            className="form-control"
                                        />
                                        {tasks.length > 0 && (
                                            <div className="mt-2">
                                                <ul className="list-group">
                                                    {tasks.map((task, index) => (
                                                        <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                                            {task}
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger"
                                                                onClick={() => removeTask(index)}
                                                            >
                                                                ×
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                            Time Spent
                                        </label> 
                                        <div className="col-6">
                                            <select
                                                name="time_spent_minutes"
                                                value={formData.time_spent_minutes}
                                                onChange={handleChange}
                                                className="form-select"
                                            >
                                                <option value="0">0</option>
                                                <option value="15">15</option>
                                                <option value="30">30</option>
                                                <option value="45">45</option>
                                            </select>
                                        </div>
                                    </div>

                                    {formData.task_category === 'Meeting' && (
                                        <div className="mb-4">
                                            <label className="form-label fw-semibold" style={{ color: '#065d48' }}>
                                                Meetings
                                            </label>
                                            <input
                                                type="number"
                                                name="meeting_count"
                                                value={formData.meeting_count}
                                                onChange={handleChange}
                                                min="0"
                                                placeholder="0"
                                                className="form-control"
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="btn w-100 fw-bold"
                                        style={{ backgroundColor: '#065d48', color: 'white' }}
                                    >
                                        Submit Report
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewData;