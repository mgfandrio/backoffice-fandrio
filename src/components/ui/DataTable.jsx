import React from 'react';

const DataTable = ({ columns, data, loading, emptyMessage = 'Aucune donnée disponible' }) => {
    if (loading) {
        return (
            <div className="bg-[#1E2235] rounded-2xl ring-1 ring-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                {columns.map((col) => (
                                    <th key={col.key} className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(5)].map((_, i) => (
                                <tr key={i} className="border-b border-white/5 animate-pulse">
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-6 py-4">
                                            <div className="h-4 bg-gray-700 rounded w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-[#1E2235] rounded-2xl ring-1 ring-white/5 p-12 text-center">
                <p className="text-gray-400 text-sm">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="bg-[#1E2235] rounded-2xl ring-1 ring-white/5 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            {columns.map((col) => (
                                <th key={col.key} className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((row, index) => (
                            <tr key={row.id ?? index} className="hover:bg-white/[0.02] transition-colors duration-150">
                                {columns.map((col) => (
                                    <td key={col.key} className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;
