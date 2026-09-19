import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Dashboard from './components/Dashboard';
import TitleBar from './components/TitleBar';
import AIChat from './components/ai/AIChat';
import InventoryPage from './pages/inventory/InventoryPage';
import PurchasingPage from './pages/purchasing/PurchasingPage';
import CustomerPromoPage from './pages/customers/CustomerPromoPage';
import ReportsAccountingPage from './pages/reports/ReportsAccountingPage';
import ItemDrawer from './pages/inventory/ItemDrawer';
import POS from './pages/pos/POS';
import Settings from './pages/settings/Settings';
import LoginPage from './pages/auth/LoginPage';
import ContextMenu from './components/layout/ContextMenu';
import { useAuthStore } from './store/AuthStore';
import { getCurrentUser, kickCashDrawer, getSyncStatus, getSettings } from './lib/api';
import { supabase } from './lib/supabase';
import { invoke } from '@tauri-apps/api/core';
import { useSyncStore } from './store/SyncStore';
import { useZoomStore } from './store/ZoomStore';
import { Package, Loader2 } from 'lucide-react';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import SetupWizard from './pages/onboarding/SetupWizard';
import MobileNav from './components/layout/MobileNav';
import MobileMenuDrawer from './components/layout/MobileMenuDrawer';
import HostQrModal from './components/common/HostQrModal';
import { logoutUser, setSetting } from './lib/api';
import { isTauri, getHostUrl } from './lib/runtime';

interface MainContentProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  refreshTrigger: number;
  setEditItemId: (id: string | null) => void;
  setIsDrawerOpen: (open: boolean) => void;
}

function MainContent({
  activeMenu,
  setActiveMenu,
  refreshTrigger,
  setEditItemId,
  setIsDrawerOpen,
}: MainContentProps) {
  switch (activeMenu) {
    case 'dashboard':
      return <Dashboard setActiveMenu={setActiveMenu} />;
    case 'pos':
      return <POS />;
    case 'inventory':
    case 'opname':
    case 'stock-opname':
      return (
        <InventoryPage
          refreshTrigger={refreshTrigger}
          onEditItem={(itemId: string) => {
            setEditItemId(itemId);
            setIsDrawerOpen(true);
          }}
          onAddItem={() => {
            setEditItemId(null);
            setIsDrawerOpen(true);
          }}
        />
      );
    case 'purchasing':
      return <PurchasingPage />;
    case 'customers':
      return <CustomerPromoPage />;
    case 'reports':
    case 'laporan-penjualan':
    case 'laporan-item':
    case 'laporan-metode-pembayaran':
      return <ReportsAccountingPage />;
    case 'settings':
      return <Settings />;
    default:
      return (
        <div className="bg-card border border-line rounded-xl p-16 text-center h-full flex flex-col items-center justify-center">
          <div className="p-6 bg-muted rounded-full mb-6">
            <Package size={48} className="text-dim" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-heading">
            {activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1)} Module
          </h3>
          <p className="text-body">Sedang dalam pengembangan.</p>
        </div>
      );
  }
}


