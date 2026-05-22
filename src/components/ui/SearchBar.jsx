import React from 'react';
import { HiOutlineSearch } from 'react-icons/hi';

const SearchBar = ({ value, onChange, placeholder = 'Rechercher...' }) => {
    return (
        <div className="relative w-full sm:w-80">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-11 pr-4 py-2.5 bg-[#1E2235] text-white text-sm rounded-xl border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none placeholder-gray-500 transition-all duration-200"
            />
        </div>
    );
};

export default SearchBar;
