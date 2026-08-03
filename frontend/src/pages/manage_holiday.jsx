import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_URL = `${API_BASE_URL}/holidays/`;

const EMPTY_HOLIDAY = {
    name: "",
    date: "",
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

export default function HolidayManagement() {
    const [holidays, setHolidays] = useState([]);
    const [formData, setFormData] = useState(EMPTY_HOLIDAY);
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

    const fetchHolidays = async () => {
        setLoading(true);

        try {
            const { data } = await axios.get(API_URL);
            
            const userData = localStorage.getItem("user");
            const user = userData ? JSON.parse(userData) : null;
            
            // If HR role, filter by company
            let filteredHolidays = data;
            if (user?.role === 'hr' && user?.company) {
                filteredHolidays = data.filter(holiday => holiday.company === user.company);
            }
            
            setHolidays(filteredHolidays);
        } catch (err) {
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            const user = JSON.parse(userData);
            setCurrentUser(user);
        }
        fetchHolidays();
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async () => {
        if (loading) return;

        if (!formData.name.trim() || !formData.date) {
            Swal.fire({
                icon: "warning",
                title: "Incomplete Form",
                text: "Holiday name and date are required.",
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
            if (editingId) {
                await axios.put(`${API_URL}${editingId}/`, payload);
            } else {
                await axios.post(API_URL, payload);
            }

            await fetchHolidays();

            Swal.fire({
                icon: "success",
                title: "Success",
                text: editingId ? "Holiday updated successfully!" : "Holiday created successfully!",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000
            });

            setFormData(EMPTY_HOLIDAY);
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

    const editHoliday = (holiday) => {
        setEditingId(holiday.id);
        setFormData({
            name: holiday.name,
            date: holiday.date,
            company: holiday.company || "",
        });
    };

    const deleteHoliday = async (id) => {
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
                    await fetchHolidays();
                    Swal.fire({
                        icon: "success",
                        title: "Deleted!",
                        text: "Holiday has been deleted.",
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
            name: "Holiday Name",
            selector: row => row.name,
            sortable: true,
            wrap: true,
            grow: 2,
        },
        {
            name: "Date",
            selector: row => row.date,
            sortable: true,
        },
        ...(currentUser?.role !== 'hr' ? [{
            name: "Company",
            selector: row => row.company || 'All Companies',
            sortable: true,
        }] : []),
        {
            name: "Created At",
            selector: row => new Intl.DateTimeFormat("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
            }).format(new Date(row.created_at)),
            sortable: true,
        },
        {
            name: "Actions",
            cell: row => (
                <>
                    <button className="btn btn-primary btn-sm me-2" data-bs-toggle="modal" data-bs-target="#holidayModal" onClick={() => editHoliday(row)}>
                        <i className="bi bi-pencil"></i>
                    </button>

                    <button className="btn btn-danger btn-sm" onClick={() => deleteHoliday(row.id)} >
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
                    <h3 className="mb-0">Holiday Management</h3>
                    <button className="btn btn-success" data-bs-toggle="modal" data-bs-target="#holidayModal" onClick={() => {
                        setEditingId(null);
                        setFormData(EMPTY_HOLIDAY);
                    }}
                    >
                        <i className="bi bi-plus"></i> Add Holiday
                    </button>
                </div>

                <div className="card-body">
                    <input type="text" className="form-control mb-3" placeholder="Search holiday..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <DataTable
                        columns={columns}
                        data={holidays.filter((holiday) =>
                            holiday.name.toLowerCase().includes(search.toLowerCase())
                        )}
                        pagination
                        highlightOnHover
                        striped
                        responsive
                        persistTableHead
                        noDataComponent="No holidays found."
                        customStyles={customStyles}
                        progressPending={loading}
                        progressComponent={
                            <div className="py-3">
                                Loading holidays...
                            </div>
                        }
                    />
                </div>
            </div>

            <div className="modal fade" id="holidayModal" tabIndex="-1">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header main-background text-white">
                            <h5 className="modal-title">
                                {editingId ? "Edit Holiday" : "Add Holiday"}
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                        </div>

                        <div className="modal-body">
                            <input className="form-control mb-2" name="name" placeholder="Holiday Name" value={formData.name} onChange={handleChange} />

                            <input className="form-control mb-2" name="date" type="date" value={formData.date} onChange={handleChange} />

                            {currentUser?.role !== 'hr' && (
                                <input className="form-control mb-2" name="company" placeholder="Company (optional)" value={formData.company} onChange={handleChange} />
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" data-bs-dismiss="modal" id="closeModal">
                                Cancel
                            </button>

                            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading || saving}>
                                {saving
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
}