import React from 'react';

const StatCard = ({ icon: Icon, label, value, subtitle, color = 'blue', trend, loading }) => {
    const colorMap = {
        blue: {
            bg: 'from-blue-500 to-blue-600',
            light: 'bg-blue-500/10',
            text: 'text-blue-400',
            ring: 'ring-blue-500/20',
        },
        cyan: {
            bg: 'from-cyan-500 to-cyan-600',
            light: 'bg-cyan-500/10',
            text: 'text-cyan-400',
            ring: 'ring-cyan-500/20',
        },
        indigo: {
            bg: 'from-indigo-500 to-indigo-600',
            light: 'bg-indigo-500/10',
            text: 'text-indigo-400',
            ring: 'ring-indigo-500/20',
        },
        emerald: {
            bg: 'from-emerald-500 to-emerald-600',
            light: 'bg-emerald-500/10',
            text: 'text-emerald-400',
            ring: 'ring-emerald-500/20',
        },
        amber: {
            bg: 'from-amber-500 to-amber-600',
            light: 'bg-amber-500/10',
            text: 'text-amber-400',
            ring: 'ring-amber-500/20',
        },
        violet: {
            bg: 'from-violet-500 to-violet-600',
            light: 'bg-violet-500/10',
            text: 'text-violet-400',
            ring: 'ring-violet-500/20',
        },
    };

    const c = colorMap[color] || colorMap.blue;

    if (loading) {
        return (
            <div className="bg-[#1E2235] rounded-2xl p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-700" />
                    <div className="w-16 h-5 rounded bg-gray-700" />
                </div>
                <div className="w-20 h-8 rounded bg-gray-700 mb-2" />
                <div className="w-32 h-4 rounded bg-gray-700" />
            </div>
        );
    }

    return (
        <div className={`bg-[#1E2235] rounded-2xl p-6 ring-1 ${c.ring} hover:ring-2 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-black/20 group`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${c.light} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    {Icon && <Icon className={`text-xl ${c.text}`} />}
                </div>
                {trend !== undefined && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${trend >= 0
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                        {trend >= 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <p className="text-3xl font-bold text-white mb-1 tracking-tight">
                {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
            </p>
            <p className="text-sm text-gray-400">{label}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
    );
};

export default StatCard;
