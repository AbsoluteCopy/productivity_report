
import React, { useState } from 'react';

export const updates = [
    {
        id: 6,
        title: 'Attendance Tracking & Management Dashboard',
        description: 'Employees can now clock in/out right from the dashboard. Managers get a live Team Status panel (who’s active, away, or offline) plus Team Insights — charts for daily activity, hours by employee, most common tasks, and work type breakdown, filterable by day, week, month, or a custom date.',
        image: '/images/updates/team-status.jpg',
        date: 'November 9, 2026'
    },
    {
        id: 5,
        title: 'Employee Timeline & Attendance Page',
        description: 'Click any employee to see their day laid out — clock in/out times and every task with its start and end time. A new Attendance page shows clock in/out history and a 14-day trend for the whole team.',
        image: '/images/updates/attendance.jpg',
        date: 'November 9, 2026'
    },
    {
        id: 4,
        title: 'Real-Time Tracking & 7.5-Hour Shift Targets',
        description: 'Real-time actual time tracking is now integrated across Daily Reports, View Reports, Utilization Reports, and Excel exports. Daily work shift targets are also now aligned to 7.5 hrs (450 mins).',
        image: '/images/updates/team-insights.jpg',
        date: 'November 5, 2026'
    }
];

// Changes whenever a new update is added at the top of the list
export const ANNOUNCEMENT_VERSION = `${updates[0].id}-${updates[0].date}`;

const Announcement = ({ onClose }) => {
    const [activeSlide, setActiveSlide] = useState(0);

    const nextSlide = () => {
        setActiveSlide((prev) => (prev + 1) % updates.length);
    };

    const prevSlide = () => {
        setActiveSlide((prev) => (prev - 1 + updates.length) % updates.length);
    };

    return (
        <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
        >
            <div
                className="modal-dialog modal-dialog-centered modal-lg"
                role="document"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-content border-0 shadow rounded-4 overflow-hidden">

                    {/* Header */}
                    <div className="modal-header border-0 px-4 pt-4">
                        <div>
                            <h5 className="modal-title fw-bold">
                                <i className="bi bi-megaphone-fill me-2 text-success"></i>
                                What's New?
                            </h5>
                            <small className="text-muted">
                                Latest updates from our application
                            </small>
                        </div>

                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                            aria-label="Close"
                        />
                    </div>

                    {/* Body */}
                    <div className="modal-body p-0">

                        {/* Image */}
                        <div
                            className="bg-light d-flex align-items-center justify-content-center"
                            style={{ height: '400px' }}
                        >
                            <img
                                src={updates[activeSlide].image}
                                alt={updates[activeSlide].title}
                                className="img-fluid"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain'
                                }}
                                onError={(e) => {
                                    // Hide a broken image reference instead of showing a broken-icon box.
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>

                        {/* Description */}
                        <div className="p-4 bg-white">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="badge bg-success">
                                    Latest Update
                                </span>

                                <small className="text-muted">
                                    <i className="bi bi-calendar3 me-1"></i>
                                    {updates[activeSlide].date}
                                </small>
                            </div>

                            <h5 className="fw-bold mb-2">
                                {updates[activeSlide].title}
                            </h5>

                            <p className="text-muted mb-0">
                                {updates[activeSlide].description}
                            </p>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="modal-footer border-0 px-4">

                        <div className="me-auto d-flex align-items-center gap-3">
                            <button
                                className="btn btn-outline-secondary btn-sm rounded-circle"
                                onClick={prevSlide}
                                aria-label="Previous slide"
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>

                            <span className="small text-muted">
                                {activeSlide + 1} / {updates.length}
                            </span>

                            <button
                                className="btn btn-outline-secondary btn-sm rounded-circle"
                                onClick={nextSlide}
                                aria-label="Next slide"
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>

                        <button
                            type="button"
                            className="btn btn-success rounded-pill px-4"
                            onClick={onClose}
                        >
                            Got it!
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Announcement;
