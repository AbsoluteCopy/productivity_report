import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'

import Initial from './pages/initial';
import Login from './pages/login';
import Logout from './pages/logout';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/dashboard';
import NewData from './pages/new_data';
import DailyReport from './pages/daily_report';
import ViewReport from './pages/view_report';
import ViewUtilizationReport from './pages/view_utilization_report';
import ManageAccounts from './pages/manage_accounts';
import ManageTaskCategory from './pages/manage_task_category';
import ManageHoliday from './pages/manage_holiday';
import ChangePassword from './pages/change_password';
import NotFound from './pages/404';

import { useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from './config';

function App() {
  return (
    <>
      <Router>
        <AppContent />
      </Router>
    </>
  )
}


function AppContent() {
  useEffect(() => {
    const sendHeartbeat = () => {
      const token = localStorage.getItem('token');
      if (token) {
        axios.post(`${API_BASE_URL}/users/heartbeat/`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
    };

    // Send immediately on mount
    sendHeartbeat();

    // Ping every 60 seconds
    const interval = setInterval(sendHeartbeat, 60000);

    const onActive = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    window.addEventListener('focus', onActive);
    document.addEventListener('visibilitychange', onActive);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onActive);
      document.removeEventListener('visibilitychange', onActive);
    };
  }, []);

  return (
    <div className="app-content">
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/new_data" element={<NewData />} />
            <Route path="/daily_report" element={<DailyReport />} />
            <Route path="/view_report" element={<ViewReport />} />
            <Route path="/view_utilization_report" element={<ViewUtilizationReport />} />
            <Route path="/manage_accounts" element={<ManageAccounts />} />
            <Route path="/manage_task_category" element={<ManageTaskCategory />} />
            <Route path="/manage_holiday" element={<ManageHoliday />} />
            <Route path="/change_password" element={<ChangePassword />} />
          </Route>
        </Route>
        <Route path="/" element={<Initial />} />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App
