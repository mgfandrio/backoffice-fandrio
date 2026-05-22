import React from 'react';
import { HiOutlineExclamation } from 'react-icons/hi';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', confirmColor = 'blue', loading = false }) => {
    if (!isOpen) return null;

    const colorClasses = {
        blue: 'bg-blue-600 hover:bg-blue-700',
        red: 'bg-red-600 hover:bg-red-700',
        amber: 'bg-amber-600 hover:bg-amber-700',
        emerald: 'bg-emerald-600 hover:bg-emerald-700',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-[#1E2235] rounded-2xl ring-1 ring-white/10 shadow-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <HiOutlineExclamation className="text-2xl text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                        <p className="text-sm text-gray-400 mt-1">{message}</p>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 ${colorClasses[confirmColor] || colorClasses.blue}`}
                    >
                        {loading ? 'En cours...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
