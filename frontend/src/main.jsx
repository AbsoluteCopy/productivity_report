import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min'
import 'bootstrap-icons/font/bootstrap-icons.css'
import axios from 'axios';

// Global Axios Interceptor
axios.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Axios Response Interceptor for handling 401 errors
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid - logout user (only if not already on /login)
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login' && !error.config?.url?.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Global Fetch Interceptor
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    let [resource, config] = args;
    // Only intercept requests to our API
    if (typeof resource === 'string' && resource.includes('/api/')) {
        config = config || {};
        const token = localStorage.getItem('token');
        if (token && token !== 'null' && token !== 'undefined') {
            config.headers = {
                ...config.headers,
                'Authorization': `Bearer ${token}`
            };
        }
    }
    const response = await originalFetch(resource, config);
    
    // Handle 401 errors for API requests (only logout/redirect if not already on login page)
    if (response.status === 401) {
        const urlStr = typeof resource === 'string' ? resource : (resource?.url || '');
        if (!urlStr.includes('/login') && window.location.pathname !== '/login') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    }
    
    return response;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
