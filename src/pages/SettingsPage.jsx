import React, { useState, useEffect } from 'react';
import {
    HiOutlineUser,
    HiOutlineLockClosed,
    HiOutlineMail,
    HiOutlinePhone,
    HiOutlineCheck,
    HiOutlineExclamationCircle,
} from 'react-icons/hi';
import DashboardLayout from '../components/layout/DashboardLayout';
import ApiService from '../services/api.service';
import { API_ENDPOINTS } from '../constants/api.constants';

const SettingsPage = () => {
    const [activeSection, setActiveSection] = useState('profil');

    const sections = [
        { id: 'profil', label: 'Informations personnelles', icon: <HiOutlineUser /> },
        { id: 'password', label: 'Mot de passe', icon: <HiOutlineLockClosed /> },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white">Paramètres</h1>
                    <p className="text-gray-400 mt-1">Gérez votre compte et vos préférences</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar */}
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="bg-[#1E2235] rounded-xl border border-gray-700/50 p-2">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                        activeSection === section.id
                                            ? 'bg-blue-600/20 text-blue-400'
                                            : 'text-gray-400 hover:bg-[#2f3349] hover:text-white'
                                    }`}
                                >
                                    <span className="text-lg">{section.icon}</span>
                                    {section.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        {activeSection === 'profil' && <ProfileSection />}
                        {activeSection === 'password' && <PasswordSection />}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

// ── Profile Section ──
const ProfileSection = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await ApiService.get(API_ENDPOINTS.AUTH.ME);
            const u = res?.data?.utilisateur ?? res?.data?.data ?? {};
            setForm({
                nom: u.nom || '',
                prenom: u.prenom || '',
                email: u.email || '',
                telephone: u.telephone || '',
            });
        } catch {
            setError('Impossible de charger le profil.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setSuccess(null);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await ApiService.put(API_ENDPOINTS.AUTH.PROFIL, form);
            const u = res?.data?.utilisateur;
            if (u) {
                localStorage.setItem('user', JSON.stringify(u));
            }
            setSuccess('Profil mis à jour avec succès.');
        } catch (err) {
            const msg = err?.response?.data?.message || err?.response?.data?.erreurs;
            if (typeof msg === 'object') {
                setError(Object.values(msg).flat().join(', '));
            } else {
                setError(msg || 'Erreur lors de la mise à jour.');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-[#1E2235] rounded-xl border border-gray-700/50 p-8">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#1E2235] rounded-xl border border-gray-700/50">
            <div className="p-6 border-b border-gray-700/50">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <HiOutlineUser className="text-blue-400" />
                    Informations personnelles
                </h2>
                <p className="text-gray-400 text-sm mt-1">Modifiez vos informations de profil</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {success && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                        <HiOutlineCheck className="text-emerald-400 text-xl flex-shrink-0" />
                        <p className="text-emerald-400 text-sm">{success}</p>
                    </div>
                )}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                        <HiOutlineExclamationCircle className="text-red-400 text-xl flex-shrink-0" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="text-gray-400 text-sm mb-2 block">Nom</label>
                        <div className="relative">
                            <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={form.nom}
                                onChange={(e) => handleChange('nom', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#171923] border border-gray-700/50 text-white focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="Votre nom"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm mb-2 block">Prénom</label>
                        <div className="relative">
                            <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={form.prenom}
                                onChange={(e) => handleChange('prenom', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#171923] border border-gray-700/50 text-white focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="Votre prénom"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-gray-400 text-sm mb-2 block">Email</label>
                    <div className="relative">
                        <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#171923] border border-gray-700/50 text-white focus:border-blue-500 focus:outline-none transition-colors"
                            placeholder="votre@email.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-gray-400 text-sm mb-2 block">Téléphone</label>
                    <div className="relative">
                        <HiOutlinePhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={form.telephone}
                            onChange={(e) => handleChange('telephone', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#171923] border border-gray-700/50 text-white focus:border-blue-500 focus:outline-none transition-colors"
                            placeholder="+261 34 00 000 00"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <HiOutlineCheck />
                                Enregistrer les modifications
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

// ── Password Section ──
const PasswordSection = () => {
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({
        ancien_mot_de_passe: '',
        nouveau_mot_de_passe: '',
        nouveau_mot_de_passe_confirmation: '',
    });

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setSuccess(null);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (form.nouveau_mot_de_passe !== form.nouveau_mot_de_passe_confirmation) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }
        if (form.nouveau_mot_de_passe.length < 6) {
            setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await ApiService.put(API_ENDPOINTS.AUTH.CHANGER_MOT_DE_PASSE, form);
            setSuccess('Mot de passe modifié avec succès.');
            setForm({
                ancien_mot_de_passe: '',
                nouveau_mot_de_passe: '',
                nouveau_mot_de_passe_confirmation: '',
            });
        } catch (err) {
            const msg = err?.response?.data?.message || err?.response?.data?.erreurs;
            if (typeof msg === 'object') {
                setError(Object.values(msg).flat().join(', '));
            } else {
                setError(msg || 'Erreur lors du changement de mot de passe.');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-[#1E2235] rounded-xl border border-gray-700/50">
            <div className="p-6 border-b border-gray-700/50">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <HiOutlineLockClosed className="text-blue-400" />
                    Changer le mot de passe
                </h2>
                <p className="text-gray-400 text-sm mt-1">Sécurisez votre compte avec un nouveau mot de passe</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {success && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                        <HiOutlineCheck className="text-emerald-400 text-xl flex-shrink-0" />
                        <p className="text-emerald-400 text-sm">{success}</p>
                    </div>
                )}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                        <HiOutlineExclamationCircle className="text-red-400 text-xl flex-shrink-0" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                <div>
                    <label className="text-gray-400 text-sm mb-2 block">Ancien mot de passe</label>
                    <div className="relative">
                        <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="password"
                            value={form.ancien_mot_de_passe}
                            onChange={(e) => handleChange('ancien_mot_de_passe', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#171923] border border-gray-700/50 text-white focus:border-blue-500 focus:outline-none transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="text-gray-400 text-sm mb-2 block">Nouveau mot de passe</label>
                    <div className="relative">
                        <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="password"
                            value={form.nouveau_mot_de_passe}
                            onChange={(e) => handleChange('nouveau_mot_de_passe', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#171923] border border-gray-700/50 text-white focus:border-blue-500 focus:outline-none transition-colors"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>
                    <p className="text-gray-500 text-xs mt-1">Minimum 6 caractères</p>
                </div>

                <div>
                    <label className="text-gray-400 text-sm mb-2 block">Confirmer le nouveau mot de passe</label>
                    <div className="relative">
                        <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="password"
                            value={form.nouveau_mot_de_passe_confirmation}
                            onChange={(e) => handleChange('nouveau_mot_de_passe_confirmation', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#171923] border border-gray-700/50 text-white focus:border-blue-500 focus:outline-none transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={saving || !form.ancien_mot_de_passe || !form.nouveau_mot_de_passe || !form.nouveau_mot_de_passe_confirmation}
                        className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                Modification...
                            </>
                        ) : (
                            <>
                                <HiOutlineLockClosed />
                                Changer le mot de passe
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsPage;
