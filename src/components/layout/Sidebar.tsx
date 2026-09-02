import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, 
  FileText, LogOut, Truck, RefreshCw, PanelLeftClose, PanelLeftOpen 
} from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { getLowStockAlerts, logoutUser, getSyncStatus, getSettings, SyncStatus } from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';
import ConfirmModal from '../ui/ConfirmModal';
import { usePermissions } from '../../lib/permissions';

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onOpenAIChat?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface SyncEventPayload {
  percent: number;
  table_name: string;
}

export default function Sidebar({ activeMenu, setActiveMenu, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const { can } = usePermissions();
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
    getSettings()
      .then((settings) => {
        const co = settings.find(s => s.key === 'company_name');
        const br = settings.find(s => s.key === 'branch_name');
        if (co?.value) setCompanyName(co.value);
        if (br?.value) setBranchName(br.value);
      })
      .catch(() => {});

    if (can('inventory.view') || can('items.view')) {
      getLowStockAlerts('branch_001')
        .then(alerts => setLowStockCount(alerts.length))
        .catch(() => {});
    }

    getSyncStatus()
      .then(setSyncStatus)
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    let unlistenPush: () => void;
    let unlistenPull: () => void;

    const handleProgress = (type: 'push' | 'pull', payload: SyncEventPayload) => {
      const rounded = Math.min(100, Math.max(0, Math.round(payload.percent)));
      setBgSyncProgress({
        active: true,
        type,
        percent: rounded,
        table_name: payload.table_name,
      });
      if (rounded >= 100) {
        setTimeout(() => setBgSyncProgress(null), 2500);
      }
    };

    listen<SyncEventPayload>('sync-push-progress', (e) => handleProgress('push', e.payload))
      .then(fn => { unlistenPush = fn; });

    listen<SyncEventPayload>('sync-pull-progress', (e) => handleProgress('pull', e.payload))
      .then(fn => { unlistenPull = fn; });

    return () => {
      if (unlistenPush) unlistenPush();
      if (unlistenPull) unlistenPull();
    };
  }, []);

  const handleLogout = async () => {
    if (token) await logoutUser(token);
    clearAuth();
  };

  const menuItems = [
    { id: 'dashboard',    icon: LayoutDashboard, label: 'Overview',            show: true },
    { id: 'pos',          icon: ShoppingCart,    label: 'Kasir & POS',         show: can('sales.create') },
    { id: 'inventory',    icon: Package,         label: 'Inventaris & Produk', show: can('items.view') || can('inventory.view'), badge: lowStockCount > 0 ? lowStockCount : null },
    { id: 'purchasing',   icon: Truck,           label: 'Penerimaan & Pemasok', show: can('purchasing.view') || can('purchasing.create') },
    { id: 'customers',    icon: Users,           label: 'Pelanggan & Promosi', show: can('crm.customers') || can('promos.manage') },
    { id: 'reports',      icon: FileText,        label: 'Laporan & Akuntansi', show: can('reports.view') || can('accounting.manage') },
    { id: 'settings',     icon: Settings,        label: 'Pengaturan',          show: can('settings.general') || can('settings.hardware') || can('settings.users') || can('settings.database') },
  ].filter(item => item.show);

  const roleLabel = () => {
    const r = user?.role?.toLowerCase();
    if (r === 'owner') return 'Owner';
    if (r === 'admin') return 'Admin';
    return 'Staff';
  };

  return (
    <>
      <aside 
        className={`${
          isCollapsed ? 'w-16' : 'w-64'
        } bg-white dark:bg-[#0B0F19] flex flex-col h-full shrink-0 border-r border-slate-200 dark:border-slate-800/60 z-20 transition-all duration-300 select-none`}
      >
        {/* Brand & Branch Header */}
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4 justify-between'} border-b border-slate-200 dark:border-slate-800/60 transition-colors mt-2`}>
          <div className="flex items-center min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shadow-sm flex items-center justify-center p-1 shrink-0">
              <img src="/cs.ico" alt="ChiraSys" className="w-full h-full object-contain" />
            </div>
            {!isCollapsed && (
              <div className="ml-3 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm leading-tight text-slate-900 dark:text-slate-100 font-semibold truncate">{companyName}</h1>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-brand/10 text-brand rounded-md border border-brand/20">v1.2</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5 truncate">{branchName}</p>
              </div>
            )}
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title={isCollapsed ? "Buka Sidebar (Ctrl+B)" : "Kecilkan Sidebar (Ctrl+B)"}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors ${
                isCollapsed ? 'mt-2' : 'ml-1'
              }`}
            >
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
        </div>
        
        {/* Navigation List */}
        <nav className={`flex-1 py-4 flex flex-col gap-1.5 ${isCollapsed ? 'px-2 items-center' : 'px-3'} overflow-y-auto custom-scrollbar`}>
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-semibold text-slate-500 dark:text-slate-500/80 uppercase tracking-wider mb-1">
              Navigasi Utama
            </p>
          )}
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`relative flex items-center ${
                  isCollapsed ? 'w-11 h-11 justify-center p-0 rounded-xl' : 'w-full px-3 py-2.5 rounded-xl text-left'
                } transition-all duration-200 group ${
                  isActive 
                    ? 'bg-brand/10 text-brand font-semibold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon 
                  size={19} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  className={`transition-colors ${
                    isCollapsed ? '' : 'mr-3'
                  } ${isActive ? 'text-brand' : 'text-slate-500 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`} 
                />
                {!isCollapsed && (
                  <span className="text-sm truncate">
                    {item.label}
                  </span>
                )}
                
                {/* Badge */}
                {item.badge !== null && item.badge !== undefined && (
                  isCollapsed ? (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900" />
                  ) : (
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      isActive 
                        ? 'bg-brand/20 text-brand' 
                        : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                    }`}>
                      {item.badge}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Sync Footer */}
        <div className={`mt-auto ${isCollapsed ? 'mx-1 mb-2 items-center' : 'mx-3 mb-3'} flex flex-col gap-1.5`}>
          {bgSyncProgress?.active && (
            <div 
              title={`Cloud Sync (${bgSyncProgress.type === 'push' ? 'Push' : 'Pull'}): ${bgSyncProgress.percent}% - ${bgSyncProgress.table_name}`}
              className={`${isCollapsed ? 'p-1.5 w-11 mx-auto' : 'px-3 py-2.5'} bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/60 rounded-xl space-y-1.5 animate-in fade-in duration-200 shadow-xs`}
            >
              {!isCollapsed && (
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 truncate mr-1">
                    <RefreshCw size={12} className="animate-spin text-emerald-500 shrink-0" />
                    <span className="truncate">{bgSyncProgress.type === 'push' ? 'Push ke Cloud...' : 'Pull dari Cloud...'}</span>
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-extrabold shrink-0">
                    {bgSyncProgress.percent}%
                  </span>
                </div>
              )}
              <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 shadow-xs"
                  style={{ width: `${bgSyncProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {!isCollapsed && syncStatus?.workspace_name && (
            <div className="px-3 py-2 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/30 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate mr-2">{syncStatus.workspace_name}</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-white dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded shadow-sm shrink-0">{syncStatus.workspace_code}</span>
            </div>
          )}

          <div
            onClick={() => setShowLogoutModal(true)}
            title={isCollapsed ? `${user?.name} (${roleLabel()}) - Klik untuk Keluar` : undefined}
            className={`${
              isCollapsed 
                ? 'w-11 h-11 justify-center rounded-xl p-0 mx-auto' 
                : 'p-3 rounded-xl justify-between'
            } bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/30 flex items-center group hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 dark:hover:border-rose-800/50 transition-all cursor-pointer`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner shrink-0"
                style={{ backgroundColor: user?.avatar_color || '#3B82F6' }}
              >
                {user?.name.substring(0, 2).toUpperCase() || 'U'}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight text-slate-900 dark:text-slate-200 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{roleLabel()}</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <LogOut size={15} className="text-slate-400 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors shrink-0 ml-1" />
            )}
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