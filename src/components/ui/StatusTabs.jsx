import React from 'react';

const StatusTabs = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div className="flex items-center gap-1 p-1 bg-[#1E2235] rounded-xl w-fit">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === tab.key
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    {tab.label}
                    {tab.count !== undefined && (
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key
                                ? 'bg-blue-500/30 text-blue-100'
                                : 'bg-white/10 text-gray-400'
                            }`}>
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};

export default StatusTabs;
