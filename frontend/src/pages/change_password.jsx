import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import API_BASE_URL from "../config";

const ChangePassword = () => {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card shadow-sm">
                        <div className="card-header main-background text-white">
                            <h5 className="mb-0">Change Password</h5>
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

                                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} noValidate>
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Current Password
                                        </label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); handleSubmit(e); }}
                                        className="btn btn-primary w-100"
                                        disabled={loading}
                                    >
                                        {loading ? 'Updating...' : 'Update Password'}
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
