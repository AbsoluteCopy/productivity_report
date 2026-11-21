import CategorySelect from './CategorySelect';
import { isDarkMode } from '../../utils/darkMode';
import { useState } from 'react';

const PRESET_TIMES = ['15', '30', '45', '60', '90', '120'];

const CategoryCard = ({
    cat,
    index,
    canRemove,
    isEditMode,
    taskCategories,
    onRemoveCategory,
    onRenameOther,
    onCategoryChange,
    onTimeSpentChange,
    onTimeSpentBlur,
    onMeetingTitleChange,
    onTaskChange,
    onTaskKeyDown,
    onAddTask,
    onRemoveTask,
    onHasTimeSpentChange,
    setTaskListRef,
}) => {
    const [isEditingCustomTime, setIsEditingCustomTime] = useState(false);
    const taskCount = Array.isArray(cat.tasks) ? cat.tasks.length : 0;
    const timePerTask = Number(cat.timeSpent) || 0;
    const totalCatEstMinutes = cat.category === 'Meeting'
        ? (Number(cat.meetingCount) || 1) * timePerTask
        : taskCount * timePerTask;
    const catActualMinutes = (cat.actualTime !== undefined && cat.actualTime !== null && cat.actualTime !== '')
        ? Number(cat.actualTime)
        : null;
    const timeSelectValue = isEditingCustomTime
        ? 'custom'
        : (PRESET_TIMES.includes(String(cat.timeSpent))
            ? String(cat.timeSpent)
            : (cat.timeSpent !== '' && cat.timeSpent !== null && cat.timeSpent !== undefined ? 'custom' : ''));
    const showCustomTimeInput = isEditingCustomTime || !PRESET_TIMES.includes(String(cat.timeSpent)) || cat.timeSpent === '';
    const timeDisabled = cat.category === 'Others' && cat.hasTimeSpent;
    const matchedCategory = taskCategories.find(c => c.name === cat.category);
    const dark = isDarkMode();
    const softGreenBg = dark ? 'rgba(95,199,172,0.15)' : 'rgba(6, 93, 72, 0.1)';
    const softGreenText = dark ? '#5fc7ac' : '#065d48';
    const cardBg = dark ? '#1a2421' : '#ffffff';
    const cardShadow = dark ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.08)';
    const borderColor = dark ? '#2a3a35' : '#e8e8e8';
    const hoverBorderColor = dark ? '#3a4a45' : '#d0d0d0';

    const handleTimeSelect = (e) => {
        const val = e.target.value;
        if (val === 'custom') {
            if (PRESET_TIMES.includes(String(cat.timeSpent))) {
                onTimeSpentChange(cat.id, '');
            }
        } else {
            onTimeSpentChange(cat.id, val);
        }
    };

    return (
        <div
            className="card mb-3"
            style={{
                border: `1px solid ${borderColor}`,
                backgroundColor: cardBg,
                boxShadow: cardShadow,
                transition: 'all 0.2s ease-in-out',
                borderRadius: '12px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = hoverBorderColor}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = borderColor}
        >
            <div className="card-body" style={{ padding: '1rem 1rem 1.25rem' }}>
                <div className="d-flex justify-content-between align-items-center mb-3 mb-md-4 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <h5 className="card-title mb-0 text-green-dark" style={{ fontSize: '1rem', fontWeight: '600' }}>
                            Category {index + 1}
                        </h5>
                        {cat.category && cat.category !== 'Meeting' && (
                            <span
                                className="badge rounded-pill"
                                style={{
                                    backgroundColor: softGreenBg,
                                    color: softGreenText,
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    padding: '0.3rem 0.65rem',
                                    border: `1px solid ${softGreenBg}`
                                }}
                            >
                                <i className="bi bi-clock me-1"></i>{totalCatEstMinutes}m {taskCount > 0 && `(${timePerTask}m × ${taskCount})`}
                            </span>
                        )}
                        {cat.category === 'Meeting' && (
                            <span
                                className="badge rounded-pill"
                                style={{
                                    backgroundColor: softGreenBg,
                                    color: softGreenText,
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    padding: '0.3rem 0.65rem',
                                    border: `1px solid ${softGreenBg}`
                                }}
                            >
                                <i className="bi bi-clock me-1"></i>{totalCatEstMinutes}m
                            </span>
                        )}
                        {isEditMode && catActualMinutes !== null && (
                            <span
                                className="badge rounded-pill"
                                style={{
                                    backgroundColor: dark ? 'rgba(255, 255, 255, 0.1)' : '#f8f9fa',
                                    color: dark ? '#e4e9e7' : '#333',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    padding: '0.3rem 0.65rem',
                                    border: `1px solid ${dark ? 'rgba(255, 255, 255, 0.2)' : '#dee2e6'}`
                                }}
                            >
                                <i className="bi bi-stopwatch me-1" style={{ color: '#28a745' }}></i>Actual: {catActualMinutes}m
                            </span>
                        )}
                    </div>
                    {canRemove && (
                        <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => onRemoveCategory(cat.id)}
                            style={{
                                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                                color: '#dc3545',
                                border: '1px solid rgba(220, 53, 69, 0.3)',
                                fontWeight: '500',
                                transition: 'all 0.2s ease-in-out',
                                padding: '0.35rem 0.7rem',
                                fontSize: '0.85rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#dc3545';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                                e.currentTarget.style.color = '#dc3545';
                            }}
                        >
                            <i className="bi bi-trash me-1"></i>Remove
                        </button>
                    )}
                </div>

                <div className="row">
                    <div className="mb-3 col-12 col-md-6 col-lg-6">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <label className="form-label fw-semibold mb-0 text-green-dark" style={{ fontSize: '0.9rem' }}>
                                Task Category *
                            </label>
                            {cat.category === 'Others' && cat.sub_category && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link p-0 text-decoration-none fw-semibold"
                                    style={{
                                        color: softGreenText,
                                        fontSize: '0.8rem',
                                        transition: 'opacity 0.2s ease'
                                    }}
                                    onClick={() => onRenameOther(cat.id, cat.sub_category)}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                    <i className="bi bi-pencil-square me-1"></i>Rename
                                </button>
                            )}
                        </div>
                        <CategorySelect
                            cat={cat}
                            taskCategories={taskCategories}
                            onSelect={(val) => onCategoryChange(cat.id, val)}
                        />
                    </div>

                    {cat.category !== 'Meeting' && (
                        <div className="mb-3 col-12 col-md-6 col-lg-6">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <div className="d-flex align-items-center flex-wrap gap-2">
                                    <label className="form-label fw-semibold mb-0 text-green-dark" style={{ fontSize: '0.9rem' }}>
                                        Time per Task (mins) *
                                    </label>
                                    {matchedCategory?.default_time && (
                                        <span
                                            className="badge rounded-pill"
                                            style={{
                                                backgroundColor: softGreenBg,
                                                color: softGreenText,
                                                fontSize: '0.72rem',
                                                fontWeight: '600',
                                                padding: '0.25rem 0.6rem',
                                                border: `1px solid ${softGreenBg}`
                                            }}
                                        >
                                            <i className="bi bi-clock me-1"></i>{matchedCategory.default_time}m
                                        </span>
                                    )}
                                </div>
                                {cat.category === 'Others' && (
                                    <div className="form-check mb-0">
                                        <input
                                            type="checkbox"
                                            checked={cat.hasTimeSpent || false}
                                            onChange={(e) => onHasTimeSpentChange(cat.id, e.target.checked)}
                                            className="form-check-input"
                                            id={`noTimeSpent-${cat.id}`}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <label
                                            className="form-check-label small fw-semibold text-muted"
                                            htmlFor={`noTimeSpent-${cat.id}`}
                                            style={{ cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            No Time
                                        </label>
                                    </div>
                                )}
                            </div>
                            <div className="d-flex gap-2 align-items-center">
                                <select
                                    value={timeSelectValue}
                                    onChange={handleTimeSelect}
                                    className="form-select"
                                    disabled={timeDisabled}
                                    required={!timeDisabled}
                                    style={{
                                        fontSize: '0.85rem',
                                        borderColor: borderColor,
                                        backgroundColor: cardBg,
                                        color: dark ? '#e4e9e7' : '#333'
                                    }}
                                >
                                    <option value="">Select Time</option>
                                    <option value="15">15 mins</option>
                                    <option value="30">30 mins</option>
                                    <option value="45">45 mins</option>
                                    <option value="60">60 mins</option>
                                    <option value="90">90 mins</option>
                                    <option value="120">120 mins</option>
                                    <option value="custom">Custom...</option>
                                </select>
                                {showCustomTimeInput && (
                                    <input
                                        type="number"
                                        value={cat.timeSpent}
                                        onChange={(e) => onTimeSpentChange(cat.id, e.target.value)}
                                        onFocus={() => setIsEditingCustomTime(true)}
                                        onBlur={(e) => {
                                            setIsEditingCustomTime(false);
                                            onTimeSpentBlur(cat.id, e.target.value);
                                        }}
                                        min="0"
                                        step="1"
                                        placeholder="Enter minutes"
                                        className="form-control"
                                        disabled={timeDisabled}
                                        required={!timeDisabled}
                                        style={{
                                            fontSize: '0.85rem',
                                            borderColor: borderColor,
                                            backgroundColor: cardBg,
                                            color: dark ? '#e4e9e7' : '#333'
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    {cat.category === 'Meeting' && (
                        <>
                            <div className="mb-3 col-12 col-md-6 col-lg-6">
                                <label className="form-label fw-semibold text-green-dark" style={{ fontSize: '0.9rem' }}>
                                    Meeting Duration (mins) *
                                </label>
                                <div className="d-flex gap-2 align-items-center">
                                    <select
                                        value={timeSelectValue}
                                        onChange={handleTimeSelect}
                                        className="form-select"
                                        required
                                        style={{
                                            fontSize: '0.85rem',
                                            borderColor: borderColor,
                                            backgroundColor: cardBg,
                                            color: dark ? '#e4e9e7' : '#333'
                                        }}
                                    >
                                        <option value="">Select Time</option>
                                        <option value="15">15 mins</option>
                                        <option value="30">30 mins</option>
                                        <option value="45">45 mins</option>
                                        <option value="60">60 mins</option>
                                        <option value="90">90 mins</option>
                                        <option value="120">120 mins</option>
                                        <option value="custom">Custom...</option>
                                    </select>
                                    {showCustomTimeInput && (
                                        <input
                                            type="number"
                                            value={cat.timeSpent}
                                            onChange={(e) => onTimeSpentChange(cat.id, e.target.value)}
                                            onFocus={() => setIsEditingCustomTime(true)}
                                            onBlur={(e) => {
                                                setIsEditingCustomTime(false);
                                                onTimeSpentBlur(cat.id, e.target.value);
                                            }}
                                            min="0"
                                            step="1"
                                            placeholder="Enter minutes"
                                            className="form-control"
                                            required
                                            style={{
                                                fontSize: '0.85rem',
                                                borderColor: borderColor,
                                                backgroundColor: cardBg,
                                                color: dark ? '#e4e9e7' : '#333'
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="mb-3 col-12">
                                <label className="form-label fw-semibold text-green-dark" style={{ fontSize: '0.9rem' }}>
                                    Meeting Title
                                </label>
                                <input
                                    type="text"
                                    value={cat.meetingTitle}
                                    onChange={(e) => onMeetingTitleChange(cat.id, e.target.value)}
                                    placeholder="Enter meeting title"
                                    className="form-control"
                                    name='meeting_title'
                                    style={{
                                        fontSize: '0.85rem',
                                        borderColor: borderColor,
                                        backgroundColor: cardBg,
                                        color: dark ? '#e4e9e7' : '#333'
                                    }}
                                />
                            </div>
                        </>
                    )}
                    {cat.category !== 'Meeting' && (
                        <>
                            <div className="mb-3 col-12 col-md-8 col-lg-9">
                                <label className="form-label fw-semibold text-green-dark" style={{ fontSize: '0.9rem' }}>
                                    Task List *
                                </label>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        value={cat.currentTask}
                                        onChange={(e) => onTaskChange(cat.id, e.target.value)}
                                        onKeyDown={(e) => onTaskKeyDown(e, cat.id)}
                                        placeholder="Type task and press Enter or click Add"
                                        className="form-control"
                                        style={{
                                            fontSize: '0.85rem',
                                            borderColor: borderColor,
                                            backgroundColor: cardBg,
                                            color: dark ? '#e4e9e7' : '#333'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => onAddTask(cat.id, cat.currentTask)}
                                        style={{
                                            backgroundColor: 'rgba(25, 135, 84, 0.1)',
                                            color: '#198754',
                                            border: '1px solid rgba(25, 135, 84, 0.3)',
                                            fontWeight: '500',
                                            transition: 'all 0.2s ease-in-out',
                                            fontSize: '0.85rem'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#198754';
                                            e.currentTarget.style.color = '#fff';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(25, 135, 84, 0.1)';
                                            e.currentTarget.style.color = '#198754';
                                        }}
                                    >
                                        <i className="bi bi-patch-plus me-1"></i>Add
                                    </button>
                                </div>
                                {cat.tasks.length > 0 && (
                                    <div
                                        className="mt-2"
                                        style={{
                                            maxHeight: '180px',
                                            overflowY: 'auto',
                                            border: `1px solid ${borderColor}`,
                                            borderRadius: '8px',
                                            boxShadow: dark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 1px 4px rgba(0, 0, 0, 0.05)'
                                        }}
                                        ref={(el) => setTaskListRef(cat.id, el)}
                                    >
                                        <ul className="list-group list-group-flush mb-0">
                                            {cat.tasks.map((task, taskIndex) => (
                                                <li
                                                    key={taskIndex}
                                                    className="list-group-item d-flex justify-content-between align-items-center py-2 px-3"
                                                    style={{
                                                        backgroundColor: dark
                                                            ? (taskIndex % 2 === 0 ? 'rgba(26, 36, 33, 0.8)' : 'rgba(31, 43, 40, 0.8)')
                                                            : (taskIndex % 2 === 0 ? '#ffffff' : '#f8f9fa'),
                                                        borderBottom: `1px solid ${borderColor}`,
                                                        transition: 'background-color 0.15s ease'
                                                    }}
                                                >
                                                    <span
                                                        className="text-break"
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            color: dark ? '#e4e9e7' : '#333',
                                                            fontWeight: '400'
                                                        }}
                                                    >
                                                        {task}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm py-0 px-2 ms-2"
                                                        style={{
                                                            fontSize: '1.3rem',
                                                            lineHeight: '1',
                                                            color: '#dc3545',
                                                            backgroundColor: 'transparent',
                                                            border: 'none',
                                                            opacity: '0.6',
                                                            transition: 'all 0.2s ease',
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Remove task"
                                                        onClick={() => onRemoveTask(cat.id, taskIndex)}
                                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                                    >
                                                        ×
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="mb-3 col-12 col-md-4 col-lg-3">
                                <label className="form-label fw-semibold text-green-dark" style={{ fontSize: '0.9rem' }}>
                                    Tasks
                                </label>
                                <input
                                    type="number"
                                    value={cat.tasks.length}
                                    readOnly
                                    className="form-control"
                                    style={{
                                        fontSize: '0.85rem',
                                        borderColor: borderColor,
                                        backgroundColor: dark ? 'rgba(95,199,172,0.1)' : 'rgba(6, 93, 72, 0.05)',
                                        color: softGreenText,
                                        fontWeight: '600'
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoryCard;
