
const TimeComparisonCard = ({ categories }) => {
    return (
        <div className="card mb-4 border-0 shadow-sm" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <div className="card-body p-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-2">
                        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', backgroundColor: 'rgba(6, 93, 72, 0.1)', color: '#065d48' }}>
                            <i className="bi bi-clock-history fs-5"></i>
                        </div>
                        <div>
                            <h6 className="mb-0 fw-bold text-dark">Time Comparison Overview</h6>
                            <small className="text-muted">Target estimate vs recorded real-time</small>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                        <div className="px-3 py-1 bg-white rounded-3 border text-center">
                            <small className="text-muted d-block label-caps">Suggested Total</small>
                            <span className="fw-bold text-green-dark">
                                {categories.reduce((sum, c) => sum + (c.category === 'Meeting' ? (Number(c.meetingCount) || 1) * (Number(c.timeSpent) || 0) : (c.tasks?.length || 0) * (Number(c.timeSpent) || 0)), 0)} mins
                            </span>
                        </div>
                        <div className="px-3 py-1 bg-white rounded-3 border text-center">
                            <small className="text-muted d-block label-caps">Actual Time</small>
                            <span className="fw-bold text-dark">
                                {categories[0].actualTime !== '' && categories[0].actualTime !== null && categories[0].actualTime !== undefined
                                    ? `${categories[0].actualTime} mins`
                                    : 'Untimed'}
                            </span>
                        </div>
                        {categories[0].actualTime !== '' && categories[0].actualTime !== null && categories[0].actualTime !== undefined && (
                            (() => {
                                const est = categories.reduce((sum, c) => sum + (c.category === 'Meeting' ? (Number(c.meetingCount) || 1) * (Number(c.timeSpent) || 0) : (c.tasks?.length || 0) * (Number(c.timeSpent) || 0)), 0);
                                const act = Number(categories[0].actualTime) || 0;
                                if (est <= 0 || act <= 0) return null;
                                const diff = est - act;
                                const isFaster = diff >= 0;
                                const pct = Math.round((Math.abs(diff) / est) * 100);
                                return (
                                    <div className={`px-3 py-1 rounded-3 border text-center ${isFaster ? 'bg-success-subtle text-success border-success-subtle' : 'bg-danger-subtle text-danger border-danger-subtle'}`}>
                                        <small className="d-block label-caps">Variance</small>
                                        <span className="fw-bold">
                                            {isFaster ? `${diff.toFixed(1)}m faster (${pct}%)` : `${Math.abs(diff).toFixed(1)}m over (${pct}%)`}
                                        </span>
                                    </div>
                                );
                            })()
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeComparisonCard;
