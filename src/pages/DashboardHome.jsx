import React, { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineUsers,
  HiOutlineOfficeBuilding,
  HiOutlineGlobe,
  HiOutlineUserAdd,
  HiOutlineCash,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import SectionHeader from '../components/dashboard/SectionHeader';
import DashboardService from '../services/dashboard.service';

const DashboardHome = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    utilisateurs: { total: 0, actifs: 0, nouveauxCeMois: 0 },
    compagnies: { total: 0, actives: 0 },
    provinces: { total: 0 },
    commissions: { totalCollecte: 0 },
  });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        DashboardService.getUtilisateursStats(),
        DashboardService.getCompagniesStats(),
        DashboardService.getProvincesStats(),
        DashboardService.getCommissionsDashboard(),
      ]);

      const extract = (result, fallback = {}) =>
        result.status === 'fulfilled' ? result.value?.data?.data ?? result.value?.data ?? fallback : fallback;

      const userStats = extract(results[0], {});
      const compStats = extract(results[1], {});
      const provStats = extract(results[2], {});
      const commStats = extract(results[3], {});

      setStats({
        utilisateurs: {
          total: userStats.total ?? userStats.total_utilisateurs ?? 0,
          actifs: userStats.actifs ?? userStats.total_actifs ?? 0,
          nouveauxCeMois: userStats.nouveaux_ce_mois ?? userStats.inscrits_ce_mois ?? 0,
        },
        compagnies: {
          total: compStats.total ?? compStats.total_compagnies ?? 0,
          actives: compStats.actives ?? compStats.total_actives ?? 0,
        },
        provinces: {
          total: provStats.total ?? provStats.total_provinces ?? 0,
        },
        commissions: {
          totalCollecte: commStats.total_collecte ?? commStats.total ?? 0,
        },
      });

    } catch (err) {
      setError('Impossible de charger les statistiques. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const mainStats = [
    {
      icon: HiOutlineUsers,
      label: 'Utilisateurs actifs',
      value: stats.utilisateurs.actifs,
      subtitle: `${stats.utilisateurs.total} au total`,
      color: 'blue',
    },
    {
      icon: HiOutlineOfficeBuilding,
      label: 'Compagnies actives',
      value: stats.compagnies.actives,
      subtitle: `${stats.compagnies.total} enregistrées`,
      color: 'cyan',
    },
    {
      icon: HiOutlineUserAdd,
      label: 'Nouveaux ce mois',
      value: stats.utilisateurs.nouveauxCeMois,
      subtitle: 'Inscriptions récentes',
      color: 'emerald',
    },
    {
      icon: HiOutlineGlobe,
      label: 'Provinces couvertes',
      value: stats.provinces.total,
      subtitle: 'Couverture nationale',
      color: 'indigo',
    },
  ];

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {greeting} 👋
            </h1>
            <p className="text-gray-400 mt-1">
              Voici un aperçu de votre plateforme Fandrio
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <HiOutlineExclamationCircle className="text-xl flex-shrink-0" />
            <span>{error}</span>
            <button onClick={fetchDashboardData} className="ml-auto text-red-300 hover:text-white underline text-xs">
              Réessayer
            </button>
          </div>
        )}

        {/* Main Stats */}
        <section>
          <SectionHeader title="Vue d'ensemble" subtitle="Statistiques principales de la plateforme" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {mainStats.map((stat) => (
              <StatCard key={stat.label} {...stat} loading={loading} />
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <SectionHeader title="Accès rapide" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Utilisateurs', icon: HiOutlineUsers, href: '/dashboard/utilisateurs' },
              { label: 'Compagnies', icon: HiOutlineOfficeBuilding, href: '/dashboard/compagnies' },
              { label: 'Provinces', icon: HiOutlineGlobe, href: '/dashboard/provinces' },
              { label: 'Commissions', icon: HiOutlineCash, href: '/dashboard/commissions' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-3 p-5 bg-[#1E2235] rounded-2xl ring-1 ring-white/5 hover:ring-blue-500/30 hover:bg-[#242942] transition-all duration-200 group"
              >
                <item.icon className="text-2xl text-gray-400 group-hover:text-blue-400 transition-colors" />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{item.label}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default DashboardHome;
