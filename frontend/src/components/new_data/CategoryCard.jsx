import CategorySelect from './CategorySelect';
import { isDarkMode } from '../../utils/darkMode';

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
    const taskCount = Array.isArray(cat.tasks) ? cat.tasks.length : 0;
    const timePerTask = Number(cat.timeSpent) || 0;
    const totalCatEstMinutes = cat.category === 'Meeting'
        ? (Number(cat.meetingCount) || 1) * timePerTask
        : taskCount * timePerTask;
    const catActualMinutes = (cat.actualTime !== undefined && cat.actualTime !== null && cat.actualTime !== '')
        ? Number(cat.actualTime)
        : null;
    const timeSelectValue = PRESET_TIMES.includes(String(cat.timeSpent))
        ? String(cat.timeSpent)
        : (cat.timeSpent !== '' && cat.timeSpent !== null && cat.timeSpent !== undefined ? 'custom' : '');
    const showCustomTimeInput = !PRESET_TIMES.includes(String(cat.timeSpent)) || cat.timeSpent === '';
    const timeDisabled = cat.category === 'Others' && cat.hasTimeSpent;
    const matchedCategory = taskCategories.find(c => c.name === cat.category);
    const dark = isDarkMode();
    const softGreenBg = dark ? 'rgba(95,199,172,0.15)' : 'rgba(6, 93, 72, 0.1)';
    const softGreenText = dark ? '#5fc7ac' : '#065d48';

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
        <div className="card mb-3" style={{ border: `2px solid ${dark ? '#2a3a35' : '#e0e0e0'}` }}>
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <h5 className="card-title mb-0 text-green-dark">
                            Category {index + 1}
                        </h5>
                        {cat.category && cat.category !== 'Meeting' && (
                            <span className="badge rounded-pill badge-soft-green-sm">
                                <i className="bi bi-clock me-1"></i>Suggested Target: {totalCatEstMinutes} mins {taskCount > 0 && `(${timePerTask}m × ${taskCount} task${taskCount > 1 ? 's' : ''})`}
                            </span>
                        )}
                        {cat.category === 'Meeting' && (
                            <span className="badge rounded-pill badge-soft-green-sm">
                                <i className="bi bi-clock me-1"></i>Meeting Suggested: {totalCatEstMinutes} mins
                            </span>
                        )}
                        {isEditMode && catActualMinutes !== null && (
                            <span className="badge rounded-pill bg-light text-dark border" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                <i className="bi bi-stopwatch me-1 text-success"></i>Actual: {catActualMinutes} mins
                            </span>
                        )}
                    </div>
                    {canRemove && (
                        <button type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => onRemoveCategory(cat.id)}
                        >
                            <i className="bi bi-trash me-1"></i>Remove Category
                        </button>
                    )}
                </div>

                <div className="row">
                    <div className="mb-3 col-lg-6">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <label className="form-label fw-semibold mb-0 text-green-dark">
                                Task Category *
                            </label>
                            {cat.category === 'Others' && cat.sub_category && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link p-0 text-decoration-none fw-semibold"
                                    style={{ color: softGreenText, fontSize: '0.82rem' }}
                                    onClick={() => onRenameOther(cat.id, cat.sub_category)}
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
                        <div className="mb-3 col-lg-6">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <div className="d-flex align-items-center">
                                    <label className="form-label fw-semibold mb-0 text-green-dark">
                                        Suggested Time per Task (Minutes) *
                                    </label>
                                    {matchedCategory?.default_time && (
                                        <span className="badge rounded-pill ms-2" style={{ backgroundColor: softGreenBg, color: softGreenText, fontSize: '0.75rem', fontWeight: '600' }}>
                                            <i className="bi bi-clock me-1"></i>Standard: {matchedCategory.default_time} min{matchedCategory.default_time > 1 ? 's' : ''}
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
                                        />
                                        <label className="form-check-label small fw-semibold text-muted" htmlFor={`noTimeSpent-${cat.id}`}>
                                            No Time Spent
                                        </label>
                                    </div>
                                )}
                            </div>
                            <div className="d-flex gap-2 align-items-center">
                                <select
                                    value={timeSelectValue}
                                    onChange={handleTimeSelect}
                                    className="form-select min-w-150"
                                    disabled={timeDisabled}
                                    required={!timeDisabled}
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
                                {showCustomTimeInput && (
                                    <input
                                        type="number"
                                        value={cat.timeSpent}
                                        onChange={(e) => onTimeSpentChange(cat.id, e.target.value)}
                                        onBlur={(e) => onTimeSpentBlur(cat.id, e.target.value)}
                                        min="0"
                                        step="1"
                                        placeholder="Enter minutes"
                                        className="form-control"
                                        disabled={timeDisabled}
                                        required={!timeDisabled}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    {cat.category === 'Meeting' && (
                        <>
                            <div className="mb-3 col-lg-6">
                                <label className="form-label fw-semibold text-green-dark">
                                    Meeting Duration (Minutes) *
                                </label>
                                <div className="d-flex gap-2 align-items-center">
                                    <select
                                        value={timeSelectValue}
                                        onChange={handleTimeSelect}
                                        className="form-select min-w-150"
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
                                    {showCustomTimeInput && (
                                        <input
                                            type="number"
                                            value={cat.timeSpent}
                                            onChange={(e) => onTimeSpentChange(cat.id, e.target.value)}
                                            onBlur={(e) => onTimeSpentBlur(cat.id, e.target.value)}
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
                                <label className="form-label fw-semibold text-green-dark">
                                    Meeting Title
                                </label>
                                <input
                                    type="text"
                                    value={cat.meetingTitle}
                                    onChange={(e) => onMeetingTitleChange(cat.id, e.target.value)}
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
                                <label className="form-label fw-semibold text-green-dark">
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
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-success"
                                        onClick={() => onAddTask(cat.id, cat.currentTask)}
                                    >
                                        <i className="bi bi-patch-plus me-1"></i>Add
                                    </button>
                                </div>
                                {cat.tasks.length > 0 && (
                                    <div
                                        className="mt-2 shadow-sm"
                                        style={{ maxHeight: '180px', overflowY: 'auto', border: `1px solid ${dark ? '#2a3a35' : '#dee2e6'}`, borderRadius: '6px' }}
                                        ref={(el) => setTaskListRef(cat.id, el)}
                                    >
                                        <ul className="list-group list-group-flush mb-0">
                                            {cat.tasks.map((task, taskIndex) => (
                                                <li key={taskIndex} className="list-group-item d-flex justify-content-between align-items-center py-2 px-3" style={{ backgroundColor: dark ? (taskIndex % 2 === 0 ? '#1a2421' : '#1f2b28') : (taskIndex % 2 === 0 ? '#ffffff' : '#f8f9fa') }}>
                                                    <span className="text-break" style={{ fontSize: '0.9rem', color: dark ? '#e4e9e7' : '#333' }}>{task}</span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger py-0 px-2 ms-2"
                                                        style={{ fontSize: '1.1rem', lineHeight: '1.2' }}
                                                        title="Remove task"
                                                        onClick={() => onRemoveTask(cat.id, taskIndex)}
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
                                <label className="form-label fw-semibold text-green-dark">
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
};

export default CategoryCard;
