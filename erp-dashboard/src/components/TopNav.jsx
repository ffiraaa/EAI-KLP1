import { Search, Bell, ChevronDown, Building2, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TopNav() {
  const [company] = useState('PT Circle Indonesia');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [username, setUsername] = useState('User');
  const [role, setRole] = useState('user');
  const navigate = useNavigate();

  useEffect(() => {
    setUsername(localStorage.getItem('username') || 'User');
    setRole(localStorage.getItem('role') || 'user');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-60 right-0 h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 z-20 shadow-sm">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search anything..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Company Selector */}
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-700">
          <Building2 size={14} className="text-blue-500" />
          <span className="font-medium text-xs">{company}</span>
          <ChevronDown size={13} className="text-gray-400" />
        </button>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <Bell size={16} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="relative">
          <div 
            className="flex items-center gap-2 cursor-pointer group p-1 rounded-xl hover:bg-gray-50"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm uppercase">
              {username.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-gray-800 capitalize">{username}</p>
              <p className="text-[10px] text-gray-400 capitalize">{role}</p>
            </div>
            <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-600" />
          </div>

          {/* Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
