import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";import API_BASE_URL from "../config";

const Logout = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const performLogout = async () => {
            try {
                const token = localStorage.getItem("token");
                if (token) {
                    await axios.post(
                        `${API_BASE_URL}/logout/`, 
                        {}, 
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }
            } catch (error) {
                console.error("Logout API failed", error);
            } finally {
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                navigate("/login");
            }
        };

        performLogout();
    }, [navigate]);

    return null;
};

export default Logout;
