import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    HiOutlineOfficeBuilding,
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
import CompanyService from '../services/company.service';
import CompanyDetailModal from '../components/companies/CompanyDetailModal';
import CompanyEditModal from '../components/companies/CompanyEditModal';
import ConfirmModal from '../components/ui/ConfirmModal';

const TABS = {
    TOUS: 'tous',
    ACTIFS: 'actifs',
    INACTIFS: 'inactifs',
    SUPPRIMES: 'supprimes',
};

const STATUS_MAP = { 1: 'actif', 2: 'inactif', 3: 'supprime' };
const getCompanyStatus = (c) => {
    const raw = c.statut ?? c.status;
    if (typeof raw === 'number') return STATUS_MAP[raw] || 'inactif';
    return String(raw || '').toLowerCase();
};

const CompaniesPage = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [stats, setStats] = useState({ total: 0, actives: 0 });
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState(TABS.TOUS);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [editingCompany, setEditingCompany] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [companiesRes, statsRes] = await Promise.allSettled([
                CompanyService.getAll(),
                CompanyService.getStats(),
            ]);

            if (companiesRes.status === 'fulfilled') {
                const data = companiesRes.value?.data?.data ?? companiesRes.value?.data ?? [];
                setCompanies(Array.isArray(data) ? data : data.compagnies ?? []);
            }

            if (statsRes.status === 'fulfilled') {
                const s = statsRes.value?.data?.data ?? statsRes.value?.data ?? {};
                setStats({
                    total: s.total ?? 0,
                    actives: s.actives ?? 0,
                });
            }
        } catch {
            setError('Impossible de charger les compagnies.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter by tab
    const filteredByTab = useMemo(() => {
        switch (activeTab) {
            case TABS.ACTIFS:
                return companies.filter((c) => getCompanyStatus(c) === 'actif');
            case TABS.INACTIFS:
                return companies.filter((c) => getCompanyStatus(c) === 'inactif');
            case TABS.SUPPRIMES:
                return companies.filter((c) => getCompanyStatus(c) === 'supprime');
            default:
                return companies;
        }
    }, [companies, activeTab]);

    // Filter by search
    const filteredCompanies = useMemo(() => {
        if (!search.trim()) return filteredByTab;
        const q = search.toLowerCase();
        return filteredByTab.filter(
            (c) =>
                (c.nom ?? '').toLowerCase().includes(q) ||
                (c.email ?? '').toLowerCase().includes(q) ||
                (c.localisation?.nom ?? '').toLowerCase().includes(q) ||
                (c.provinces ?? []).some((p) => p.toLowerCase().includes(q))
        );
    }, [filteredByTab, search]);

    // Tab counts
    const tabCounts = useMemo(() => {
        const count = (status) => companies.filter((c) => getCompanyStatus(c) === status).length;
        return {
            tous: companies.length,
            actifs: count('actif'),
            inactifs: count('inactif'),
            supprimes: count('supprime'),
        };
    }, [companies]);

    const tabs = [
        { key: TABS.TOUS, label: 'Tous', count: tabCounts.tous },
        { key: TABS.ACTIFS, label: 'Actifs', count: tabCounts.actifs },
        { key: TABS.INACTIFS, label: 'Inactifs', count: tabCounts.inactifs },
        { key: TABS.SUPPRIMES, label: 'Supprimés', count: tabCounts.supprimes },
    ];

    const handleViewDetails = (company) => {
        setSelectedCompanyId(company.id);
    };

    const handleEdit = async (company) => {
        // Fetch full detail for edit (includes provinces_desservies, modes_paiement, etc.)
        try {
            const res = await CompanyService.getDetail(company.id);
            const detail = res?.data?.data ?? res?.data ?? company;
            setEditingCompany(detail);
        } catch {
            setEditingCompany(company);
        }
    };

    const handleToggleStatus = (company) => {
        const isActive = getCompanyStatus(company) === 'actif';
        setConfirmAction({
            title: isActive ? 'Désactiver la compagnie' : 'Activer la compagnie',
            message: `Voulez-vous ${isActive ? 'désactiver' : 'activer'} ${company.nom ?? ''} ?`,
            confirmLabel: isActive ? 'Désactiver' : 'Activer',
            confirmColor: isActive ? 'amber' : 'emerald',
            action: async () => {
                await CompanyService.changerStatut(company.id, { statut: isActive ? 2 : 1 });
            },
        });
    };

    const handleDelete = (company) => {
        setConfirmAction({
            title: 'Supprimer la compagnie',
            message: `Voulez-vous vraiment supprimer ${company.nom ?? ''} ? Cette action est irréversible.`,
            confirmLabel: 'Supprimer',
            confirmColor: 'red',
            action: async () => {
                await CompanyService.supprimer(company.id);
            },
        });
    };

    const executeConfirmAction = async () => {
        if (!confirmAction?.action) return;
        setActionLoading(true);
        try {
            await confirmAction.action();
            setConfirmAction(null);
            fetchData();
        } catch (err) {
            setError(err?.message || 'Une erreur est survenue.');
            setConfirmAction(null);
        } finally {
            setActionLoading(false);
        }
    };

    const statsCards = [
        {
            icon: HiOutlineOfficeBuilding,
            label: 'Total compagnies',
            value: stats.total,
            color: 'blue',
        },
        {
            icon: HiOutlineUserAdd,
            label: 'Compagnies actives',
            value: stats.actives,
            subtitle: `${stats.total > 0 ? Math.round((stats.actives / stats.total) * 100) : 0}% du total`,
            color: 'cyan',
        },
    ];

    const columns = [
        {
            key: 'nom',
            label: 'Nom de la coopérative',
            render: (c) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-sm font-semibold flex-shrink-0">
                        {(c.nom || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-medium text-white">{c.nom ?? '—'}</p>
                        <p className="text-xs text-gray-500">{c.nif ?? ''}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'localisation',
            label: 'Province',
            render: (c) => (
                <span className="text-gray-300">{c.localisation?.nom ?? '—'}</span>
            ),
        },
        {
            key: 'email',
            label: 'Email',
            render: (c) => <span className="text-gray-300">{c.email ?? '—'}</span>,
        },
        {
            key: 'telephone',
            label: 'Contact',
            render: (c) => <span className="text-gray-300">{c.telephone ?? '—'}</span>,
        },
        {
            key: 'statut',
            label: 'Statut',
            render: (c) => <StatusBadge status={c.statut} />,
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (c) => {
                const isActive = getCompanyStatus(c) === 'actif';
                return (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleViewDetails(c)}
                            title="Voir détails"
                            className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        >
                            <HiOutlineEye className="text-lg" />
                        </button>
                        <button
                            onClick={() => handleEdit(c)}
                            title="Modifier"
                            className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        >
                            <HiOutlinePencil className="text-lg" />
                        </button>
                        <button
                            onClick={() => handleToggleStatus(c)}
                            title={isActive ? 'Désactiver' : 'Activer'}
                            className={`p-2 rounded-lg transition-colors ${isActive
                                    ? 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/10'
                                    : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                        >
                            {isActive ? <HiOutlineBan className="text-lg" /> : <HiOutlineShieldCheck className="text-lg" />}
                        </button>
                        <button
                            onClick={() => handleDelete(c)}
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

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-7xl mx-auto">
                {/* Header */}
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Compagnies</h1>
                    <p className="text-gray-400 mt-1">Gérez les compagnies (coopératives) de la plateforme</p>
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
                        placeholder="Rechercher par nom, email ou province..."
                    />
                </div>

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={filteredCompanies}
                    loading={loading}
                    emptyMessage="Aucune compagnie trouvée"
                />

                {/* Results count */}
                {!loading && (
                    <p className="text-xs text-gray-500">
                        {filteredCompanies.length} résultat{filteredCompanies.length !== 1 ? 's' : ''}
                        {search && ` pour « ${search} »`}
                    </p>
                )}
            </div>

            {/* Detail Modal */}
            {selectedCompanyId && (
                <CompanyDetailModal
                    companyId={selectedCompanyId}
                    onClose={() => setSelectedCompanyId(null)}
                />
            )}

            {/* Edit Modal */}
            {editingCompany && (
                <CompanyEditModal
                    company={editingCompany}
                    onClose={() => setEditingCompany(null)}
                    onSuccess={fetchData}
                />
            )}

            {/* Confirm Action Modal */}
            <ConfirmModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={executeConfirmAction}
                title={confirmAction?.title}
                message={confirmAction?.message}
                confirmLabel={confirmAction?.confirmLabel}
                confirmColor={confirmAction?.confirmColor}
                loading={actionLoading}
            />
        </DashboardLayout>
    );
};

export default CompaniesPage;
