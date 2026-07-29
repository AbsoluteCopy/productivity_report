import React, { useEffect, useState } from "react";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";

const ManageTaskCategory = () => {
    const API_URL = `${API_BASE_URL}/task-categories/`;

    const emptyCategory = {
        name: "",
        status: "active",
    };

    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState(emptyCategory);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await axios.get(API_URL);
            setCategories(res.data);
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
        if (!formData.name || !formData.status) {
            Swal.fire({
                icon: "warning",
                title: "Incomplete Form",
                text: "Please fill in all required fields.",
            });
            return;
        }

        setLoading(true);
        try {
            const payload = { ...formData };

            if (editingId) {
                await axios.put(`${API_URL}${editingId}/`, payload);
            } else {
                await axios.post(API_URL, payload);
            }

            fetchCategories();
            
            Swal.fire({
                icon: "success",
                title: "Success",
                text: editingId ? "Category updated successfully!" : "Category created successfully!",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000
            });
            
            setFormData(emptyCategory);
            setEditingId(null);
            
            // Close modal
            const closeModalBtn = document.getElementById('closeModal');
            if (closeModalBtn) closeModalBtn.click();
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

    const editCategory = (category) => {
        setEditingId(category.id);
        setFormData({
            name: category.name,
            status: category.status,
        });
    };

    const deleteCategory = async (id) => {
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
                    fetchCategories();
                    Swal.fire({
                        icon: "success",
                        title: "Deleted!",
                        text: "Category has been deleted.",
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
            }
        });
    };

    const columns = [
        {
            name: "Task Name",
            selector: row => row.name,
            sortable: true,
        },
        {
            name: "Status",
            cell: row => (
                <span
                    className={`badge ${row.status === "active"
                        ? "bg-success"
                        : "bg-secondary"
                        }`}
                >
                    {row.status.toUpperCase()}
                </span>
            ),
            sortable: true,
        },
        {
            name: "Created At",
            selector: row => new Date(row.created_at).toLocaleDateString(),
            sortable: true,
        },
        {
            name: "Actions",
            cell: row => (
                <>
                    <button
                        className="btn btn-primary btn-sm me-2"
                        data-bs-toggle="modal"
                        data-bs-target="#categoryModal"
                        onClick={() => editCategory(row)}
                    >
                        Edit
                    </button>

                    <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteCategory(row.id)}
                    >
                        Delete
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

    return (
        <div className="container mt-4">
            <div className="card shadow">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h3 className="mb-0">Task Category Management</h3>
                    <button
                        className="btn btn-success"
                        data-bs-toggle="modal"
                        data-bs-target="#categoryModal"
                        onClick={() => {
                            setEditingId(null);
                            setFormData(emptyCategory);
                        }}
                    >
                        + Add Category
                    </button>
                </div>

                <div className="card-body">
                    <input
                        type="text"
                        className="form-control mb-3"
                        placeholder="Search category..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <DataTable
                        columns={columns}
                        data={categories.filter((category) =>
                            category.name.toLowerCase().includes(search.toLowerCase())
                        )}
                        pagination
                        highlightOnHover
                        striped
                        responsive
                        persistTableHead
                        noDataComponent="No categories found."
                        customStyles={customStyles}
                    />
                </div>
            </div>

            {/* Modal */}
            <div
                className="modal fade"
                id="categoryModal"
                tabIndex="-1"
            >
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                {editingId ? "Edit Category" : "Add Category"}
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
                                name="name"
                                placeholder="Category Name"
                                value={formData.name}
                                onChange={handleChange}
                            />

                            <select
                                className="form-select"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
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

export default ManageTaskCategory;