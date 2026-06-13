import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Globe,
  Users, BookOpen, BarChart2, Activity, Layers
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sales', label: 'Sales', icon: ShoppingCart },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/ecommerce', label: 'E-Commerce', icon: Globe },
  { to: '/customers', label: 'CRM', icon: Users },
  { to: '/accounting', label: 'Accounting', icon: BookOpen },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
  { to: '/system', label: 'System Monitor', icon: Activity },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-100 flex flex-col z-30 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
          <Layers size={18} className="text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-gray-900">Circle</span>
          <span className="text-sm font-bold text-blue-600"> ERP</span>
          <p className="text-[10px] text-gray-400 leading-none">Enterprise Suite</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pb-2">Main Menu</p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ` +
              (isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900')
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">A</div>
          <div>
            <p className="text-xs font-semibold text-gray-700">Admin</p>
            <p className="text-[10px] text-gray-400">admin@circle.erp</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
