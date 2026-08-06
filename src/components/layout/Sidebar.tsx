import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, FileText, ChevronDown, LogOut, Truck, RefreshCw } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { getLowStockAlerts, logoutUser, getSyncStatus, getSettings, SyncStatus } from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';
import ConfirmModal from '../ui/ConfirmModal';

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onOpenAIChat?: () => void;
}

export default function Sidebar({ activeMenu, setActiveMenu }: SidebarProps) {
  const [lowStockCount, setLowStockCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [companyName, setCompanyName] = useState('ChiraSys');
  const [branchName, setBranchName] = useState('Cabang Utama');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [bgSyncProgress, setBgSyncProgress] = useState<{
    active: boolean;
    type: 'push' | 'pull';
    percent: number;
    table_name: string;
  } | null>(null);
  const { user, token, clearAuth } = useAuthStore();

  useEffect(() => {
    // Load company/branch name from settings
    getSettings()
      .then((settings) => {
        const co = settings.find(s => s.key === 'company_name');
        const br = settings.find(s => s.key === 'branch_name');
        if (co?.value) setCompanyName(co.value);
        if (br?.value) setBranchName(br.value);
      })
      .catch(() => {});

    // Only check low stock if user has inventory access
    if (user?.role !== 'staff' || true) {
      getLowStockAlerts('branch_001')
        .then(alerts => setLowStockCount(alerts.length))
        .catch(() => {});
    }

    getSyncStatus()
      .then(s => setSyncStatus(s))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    let unlistenPush: () => void;
    let unlistenPull: () => void;

    listen<{ current: number; total: number; percent: number; table_name: string }>('sync-push-progress', (event) => {
      const { percent, table_name } = event.payload;
      const rounded = Math.min(100, Math.max(0, Math.round(percent)));
      setBgSyncProgress({
        active: true,
        type: 'push',
        percent: rounded,
        table_name,
      });
      if (rounded >= 100) {
        setTimeout(() => setBgSyncProgress(null), 2500);
      }
    }).then((fn) => { unlistenPush = fn; });

    listen<{ current: number; total: number; percent: number; table_name: string }>('sync-pull-progress', (event) => {
      const { percent, table_name } = event.payload;
      const rounded = Math.min(100, Math.max(0, Math.round(percent)));
      setBgSyncProgress({
        active: true,
        type: 'pull',
        percent: rounded,
        table_name,
      });
      if (rounded >= 100) {
        setTimeout(() => setBgSyncProgress(null), 2500);
      }
    }).then((fn) => { unlistenPull = fn; });

    return () => {
      if (unlistenPush) unlistenPush();
      if (unlistenPull) unlistenPull();
    };
  }, []);

  const handleLogout = async () => {
    if (token) await logoutUser(token);
    clearAuth();
  };

  const allMenuItems = [
    { id: 'dashboard',    icon: LayoutDashboard, label: 'Overview',            roles: ['owner', 'admin', 'staff'] },
    { id: 'pos',          icon: ShoppingCart,    label: 'Kasir & POS',         roles: ['owner', 'admin', 'staff'] },
    { id: 'inventory',    icon: Package,         label: 'Inventaris & Produk', badge: lowStockCount > 0 ? lowStockCount : null, roles: ['owner', 'admin', 'staff'] },
    { id: 'purchasing',   icon: Truck,           label: 'Pembelian & Pemasok', roles: ['owner', 'admin', 'staff'] },
    { id: 'customers',    icon: Users,           label: 'Pelanggan & Promosi', roles: ['owner', 'admin', 'staff'] },
    { id: 'reports',      icon: FileText,        label: 'Laporan & Akuntansi', roles: ['owner', 'admin'] },
    { id: 'settings',     icon: Settings,        label: 'Pengaturan',          roles: ['owner', 'admin', 'staff'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(user?.role || 'staff'));

  // Display role label nicely
  const roleLabel = () => {
    switch (user?.role) {
      case 'owner': return 'Owner';
      case 'admin': return 'Admin';
      case 'staff': return 'Staff';
      default: return user?.role ?? 'Staff';
    }
  };

  return (
    <>
      <aside className="w-64 bg-white dark:bg-[#0B0F19] flex flex-col h-full shrink-0 border-r border-slate-200 dark:border-slate-800/60 z-20 transition-colors duration-300">
        
        {/* Brand & Branch Selector */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors mt-2">
          <div className="w-8 h-8 mr-3 rounded-lg overflow-hidden bg-white shadow-sm flex items-center justify-center p-1">
            <img src="/cs.ico" alt="ChiraSys" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm leading-tight text-slate-900 dark:text-slate-100 font-semibold truncate">{companyName}</h1>
            <p className="text-[11px] font-medium text-slate-600 uppercase tracking-wider mt-0.5 truncate">{branchName}</p>
          </div>
          <ChevronDown size={14} className="text-slate-500 dark:text-slate-500 ml-1 shrink-0" />
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
        <div className="mt-auto mx-3 mb-3 flex flex-col gap-1.5">
          {/* Mini Background Sync Progress Bar */}
          {bgSyncProgress?.active && (
            <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[11px] font-extrabold">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <RefreshCw size={12} className="animate-spin text-emerald-500" />
                  {bgSyncProgress.type === 'push' ? 'Push Sync...' : 'Pull Sync...'}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">{bgSyncProgress.percent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${bgSyncProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {syncStatus?.workspace_name && (
            <div className="px-3 py-2.5 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/30 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{syncStatus.workspace_name}</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-white dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded shadow-sm">{syncStatus.workspace_code}</span>
            </div>
          )}
          <div
            onClick={() => setShowLogoutModal(true)}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/30 flex items-center justify-between group hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 dark:hover:border-rose-800/50 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner"
                style={{ backgroundColor: user?.avatar_color || '#3B82F6' }}
              >
                {user?.name.substring(0, 2).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-200">{user?.name}</p>
                <p className="text-[11px] text-slate-500 mt-1">{roleLabel()}</p>
              </div>
            </div>
            <LogOut size={16} className="text-slate-500 dark:text-slate-500 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors" />
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <ConfirmModal
          title="Keluar dari Akun?"
          message={`Anda akan keluar dari akun "${user?.name}". Semua sesi aktif akan diakhiri.`}
          confirmLabel="Ya, Keluar"
          cancelLabel="Batal"
          variant="logout"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
}