import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    HiOutlineLocationMarker,
    HiOutlineEye,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineExclamationCircle,
} from 'react-icons/hi';
import DashboardLayout from '../components/layout/DashboardLayout';
import SearchBar from '../components/ui/SearchBar';
import StatusTabs from '../components/ui/StatusTabs';
import DataTable from '../components/ui/DataTable';
import ConfirmModal from '../components/ui/ConfirmModal';
import ProvinceService from '../services/province.service';

const TABS = {
    TOUS: 'tous',
    NORD: 'Nord',
    SUD: 'Sud',
    EST: 'Est',
    OUEST: 'Ouest',
    CENTRE: 'Centre',
};

const ProvincesPage = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [provinces, setProvinces] = useState([]);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState(TABS.TOUS);
    const [selectedProvince, setSelectedProvince] = useState(null);
    const [editingProvince, setEditingProvince] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await ProvinceService.getAll({ paginer: false });
            const data = res?.data?.data ?? res?.data ?? [];
            const list = Array.isArray(data) ? data : data.provinces ?? [];
            setProvinces(list);
        } catch {
            setError('Impossible de charger les provinces.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter by tab (orientation)
    const filteredByTab = useMemo(() => {
        if (activeTab === TABS.TOUS) return provinces;
        return provinces.filter((p) => p.orientation === activeTab);
    }, [provinces, activeTab]);

    // Filter by search
    const filteredProvinces = useMemo(() => {
        if (!search.trim()) return filteredByTab;
        const q = search.toLowerCase();
        return filteredByTab.filter((p) =>
            (p.nom || '').toLowerCase().includes(q) ||
            (p.orientation || '').toLowerCase().includes(q)
        );
    }, [filteredByTab, search]);

    const tabs = useMemo(() => {
        const count = (orientation) =>
            orientation === 'tous'
                ? provinces.length
                : provinces.filter((p) => p.orientation === orientation).length;

        return [
            { id: TABS.TOUS, label: 'Tous', count: count('tous') },
            { id: TABS.NORD, label: 'Nord', count: count('Nord') },
            { id: TABS.SUD, label: 'Sud', count: count('Sud') },
            { id: TABS.EST, label: 'Est', count: count('Est') },
            { id: TABS.OUEST, label: 'Ouest', count: count('Ouest') },
            { id: TABS.CENTRE, label: 'Centre', count: count('Centre') },
        ];
    }, [provinces]);

    const handleDelete = (province) => {
        setConfirmAction({
            title: 'Supprimer la province',
            message: `Voulez-vous vraiment supprimer "${province.nom}" ? Cette action est irréversible.`,
            confirmLabel: 'Supprimer',
            confirmColor: 'red',
            action: async () => {
                await ProvinceService.supprimer(province.id);
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
            setError(err?.response?.data?.message || err?.message || 'Une erreur est survenue.');
            setConfirmAction(null);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveEdit = async (data) => {
        try {
            await ProvinceService.modifier(editingProvince.id, data);
            setEditingProvince(null);
            fetchData();
        } catch (err) {
            throw err;
        }
    };

    const columns = [
        {
            key: 'nom',
            label: 'Nom',
            render: (p) => (
                <span className="font-medium text-white">{p.nom}</span>
            ),
        },
        {
            key: 'orientation',
            label: 'Orientation',
            render: (p) => {
                const colors = {
                    Nord: 'bg-blue-500/20 text-blue-400',
                    Sud: 'bg-emerald-500/20 text-emerald-400',
                    Est: 'bg-amber-500/20 text-amber-400',
                    Ouest: 'bg-purple-500/20 text-purple-400',
                    Centre: 'bg-cyan-500/20 text-cyan-400',
                };
                return (
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${colors[p.orientation] || 'bg-gray-500/20 text-gray-400'}`}>
                        {p.orientation}
                    </span>
                );
            },
        },
        {
            key: 'date_creation',
            label: 'Date de création',
            render: (p) => (
                <span className="text-gray-400 text-sm">{p.date_creation || '—'}</span>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (p) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setSelectedProvince(p)}
                        title="Voir détails"
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                        <HiOutlineEye className="text-lg" />
                    </button>
                    <button
                        onClick={() => setEditingProvince(p)}
                        title="Modifier"
                        className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                    >
                        <HiOutlinePencil className="text-lg" />
                    </button>
                    <button
                        onClick={() => handleDelete(p)}
                        title="Supprimer"
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <HiOutlineTrash className="text-lg" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Provinces</h1>
                        <p className="text-gray-400 mt-1">Gestion des provinces</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`bg-[#1E2235] rounded-xl p-4 border cursor-pointer transition-all ${activeTab === tab.id
                                    ? 'border-blue-500/50 bg-blue-500/5'
                                    : 'border-gray-700/50 hover:border-gray-600/50'
                                }`}
                        >
                            <p className="text-gray-400 text-xs">{tab.label}</p>
                            <p className="text-white text-xl font-bold mt-1">{tab.count}</p>
                        </div>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                        <HiOutlineExclamationCircle className="text-red-400 text-xl flex-shrink-0" />
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Search + Tabs */}
                <div className="bg-[#1E2235] rounded-xl border border-gray-700/50 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <StatusTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                        <SearchBar
                            value={search}
                            onChange={setSearch}
                            placeholder="Rechercher une province..."
                        />
                    </div>

                    <DataTable
                        columns={columns}
                        data={filteredProvinces}
                        loading={loading}
                        emptyMessage="Aucune province trouvée"
                    />

                    <div className="mt-4 text-sm text-gray-500">
                        {filteredProvinces.length} résultat{filteredProvinces.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedProvince && (
                <ProvinceDetailModal
                    province={selectedProvince}
                    onClose={() => setSelectedProvince(null)}
                />
            )}

            {/* Edit Modal */}
            {editingProvince && (
                <ProvinceEditModal
                    province={editingProvince}
                    onClose={() => setEditingProvince(null)}
                    onSave={handleSaveEdit}
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

// Detail Modal Component
const ProvinceDetailModal = ({ province, onClose }) => {
    const colors = {
        Nord: 'bg-blue-500/20 text-blue-400',
        Sud: 'bg-emerald-500/20 text-emerald-400',
        Est: 'bg-amber-500/20 text-amber-400',
        Ouest: 'bg-purple-500/20 text-purple-400',
        Centre: 'bg-cyan-500/20 text-cyan-400',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1E2235] rounded-2xl border border-gray-700/50 w-full max-w-md shadow-xl">
                <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Détails de la province</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-gray-400 text-sm">Nom</label>
                        <p className="text-white font-medium text-lg">{province.nom}</p>
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm">Orientation</label>
                        <p className="mt-1">
                            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${colors[province.orientation] || 'bg-gray-500/20 text-gray-400'}`}>
                                {province.orientation}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm">Date de création</label>
                        <p className="text-white">{province.date_creation || '—'}</p>
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm">Dernière modification</label>
                        <p className="text-white">{province.date_modification || '—'}</p>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-700/50">
                    <button
                        onClick={onClose}
                        className="w-full py-2 rounded-xl bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

// Edit Modal Component
const ProvinceEditModal = ({ province, onClose, onSave }) => {
    const [nom, setNom] = useState(province.nom || '');
    const [orientation, setOrientation] = useState(province.orientation || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const orientations = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nom.trim() || !orientation) return;
        setSaving(true);
        setError(null);
        try {
            await onSave({ pro_nom: nom.trim(), pro_orientation: orientation });
        } catch (err) {
            setError(err?.response?.data?.message || 'Erreur lors de la modification.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1E2235] rounded-2xl border border-gray-700/50 w-full max-w-md shadow-xl">
                <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Modifier la province</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">Nom</label>
                        <input
                            type="text"
                            value={nom}
                            onChange={(e) => setNom(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-[#171923] border border-gray-700/50 text-white focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">Orientation</label>
                        <select
                            value={orientation}
                            onChange={(e) => setOrientation(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-[#171923] border border-gray-700/50 text-white focus:border-blue-500 focus:outline-none"
                            required
                        >
                            <option value="">Sélectionner...</option>
                            {orientations.map((o) => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 rounded-xl bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !nom.trim() || !orientation}
                            className="flex-1 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProvincesPage;
