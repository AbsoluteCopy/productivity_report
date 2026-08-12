import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
const API = import.meta.env.VITE_API_BASE_URL;
const API_URL = import.meta.env.VITE_API_BASE_URL;
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";

export const getUsers = () =>
    axios.get(`${API}/users/`);

export const createUser = (data) =>
    axios.post(`${API}/users/`, data);

export const updateUser = (id, data) =>
    axios.put(`${API}/users/${id}/`, data);

export const deleteUser = (id) =>
    axios.delete(`${API}/users/${id}/`);

export const getTaskCategories = () =>
    axios.get(`${API}/task-categories/`);

const ManageAccounts = () => {

    const [currentUser, setCurrentUser] = useState(null);

    const emptyUser = {
        id_number: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "employee",
        company: "",
    };

    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState(emptyUser);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [taskCategories, setTaskCategories] = useState([]);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [categorySearch, setCategorySearch] = useState("");
    const requiredFields = [
        "id_number",
        "first_name",
        "last_name",
        "email",
        "role",
    ];

    const isValid = requiredFields.every(
        field => formData[field]?.trim()
    );

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            const user = JSON.parse(userData);
            setCurrentUser(user);
        }
        fetchUsers();
        fetchTaskCategories();
    }, []);

    const fetchTaskCategories = async () => {
        try {
            const { data } = await getTaskCategories();
            setTaskCategories(data);
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.response?.data?.detail || "Failed to fetch task categories.",
            });
        }
    };

    const fetchUsers = async () => {
        try {
            const { data } = await getUsers();

            const userData = localStorage.getItem("user");
            const user = userData ? JSON.parse(userData) : null;

            // If HR role, filter by company
            let filteredUsers = data;
            if (user?.role === 'hr' && user?.company) {
                filteredUsers = data.filter(u => u.company === user.company);
            }

            setUsers(filteredUsers);
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.response?.data?.detail || "Something went wrong.",
            });
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async () => {
        if (!isValid) {
            Swal.fire({
                icon: "warning",
                title: "Incomplete Form",
                text: "Please fill in all required fields.",
            });
            return;
        }

        if (!editingId && !formData.password) {
            Swal.fire({
                icon: "warning",
                title: "Password Required",
                text: "Password is required for new accounts.",
            });
            return;
        }

        const userData = localStorage.getItem("user");
        const user = userData ? JSON.parse(userData) : null;

        // HR cannot create admin accounts
        if (user?.role === 'hr' && formData.role === 'admin') {
            Swal.fire({
                icon: "error",
                title: "Permission Denied",
                text: "HR users cannot create admin accounts.",
            });
            return;
        }

        // Check for duplicate ID number
        const duplicateIdNumber = users.find(
            u => u.id_number === formData.id_number && u.id !== editingId
        );
        if (duplicateIdNumber) {
            Swal.fire({
                icon: "error",
                title: "Duplicate ID Number",
                text: "An account with this ID number already exists.",
            });
            return;
        }

        // Check for duplicate email
        const duplicateEmail = users.find(
            u => u.email === formData.email && u.id !== editingId
        );
        if (duplicateEmail) {
            Swal.fire({
                icon: "error",
                title: "Duplicate Email",
                text: "An account with this email already exists.",
            });
            return;
        }

        setLoading(true);
        try {
            const payload = { ...formData };

            if (editingId && !payload.password) {
                delete payload.password;
            }

            // If HR role, ensure company is set to their own company
            if (user?.role === 'hr' && user?.company) {
                payload.company = user.company;
            }

            // If HR and not editing, default role to employee
            if (user?.role === 'hr' && !editingId) {
                payload.role = 'employee';
            }

            if (editingId) {
                await updateUser(editingId, payload);
            } else {
                await createUser(payload);
            }

            fetchUsers();

            Swal.fire({
                icon: "success",
                title: "Success",
                text: editingId ? "Account updated successfully!" : "Account created successfully!",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000
            });

            setFormData(emptyUser);
            setEditingId(null);
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.response?.data?.detail || "Something went wrong.",
            });
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
            company: user.company || "",
        });
    };

    const handleDeleteUser = async (id) => {
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
                    await deleteUser(id);
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

    const manageTask = (userId) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            setCurrentUserId(userId);
            setSelectedCategories(user.task_list || []);
            setCategorySearch("");
            setShowTaskModal(true);
        }
    };

    const saveTaskCategories = async () => {
        try {
            await updateUser(currentUserId, {
                task_list: selectedCategories
            });
            fetchUsers();
            setShowTaskModal(false);
            Swal.fire({
                icon: "success",
                title: "Success",
                text: "Task categories saved successfully!",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000
            });
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.response?.data?.detail || "Something went wrong.",
            });
        }
    };

    const handleCategoryToggle = (categoryId) => {
        setSelectedCategories(prev => {
            if (prev.includes(categoryId)) {
                return prev.filter(id => id !== categoryId);
            } else {
                return [...prev, categoryId];
            }
        });
    };

    const columns = [
        {
            name: "ID Number",
            selector: row => row.id_number,
            sortable: true,
        },
        {
            name: "Name",
            selector: row => `${row.first_name} ${row.last_name}`,
            sortable: true,
        },
        {
            name: "Email",
            selector: row => row.email,
            sortable: true,
        },
        {
            name: "Role",
            cell: row => (
                <span
                    className={`badge ${row.role === "admin"
                        ? "bg-danger"
                        : row.role === "hr"
                            ? "bg-warning"
                            : "bg-primary"
                        }`}
                >
                    {row.role.toUpperCase()}
                </span>
            ),
            sortable: true,
        },
        ...(currentUser?.role !== 'hr' ? [{
            name: "Company",
            selector: row => row.company || '-',
            sortable: true,
        }] : []),
        {
            name: "Actions",
            cell: row => (
                <>
                    {row.role === "employee" && (
                        <button className="btn btn-info btn-sm me-2"
                            data-bs-toggle="modal" data-bs-target="#taskModal"
                            title="Manage task categories"
                            onClick={() => manageTask(row.id)}
                        >
                            <i className="bi bi-list-task"></i>
                        </button>
                    )}
                    <button className="btn btn-primary btn-sm me-2"
                        data-bs-toggle="modal" data-bs-target="#userModal"
                        title="Edit User"
                        onClick={() => editUser(row)}
                    >
                        <i className="bi bi-pen"></i>
                    </button>

                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(row.id)}
                        title="Delete User">
                        <i className="bi bi-trash"></i>
                    </button>
                </>
            ),
        },
    ];
    const customStyles = {
        rows: {
            style: {
                minHeight: "55px",
            },
        },
    };
    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            `${user.first_name} ${user.last_name} ${user.id_number} ${user.email}`
                .toLowerCase()
                .includes(search.toLowerCase())
        );
    }, [users, search]);

    const sortedAndFilteredCategories = useMemo(() => {
        const filtered = taskCategories.filter(category =>
            category.name.toLowerCase().includes(categorySearch.toLowerCase())
        );
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }, [taskCategories, categorySearch]);

    return (
        <div className="container mt-4">
            <div className="card shadow">
                <div className="card-header main-background text-white d-flex justify-content-between align-items-center">
                    <h3 className="mb-0">Account Management</h3>

                    <button className="btn btn-success"
                        data-bs-toggle="modal" data-bs-target="#userModal"
                        onClick={() => {
                            setEditingId(null);
                            setFormData(emptyUser);
                        }}
                    >
                        <i className="bi bi-plus"></i> Add Account
                    </button>
                </div>

                <div className="card-body">

                    <input type="text" className="form-control mb-3"
                        placeholder="Search employee..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <DataTable
                        columns={columns}
                        data={filteredUsers}
                        pagination
                        highlightOnHover
                        striped
                        responsive
                        persistTableHead
                        noDataComponent="No users found."
                        customStyles={customStyles}
                    />
                </div>

            </div>

            {/* Modal */}

            <div className="modal fade" id="userModal" tabIndex="-1">
                <div className="modal-dialog">

                    <div className="modal-content">

                        <div className="modal-header main-background text-white">
                            <h5 className="modal-title">
                                {editingId ? "Edit Account" : "Add Account"}
                            </h5>

                            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>

                        </div>

                        <div className="modal-body">

                            <input className="form-control mb-2"
                                name="id_number"
                                placeholder="ID Number"
                                value={formData.id_number}
                                onChange={handleChange}
                            />

                            <input className="form-control mb-2"
                                name="first_name"
                                placeholder="First Name"
                                value={formData.first_name}
                                onChange={handleChange}
                            />

                            <input className="form-control mb-2"
                                name="last_name"
                                placeholder="Last Name"
                                value={formData.last_name}
                                onChange={handleChange}
                            />

                            <input className="form-control mb-2"
                                name="email"
                                type="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={handleChange}
                            />

                            <input className="form-control mb-2" name="password" type="password" placeholder={
                                editingId
                                    ? "Leave blank to keep current password"
                                    : "Password"
                            }
                                value={formData.password}
                                onChange={handleChange}
                            />

                            {currentUser?.role !== 'hr' ? (
                                <select className="form-select" name="role" value={formData.role} onChange={handleChange}>
                                    <option value="employee">Employee</option>
                                    <option value="admin">Admin</option>
                                    <option value="viewer">Viewer</option>
                                    <option value="hr">HR</option>
                                </select>
                            ) : (
                                <select className="form-select" name="role" value={formData.role} onChange={handleChange} disabled>
                                    <option value="employee">Employee</option>
                                </select>
                            )}

                            {currentUser?.role !== 'hr' && (
                                <input className="form-control mb-2 mt-2"
                                    name="company"
                                    placeholder="Company (optional)"
                                    value={formData.company}
                                    onChange={handleChange}
                                />
                            )}

                        </div>

                        <div className="modal-footer">

                            <button className="btn btn-secondary" data-bs-dismiss="modal" id="closeModal">
                                Cancel
                            </button>

                            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
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

            {/* Task Category Modal */}
            <div
                className="modal fade"
                id="taskModal"
                tabIndex="-1"
            >
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header main-background text-white">
                            <h5 className="modal-title">Manage Task Categories</h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                            ></button>
                        </div>
                        <div className="modal-body">
                            <input
                                type="text"
                                className="form-control mb-3"
                                placeholder="Search categories..."
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                            />
                            <div className="row">
                                {sortedAndFilteredCategories.map((category) => (
                                    <div key={category.id} className="col-md-6 mb-3">
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={`category-${category.id}`}
                                                checked={selectedCategories.includes(category.id)}
                                                onChange={() => handleCategoryToggle(category.id)}
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor={`category-${category.id}`}
                                            >
                                                {category.name}
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={saveTaskCategories}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageAccounts;