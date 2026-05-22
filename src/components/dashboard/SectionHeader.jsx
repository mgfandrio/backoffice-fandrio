import React from 'react';

const SectionHeader = ({ title, subtitle, action }) => (
    <div className="flex items-center justify-between mb-6">
        <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && action}
    </div>
);

export default SectionHeader;
