import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    HiOutlineUsers,
    HiOutlineUserAdd,
    HiOutlineEye,
    HiOutlinePencil,
    HiOutlineShieldCheck,
    HiOutlineBan,
    HiOutlineTrash,
    HiOutlineExclamationCircle,
} from 'react-icons/hi';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import SearchBar from '../components/ui/SearchBar';
import StatusTabs from '../components/ui/StatusTabs';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import UserService from '../services/user.service';

const TABS = {
    ACTIFS: 'actifs',
    INACTIFS: 'inactifs',
    SUPPRIMES: 'supprimes',
    TOUS: 'tous',
};

const UsersPage = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ total: 0, actifs: 0 });
    const [activeTab, setActiveTab] = useState(TABS.TOUS);
    const [search, setSearch] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRes, statsRes] = await Promise.allSettled([
                UserService.getAll(),
                UserService.getStats(),
            ]);

            if (usersRes.status === 'fulfilled') {
                const data = usersRes.value?.data?.data ?? usersRes.value?.data ?? [];
                setUsers(Array.isArray(data) ? data : data.utilisateurs ?? data.users ?? []);
            }

            if (statsRes.status === 'fulfilled') {
                const s = statsRes.value?.data?.data ?? statsRes.value?.data ?? {};
                setStats({
                    total: s.total ?? s.total_utilisateurs ?? 0,
                    actifs: s.actifs ?? s.total_actifs ?? 0,
                });
            }
        } catch {
            setError('Impossible de charger les utilisateurs.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Map numeric status (1=actif, 2=inactif, 3=supprimé) to string
    const STATUS_MAP = { 1: 'actif', 2: 'inactif', 3: 'supprime' };
    const getStatus = (u) => {
        const raw = u.statut ?? u.status;
        if (typeof raw === 'number') return STATUS_MAP[raw] || 'inactif';
        return String(raw || '').toLowerCase();
    };

    // Filter users by tab
    const filteredByTab = useMemo(() => {
        switch (activeTab) {
            case TABS.ACTIFS:
                return users.filter((u) => getStatus(u) === 'actif');
            case TABS.INACTIFS:
                return users.filter((u) => getStatus(u) === 'inactif');
            case TABS.SUPPRIMES:
                return users.filter((u) => {
                    const s = getStatus(u);
                    return s === 'supprimé' || s === 'supprime';
                });
            default:
                return users;
        }
    }, [users, activeTab]);

    // Filter by search
    const filteredUsers = useMemo(() => {
        if (!search.trim()) return filteredByTab;
        const q = search.toLowerCase();
        return filteredByTab.filter(
            (u) =>
                (u.nom ?? u.name ?? '').toLowerCase().includes(q) ||
                (u.prenom ?? '').toLowerCase().includes(q) ||
                (u.email ?? '').toLowerCase().includes(q) ||
                `${u.prenom ?? ''} ${u.nom ?? u.name ?? ''}`.toLowerCase().includes(q)
        );
    }, [filteredByTab, search]);

    // Tab counts
    const tabCounts = useMemo(() => {
        const count = (status) =>
            users.filter((u) => {
                const s = getStatus(u);
                if (status === 'supprime') return s === 'supprimé' || s === 'supprime';
                return s === status;
            }).length;
        return {
            actifs: count('actif'),
            inactifs: count('inactif'),
            supprimes: count('supprime'),
            tous: users.length,
        };
    }, [users]);

    const tabs = [
        { key: TABS.TOUS, label: 'Tous', count: tabCounts.tous },
        { key: TABS.ACTIFS, label: 'Actifs', count: tabCounts.actifs },
        { key: TABS.INACTIFS, label: 'Inactifs', count: tabCounts.inactifs },
        { key: TABS.SUPPRIMES, label: 'Supprimés', count: tabCounts.supprimes },
    ];

    // Action handlers (structure only)
    const handleViewDetails = (user) => {
        // TODO: navigate to user detail page or open modal
        console.log('Voir détails:', user.id);
    };

    const handleEdit = (user) => {
        // TODO: open edit modal or navigate
        console.log('Modifier:', user.id);
    };

    const handleToggleStatus = (user) => {
        // TODO: call activer/desactiver API
        const status = getStatus(user);
        console.log(status === 'actif' ? 'Désactiver:' : 'Activer:', user.id);
    };

    const handleDelete = (user) => {
        // TODO: confirm then call supprimer API
        console.log('Supprimer:', user.id);
    };

    const getUserName = (user) => {
        if (user.prenom && user.nom) return `${user.prenom} ${user.nom}`;
        return user.nom ?? user.name ?? '—';
    };

    const columns = [
        {
            key: 'nom',
            label: 'Nom complet',
            render: (user) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-sm font-semibold flex-shrink-0">
                        {(getUserName(user)).charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-medium text-white">{getUserName(user)}</p>
                        <p className="text-xs text-gray-500">{user.role ?? user.type ?? ''}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'email',
            label: 'Email',
            render: (user) => <span className="text-gray-300">{user.email ?? '—'}</span>,
        },
        {
            key: 'telephone',
            label: 'Téléphone',
            render: (user) => <span className="text-gray-300">{user.telephone ?? user.phone ?? '—'}</span>,
        },
        {
            key: 'reservations',
            label: 'Réservations',
            render: (user) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                    {user.total_reservations ?? user.reservations_count ?? 0}
                </span>
            ),
        },
        {
            key: 'statut',
            label: 'Statut',
            render: (user) => <StatusBadge status={user.statut ?? user.status ?? 2} />,
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (user) => {
                const isActive = getStatus(user) === 'actif';
                return (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleViewDetails(user)}
                            title="Voir détails"
                            className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        >
                            <HiOutlineEye className="text-lg" />
                        </button>
                        <button
                            onClick={() => handleEdit(user)}
                            title="Modifier"
                            className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        >
                            <HiOutlinePencil className="text-lg" />
                        </button>
                        <button
                            onClick={() => handleToggleStatus(user)}
                            title={isActive ? 'Désactiver' : 'Activer'}
                            className={`p-2 rounded-lg transition-colors ${isActive
                                ? 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/10'
                                : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                        >
                            {isActive ? <HiOutlineBan className="text-lg" /> : <HiOutlineShieldCheck className="text-lg" />}
                        </button>
                        <button
                            onClick={() => handleDelete(user)}
                            title="Supprimer"
                            className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <HiOutlineTrash className="text-lg" />
                        </button>
                    </div>
                );
            },
        },
    ];

    const statsCards = [
        {
            icon: HiOutlineUsers,
            label: 'Total utilisateurs',
            value: stats.total,
            color: 'blue',
        },
        {
            icon: HiOutlineUserAdd,
            label: 'Utilisateurs actifs',
            value: stats.actifs,
            subtitle: `${stats.total > 0 ? Math.round((stats.actifs / stats.total) * 100) : 0}% du total`,
            color: 'cyan',
        },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-7xl mx-auto">
                {/* Header */}
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Utilisateurs</h1>
                    <p className="text-gray-400 mt-1">Gérez les utilisateurs de la plateforme</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {statsCards.map((s) => (
                        <StatCard key={s.label} {...s} loading={loading} />
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        <HiOutlineExclamationCircle className="text-xl flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Tabs + Search */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <StatusTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Rechercher par nom ou email..."
                    />
                </div>

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={filteredUsers}
                    loading={loading}
                    emptyMessage="Aucun utilisateur trouvé"
                />

                {/* Results count */}
                {!loading && (
                    <p className="text-xs text-gray-500">
                        {filteredUsers.length} résultat{filteredUsers.length !== 1 ? 's' : ''}
                        {search && ` pour « ${search} »`}
                    </p>
                )}
            </div>
        </DashboardLayout>
    );
};

export default UsersPage;
