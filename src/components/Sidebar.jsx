import React from 'react';
import { LayoutDashboard, Package, ShoppingCart, Settings, LogOut, Store, X, Users } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, storeName, storeLogo, closeSidebar, onLogout }) => {
  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory Control', icon: Package },
    { id: 'orders', label: 'Orders & Sales', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'settings', label: 'Shop Settings', icon: Settings },
  ];

  return (
    // كبرنا العرض هنا لـ 280 بيكسل
    <aside className="w-[280px] h-full bg-[#0a0a0a] md:bg-transparent border-r border-white/5 flex flex-col pt-6 md:pt-8 pb-6 relative shrink-0">
      <button 
        onClick={closeSidebar}
        className="md:hidden absolute top-6 right-4 text-gray-500 hover:text-white transition-colors bg-[#111] p-2 rounded-full border border-white/10 z-50"
      >
        <X size={20} />
      </button>

      <div className="flex items-center gap-3 px-8 mb-12">
        <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-xl border border-blue-600/30 flex items-center justify-center shrink-0 overflow-hidden">
          {storeLogo ? (
            <img src={storeLogo} alt="Logo" className="w-full h-full object-contain p-1" />
          ) : (
            <Store size={22} />
          )}
        </div>
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-white truncate pr-4">
          {storeName || 'Store'}
        </h2>
      </div>

      <nav className="flex-1 px-5 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              // كبرنا الخط لـ text-xs والبادينج
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-gray-600'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-5 mt-8">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;