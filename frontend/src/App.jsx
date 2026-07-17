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
import NotFound from './pages/404';

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
