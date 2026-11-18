
import { isDarkMode } from '../../utils/darkMode';

const CopyPreviousDayModal = ({
    onClose,
    previousReports,
    selectedCopyIds,
    selectedCopyDate,
    availableDates,
    onCopyDateChange,
    onToggleSelect,
    onToggleAll,
    onCopySelected,
    formatDateLabel,
}) => {
    const dark = isDarkMode();
    return (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header" style={{ backgroundColor: '#065d48', color: 'white' }}>
                        <h5 className="modal-title">
                            <i className="bi bi-clipboard-plus me-2"></i>Copy Tasks from a Previous Day
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose} />
                    </div>
                    <div className="modal-body">
                        {/* Date picker row */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold text-green-dark">
                                Select a date to copy from:
                            </label>
                            <select
                                className="form-select"
                                value={selectedCopyDate}
                                onChange={e => onCopyDateChange(e.target.value)}
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
                                onClick={onToggleAll}
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
                                        onClick={() => onToggleSelect(report.id)}
                                        className="card"
                                        style={{
                                            cursor: 'pointer',
                                            border: isSelected
                                                ? `2px solid ${dark ? '#5fc7ac' : '#065d48'}`
                                                : `2px solid ${dark ? '#2a3a35' : '#e0e0e0'}`,
                                            backgroundColor: isSelected
                                                ? (dark ? 'rgba(95,199,172,0.08)' : '#f0faf6')
                                                : (dark ? '#1a2421' : '#fff'),
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
                                                        onChange={() => onToggleSelect(report.id)}
                                                        onClick={e => e.stopPropagation()}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                    <div>
                                                        <span className="fw-semibold text-green-dark">{displayCat}</span>
                                                        {taskList.length > 0 && (
                                                            <div className="mt-1 ps-1 pe-2" style={{ maxHeight: '130px', overflowY: 'auto' }}>
                                                                <ul className="mb-0 ps-3" style={{ fontSize: '0.875rem', color: dark ? '#cfe0da' : '#555' }}>
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
                                                        <span className="badge rounded-pill" style={{ backgroundColor: dark ? 'rgba(95,199,172,0.15)' : 'rgba(6,93,72,0.1)', color: dark ? '#5fc7ac' : '#065d48', fontSize: '0.8rem' }}>
                                                            <i className="bi bi-clock me-1"></i>{report.time_spent} min
                                                        </span>
                                                    )}
                                                    {report.task_category === 'Meeting' && report.meeting_count > 0 && (
                                                        <div style={{ fontSize: '0.8rem', color: dark ? '#9db3ab' : '#888', marginTop: '2px' }}>
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
                        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-success fw-semibold btn-brand-solid"
                            onClick={onCopySelected}
                            disabled={selectedCopyIds.size === 0}
                        >
                            Copy Selected ({selectedCopyIds.size})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CopyPreviousDayModal;
