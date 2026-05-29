import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, FileText, ChevronDown, LogOut, Database, Pill, Truck, ClipboardList, Tag, BookOpen } from 'lucide-react';
import { getLowStockAlerts, logoutUser } from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
}

export default function Sidebar({ activeMenu, setActiveMenu }: SidebarProps) {
  const [lowStockCount, setLowStockCount] = useState(0);
  const { user, token, clearAuth } = useAuthStore();

  useEffect(() => {
    // Only check low stock if user has inventory access
    if (user?.role !== 'kasir') {
      getLowStockAlerts('branch_001')
        .then(alerts => setLowStockCount(alerts.length))
        .catch(() => {});
    }
  }, [user]);

  const handleLogout = async () => {
    if (token) await logoutUser(token);
    clearAuth();
  };

  const allMenuItems = [
    { id: 'dashboard',   icon: LayoutDashboard, label: 'Overview', roles: ['owner', 'admin', 'kasir', 'gudang'] },
    { id: 'pos',         icon: ShoppingCart,    label: 'Kasir & POS', roles: ['owner', 'admin', 'kasir'] },
    { id: 'master-data', icon: Database,        label: 'Master Data', roles: ['owner', 'admin', 'gudang'] },
    { id: 'inventory',   icon: Package,         label: 'Stok Inventaris', badge: lowStockCount > 0 ? lowStockCount : null, roles: ['owner', 'admin', 'gudang', 'kasir'] },
    { id: 'stock-opname',icon: ClipboardList,   label: 'Stock Opname', roles: ['owner', 'admin', 'gudang'] },
    { id: 'catalog',     icon: Pill,            label: 'Katalog Produk', roles: ['owner', 'admin', 'gudang'] },
    { id: 'suppliers',   icon: Truck,           label: 'Pemasok', roles: ['owner', 'admin', 'gudang'] },
    { id: 'customers',   icon: Users,           label: 'Pelanggan', roles: ['owner', 'admin', 'kasir'] },
    { id: 'purchasing',  icon: ClipboardList,   label: 'Pembelian (PO)', roles: ['owner', 'admin', 'gudang'] },
    { id: 'promos',      icon: Tag,             label: 'Promosi', roles: ['owner', 'admin'] },
    { id: 'accounting',  icon: BookOpen,        label: 'Akuntansi', roles: ['owner', 'admin'] },
    { id: 'reports',     icon: FileText,        label: 'Laporan', roles: ['owner', 'admin'] },
    { id: 'settings',    icon: Settings,        label: 'Pengaturan', roles: ['owner', 'admin'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(user?.role || 'kasir'));

  return (
    <aside className="w-64 bg-white dark:bg-[#0B0F19] flex flex-col h-full shrink-0 border-r border-slate-200 dark:border-slate-800/60 z-20 transition-colors duration-300">
      
      {/* Brand & Branch Selector */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors mt-2">
        <div className="w-8 h-8 mr-3 rounded-lg overflow-hidden bg-white shadow-sm flex items-center justify-center p-1">
          <img src="/cs.ico" alt="ChiraSys" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1">
          <h1 className="text-sm leading-tight text-slate-900 dark:text-slate-100">ChiraSys HQ</h1>
          <p className="text-[11px] font-medium text-slate-600 uppercase tracking-wider mt-0.5">Cabang Utama</p>
        </div>
        <ChevronDown size={14} className="text-slate-500 dark:text-slate-500" />
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto custom-scrollbar">
        <p className="px-3 text-[10px] font-semibold text-slate-500 dark:text-slate-500/80 uppercase tracking-wider mb-1">
          Navigasi Utama
        </p>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`flex items-center w-full px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                isActive 
                  ? 'bg-brand/10 text-brand' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon 
                size={18} 
                strokeWidth={isActive ? 2.5 : 2} 
                className={`mr-3 transition-colors ${isActive ? 'text-brand' : 'text-slate-500 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`} 
              />
              <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
              
              {/* Dynamic Badge */}
              {item.badge !== null && item.badge !== undefined && (
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                  isActive 
                    ? 'bg-brand/20 text-brand' 
                    : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div onClick={handleLogout} className="p-4 m-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/30 flex items-center justify-between group hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 dark:hover:border-rose-800/50 transition-all cursor-pointer">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner"
            style={{ backgroundColor: user?.avatar_color || '#3B82F6' }}
          >
            {user?.name.substring(0, 2).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-200">{user?.name}</p>
            <p className="text-[11px] text-slate-500 mt-1 capitalize">{user?.role}</p>
          </div>
        </div>
        <LogOut size={16} className="text-slate-500 dark:text-slate-500 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors" />
      </div>
    </aside>
  );
}