
import React, { useState } from 'react';

const Announcement = ({ onClose }) => {
    const [activeSlide, setActiveSlide] = useState(0);

    const updates = [
        {
            id: 1,
            title: 'New Dashboard Design',
            description: 'We have improved the dashboard interface to provide a cleaner and more user-friendly experience.',
            image: '/images/updates/dashboard.png',
            date: 'November 3, 2026'
        },
        {
            id: 2,
            title: 'Improved Reports',
            description: 'Generate reports faster with our newly improved reporting module and enhanced filtering options.',
            image: '/images/updates/reports.png',
            date: 'November 2, 2026'
        },
        {
            id: 3,
            title: 'New Features Available',
            description: 'Explore our latest features and improvements designed to make your workflow easier.',
            image: '/images/updates/features.png',
            date: 'October 30, 2026'
        }
    ];

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
