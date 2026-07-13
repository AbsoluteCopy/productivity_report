import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'

import Initial from './pages/initial';
import Login from './pages/login';
import Layout from './components/Layout';
import Dashboard from './pages/dashboard';
import NewData from './pages/new_data';

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
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new_data" element={<NewData />} />
        </Route>
        <Route path="/" element={<Initial />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  );
}

export default App
