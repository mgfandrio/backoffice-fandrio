import React, { useState } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import UserService from '../../services/user.service';

const UserEditModal = ({ user, onClose, onSuccess }) => {
    const [form, setForm] = useState({
        nom: user?.nom ?? '',
        prenom: user?.prenom ?? '',
        email: user?.email ?? '',
        telephone: user?.telephone ?? '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!user) return null;

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            await UserService.modifier(user.id, form);
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err?.errors ? Object.values(err.errors).flat().join(', ') : err?.message || 'Une erreur est survenue.');
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        { key: 'prenom', label: 'Prénom', type: 'text' },
        { key: 'nom', label: 'Nom', type: 'text' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'telephone', label: 'Téléphone', type: 'tel' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-[#1E2235] rounded-2xl ring-1 ring-white/10 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">Modifier l'utilisateur</h2>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        <HiOutlineX className="text-xl" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {fields.map((f) => (
                        <div key={f.key}>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">{f.label}</label>
                            <input
                                type={f.type}
                                value={form[f.key]}
                                onChange={handleChange(f.key)}
                                className="w-full px-4 py-2.5 bg-white/[0.03] text-white text-sm rounded-xl border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none placeholder-gray-500 transition-all"
                            />
                        </div>
                    ))}

                    {error && (
                        <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl">{error}</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
                        >
                            {loading ? 'En cours...' : 'Enregistrer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserEditModal;
