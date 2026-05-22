import React, { useState, useEffect } from 'react';
import { HiOutlineX, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import CompanyService from '../../services/company.service';

const FREQUENCE_OPTIONS = [
    { value: 'mensuelle', label: 'Mensuelle' },
    { value: 'hebdomadaire', label: 'Hebdomadaire' },
];

const JOURS_SEMAINE = [
    { value: 'lundi', label: 'Lundi' },
    { value: 'mardi', label: 'Mardi' },
    { value: 'mercredi', label: 'Mercredi' },
    { value: 'jeudi', label: 'Jeudi' },
    { value: 'vendredi', label: 'Vendredi' },
    { value: 'samedi', label: 'Samedi' },
    { value: 'dimanche', label: 'Dimanche' },
];

const OPERATEURS_MOBILE_MONEY = [
    { id: 'mvola', nom: 'MVola (Telma)' },
    { id: 'orange_money', nom: 'Orange Money' },
    { id: 'airtel_money', nom: 'Airtel Money' },
];

const CompanyEditModal = ({ company, onClose, onSuccess }) => {
    const [form, setForm] = useState({
        comp_nom: company?.nom ?? '',
        comp_nif: company?.nif ?? '',
        comp_stat: company?.stat ?? '',
        comp_description: company?.description ?? '',
        comp_phone: company?.telephone ?? '',
        comp_email: company?.email ?? '',
        comp_adresse: company?.adresse ?? '',
        comp_localisation: company?.localisation?.id ?? '',
        provinces_desservies: company?.provinces_desservies?.map((p) => p.id) ?? [],
        modes_paiement: company?.modes_paiement_acceptes?.map((m) => ({
            type_paie_id: m.id,
            nom: m.nom,
            numero: m.numero ?? '',
            titulaire: m.titulaire ?? '',
        })) ?? [],
        comm_frequence_collecte: company?.frequence_collecte ?? 'mensuelle',
        comm_jour_collecte: company?.jour_collecte ?? '',
    });
    const [provinces, setProvinces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingProvinces, setLoadingProvinces] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        CompanyService.getProvinces()
            .then((res) => {
                const data = res?.data?.data ?? res?.data ?? [];
                setProvinces(Array.isArray(data) ? data : data.provinces ?? []);
            })
            .catch(() => { })
            .finally(() => setLoadingProvinces(false));
    }, []);

    if (!company) return null;

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleProvinceToggle = (provId) => {
        setForm((prev) => ({
            ...prev,
            provinces_desservies: prev.provinces_desservies.includes(provId)
                ? prev.provinces_desservies.filter((id) => id !== provId)
                : [...prev.provinces_desservies, provId],
        }));
    };

    const handlePaymentChange = (index, field) => (e) => {
        setForm((prev) => {
            const updated = [...prev.modes_paiement];
            updated[index] = { ...updated[index], [field]: e.target.value };
            return { ...prev, modes_paiement: updated };
        });
    };

    const handleAddOperator = (operateur) => {
        const exists = form.modes_paiement.some((m) => m.type_paie_id === operateur.id || m.nom === operateur.nom);
        if (exists) return;
        setForm((prev) => ({
            ...prev,
            modes_paiement: [...prev.modes_paiement, { type_paie_id: operateur.id, nom: operateur.nom, numero: '', titulaire: '' }],
        }));
    };

    const handleRemoveOperator = (index) => {
        setForm((prev) => ({
            ...prev,
            modes_paiement: prev.modes_paiement.filter((_, i) => i !== index),
        }));
    };

    const handleFrequenceChange = (value) => {
        setForm((prev) => ({ ...prev, comm_frequence_collecte: value, comm_jour_collecte: '' }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            await CompanyService.modifier(company.id, form);
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err?.errors ? Object.values(err.errors).flat().join(', ') : err?.message || 'Une erreur est survenue.');
        } finally {
            setLoading(false);
        }
    };

    const textFields = [
        { key: 'comp_nom', label: 'Nom de la compagnie', type: 'text' },
        { key: 'comp_nif', label: 'NIF', type: 'text' },
        { key: 'comp_stat', label: 'STAT', type: 'text' },
        { key: 'comp_email', label: 'Email', type: 'email' },
        { key: 'comp_phone', label: 'Téléphone', type: 'tel' },
        { key: 'comp_adresse', label: 'Adresse', type: 'text' },
    ];

    const inputClass = "w-full px-4 py-2.5 bg-white/[0.03] text-white text-sm rounded-xl border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none placeholder-gray-500 transition-all";

    // Available operators not yet added
    const availableOperators = OPERATEURS_MOBILE_MONEY.filter(
        (op) => !form.modes_paiement.some((m) => m.type_paie_id === op.id || m.nom === op.nom)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1E2235] rounded-2xl ring-1 ring-white/10 shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4 bg-[#1E2235] border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">Modifier la compagnie</h2>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        <HiOutlineX className="text-xl" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Informations générales */}
                    <SectionTitle title="Informations générales" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {textFields.map((f) => (
                            <div key={f.key}>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">{f.label}</label>
                                <input type={f.type} value={form[f.key]} onChange={handleChange(f.key)} className={inputClass} />
                            </div>
                        ))}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                        <textarea
                            value={form.comp_description}
                            onChange={handleChange('comp_description')}
                            rows={3}
                            className={inputClass + ' resize-none'}
                        />
                    </div>

                    {/* Provinces desservies */}
                    <SectionTitle title="Provinces desservies" />
                    {loadingProvinces ? (
                        <div className="h-20 bg-gray-700 rounded-xl animate-pulse" />
                    ) : (
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                            {provinces.map((prov) => {
                                const provId = prov.id ?? prov.pro_id;
                                const provNom = prov.nom ?? prov.pro_nom;
                                const selected = form.provinces_desservies.includes(provId);
                                return (
                                    <button
                                        key={provId}
                                        type="button"
                                        onClick={() => handleProvinceToggle(provId)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full ring-1 transition-all ${selected
                                                ? 'bg-blue-500/20 text-blue-400 ring-blue-500/30'
                                                : 'bg-white/[0.03] text-gray-400 ring-white/10 hover:ring-white/20'
                                            }`}
                                    >
                                        {provNom}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Modes de paiement - Mobile Money */}
                    <SectionTitle title="Mobile Money" />

                    {/* Existing operators */}
                    <div className="space-y-3">
                        {form.modes_paiement.map((mode, i) => (
                            <div key={`${mode.type_paie_id}-${i}`} className="p-4 bg-white/[0.03] rounded-xl ring-1 ring-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-white">{mode.nom}</p>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOperator(i)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        title="Retirer"
                                    >
                                        <HiOutlineTrash className="text-base" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Numéro</label>
                                        <input type="tel" value={mode.numero} onChange={handlePaymentChange(i, 'numero')} className={inputClass} placeholder="Ex: 034 00 000 00" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Titulaire du compte</label>
                                        <input type="text" value={mode.titulaire} onChange={handlePaymentChange(i, 'titulaire')} className={inputClass} placeholder="Nom du titulaire" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add operator */}
                    {availableOperators.length > 0 && (
                        <div>
                            <p className="text-xs text-gray-500 mb-2">Ajouter un opérateur</p>
                            <div className="flex flex-wrap gap-2">
                                {availableOperators.map((op) => (
                                    <button
                                        key={op.id}
                                        type="button"
                                        onClick={() => handleAddOperator(op)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-white/[0.03] text-gray-400 ring-1 ring-white/10 hover:ring-blue-500/30 hover:text-blue-400 transition-all"
                                    >
                                        <HiOutlinePlus className="text-sm" />
                                        {op.nom}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {form.modes_paiement.length === 0 && availableOperators.length === 0 && (
                        <p className="text-xs text-gray-500 italic">Tous les opérateurs ont été ajoutés</p>
                    )}

                    {/* Fréquence de collecte */}
                    <SectionTitle title="Paramètres financiers" />
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Fréquence de collecte</label>
                            <div className="flex gap-3">
                                {FREQUENCE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleFrequenceChange(opt.value)}
                                        className={`flex-1 py-2.5 text-sm font-medium rounded-xl ring-1 transition-all ${form.comm_frequence_collecte === opt.value
                                                ? 'bg-blue-500/20 text-blue-400 ring-blue-500/30'
                                                : 'bg-white/[0.03] text-gray-400 ring-white/10 hover:ring-white/20'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Jour de collecte */}
                        {form.comm_frequence_collecte === 'hebdomadaire' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Jour de collecte</label>
                                <div className="flex flex-wrap gap-2">
                                    {JOURS_SEMAINE.map((jour) => (
                                        <button
                                            key={jour.value}
                                            type="button"
                                            onClick={() => setForm((prev) => ({ ...prev, comm_jour_collecte: jour.value }))}
                                            className={`px-3 py-2 text-xs font-medium rounded-xl ring-1 transition-all ${form.comm_jour_collecte === jour.value
                                                    ? 'bg-blue-500/20 text-blue-400 ring-blue-500/30'
                                                    : 'bg-white/[0.03] text-gray-400 ring-white/10 hover:ring-white/20'
                                                }`}
                                        >
                                            {jour.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {form.comm_frequence_collecte === 'mensuelle' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Jour du mois</label>
                                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => setForm((prev) => ({ ...prev, comm_jour_collecte: String(day) }))}
                                            className={`w-9 h-9 text-xs font-medium rounded-lg ring-1 transition-all ${form.comm_jour_collecte === String(day)
                                                    ? 'bg-blue-500/20 text-blue-400 ring-blue-500/30'
                                                    : 'bg-white/[0.03] text-gray-400 ring-white/10 hover:ring-white/20'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl">{error}</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                            Annuler
                        </button>
                        <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50">
                            {loading ? 'En cours...' : 'Enregistrer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SectionTitle = ({ title }) => (
    <h4 className="text-sm font-semibold text-gray-300 border-b border-white/5 pb-2">{title}</h4>
);

export default CompanyEditModal;
