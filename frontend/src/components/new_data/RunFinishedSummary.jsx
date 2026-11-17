import { fmtClock, compareText } from '../../utils/timeUtils';

const RunFinishedSummary = ({ run, onLogAnother }) => {
    const tExp = run.results.reduce((s, r) => s + (r.expectedSeconds || 0), 0);
    const tAct = run.results.filter(r => r.expectedSeconds > 0).reduce((s, r) => s + r.actualSeconds, 0);
    const overall = compareText(tAct, tExp);
    return (
        <div className="container py-4">
            <div className="card shadow-sm mx-auto" style={{ maxWidth: 720 }}>
                <div className="card-body p-4">
                    <h3 className="fw-bold text-center mb-3 text-green-dark">All Tasks Completed</h3>
                    <ul className="list-group mb-3">
                        {run.results.map((r, i) => {
                            const c = compareText(r.actualSeconds, r.expectedSeconds);
                            const startTime = r.timeAdded ? new Date(r.timeAdded).toLocaleTimeString() : '—';
                            const endTime = r.timeFinished ? new Date(r.timeFinished).toLocaleTimeString() : '—';
                            return (
                                <li key={i} className="list-group-item d-flex justify-content-between align-items-start">
                                    <div>
                                        <div className="fw-semibold">{r.label}</div>
                                        <small className="text-muted">
                                            Selected: {r.expectedSeconds ? fmtClock(r.expectedSeconds) : '—'} • Actual: {fmtClock(r.actualSeconds)}
                                        </small>
                                        <div className="text-muted fs-085">
                                            <i className="bi bi-clock-history me-1"></i>Started: {startTime}
                                            <span className="mx-2">•</span>
                                            <i className="bi bi-clock me-1"></i>Finished: {endTime}
                                        </div>
                                    </div>
                                    <span className={`fw-semibold ${c.cls}`}>{c.text}</span>
                                </li>
                            );
                        })}
                    </ul>
                    <div className={`text-center fs-5 fw-bold mb-3 ${overall.cls}`}>Overall: {overall.text}</div>
                    <button className="btn btn-success w-100 fw-bold btn-brand-solid"
                        onClick={onLogAnother}>
                        Log Another Task
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RunFinishedSummary;
