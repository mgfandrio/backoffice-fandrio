import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    HiOutlineLocationMarker,
    HiOutlineGlobe,
} from 'react-icons/hi';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import SearchBar from '../components/ui/SearchBar';
import StatusTabs from '../components/ui/StatusTabs';
import DataTable from '../components/ui/DataTable';
import ProvinceService from '../services/province.service';

const TABS = {
    TOUS: 'tous',
    NORD: 'Nord',
    SUD: 'Sud',
    EST: 'Est',
    OUEST: 'Ouest',
};

const ORIENTATION_COLORS = {
    Nord: 'bg-blue-500/20 text-blue-400',
    Sud: 'bg-emerald-500/20 text-emerald-400',
    Est: 'bg-amber-500/20 text-amber-400',
    Ouest: 'bg-purple-500/20 text-purple-400',
    Centre: 'bg-cyan-500/20 text-cyan-400',
};

const ProvincesPage = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [provinces, setProvinces] = useState([]);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState(TABS.TOUS);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await ProvinceService.getAll();
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
        return filteredByTab.filter(
            (p) =>
                (p.nom || '').toLowerCase().includes(q) ||
                (p.orientation || '').toLowerCase().includes(q)
        );
    }, [filteredByTab, search]);

    // Count per orientation
    const countByOrientation = (orientation) =>
        provinces.filter((p) => p.orientation === orientation).length;

    const tabs = [
        { key: TABS.TOUS, label: 'Tous', count: provinces.length },
        { key: TABS.NORD, label: 'Nord', count: countByOrientation('Nord') },
        { key: TABS.SUD, label: 'Sud', count: countByOrientation('Sud') },
        { key: TABS.EST, label: 'Est', count: countByOrientation('Est') },
        { key: TABS.OUEST, label: 'Ouest', count: countByOrientation('Ouest') },
    ];

    const statsCards = [
        {
            label: 'Total provinces',
            value: provinces.length,
            icon: HiOutlineLocationMarker,
            color: 'blue',
        },
        {
            label: 'Nord',
            value: countByOrientation('Nord'),
            icon: HiOutlineGlobe,
            color: 'blue',
        },
        {
            label: 'Sud',
            value: countByOrientation('Sud'),
            icon: HiOutlineGlobe,
            color: 'emerald',
        },
        {
            label: 'Est',
            value: countByOrientation('Est'),
            icon: HiOutlineGlobe,
            color: 'amber',
        },
        {
            label: 'Ouest',
            value: countByOrientation('Ouest'),
            icon: HiOutlineGlobe,
            color: 'purple',
        },
    ];

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
                const colorClass = ORIENTATION_COLORS[p.orientation] || 'bg-gray-500/20 text-gray-400';
                return (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
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
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Provinces</h1>
                        <p className="text-gray-400 text-sm mt-1">
                            Liste des provinces par point cardinal
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {statsCards.map((card, i) => (
                        <StatCard key={i} {...card} />
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
                        {error}
                    </div>
                )}

                {/* Tabs + Search */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <StatusTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Rechercher une province..."
                    />
                </div>

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={filteredProvinces}
                    loading={loading}
                    emptyMessage="Aucune province trouvée"
                />

                <div className="text-gray-500 text-sm">
                    {filteredProvinces.length} résultat{filteredProvinces.length !== 1 ? 's' : ''}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ProvincesPage;
