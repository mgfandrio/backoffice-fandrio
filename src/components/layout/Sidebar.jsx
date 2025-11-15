import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AiOutlineHome, AiOutlineUser, AiOutlineSetting } from 'react-icons/ai';
import { BsBuilding } from 'react-icons/bs';
import { FiLogOut } from 'react-icons/fi';
import { RiMenuFoldLine, RiMenuUnfoldLine } from 'react-icons/ri';
import AuthService from '../../services/auth.service';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: <AiOutlineHome size={20} />, title: 'Accueil' },
    { path: '/dashboard/users', icon: <AiOutlineUser size={20} />, title: 'Utilisateurs' },
    { path: '/dashboard/companies', icon: <BsBuilding size={20} />, title: 'Compagnies' },
    { path: '/dashboard/settings', icon: <AiOutlineSetting size={20} />, title: 'Paramètres' },
  ];

  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/';
  };

  return (
    <div className={`fixed left-0 top-0 h-full transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    } bg-[#2f3349] text-white`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          {!isCollapsed && <h1 className="text-2xl font-bold">FANDRIO</h1>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#3b4154]"
          >
            {isCollapsed ? <RiMenuUnfoldLine size={20} /> : <RiMenuFoldLine size={20} />}
          </button>
        </div>
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path
                  ? 'bg-[#3b4154] text-white'
                  : 'text-gray-400 hover:bg-[#3b4154] hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
            </Link>
          ))}
        </nav>
      </div>
      <button
        onClick={handleLogout}
        className={`absolute bottom-8 left-4 right-4 flex items-center ${
          isCollapsed ? 'justify-center' : 'gap-4'
        } px-4 py-3 rounded-xl text-gray-400 hover:bg-[#3b4154] hover:text-white`}
      >
        <FiLogOut size={20} />
        {!isCollapsed && <span className="text-sm font-medium">Déconnexion</span>}
      </button>
    </div>
  );
};

export default Sidebar;
