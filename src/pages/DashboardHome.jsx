import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';

const DashboardHome = () => {
  return (
    <DashboardLayout>
      <div className="grid gap-6">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Placeholders pour les statistiques */}
          {['Utilisateurs', 'Compagnies', 'Activités', 'Notifications'].map((item) => (
            <div key={item} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">{item}</h2>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardHome;
