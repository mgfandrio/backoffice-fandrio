import React, { useState, useEffect } from 'react';
import {
    HiOutlineX,
    HiOutlineMail,
    HiOutlinePhone,
    HiOutlineLocationMarker,
    HiOutlineIdentification,
    HiOutlineDocumentText,
    HiOutlineUserGroup,
    HiOutlineGlobe,
    HiOutlineCreditCard,
    HiOutlineOfficeBuilding,
} from 'react-icons/hi';
import StatusBadge from '../ui/StatusBadge';
import CompanyService from '../../services/company.service';

const CompanyDetailModal = ({ companyId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!companyId) return;
        setLoading(true);
        setError(null);
        CompanyService.getDetail(companyId)
            .then((res) => setCompany(res?.data?.data ?? res?.data ?? null))
            .catch(() => setError('Impossible de charger les détails.'))
            .finally(() => setLoading(false));
    }, [companyId]);

    if (!companyId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1E2235] rounded-2xl ring-1 ring-white/10 shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4 bg-[#1E2235] border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">Détails de la compagnie</h2>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
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
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
                    )}

                    {company && !loading && (
                        <>
                            {/* Header */}
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-xl font-bold flex-shrink-0">
                                    {(company.nom || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-white truncate">{company.nom}</h3>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <StatusBadge status={company.statut} />
                                        <span className="text-xs text-gray-500">Créée le {company.date_creation}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Informations générales */}
                            <Section title="Informations générales" icon={HiOutlineOfficeBuilding}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <InfoItem icon={HiOutlineIdentification} label="NIF" value={company.nif} />
                                    <InfoItem icon={HiOutlineDocumentText} label="STAT" value={company.stat} />
                                    <InfoItem icon={HiOutlineMail} label="Email" value={company.email} />
                                    <InfoItem icon={HiOutlinePhone} label="Téléphone" value={company.telephone} />
                                    <InfoItem icon={HiOutlineLocationMarker} label="Localisation" value={company.localisation?.nom} />
                                    <InfoItem icon={HiOutlineLocationMarker} label="Adresse" value={company.adresse} />
                                </div>
                                {company.description && (
                                    <div className="mt-3 p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/5">
                                        <p className="text-xs text-gray-500 mb-1">Description</p>
                                        <p className="text-sm text-gray-300">{company.description}</p>
                                    </div>
                                )}
                            </Section>

                            {/* Administrateurs */}
                            {company.administrateurs && company.administrateurs.length > 0 && (
                                <Section title={`Administrateurs (${company.administrateurs.length})`} icon={HiOutlineUserGroup}>
                                    <div className="space-y-2">
                                        {company.administrateurs.map((admin) => (
                                            <div key={admin.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-semibold">
                                                        {(admin.prenom || admin.nom || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-white">{admin.prenom} {admin.nom}</p>
                                                        <p className="text-xs text-gray-500">{admin.email}</p>
                                                    </div>
                                                </div>
                                                <StatusBadge status={admin.statut} />
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            {/* Provinces desservies */}
                            {company.provinces_desservies && company.provinces_desservies.length > 0 && (
                                <Section title={`Provinces desservies (${company.provinces_desservies.length})`} icon={HiOutlineGlobe}>
                                    <div className="flex flex-wrap gap-2">
                                        {company.provinces_desservies.map((prov) => (
                                            <span key={prov.id} className="px-3 py-1.5 text-xs font-medium bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20 rounded-full">
                                                {prov.nom}
                                            </span>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            {/* Modes de paiement */}
                            {company.modes_paiement_acceptes && company.modes_paiement_acceptes.length > 0 && (
                                <Section title={`Modes de paiement (${company.modes_paiement_acceptes.length})`} icon={HiOutlineCreditCard}>
                                    <div className="space-y-2">
                                        {company.modes_paiement_acceptes.map((mode) => (
                                            <div key={mode.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/5">
                                                <div>
                                                    <p className="text-sm text-white">{mode.nom}</p>
                                                    <p className="text-xs text-gray-500">{mode.type}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-300">{mode.numero || '—'}</p>
                                                    <p className="text-xs text-gray-500">{mode.titulaire || '—'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            {/* Paramètres financiers */}
                            <Section title="Paramètres financiers" icon={HiOutlineCreditCard}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <InfoItem label="Fréquence de collecte" value={company.frequence_collecte === 'hebdomadaire' ? 'Hebdomadaire' : 'Mensuelle'} />
                                    <InfoItem label="Commission active" value={company.commission_active ? 'Oui' : 'Non'} />
                                </div>
                            </Section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const Section = ({ title, icon: Icon, children }) => (
    <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            {Icon && <Icon className="text-blue-400" />}
            {title}
        </h4>
        {children}
    </div>
);

const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/5">
        {Icon && <Icon className="text-lg text-gray-400 flex-shrink-0" />}
        <div className="min-w-0">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm text-white truncate">{value || '—'}</p>
        </div>
    </div>
);

export default CompanyDetailModal;
