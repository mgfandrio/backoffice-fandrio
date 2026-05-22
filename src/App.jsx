import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardHome from './pages/DashboardHome';
import UsersPage from './pages/UsersPage';
import CompaniesPage from './pages/CompaniesPage';
import ProvincesPage from './pages/ProvincesPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/dashboard/users" element={<UsersPage />} />
        <Route path="/dashboard/companies" element={<CompaniesPage />} />
        <Route path="/dashboard/provinces" element={<ProvincesPage />} />
      </Routes>
    </Router>
  );
}

export default App;
