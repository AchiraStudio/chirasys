import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Settings,
  FileText, LogOut, Truck, RefreshCw, PanelLeftClose, PanelLeftOpen,
  CheckCircle2, AlertTriangle, LucideIcon
} from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { getLowStockAlerts, logoutUser, getSyncStatus, getSettings, SyncStatus, LanSyncProgress, getLanStatus } from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';
import ConfirmModal from '../ui/ConfirmModal';
import { usePermissions } from '../../lib/permissions';
import KivoLogo from '../common/KivoLogo';

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

interface MenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
  show: boolean;
  badge?: number | null;
}

export default function Sidebar({ activeMenu, setActiveMenu, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const { can } = usePermissions();
  const [lowStockCount, setLowStockCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [companyName, setCompanyName] = useState('Kivo');
  const [branchName, setBranchName] = useState('Cabang Utama');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [lanSyncProgress, setLanSyncProgress] = useState<LanSyncProgress | null>(null);
  const [lanParentInfo, setLanParentInfo] = useState<{ ip: string; name?: string } | null>(null);
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

    getLowStockAlerts('main')
      .then((alerts) => setLowStockCount(alerts.length))
      .catch(() => {});

    getSyncStatus()
      .then(setSyncStatus)
      .catch(() => {});

    const checkLan = () => {
      getLanStatus()
        .then((s) => {
          if (s.role === 'child' && s.paired_parent_ip) {
            setLanParentInfo({ ip: s.paired_parent_ip, name: s.paired_parent_name });
          } else {
            setLanParentInfo(null);
          }
        })
        .catch(() => {});
    };
    checkLan();
    const lanInterval = setInterval(checkLan, 5000);

    let unlistenPush: () => void;
    let unlistenPull: () => void;
    let unlistenLanStatus: () => void;

    listen('chirasys:lan_status_updated', () => checkLan())
      .then(fn => { unlistenLanStatus = fn; });

    const handleProgress = (type: 'push' | 'pull', payload: SyncEventPayload) => {
      const rounded = Math.round(payload.percent);
      setBgSyncProgress({
        active: rounded < 100,
        type,
        percent: rounded,
        table_name: payload.table_name
      });
      if (rounded >= 100) {
        setTimeout(() => setBgSyncProgress(null), 2500);
      }
    };

    listen<SyncEventPayload>('sync-push-progress', (e) => handleProgress('push', e.payload))
      .then(fn => { unlistenPush = fn; });

    listen<SyncEventPayload>('sync-pull-progress', (e) => handleProgress('pull', e.payload))
      .then(fn => { unlistenPull = fn; });

    let unlistenLanProgress: () => void;
    listen<LanSyncProgress>('chirasys:lan_sync_progress', (e) => {
      const p = e.payload;
      setLanSyncProgress(p);
      if (!p.active && (p.stage === 'complete' || p.percent >= 100)) {
        setTimeout(() => {
          setLanSyncProgress(prev => (prev?.stage === 'complete' ? null : prev));
        }, 4000);
      }
    }).then(fn => { unlistenLanProgress = fn; });

    return () => {
      clearInterval(lanInterval);
      if (unlistenPush) unlistenPush();
      if (unlistenPull) unlistenPull();
      if (unlistenLanProgress) unlistenLanProgress();
      if (unlistenLanStatus) unlistenLanStatus();
    };
  }, []);

  const handleLogout = async () => {
    if (token) await logoutUser(token);
    clearAuth();
  };

  const menuItems: MenuItem[] = [
    { id: 'dashboard',    icon: LayoutDashboard, label: 'Overview',       show: true },
    { id: 'pos',          icon: ShoppingCart,    label: 'POS',            show: can('sales.create') },
    { id: 'inventory',    icon: Package,         label: 'Inventory',      show: can('items.view') || can('inventory.view'), badge: lowStockCount > 0 ? lowStockCount : null },
    { id: 'purchasing',   icon: Truck,           label: 'Purchasing',     show: can('purchasing.view') || can('purchasing.create') },
    { id: 'customers',    icon: Users,           label: 'Customers',      show: can('crm.customers') || can('promos.manage') },
    { id: 'reports',      icon: FileText,        label: 'Reports',        show: can('reports.view') || can('accounting.manage') },
    { id: 'settings',     icon: Settings,        label: 'Settings',       show: can('settings.general') || can('settings.hardware') || can('settings.users') || can('settings.database') || can('settings.lan') },
  ].filter(item => item.show);

  return (
    <>
      <aside
        className={`${
          isCollapsed ? 'w-16' : 'w-64'
        } bg-sidebar flex flex-col h-full shrink-0 border-r border-sidebar-line z-20 transition-all duration-300 select-none`}
      >
        <SidebarBrand
          isCollapsed={isCollapsed}
          companyName={companyName}
          branchName={branchName}
          onToggleCollapse={onToggleCollapse}
        />

        <SidebarNav
          isCollapsed={isCollapsed}
          menuItems={menuItems}
          activeMenu={activeMenu}
          onSelect={setActiveMenu}
        />

        <div className={`mt-auto ${isCollapsed ? 'px-2 pb-3 items-center' : 'px-3 pb-3'} flex flex-col gap-1.5 border-t border-sidebar-line pt-3`}>
          <SidebarSyncStatus
            isCollapsed={isCollapsed}
            bgSyncProgress={bgSyncProgress}
            lanSyncProgress={lanSyncProgress}
            lanParentInfo={lanParentInfo}
            syncStatus={syncStatus}
          />

          <SidebarUserProfile
            isCollapsed={isCollapsed}
            user={user}
            onClick={() => setShowLogoutModal(true)}
          />
        </div>
      </aside>

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

function SidebarBrand({
  isCollapsed,
  companyName,
  branchName,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  companyName: string;
  branchName: string;
  onToggleCollapse?: () => void;
}) {
  if (isCollapsed) {
    return (
      <div className="h-14 flex items-center justify-center px-2 border-b border-sidebar-line transition-colors">
        <button
          onClick={onToggleCollapse}
          title="Buka Sidebar (Ctrl+B)"
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-primary-soft transition-all relative group cursor-pointer border border-transparent hover:border-primary/20"
        >
          <div className="flex items-center justify-center group-hover:opacity-0 transition-opacity">
            <KivoLogo size={28} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-primary">
            <PanelLeftOpen size={18} />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="h-14 flex items-center px-4 justify-between border-b border-sidebar-line transition-colors">
      <div className="flex items-center min-w-0">
        <div className="shrink-0 flex items-center justify-center">
          <KivoLogo size={28} />
        </div>
        <div className="ml-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm leading-tight text-heading font-semibold truncate">{companyName}</h1>
          </div>
          <p className="text-[11px] font-medium text-dim uppercase tracking-wider mt-0.5 truncate">{branchName}</p>
        </div>
      </div>
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          title="Kecilkan Sidebar (Ctrl+B)"
          className="p-1.5 rounded-lg text-dim hover:text-heading hover:bg-muted transition-colors ml-1 cursor-pointer"
        >
          <PanelLeftClose size={16} />
        </button>
      )}
    </div>
  );
}

function SidebarNav({
  isCollapsed,
  menuItems,
  activeMenu,
  onSelect,
}: {
  isCollapsed: boolean;
  menuItems: MenuItem[];
  activeMenu: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className={`flex-1 py-3 flex flex-col gap-1.5 ${isCollapsed ? 'px-2 items-center' : 'px-3'} overflow-y-auto custom-scrollbar`}>
      {!isCollapsed && (
        <p className="px-3 text-[10px] font-semibold text-dim uppercase tracking-wider mb-1">
          Navigasi Utama
        </p>
      )}

      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeMenu === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            title={isCollapsed ? item.label : undefined}
            className={`relative flex items-center ${
              isCollapsed ? 'w-10 h-10 justify-center p-0 rounded-xl' : 'w-full px-3 py-2.5 rounded-lg text-left'
            } transition-all duration-150 group cursor-pointer ${
              isActive
                ? 'bg-primary-soft text-primary font-semibold border border-primary/20 shadow-xs'
                : 'text-body hover:bg-muted hover:text-heading border border-transparent'
            }`}
          >
            {!isCollapsed && isActive && (
              <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
            )}
            <Icon
              size={19}
              strokeWidth={isActive ? 2.5 : 2}
              className={`transition-colors shrink-0 ${
                isCollapsed ? '' : 'mr-3'
              } ${isActive ? 'text-primary' : 'text-dim group-hover:text-heading'}`}
            />
            {!isCollapsed && (
              <span className="text-sm truncate">
                {item.label}
              </span>
            )}

            {item.badge !== null && item.badge !== undefined && (
              isCollapsed ? (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-danger ring-2 ring-sidebar" />
              ) : (
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full tnum transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-danger-soft text-danger'
                }`}>
                  {item.badge}
                </span>
              )
            )}
          </button>
        );
      })}
    </nav>
  );
}

function CloudSyncProgressBar({
  isCollapsed,
  bgSyncProgress,
}: {
  isCollapsed: boolean;
  bgSyncProgress: { active: boolean; type: 'push' | 'pull'; percent: number; table_name: string };
}) {
  if (isCollapsed) {
    return (
      <div
        title={`Cloud Sync (${bgSyncProgress.type === 'push' ? 'Push' : 'Pull'}): ${bgSyncProgress.percent}% - ${bgSyncProgress.table_name}`}
        className="w-10 h-10 p-0 justify-center bg-success-soft border border-success/20 rounded-xl flex items-center animate-fade-in"
      >
        <RefreshCw size={16} className="animate-spin text-success" />
      </div>
    );
  }

  return (
    <div
      title={`Cloud Sync (${bgSyncProgress.type === 'push' ? 'Push' : 'Pull'}): ${bgSyncProgress.percent}% - ${bgSyncProgress.table_name}`}
      className="px-3 py-2.5 bg-success-soft border border-success/20 rounded-xl flex items-center animate-fade-in"
    >
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-success truncate mr-1">
            <RefreshCw size={12} className="animate-spin shrink-0" />
            <span className="truncate">{bgSyncProgress.type === 'push' ? 'Push ke Cloud...' : 'Pull dari Cloud...'}</span>
          </span>
          <span className="text-success font-mono text-[10px] font-extrabold shrink-0 tnum">
            {bgSyncProgress.percent}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-300"
            style={{ width: `${bgSyncProgress.percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function LanSyncProgressBar({
  isCollapsed,
  lanSyncProgress,
}: {
  isCollapsed: boolean;
  lanSyncProgress: LanSyncProgress;
}) {
  const isError = lanSyncProgress.stage === 'error';
  const isComplete = lanSyncProgress.stage === 'complete';

  const toneClass = isError
    ? 'bg-danger-soft border-danger/20 text-danger'
    : isComplete
    ? 'bg-success-soft border-success/20 text-success'
    : 'bg-accent-soft border-accent/20 text-accent';

  const barBgClass = isError ? 'bg-danger' : isComplete ? 'bg-success' : 'bg-accent';

  if (isCollapsed) {
    return (
      <div
        title={`LAN Sync: ${lanSyncProgress.message} (${lanSyncProgress.percent}%)`}
        className={`w-10 h-10 p-0 justify-center border rounded-xl flex items-center animate-fade-in ${toneClass}`}
      >
        {lanSyncProgress.active ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : isError ? (
          <AlertTriangle size={16} />
        ) : (
          <CheckCircle2 size={16} />
        )}
      </div>
    );
  }

  return (
    <div
      title={`LAN Sync: ${lanSyncProgress.message} (${lanSyncProgress.percent}%)`}
      className={`px-3 py-2.5 border rounded-xl flex items-center animate-fade-in ${toneClass}`}
    >
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="flex items-center gap-1.5 truncate mr-1">
            {lanSyncProgress.active ? (
              <RefreshCw size={12} className="animate-spin shrink-0" />
            ) : isError ? (
              <AlertTriangle size={12} className="shrink-0" />
            ) : (
              <CheckCircle2 size={12} className="shrink-0" />
            )}
            <span className="truncate">{lanSyncProgress.message}</span>
          </span>
          <span className="font-mono text-[10px] font-extrabold shrink-0 tnum">
            {lanSyncProgress.percent}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barBgClass}`}
            style={{ width: `${lanSyncProgress.percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function LanParentBadge({
  isCollapsed,
  lanParentInfo,
}: {
  isCollapsed: boolean;
  lanParentInfo: { ip: string; name?: string };
}) {
  return (
    <div
      title={`Terhubung ke Server Induk: ${lanParentInfo.name || lanParentInfo.ip} (Mode B Live Induk)`}
      className={`bg-success-soft border border-success/20 rounded-xl flex items-center ${
        isCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2 justify-between'
      } animate-fade-in`}
    >
      <div className="flex items-center gap-1.5 truncate mr-1">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
        {!isCollapsed && (
          <span className="text-[11px] font-bold text-success truncate">
            {lanParentInfo.name || 'Server Induk'}
          </span>
        )}
      </div>
      {!isCollapsed && (
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 bg-success/15 text-success rounded shrink-0">
          Live Induk
        </span>
      )}
    </div>
  );
}

function SidebarSyncStatus({
  isCollapsed,
  bgSyncProgress,
  lanSyncProgress,
  lanParentInfo,
  syncStatus,
}: {
  isCollapsed: boolean;
  bgSyncProgress: { active: boolean; type: 'push' | 'pull'; percent: number; table_name: string } | null;
  lanSyncProgress: LanSyncProgress | null;
  lanParentInfo: { ip: string; name?: string } | null;
  syncStatus: SyncStatus | null;
}) {
  const showLan = lanSyncProgress && (lanSyncProgress.active || lanSyncProgress.stage === 'complete' || lanSyncProgress.stage === 'error');

  return (
    <>
      {bgSyncProgress?.active && (
        <CloudSyncProgressBar isCollapsed={isCollapsed} bgSyncProgress={bgSyncProgress} />
      )}

      {showLan && (
        <LanSyncProgressBar isCollapsed={isCollapsed} lanSyncProgress={lanSyncProgress} />
      )}

      {lanParentInfo && (
        <LanParentBadge isCollapsed={isCollapsed} lanParentInfo={lanParentInfo} />
      )}

      {!isCollapsed && syncStatus?.workspace_name && (
        <div className="px-3 py-2 bg-primary-soft border border-primary/15 rounded-lg flex items-center justify-between">
          <span className="text-xs font-bold text-primary truncate mr-2">{syncStatus.workspace_name}</span>
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-card text-primary rounded shrink-0">{syncStatus.workspace_code}</span>
        </div>
      )}
    </>
  );
}

function SidebarUserProfile({
  isCollapsed,
  user,
  onClick,
}: {
  isCollapsed: boolean;
  user: any;
  onClick: () => void;
}) {
  const roleLabel = () => {
    const r = user?.role?.toLowerCase();
    if (r === 'owner') return 'Owner';
    if (r === 'admin') return 'Admin';
    return 'Staff';
  };

  if (isCollapsed) {
    return (
      <button
        onClick={onClick}
        title={`${user?.name} (${roleLabel()}) • Klik untuk Keluar`}
        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-danger-soft transition-all cursor-pointer group relative border border-transparent hover:border-danger/30"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs group-hover:scale-90 transition-transform"
          style={{ backgroundColor: user?.avatar_color || '#3B82F6' }}
        >
          {user?.name?.substring(0, 2).toUpperCase() || 'U'}
        </div>
        <div className="absolute inset-0 rounded-xl bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <LogOut size={16} />
        </div>
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      title={`${user?.name} (${roleLabel()}) • Klik untuk Keluar`}
      className="p-2.5 rounded-xl bg-muted/60 border border-line flex items-center justify-between group hover:bg-danger-soft hover:border-danger/30 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
          style={{ backgroundColor: user?.avatar_color || '#3B82F6' }}
        >
          {user?.name?.substring(0, 2).toUpperCase() || 'U'}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight text-heading truncate">{user?.name}</p>
          <p className="text-[10px] text-dim mt-0.5 truncate">{roleLabel()}</p>
        </div>
      </div>
      <LogOut size={15} className="text-dim group-hover:text-danger transition-colors shrink-0 ml-1" />
    </div>
  );
}
