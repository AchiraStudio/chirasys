import { LayoutDashboard, Package, ShoppingCart, Users, Settings, FileText, Activity, ChevronDown, LogOut, Database, Pill, Truck, ClipboardList } from 'lucide-react';

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
}

export default function Sidebar({ activeMenu, setActiveMenu }: SidebarProps) {
const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'master-data', icon: Database, label: 'Master Data' },
    { id: 'inventory', icon: Package, label: 'Inventory Stock' },
    { id: 'catalog', icon: Pill, label: 'Catalog' },
    { id: 'suppliers', icon: Truck, label: 'Suppliers' },
    { id: 'customers', icon: Users, label: 'Customers' },
    { id: 'purchasing', icon: ClipboardList, label: 'Purchasing (PO)' }, // <--- ADDED PHASE 4
    { id: 'pos', icon: ShoppingCart, label: 'Sales & POS' },
    { id: 'reports', icon: FileText, label: 'Reports' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-[#0B0F19] flex flex-col h-full shrink-0 border-r border-slate-200 dark:border-slate-800/60 z-20 transition-colors duration-300">
      
      {/* Brand & Branch Selector */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors mt-2">
        <div className="bg-brand text-white rounded-lg p-1.5 mr-3 shadow-sm shadow-brand/20">
          <Activity size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <h1 className="text-sm leading-tight text-slate-900 dark:text-slate-100">ChiraSys HQ</h1>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">Main Branch</p>
        </div>
        <ChevronDown size={14} className="text-slate-400 dark:text-slate-500" />
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-6 flex flex-col gap-1.5 px-3 overflow-y-auto custom-scrollbar">
        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500/80 uppercase tracking-wider mb-2">
          Main Navigation
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
                className={`mr-3 transition-colors ${isActive ? 'text-brand' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} 
              />
              <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
              
              {/* Optional Notification Pill */}
              {item.id === 'inventory' && (
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                  isActive 
                    ? 'bg-brand/20 text-brand' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                }`}>
                  12
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 m-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/30 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700/50 transition-all cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-inner">
            AU
          </div>
          <div>
            <p className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-200">Admin User</p>
            <p className="text-[11px] text-slate-500 mt-1">System Admin</p>
          </div>
        </div>
        <LogOut size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors" />
      </div>
    </aside>
  );
}