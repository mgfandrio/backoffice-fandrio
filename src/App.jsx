import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardHome from './pages/DashboardHome';
import UsersPage from './pages/UsersPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/dashboard/users" element={<UsersPage />} />
      </Routes>
    </Router>
  );
}

export default App;
