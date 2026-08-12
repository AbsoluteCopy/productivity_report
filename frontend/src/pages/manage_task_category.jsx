import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";

const API_URL = `${API_BASE_URL}/task-categories/`;

const EMPTY_CATEGORY = {
    name: "",
    status: "active",
    company: "",
};

const customStyles = {
    rows: {
        style: {
            minHeight: "70px",
        },
    },
    cells: {
        style: {
            whiteSpace: "normal",
            wordBreak: "break-word",
            overflowWrap: "break-word",
        },
    },
};


const ManageTaskCategory = () => {

    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState(EMPTY_CATEGORY);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);


    const showError = (err) => {
        Swal.fire({
            icon: "error",
            title: "Error",
            text:
                err.response?.data?.detail ||
                err.response?.data?.message ||
                "Something went wrong.",
        });
    };

    const fetchCategories = useCallback(async () => {
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get(API_URL, config);
            
            const userData = localStorage.getItem("user");
            const user = userData ? JSON.parse(userData) : null;
            
            // If HR role, filter by company
            let filteredCategories = data;
            if (user?.role === 'hr' && user?.company) {
                filteredCategories = data.filter(category => category.company === user.company);
            }
            
            // Sort categories in ascending order by name
            const sortedCategories = filteredCategories.sort((a, b) => 
                a.name.localeCompare(b.name)
            );
            setCategories(sortedCategories);
        } catch (err) {
            showError(err);
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            const user = JSON.parse(userData);
            setCurrentUser(user);
        }
        fetchCategories();
    }, []);


    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async () => {
        if (loading) return;

        if (!formData.name.trim()) {
            Swal.fire({
                icon: "warning",
                title: "Incomplete Form",
                text: "Category name is required.",
            });
            return;
        }
        const payload = {
            ...formData,
            name: formData.name.trim(),
        };
        
        // If HR role, ensure company is set to their own company
        if (currentUser?.role === 'hr' && currentUser?.company) {
            payload.company = currentUser.company;
        }
        
        setSaving(true);

        try {
            const duplicate = categories.some(
                (category) =>
                    category.name.toLowerCase() ===
                    formData.name.trim().toLowerCase() &&
                    category.id !== editingId
            );

            if (duplicate) {
                Swal.fire({
                    icon: "warning",
                    title: "Duplicate Category",
                    text: "A category with this name already exists.",
                });
                return;
            }

            const token = localStorage.getItem("token");
            const config = { headers: { Authorization: `Bearer ${token}` } };

            if (editingId) {
                await axios.put(`${API_URL}${editingId}/`, payload, config);
            } else {
                await axios.post(API_URL, payload, config);
            }

            await fetchCategories();

            Swal.fire({
                icon: "success",
                title: "Success",
                text: editingId ? "Category updated successfully!" : "Category created successfully!",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000
            });

            setFormData(EMPTY_CATEGORY);
            setEditingId(null);

            // Close modal
            const closeModalBtn = document.getElementById('closeModal');
            if (closeModalBtn) closeModalBtn.click();
        } catch (err) {
            showError(err);
        } finally {
            setSaving(false);
        }
    };

    const editCategory = (category) => {
        setEditingId(category.id);
        setFormData({
            name: category.name,
            status: category.status,
            company: category.company || "",
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
                    const token = localStorage.getItem("token");
                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    await axios.delete(`${API_URL}${id}/`, config);
                    await fetchCategories();
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
                    showError(err);
                }
            }
        });
    };

    const columns = [
        {
            name: "Task Name",
            selector: row => row.name,
            sortable: true,
            wrap: true,      // Allows text to wrap to multiple lines
            grow: 3,
        },
        {
            name: "Status",
            cell: row => (
                <span className={`badge ${row.status === "active"
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
            selector: row => new Intl.DateTimeFormat("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
            }).format(new Date(row.created_at)),
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
                    <button className="btn btn-primary btn-sm me-2" data-bs-toggle="modal" title="Edit Category" data-bs-target="#categoryModal" onClick={() => editCategory(row)}>
                        <i className="bi bi-pencil"></i>
                    </button>

                    <button className="btn btn-danger btn-sm" title="Delete Category" onClick={() => deleteCategory(row.id)} >
                        <i className="bi bi-trash"></i>
                    </button>
                </>
            ),
        },
    ];

    return (
        <div className="container mt-4">
            <div className="card shadow">
                <div className="card-header main-background text-white d-flex justify-content-between align-items-center">
                    <h3 className="mb-0">Task Category Management</h3>
                    <button className="btn btn-success" data-bs-toggle="modal" data-bs-target="#categoryModal" onClick={() => {
                        setEditingId(null);
                        setFormData(EMPTY_CATEGORY);
                    }}
                    >
                        <i className="bi bi-plus"></i> Add Category
                    </button>
                </div>

                <div className="card-body">
                    <input type="text" className="form-control mb-3" placeholder="Search category..."
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
                        progressPending={loading}
                        progressComponent={
                            <div className="py-3">
                                Loading categories...
                            </div>
                        }
                    />
                </div>
            </div>

            <div className="modal fade" id="categoryModal" tabIndex="-1">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header main-background text-white">
                            <h5 className="modal-title">
                                {editingId ? "Edit Category" : "Add Category"}
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                        </div>

                        <div className="modal-body">
                            <input className="form-control mb-2" name="name" placeholder="Category Name" value={formData.name} onChange={handleChange} />

                            <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>

                            {currentUser?.role !== 'hr' && (
                                <input className="form-control mb-2 mt-2" name="company" placeholder="Company (optional)" value={formData.company} onChange={handleChange} />
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
        </div>
    );
};

export default ManageTaskCategory;