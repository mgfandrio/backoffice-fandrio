import React, { useState, useEffect } from 'react';
import {
    HiOutlineX,
    HiOutlineUser,
    HiOutlineMail,
    HiOutlinePhone,
    HiOutlineCalendar,
    HiOutlineTicket,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineTrendingUp,
    HiOutlineUserGroup,
} from 'react-icons/hi';
import StatusBadge from '../ui/StatusBadge';
import UserService from '../../services/user.service';

const UserDetailModal = ({ userId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        UserService.getDetail(userId)
            .then((res) => {
                const data = res?.data?.data ?? res?.data ?? null;
                setUser(data);
            })
            .catch(() => setError('Impossible de charger les détails.'))
            .finally(() => setLoading(false));
    }, [userId]);

    if (!userId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1E2235] rounded-2xl ring-1 ring-white/10 shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4 bg-[#1E2235] border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">Détails de l'utilisateur</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <HiOutlineX className="text-xl" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {loading && (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-16 bg-gray-700 rounded-xl" />
                            <div className="h-32 bg-gray-700 rounded-xl" />
                            <div className="h-24 bg-gray-700 rounded-xl" />
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {user && !loading && (
                        <>
                            {/* User Info */}
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xl font-bold flex-shrink-0">
                                    {(user.prenom || user.nom || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-white truncate">
                                        {user.prenom} {user.nom}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <StatusBadge status={user.statut} />
                                        <span className="text-xs text-gray-500">Inscrit le {user.date_creation}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <InfoItem icon={HiOutlineMail} label="Email" value={user.email} />
                                <InfoItem icon={HiOutlinePhone} label="Téléphone" value={user.telephone} />
                                <InfoItem icon={HiOutlineCalendar} label="Date de naissance" value={user.date_naissance} />
                            </div>

                            {/* Reservation Stats */}
                            {user.statistiques && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                                        <HiOutlineTicket className="text-blue-400" />
                                        Statistiques de réservation
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <MiniStat
                                            label="Total"
                                            value={user.statistiques.total_reservations}
                                            color="blue"
                                        />
                                        <MiniStat
                                            label="Confirmées"
                                            value={user.statistiques.reservations_confirmees}
                                            color="emerald"
                                        />
                                        <MiniStat
                                            label="Annulées"
                                            value={user.statistiques.reservations_annulees}
                                            color="red"
                                        />
                                        <MiniStat
                                            label="Taux confirm."
                                            value={`${user.statistiques.taux_confirmation}%`}
                                            color="cyan"
                                            icon={HiOutlineTrendingUp}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Voyageurs */}
                            {user.voyageurs_associes && user.voyageurs_associes.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                                        <HiOutlineUserGroup className="text-blue-400" />
                                        Voyageurs associés ({user.voyageurs_associes.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {user.voyageurs_associes.map((v) => (
                                            <div
                                                key={v.id}
                                                className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/5"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xs font-semibold">
                                                        {(v.prenom || v.nom || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-white">
                                                        {v.prenom} {v.nom}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-full">
                                                    {v.age ? `${v.age} ans` : '—'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {user.voyageurs_associes && user.voyageurs_associes.length === 0 && (
                                <p className="text-sm text-gray-500 italic">Aucun voyageur associé</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/5">
        <Icon className="text-lg text-gray-400 flex-shrink-0" />
        <div className="min-w-0">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm text-white truncate">{value || '—'}</p>
        </div>
    </div>
);

const MiniStat = ({ label, value, color, icon: Icon }) => {
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
        red: 'bg-red-500/10 text-red-400 ring-red-500/20',
        cyan: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20',
    };

    return (
        <div className={`p-3 rounded-xl ring-1 text-center ${colorClasses[color] || colorClasses.blue}`}>
            {Icon && <Icon className="text-lg mx-auto mb-1" />}
            <p className="text-lg font-bold">{value}</p>
            <p className="text-xs opacity-70">{label}</p>
        </div>
    );
};

export default UserDetailModal;