export default function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { token, user, setAuth, clearAuth } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  const { zoom, zoomIn, zoomOut, reset } = useZoomStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return (localStorage.getItem('kivo_sidebar_collapsed') ?? localStorage.getItem('chirasys_sidebar_collapsed')) === 'true';
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('kivo_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHostQrOpen, setIsHostQrOpen] = useState(false);

  // Auto-collapse sidebar on tablet screens (< 1024px)
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const handleLogout = async () => {
    if (isTauri()) {
      setSetting('active_host_token', '').catch(() => {});
    }
    if (token) await logoutUser(token);
    clearAuth();
  };

  // Check if first-run setup has been completed
  useEffect(() => {
    getSettings()
      .then((settings) => {
        const completed = settings.find(s => s.key === 'has_completed_setup')?.value === 'true';
        setHasCompletedSetup(completed);
      })
      .catch((err) => {
        console.warn('Could not check has_completed_setup:', err);
        setHasCompletedSetup(true);
      });
  }, []);
  
  useRealtimeSync();

  // Bump refreshTrigger whenever the pull-worker syncs cloud data locally
  useEffect(() => {
    const handler = () => setRefreshTrigger(p => p + 1);
    window.addEventListener('chirasys:sync', handler);
    return () => window.removeEventListener('chirasys:sync', handler);
  }, []);

  useEffect(() => {
    (document.documentElement.style as any).zoom = `${zoom}%`;
  }, [zoom]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          reset();
        } else if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          toggleSidebar();
        }
      }

      // Global Shortcut for Cash Drawer (F2 or Alt + C) - Instant 0-lag kick
      if (e.key === 'F2' || (e.altKey && e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        kickCashDrawer('').catch(err => {
          console.error('[Global Shortcut F2] Failed to kick cash drawer:', err);
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, reset, toggleSidebar]);

  useEffect(() => {
    const verifySession = async () => {
      // 1. If running on a client browser (mobile web/tablet) without an existing token:
      // Automatically query the host for its active session so it uses the SAME account!
      if (!isTauri() && !token) {
        try {
          const hostUrl = getHostUrl();
          const res = await fetch(`${hostUrl}/api/lan/active_session`, {
            signal: AbortSignal.timeout(3500),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.token && data.user) {
              console.log('⚡ [Auto-Auth] Joined host session automatically:', data.user.name);
              setAuth(data.token, data.user);
              setIsVerifying(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Could not auto-fetch host session:', e);
        }
      }

      if (!token) {
        setIsVerifying(false);
        return;
      }
      try {
        const validUser = await getCurrentUser(token);
        setAuth(token, validUser);
      } catch (e) {
        console.error("Session invalid:", e);
        clearAuth();
      } finally {
        setIsVerifying(false);
      }
    };
    verifySession();
  }, [token, setAuth, clearAuth]);

  useEffect(() => {
    if (!token) return;

    // --- Phase 9: Realtime Cloud -> Local Sync ---
    const setupRealtime = async () => {
      const { setStatus, setLastSyncTime } = useSyncStore.getState();

      setStatus('connecting');

      let workspaceId = '';
      let autoSync = false;
      try {
        const syncStatus = await getSyncStatus();
        workspaceId = syncStatus.workspace_id;
        autoSync = syncStatus.auto_sync;
      } catch (err) {
        console.error("Failed to load sync status:", err);
      }

      if (!workspaceId) {
        console.log('⚠️ No active workspace connected. Realtime sync bypassed.');
        setStatus('disconnected');
        return;
      }

      if (!autoSync) {
        console.log('⏸️ Automatic sync disabled in settings. Realtime sync bypassed.');
        setStatus('disconnected');
        return;
      }

      console.log('📡 Subscribing to Supabase Realtime for workspace:', workspaceId);

      // Use a unique channel name each time to avoid getting a cached, already-subscribed channel from Supabase
      const channelName = `kivo-sync-${workspaceId}-${Date.now()}`;
      let channel = supabase.channel(channelName);

      const tablesToSync = [
        'sales', 'stock_ledger', 'categories', 'brands', 'items', 'item_units', 'item_prices',
        'customers', 'suppliers', 'promos', 'users', 'role_default_permissions'
      ];

      tablesToSync.forEach(table => {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `workspace_id=eq.${workspaceId}` },
          (payload) => {
            console.log(`🔄 Cloud update received (${table}):`, payload);
            invoke('receive_cloud_sync', { tableName: table, payload: payload.new })
              .then(() => {
                setRefreshTrigger(p => p + 1);
                setLastSyncTime(new Date());
              })
              .catch(console.error);
          }
        );
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connected to Supabase Realtime');
          setStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setStatus('error');
        }
      });

      return () => {
        supabase.removeChannel(channel);
      };
    };

    let activeCleanup: (() => void) | undefined;

    const runSetup = async () => {
      if (activeCleanup) {
        activeCleanup();
        activeCleanup = undefined;
      }
      const cleanup = await setupRealtime();
      if (cleanup) activeCleanup = cleanup;
    };

    runSetup();

    const handleAutoSyncChange = () => {
      runSetup();
    };

    window.addEventListener('chirasys:auto_sync_changed', handleAutoSyncChange);

    return () => {
      window.removeEventListener('chirasys:auto_sync_changed', handleAutoSyncChange);
      if (activeCleanup) activeCleanup();
    };
  }, [token]);

  if (isVerifying || hasCompletedSetup === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (hasCompletedSetup === false || showSetupWizard) {
    return (
      <SetupWizard
        onComplete={() => {
          setHasCompletedSetup(true);
          setShowSetupWizard(false);
        }}
        onCancel={hasCompletedSetup ? () => setShowSetupWizard(false) : undefined}
      />
    );
  }

  if (!token || !user) {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
        <TitleBar />
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative">
          <LoginPage onOpenSetupWizard={() => setShowSetupWizard(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background transition-colors duration-300">
      <ContextMenu />
      <TitleBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          onOpenAIChat={() => setIsAIChatOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
          <Topbar 
            activeMenu={activeMenu} 
            setActiveMenu={setActiveMenu} 
            onOpenAIChat={() => setIsAIChatOpen(true)}
            onOpenHostQr={() => setIsHostQrOpen(true)}
            onOpenMenuDrawer={() => setIsMobileMenuOpen(true)}
          />
          <div className={`flex-1 min-h-0 overflow-hidden relative flex flex-col ${activeMenu === 'pos' ? 'p-0 pb-16 md:pb-0' : 'p-3 sm:p-4 lg:p-5 pb-24 md:pb-0'}`}>
            <MainContent
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              refreshTrigger={refreshTrigger}
              setEditItemId={setEditItemId}
              setIsDrawerOpen={setIsDrawerOpen}
            />
          </div>
          <ItemDrawer
            isOpen={isDrawerOpen}
            onClose={() => {
              setIsDrawerOpen(false);
              setEditItemId(null);
            }}
            onItemAdded={() => setRefreshTrigger(prev => prev + 1)}
            editItemId={editItemId}
          />
          <AIChat
            isOpen={isAIChatOpen}
            onClose={() => setIsAIChatOpen(false)}
            branchId={user.branch_id || 'branch_001'}
          />

          {/* Mobile Bottom Navigation Bar (< 768px) */}
          <MobileNav
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            onOpenMenuDrawer={() => setIsMobileMenuOpen(true)}
          />

          {/* Mobile Slide-Over Menu Drawer */}
          <MobileMenuDrawer
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            onOpenHostQr={() => setIsHostQrOpen(true)}
            onLogout={handleLogout}
          />

          {/* Host Server & Mobile QR Code Modal */}
          <HostQrModal
            isOpen={isHostQrOpen}
            onClose={() => setIsHostQrOpen(false)}
          />
        </main>
      </div>
    </div>
  );
}