import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import API_BASE_URL from "../config";
import { isDarkMode } from '../utils/darkMode';

const PASSWORD_RULES = [
    { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { key: 'lower', label: 'Contains a lowercase letter', test: (p) => /[a-z]/.test(p) },
    { key: 'upper', label: 'Contains an uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { key: 'number', label: 'Contains a number', test: (p) => /\d/.test(p) },
    { key: 'symbol', label: 'Contains a special character (e.g. !@#$%)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const passwordScore = (password) => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min(score, 5);
};

const strengthColors = ['#dc3545', '#dc3545', '#ffc107', '#ffc107', '#28a745'];
const strengthLabels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];

const PasswordField = ({ id, label, value, onChange, placeholder, show, onToggleShow, hint }) => (
    <div className="mb-3">
        <label htmlFor={id} className="form-label fw-semibold text-ink">
            {label}
        </label>
        <div className="input-group">
            <input
                type={show ? 'text' : 'password'}
                id={id}
                className="form-control"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                autoComplete="off"
            />
            <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onToggleShow}
                aria-label={show ? 'Hide password' : 'Show password'}
                title={show ? 'Hide password' : 'Show password'}
            >
                <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
        </div>
        {hint && <div className="form-text mt-1">{hint}</div>}
    </div>
);

const ChangePassword = () => {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!currentPassword.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Current Password',
                text: 'Please enter your current password.',
            });
            return;
        }

        if (!newPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing New Password',
                text: 'Please enter a new password.',
            });
            return;
        }

        if (newPassword.length < 8) {
            Swal.fire({
                icon: 'warning',
                title: 'Weak Password',
                text: 'New password must be at least 8 characters long.',
            });
            return;
        }

        if (currentPassword === newPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid New Password',
                text: 'New password cannot be the same as your current password.',
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Passwords Do Not Match',
                text: 'New password and confirmation password do not match.',
            });
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/change-password/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Password changed successfully!',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                navigate('/dashboard');
            } else {
                const errorMessage = data.error || data.detail || 'Failed to change password.';
                setError(errorMessage);
                Swal.fire({
                    icon: 'error',
                    title: 'Password Error',
                    text: errorMessage,
                });
            }
        } catch (err) {
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

    const rules = [
        { label: 'At least 8 characters', met: newPassword.length >= 8 },
        { label: 'Not the same as your current password', met: newPassword.length > 0 && newPassword !== currentPassword },
        ...PASSWORD_RULES.slice(1).map((r) => ({ label: r.label, met: r.test(newPassword) })),
    ];
    const metCount = rules.filter((r) => r.met).length;
    const score = newPassword ? passwordScore(newPassword) : 0;
    const confirmMatches = confirmPassword.length > 0 && newPassword === confirmPassword;

    return (
        <div className="container py-4">
            <div className="row justify-content-center">
                <div className="col-md-6 col-lg-5">
                    <div className="card shadow border-0 overflow-hidden">
                        <div className="card-brand-gradient text-white p-4">
                            <div className="d-flex align-items-center gap-3">
                                <div
                                    className="rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.15)' }}
                                >
                                    <i className="bi bi-shield-lock-fill fs-4"></i>
                                </div>
                                <div>
                                    <h5 className="mb-1 fw-bold">Change Password</h5>
                                    <p className="mb-0" style={{ opacity: 0.85, fontSize: '0.85rem' }}>
                                        Choose a strong password to keep your account secure
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card-body p-4">
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

                            <form onSubmit={handleSubmit} noValidate>
                                <PasswordField
                                    id="currentPassword"
                                    label="Current Password"
                                    placeholder="Enter your current password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    show={showCurrent}
                                    onToggleShow={() => setShowCurrent(!showCurrent)}
                                />

                                <PasswordField
                                    id="newPassword"
                                    label="New Password"
                                    placeholder="Enter a new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    show={showNew}
                                    onToggleShow={() => setShowNew(!showNew)}
                                />

                                <div
                                    className="border rounded-3 p-3 mb-3"
                                    style={{ backgroundColor: isDarkMode() ? '#1a2421' : '#f8f9fa' }}
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="label-caps text-ink" style={{ fontSize: '0.7rem' }}>
                                            Password guidelines
                                        </span>
                                        <span
                                            className="badge"
                                            style={{
                                                backgroundColor: newPassword ? strengthColors[score - 1] : '#6c757d',
                                                color: '#fff',
                                                fontSize: '0.7rem',
                                            }}
                                        >
                                            {newPassword ? strengthLabels[score - 1] : 'Not set'}
                                        </span>
                                    </div>

                                    <div className="d-flex gap-1 mb-3">
                                        {[0, 1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className="flex-fill rounded-pill"
                                                style={{
                                                    height: 6,
                                                    backgroundColor: i < score ? strengthColors[i] : '#e9ecef',
                                                    transition: 'background-color 0.2s ease',
                                                }}
                                            />
                                        ))}
                                    </div>

                                    <ul className="list-unstyled mb-0" style={{ fontSize: '0.82rem' }}>
                                        {rules.map((rule, idx) => (
                                            <li key={idx} className={`d-flex align-items-center gap-2 mb-1 ${rule.met ? 'text-success' : 'text-muted'}`}>
                                                <i className={`bi ${rule.met ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                                                <span>{rule.label}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                                        {metCount} of {rules.length} requirements met
                                    </div>
                                </div>

                                <PasswordField
                                    id="confirmPassword"
                                    label="Confirm New Password"
                                    placeholder="Re-enter your new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    show={showConfirm}
                                    onToggleShow={() => setShowConfirm(!showConfirm)}
                                />

                                {confirmPassword.length > 0 && (
                                    <div
                                        className={`d-flex align-items-center gap-2 mb-3 ${confirmMatches ? 'text-success' : 'text-danger'}`}
                                        style={{ fontSize: '0.85rem' }}
                                    >
                                        <i className={`bi ${confirmMatches ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
                                        {confirmMatches ? 'Passwords match' : 'Passwords do not match'}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100 py-2 fw-semibold"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Password'
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
