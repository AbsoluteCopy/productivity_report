import React, { useEffect, useState } from "react";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import Swal from "sweetalert2";

const ManageAccounts = () => {
    const API_URL = `${API_BASE_URL}/users/`;

    const emptyUser = {
        id_number: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "employee",
    };

    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState(emptyUser);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(API_URL);
            setUsers(res.data);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Something went wrong.");
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async () => {
        if (
            !formData.id_number ||
            !formData.first_name ||
            !formData.last_name ||
            !formData.email
        ) {
            alert("Please fill in all required fields.");
            return;
        }

        if (!editingId && !formData.password) {
            alert("Password is required.");
            return;
        }
        setLoading(true);
        try {
            const payload = { ...formData };

            if (editingId && !payload.password) {
                delete payload.password;
            }

            if (editingId) {
                await axios.put(`${API_URL}${editingId}/`, payload);
            } else {
                await axios.post(API_URL, payload);
            }

            fetchUsers();
            setFormData(emptyUser);
            setEditingId(null);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const editUser = (user) => {
        setEditingId(user.id);

        setFormData({
            id_number: user.id_number,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            password: "",
            role: user.role,
        });
    };

    const deleteUser = async (id) => {
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${API_URL}${id}/`);
                    fetchUsers();
                } catch (err) {
                    console.error(err);
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: err.response?.data?.detail || "Something went wrong.",
                    });
                }
            }
        });
    };

    const filteredUsers = users.filter((user) =>
        `${user.first_name} ${user.last_name} ${user.id_number} ${user.email}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div className="container mt-4">

            <div className="card shadow">

                <div className="card-header d-flex justify-content-between align-items-center">
                    <h3 className="mb-0">Account Management</h3>

                    <button
                        className="btn btn-success"
                        data-bs-toggle="modal"
                        data-bs-target="#userModal"
                        onClick={() => {
                            setEditingId(null);
                            setFormData(emptyUser);
                        }}
                    >
                        + Add Account
                    </button>
                </div>

                <div className="card-body">

                    <input
                        type="text"
                        className="form-control mb-3"
                        placeholder="Search employee..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <table className="table table-hover table-bordered align-middle">

                        <thead className="table-dark">
                            <tr>
                                <th>ID Number</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th width="220">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredUsers.length > 0 ? (

                                filteredUsers.map((user) => (

                                    <tr key={user.id}>
                                        <td>{user.id_number}</td>

                                        <td>
                                            {user.first_name} {user.last_name}
                                        </td>

                                        <td>{user.email}</td>

                                        <td>
                                            <span
                                                className={`badge ${user.role === "admin"
                                                    ? "bg-danger"
                                                    : "bg-primary"
                                                    }`}
                                            >
                                                {user.role}
                                            </span>
                                        </td>

                                        <td>

                                            <button
                                                className="btn btn-primary btn-sm me-2"
                                                data-bs-toggle="modal"
                                                data-bs-target="#userModal"
                                                onClick={() => editUser(user)}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => deleteUser(user.id)}
                                            >
                                                Delete
                                            </button>

                                        </td>

                                    </tr>

                                ))

                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                    </table>

                </div>

            </div>

            {/* Modal */}

            <div
                className="modal fade"
                id="userModal"
                tabIndex="-1"
            >
                <div className="modal-dialog">

                    <div className="modal-content">

                        <div className="modal-header">
                            <h5 className="modal-title">
                                {editingId ? "Edit Account" : "Add Account"}
                            </h5>

                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                            ></button>

                        </div>

                        <div className="modal-body">

                            <input
                                className="form-control mb-2"
                                name="id_number"
                                placeholder="ID Number"
                                value={formData.id_number}
                                onChange={handleChange}
                            />

                            <input
                                className="form-control mb-2"
                                name="first_name"
                                placeholder="First Name"
                                value={formData.first_name}
                                onChange={handleChange}
                            />

                            <input
                                className="form-control mb-2"
                                name="last_name"
                                placeholder="Last Name"
                                value={formData.last_name}
                                onChange={handleChange}
                            />

                            <input
                                className="form-control mb-2"
                                name="email"
                                type="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={handleChange}
                            />

                            <input
                                className="form-control mb-2"
                                name="password"
                                type="password"
                                placeholder={
                                    editingId
                                        ? "Leave blank to keep current password"
                                        : "Password"
                                }
                                value={formData.password}
                                onChange={handleChange}
                            />

                            <select
                                className="form-select"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                            >
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>

                        </div>

                        <div className="modal-footer">

                            <button
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                                id="closeModal"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading
                                    ? "Saving..."
                                    : editingId
                                        ? "Update"
                                        : "Create"}
                            </button>

                        </div>

                    </div>

                </div>
            </div>

        </div>
    );
};

export default ManageAccounts;