
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
            <div className="card-body p-3 p-md-4 d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
                {/* Left: Circular Progress Ring */}
                <div className="d-flex align-items-center gap-3 flex-shrink-0">
                    <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                        <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                            <circle
                                cx="28"
                                cy="28"
                                r="24"
                                stroke={dark ? '#2a3a35' : '#e2e8f0'}
                                strokeWidth="4"
                                fill="transparent"
                            />
                            <circle
                                cx="28"
                                cy="28"
                                r="24"
                                stroke={
                                    dailyTotals.minutes > 600
                                        ? '#ef4444'
                                        : dailyTotals.minutes >= 450
                                            ? '#10b981'
                                            : (dark ? '#5fc7ac' : '#065d48')
                                }
                                strokeWidth="4"
                                strokeDasharray={150.8}
                                strokeDashoffset={
                                    150.8 - (150.8 * Math.min(dailyTotals.minutes / dailyTotals.targetMinutes, 1))
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
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: accentColor,
                            }}
                        >
                            {dailyTotals.percent}%
                        </div>
                    </div>
                </div>

                {/* Middle: Hours Information */}
                <div className="flex-grow-1 w-100">
                    {isEditMode && editingUserName && (
                        <div className="badge bg-light text-success border border-success-subtle px-2 py-1 mb-2 rounded-pill" style={{ fontSize: '0.7rem' }}>
                            <i className="bi bi-person-fill me-1"></i>Employee: {editingUserName}
                        </div>
                    )}

                    {/* Suggested Hours Row */}
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <span className="fw-bold" style={{ color: accentColor, fontSize: '1rem' }}>
                            Suggested: {dailyTotals.totalHours > 0 ? `${dailyTotals.totalHours}h ` : ''}
                            {dailyTotals.remainingMins}m
                        </span>
                        {dailyTotals.minutes >= 450 && dailyTotals.minutes <= 510 && (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill" style={{ fontSize: '0.7rem' }}>
                                <i className="bi bi-check-circle-fill me-1"></i>Full Day
                            </span>
                        )}
                        {dailyTotals.minutes > 600 && (
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 rounded-pill" style={{ fontSize: '0.7rem' }}>
                                <i className="bi bi-exclamation-triangle-fill me-1"></i>Exceeds 7.5h
                            </span>
                        )}
                    </div>

                    {/* Details Row */}
                    <div className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>
                        {dailyTotals.priorMinutes > 0 ? (
                            <>
                                <span className="fw-semibold text-dark">{dailyTotals.priorMinutes}m</span> logged + <span className="fw-semibold text-dark">{dailyTotals.currentMinutes}m</span> new &bull; Target: 7.5h
                            </>
                        ) : (
                            `Total Work Hours for ${date} • Target: 7.5h (450m)`
                        )}
                    </div>

                    {/* Actual Hours Row */}
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="fw-bold text-green-dark" style={{ fontSize: '0.9rem' }}>
                            Actual:{' '}
                            {dailyTotals.actualMinutes > 0 ? (
                                <>
                                    {dailyTotals.totalActualHours > 0 ? `${dailyTotals.totalActualHours}h ` : ''}
                                    {dailyTotals.remainingActualMins}m
                                </>
                            ) : (
                                'Not recorded'
                            )}
                        </span>
                        {dailyTotals.actualMinutes > 0 && (
                            <span className="badge bg-light text-dark border px-2 py-1 rounded-pill" style={{ fontSize: '0.7rem' }}>
                                {dailyTotals.actualPercent}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: Tasks Count */}
                <div className="d-flex align-items-center gap-3 flex-shrink-0 justify-content-center justify-content-md-end">
                    <div className="text-center text-md-end ps-3" style={{ borderLeft: `1px solid ${dark ? '#2a3a35' : '#e2e8f0'}` }}>
                        <div className="fw-bold text-green-dark" style={{ fontSize: '1.4rem', lineHeight: 1 }}>
                            {dailyTotals.tasksCount}
                        </div>
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {dailyTotals.priorTasks > 0
                                ? `${dailyTotals.priorTasks} + ${dailyTotals.currentTasks}`
                                : 'Total Tasks'}
                        </small>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyTotalsCard;
