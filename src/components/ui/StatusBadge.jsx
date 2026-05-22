import React from 'react';

const STATUS_NUM_MAP = { 1: 'actif', 2: 'inactif', 3: 'supprime' };

const StatusBadge = ({ status }) => {
    const config = {
        actif: { label: 'Actif', className: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' },
        inactif: { label: 'Inactif', className: 'bg-amber-500/10 text-amber-400 ring-amber-500/20' },
        supprime: { label: 'Supprimé', className: 'bg-red-500/10 text-red-400 ring-red-500/20' },
    };

    const normalized = typeof status === 'number'
        ? (STATUS_NUM_MAP[status] || 'inactif')
        : String(status || '').toLowerCase().replace('é', 'e');
    const c = config[normalized] || config.inactif;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${c.className}`}>
            {c.label}
        </span>
    );
};

export default StatusBadge;
