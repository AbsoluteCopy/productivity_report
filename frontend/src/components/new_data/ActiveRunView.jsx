import { fmtClock } from '../../utils/timeUtils';
import { isDarkMode } from '../../utils/darkMode';

const ActiveRunView = ({
    run,
    elapsedSec,
    overtime,
    description,
    onDescriptionChange,
    nameInsured,
    onNameInsuredChange,
    onAttachmentChange,
    saving,
    onCancel,
    onStartNext,
    onEndTask,
    onPauseTask,
}) => {
    const cur = run.queue[run.index];
    const p = cur.payload;
    const running = !!run.startedAt;
    const dark = isDarkMode();
    const accentColor = overtime ? "#b14c4c" : (dark ? "#5fc7ac" : "#065d48");
    const pct = cur.expectedSeconds ? Math.min((elapsedSec / cur.expectedSeconds) * 100, 100) : 0;

    return (
        <div className="container py-3 py-md-4 px-3 px-md-5">
            <div className="row g-3 g-md-4 px-0 px-md-5 mx-0 mx-md-5 justify-content-center">

                {/* Main Card */}
                <div className="col-12 col-lg-8">
                    <div className="card shadow-sm h-100">
                        <div className="card-body p-3 p-md-4">
                            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                <span className="badge bg-secondary" style={{ fontSize: '0.8rem' }}>Category {run.index + 1} of {run.queue.length}</span>
                                {cur.resumeReportId && (
                                    <span className="badge bg-warning text-dark" style={{ fontSize: '0.8rem' }}>Resuming paused task</span>
                                )}
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={onCancel} disabled={saving} style={{ fontSize: '0.85rem' }}>Cancel</button>
                            </div>

                            <h3 className="fw-bold mb-2 text-green-dark" style={{ fontSize: '1.25rem', fontSize: 'clamp(1.1rem, 4vw, 1.5rem)' }}>{cur.label}</h3>

                            <div className="d-flex justify-content-center my-3 my-md-4">
                                {(() => {
                                    const size = 180;
                                    const strokeWidth = 10;
                                    const radius = (size - strokeWidth) / 2;
                                    const circumference = 2 * Math.PI * radius;

                                    const progress = Math.min(pct, 100);
                                    const offset =
                                        circumference - (progress / 100) * circumference;

                                    return (
                                        <div style={{ position: 'relative', width: size, height: size, maxWidth: '220px', maxHeight: '220px' }}>
                                            <svg width="100%" height="100%" viewBox="0 0 180 180" preserveAspectRatio="xMidYMid meet">
                                                {/* Background Circle */}
                                                <circle
                                                    cx="90"
                                                    cy="90"
                                                    r={radius}
                                                    fill="none"
                                                    stroke={dark ? '#2a3a35' : '#e5e7eb'}
                                                    strokeWidth={strokeWidth}
                                                />

                                                {/* Progress Circle */}
                                                <circle
                                                    cx="90"
                                                    cy="90"
                                                    r={radius}
                                                    fill="none"
                                                    stroke={accentColor}
                                                    strokeWidth={strokeWidth}
                                                    strokeLinecap="round"
                                                    strokeDasharray={circumference}
                                                    strokeDashoffset={offset}
                                                    transform="rotate(-90 90 90)"
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
                                                        fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
                                                        fontWeight: 700,
                                                        fontVariantNumeric: "tabular-nums",
                                                        color: accentColor,
                                                    }}
                                                >
                                                    {fmtClock(running ? elapsedSec : 0)}
                                                </div>

                                                <small className="text-muted" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}>
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
                                        backgroundColor: dark ? "rgba(245,158,11,0.12)" : "#fffbeb",
                                        border: `1px solid ${dark ? "#6b5410" : "#fde68a"}`
                                    }}
                                >
                                    <div className={dark ? 'fw-semibold' : 'fw-semibold text-warning-emphasis'} style={{ color: dark ? '#fbbf24' : undefined, fontSize: '0.9rem' }}>
                                        Suggested time reached
                                    </div>

                                    <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                                        You've spent {fmtClock(elapsedSec - cur.expectedSeconds)} &nbsp;
                                        beyond the suggested time duration on this task.
                                        Feel free to continue working and finish when ready.
                                    </small>
                                </div>
                            )}

                            {p.task_category === 'Meeting' ? (
                                <p className="mb-3" style={{ fontSize: '0.9rem' }}>{p.task_list[0]}</p>
                            ) : (
                                <ul className="list-group mb-3">
                                    {p.task_list.map((t, i) => <li key={i} className="list-group-item py-2" style={{ fontSize: '0.85rem' }}>{t}</li>)}
                                </ul>
                            )}

                            {running ? (
                                <>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-green-dark" style={{ fontSize: '0.9rem' }}>Name Insured (optional)</label>
                                        <input type="text" className="form-control" value={nameInsured}
                                            onChange={e => onNameInsuredChange(e.target.value)}
                                            placeholder="Name of the insured"
                                            style={{ fontSize: '0.85rem' }} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-green-dark" style={{ fontSize: '0.9rem' }}>Description (optional)</label>
                                        <textarea className="form-control" rows={3} value={description}
                                            onChange={e => onDescriptionChange(e.target.value)}
                                            placeholder="What did you do for this task?"
                                            style={{ fontSize: '0.85rem' }} />
                                    </div>
                                    <div className="mb-3" hidden>
                                        <label className="form-label fw-semibold text-green-dark">Attachment (optional, max 10 MB)</label>
                                        <input type="file" className="form-control"
                                            onChange={e => onAttachmentChange(e.target.files[0] || null)} />
                                    </div>
                                    <div className="d-flex flex-column flex-md-row gap-2">
                                        <button className="btn btn-danger flex-fill fw-bold py-2" onClick={onEndTask} disabled={saving} style={{ fontSize: '0.9rem' }}>
                                            {saving ? 'Saving...' : <><i className="bi bi-stop-circle me-1"></i>End Task</>}
                                        </button>
                                        <button className="btn btn-warning flex-fill fw-bold py-2" onClick={onPauseTask} disabled={saving} style={{ fontSize: '0.9rem' }}>
                                            {saving ? 'Saving...' : <><i className="bi bi-pause-circle me-1"></i>Pause Task</>}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button className="btn btn-success w-100 fw-bold py-2 btn-brand-solid" onClick={onStartNext} style={{ fontSize: '0.9rem' }}>
                                    <i className="bi bi-play-circle me-1"></i>Start {cur.label}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side Card */}
                <div className="col-12 col-lg-4">
                    <div className="card shadow-sm h-100 border-0">
                        <div className="card-body p-3 p-md-4">

                            <div className="d-flex align-items-center gap-2 mb-3 mb-md-4 pb-3 border-bottom">
                                <span className="d-inline-flex align-items-center justify-content-center rounded-3 bg-success-subtle text-success" style={{ width: 32, height: 32 }}>
                                    <i className="bi bi-bar-chart" style={{ fontSize: '0.9rem' }}></i>
                                </span>
                                <h5 className="fw-bold mb-0" style={{ fontSize: '1rem' }}>Task Details</h5>
                            </div>

                            <ul className="list-group list-group-flush mb-3">
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 border-0 py-2">
                                    <span className="text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                                        <i className="bi bi-calendar3"></i>Date
                                    </span>
                                    <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>{p.date}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 border-0 py-2">
                                    <span className="text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                                        <i className="bi bi-clock"></i>Current Time
                                    </span>
                                    <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>{new Date().toLocaleTimeString()}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 border-0 py-2">
                                    <span className="text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                                        <i className="bi bi-play-circle"></i>Time Started
                                    </span>
                                    <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>{new Date(run.startedAt).toLocaleTimeString()}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 border-0 py-2">
                                    <span className="text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                                        <i className="bi bi-stopwatch"></i>Elapsed Time
                                    </span>
                                    <span className="fw-semibold" style={{ fontSize: '1.1rem' }}>{fmtClock(elapsedSec)}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 border-0 py-2">
                                    <span className="text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                                        <i className="bi bi-bullseye"></i>Target Time
                                    </span>
                                    <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>{cur.expectedSeconds ? fmtClock(cur.expectedSeconds) : "N/A"}</span>
                                </li>
                                {!overtime && (
                                    <li className="list-group-item d-flex justify-content-between align-items-center px-0 border-0 py-2">
                                        <span className="text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                                            <i className="bi bi-hourglass-split"></i>Time Remaining
                                        </span>
                                        <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>{`${fmtClock(cur.expectedSeconds - elapsedSec)}`}</span>
                                    </li>
                                )}
                            </ul>

                            {cur.expectedSeconds > 0 && (
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between small mb-1" style={{ fontSize: '0.75rem' }}>
                                        <span className="text-muted">Progress</span>
                                        <span className="fw-semibold">{Math.round(pct)}%</span>
                                    </div>
                                    <div className="progress" style={{ height: 6 }}>
                                        <div
                                            className={`progress-bar ${overtime ? "bg-danger" : "bg-success"}`}
                                            role="progressbar"
                                            style={{ width: `${pct}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            <div className="d-flex align-items-center justify-content-between rounded-3 px-3 py-2 bg-light border">
                                <span className="text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                                    <i className="bi bi-activity"></i>Status
                                </span>
                                <span
                                    className={`badge rounded-pill px-2 py-1 ${overtime
                                        ? "bg-danger-subtle text-danger border border-danger-subtle"
                                        : "bg-success-subtle text-success border border-success-subtle"
                                        }`}
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    {overtime ? "Beyond suggested time" : "On Track"}
                                </span>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ActiveRunView;
