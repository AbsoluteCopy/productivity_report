import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import API_BASE_URL from "../config";

const FALLBACK_TIMEZONES = [
    'UTC',
    'America/Anchorage', 'America/Los_Angeles', 'America/Denver', 'America/Chicago',
    'America/New_York', 'America/Toronto', 'America/Vancouver', 'America/Mexico_City',
    'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
    'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
    'Europe/Rome', 'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Athens', 'Europe/Istanbul',
    'Europe/Moscow',
    'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos',
    'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok',
    'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
    'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth', 'Pacific/Auckland',
];

const getTimezoneOptions = () => {
    try {
        return Intl.supportedValuesOf('timeZone');
    } catch {
        return FALLBACK_TIMEZONES;
    }
};

const Settings = () => {
    const [user, setUser] = useState(null);
    const [timezone, setTimezone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const timezoneOptions = useMemo(() => {
        const list = getTimezoneOptions();
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const options = detected && !list.includes(detected) ? [detected, ...list] : list;
        return [...options].sort((a, b) => a.localeCompare(b));
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/users/me/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();
                if (response.ok) {
                    setUser(data);
                    setTimezone(data.timezone || '');
                } else {
                    setError(data.error || data.detail || 'Failed to load your profile.');
                }
            } catch {
                setError('Network error. Please try again.');
            } finally {
                setFetching(false);
            }
        };
        load();
    }, []);

    const handleUseBrowserTimezone = () => {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detected) setTimezone(detected);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/${user.id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ timezone: timezone || null }),
            });

            const data = await response.json();

            if (response.ok) {
                const stored = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...stored, timezone: data.timezone || null }));
                Swal.fire({
                    icon: 'success',
                    title: 'Timezone updated!',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            } else {
                const errorMessage = data.error || data.detail || 'Failed to update timezone.';
                setError(errorMessage);
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: errorMessage,
                });
            }
        } catch {
            const errorMsg = 'Network error. Please try again.';
            setError(errorMsg);
            Swal.fire({
                icon: 'error',
                title: 'Connection Error',
                text: errorMsg,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card shadow-sm">
                        <div className="card-header main-background text-white">
                            <h5 className="mb-0">Settings</h5>
                        </div>

                        <div className="card-body">
                            {error && (
                                <div
                                    style={{
                                        background: "#fff2f2",
                                        color: "#d32f2f",
                                        border: "1px solid #ffcdd2",
                                        borderRadius: "10px",
                                        padding: "12px",
                                        textAlign: "center",
                                        marginBottom: "20px",
                                        fontSize: "14px",
                                    }}
                                >
                                    {error}
                                </div>
                            )}

                            {fetching ? (
                                <div className="text-center py-4 text-muted">Loading...</div>
                            ) : (
                                <form onSubmit={handleSubmit} noValidate>
                                    <div className="mb-3">
                                        <label className="form-label">Timezone</label>
                                        <div className="input-group">
                                            <select
                                                className="form-select"
                                                value={timezone}
                                                onChange={(e) => setTimezone(e.target.value)}
                                            >
                                                <option value="">Server default (no timezone set)</option>
                                                {timezone && !timezoneOptions.includes(timezone) && (
                                                    <option value={timezone}>{timezone}</option>
                                                )}
                                                {timezoneOptions.map((tz) => (
                                                    <option key={tz} value={tz}>{tz}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={handleUseBrowserTimezone}
                                                title="Use my browser's timezone"
                                            >
                                                <i className="bi bi-globe"></i> Auto
                                            </button>
                                        </div>
                                        <div className="form-text">
                                            Used for displaying dates and times in your reports.
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100"
                                        disabled={loading}
                                    >
                                        {loading ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
