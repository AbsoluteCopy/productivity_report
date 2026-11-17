import DailyTotalsCard from './DailyTotalsCard';
import TimeComparisonCard from './TimeComparisonCard';
import CategoryCard from './CategoryCard';

const ReportForm = ({
    formData,
    onFieldChange,
    onSubmit,
    isEditMode,
    editingUserName,
    dailyTotals,
    categories,
    taskCategories,
    onDeleteReport,
    onAddCategory,
    onFetchPreviousReports,
    copyLoading,
    setTaskListRef,
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
}) => {
    return (
        <form onSubmit={onSubmit}>
            <div className="row mb-4">
                <div className="mb-3 col-lg-6">
                    <label className="form-label fw-semibold text-green-dark">
                        Date *
                    </label>
                    <input type="date" name="date" value={formData.date}
                        onChange={onFieldChange} required
                        className="form-control" disabled={isEditMode}
                        max={formData.work_type === "Working" ? new Date().toISOString().split('T')[0] : undefined}
                    />
                </div>
                <div className="col-lg-6 col-sm-12">
                    <div className="mb-3">
                        <label className="form-label fw-semibold text-green-dark">
                            Option *
                        </label>
                        <br />
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" name="work_type" id="working" value="Working" checked={!formData.work_type || formData.work_type === "Working"} onChange={onFieldChange} required disabled={isEditMode} />
                            <label className="form-check-label" htmlFor="working">Working</label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" name="work_type" id="pto" value="PTO" checked={formData.work_type === "PTO"} onChange={onFieldChange} required disabled={isEditMode} />
                            <label className="form-check-label" htmlFor="pto">PTO</label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" name="work_type" id="holiday" value="Holiday" checked={formData.work_type === "Holiday"} onChange={onFieldChange} required disabled={isEditMode} />
                            <label className="form-check-label" htmlFor="holiday">Holiday</label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" name="work_type" id="company_event" value="Company Event" checked={formData.work_type === "Company Event"} onChange={onFieldChange} required disabled={isEditMode} />
                            <label className="form-check-label" htmlFor="company_event">Company Event</label>
                        </div>
                    </div>
                </div>
                {(formData.work_type === "Holiday" || formData.work_type === "Company Event") && (
                    <div className="col-12">
                        <div className="col-12">
                            <div className="mb-3">
                                <label className="form-label fw-semibold text-green-dark">
                                    {formData.work_type === "Company Event" ? "Event Name *" : "Holiday Name *"}
                                </label>
                                <input
                                    type="text"
                                    name="holiday_name"
                                    value={formData.holiday_name}
                                    onChange={onFieldChange}
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
                    <DailyTotalsCard
                        dailyTotals={dailyTotals}
                        isEditMode={isEditMode}
                        editingUserName={editingUserName}
                        date={formData.date}
                    />
                    {isEditMode && formData.work_type === 'Working' && categories[0] && (
                        <TimeComparisonCard categories={categories} />
                    )}
                    {categories.map((cat, index) => (
                        <CategoryCard
                            key={cat.id}
                            cat={cat}
                            index={index}
                            canRemove={categories.length > 1}
                            isEditMode={isEditMode}
                            taskCategories={taskCategories}
                            setTaskListRef={setTaskListRef}
                            onRemoveCategory={onRemoveCategory}
                            onRenameOther={onRenameOther}
                            onCategoryChange={onCategoryChange}
                            onTimeSpentChange={onTimeSpentChange}
                            onTimeSpentBlur={onTimeSpentBlur}
                            onMeetingTitleChange={onMeetingTitleChange}
                            onTaskChange={onTaskChange}
                            onTaskKeyDown={onTaskKeyDown}
                            onAddTask={onAddTask}
                            onRemoveTask={onRemoveTask}
                            onHasTimeSpentChange={onHasTimeSpentChange}
                        />
                    ))}
                    <div className="d-flex gap-2 mb-3">
                        <button type="button" className="btn btn-outline-success flex-grow-1" onClick={onAddCategory}>
                            + Add Another Category
                        </button>
                        {!isEditMode && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary d-flex align-items-center"
                                onClick={onFetchPreviousReports}
                                disabled={copyLoading}
                                title="Copy tasks from your most recent previous working day"
                            >
                                {copyLoading
                                    ? <span className="spinner-border spinner-border-sm me-1" role="status" />
                                    : <i className="bi bi-clipboard-plus me-1"></i>
                                }
                                {copyLoading ? ' Loading...' : ' Copy from Previous Day'}
                            </button>
                        )}
                    </div>
                </>
            )}
            {isEditMode ? (
                <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-success flex-grow-1 fw-bold py-2">
                        <i className="bi bi-check-circle me-1"></i>Update Report
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-danger fw-semibold px-4 py-2"
                        onClick={onDeleteReport}
                        title="Permanently remove this report"
                    >
                        <i className="bi bi-trash me-1"></i>Delete Report
                    </button>
                </div>
            ) : (
                <button type="submit" className="btn btn-success w-100 fw-bold py-2">
                    <i className="bi bi-play-circle me-1"></i> {formData.work_type && formData.work_type === 'Working' ? 'Start Task' : 'Save ' + formData.work_type}
                </button>
            )}
        </form>
    );
};

export default ReportForm;
