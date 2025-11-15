import React from 'react';
import { IoNotificationsOutline, IoSearchOutline } from 'react-icons/io5';
import { AiOutlineSetting, AiOutlineUser } from 'react-icons/ai';

const Header = () => {
  return (
    <header className="bg-[#1e2231] h-16 flex items-center justify-between px-6 w-full sticky top-0 z-10">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full h-10 pl-10 pr-4 text-sm rounded-lg bg-[#2f3349] border-0 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#4f546a]"
          />
          <IoSearchOutline
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-[#2f3349] rounded-lg hover:text-gray-200 transition-colors">
          <IoNotificationsOutline size={20} />
        </button>
        <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-[#2f3349] rounded-lg hover:text-gray-200 transition-colors">
          <AiOutlineSetting size={20} />
        </button>
        <div className="w-10 h-10 flex items-center justify-center bg-[#2f3349] rounded-lg cursor-pointer">
          <AiOutlineUser size={20} className="text-gray-200" />
        </div>
      </div>
    </header>
  );
};

export default Header;
