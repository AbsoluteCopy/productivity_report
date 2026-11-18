
import { isDarkMode } from '../../utils/darkMode';

const DailyTotalsCard = ({ dailyTotals, isEditMode, editingUserName, date }) => {
    const dark = isDarkMode();
    const accentColor = dailyTotals.minutes > 600 ? '#dc2626' : (dark ? '#5fc7ac' : '#065d48');
    return (
        <div
            className="card mb-4 border-0 shadow-sm"
            style={{
                background: dark
                    ? 'linear-gradient(135deg, #14201c 0%, #1a2421 100%)'
                    : 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                border: `1px solid ${dark ? '#2a3a35' : '#bbf7d0'}`,
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
                                stroke={dark ? '#2a3a35' : '#e2e8f0'}
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
                                            : (dark ? '#5fc7ac' : '#065d48')
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
                                color: accentColor,
                            }}
                        >
                            {dailyTotals.percent}%
                        </div>
                    </div>

                    <div>
                        {isEditMode && editingUserName && (
                            <div className="badge bg-light text-success border border-success-subtle px-2 py-1 mb-1 rounded-pill fs-072">
                                <i className="bi bi-person-fill me-1"></i>Employee: {editingUserName}
                            </div>
                        )}
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <h5 className="mb-0 fw-bold" style={{ color: accentColor }}>
                                Suggested Time Spent: {dailyTotals.totalHours > 0 ? `${dailyTotals.totalHours} hr${dailyTotals.totalHours > 1 ? 's' : ''} ` : ''}
                                {dailyTotals.remainingMins} min{dailyTotals.remainingMins !== 1 ? 's' : ''}
                            </h5>
                            {dailyTotals.minutes >= 450 && dailyTotals.minutes <= 510 && (
                                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill fs-072">
                                    <i className="bi bi-check-circle-fill me-1"></i>Full Day (7.5h)
                                </span>
                            )}
                            {dailyTotals.minutes > 600 && (
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 rounded-pill fs-072">
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
                                `Total Work Hours for ${date} • Target: 7.5 hrs (450 mins)`
                            )}
                        </small>
                        <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
                            <h6 className="mb-0 fw-bold text-green-dark">
                                Actual Time Spent:{' '}
                                {dailyTotals.actualMinutes > 0 ? (
                                    <>
                                        {dailyTotals.totalActualHours > 0 ? `${dailyTotals.totalActualHours} hr${dailyTotals.totalActualHours > 1 ? 's' : ''} ` : ''}
                                        {dailyTotals.remainingActualMins} min{dailyTotals.remainingActualMins !== 1 ? 's' : ''}
                                    </>
                                ) : (
                                    'Not recorded'
                                )}
                            </h6>
                            {dailyTotals.actualMinutes > 0 && (
                                <span className="badge bg-light text-dark border px-2 py-1 rounded-pill fs-072">
                                    {dailyTotals.actualPercent}% of target
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Tasks Count */}
                <div className="d-flex align-items-center gap-3">
                    <div className="text-end">
                        <div className="fw-bold fs-5 text-green-dark">
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
    );
};

export default DailyTotalsCard;
