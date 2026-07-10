import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'

import Initial from './pages/initial';
import Login from './pages/login';
import Layout from './components/Layout';

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
        <Route path="/" element={<Initial />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  );
}

export default App
