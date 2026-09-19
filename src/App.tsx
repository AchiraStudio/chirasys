import { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Dashboard from './components/Dashboard';
import TitleBar from './components/TitleBar';
import AIChat from './components/ai/AIChat';
import MasterData from './pages/inventory/MasterData';
import StockOverview from './pages/inventory/StockOverview';
import StockOpname from './pages/inventory/StockOpname';
import ItemList from './pages/inventory/ItemList';
import ItemDetail from './pages/inventory/ItemDetail';
import ItemDrawer from './pages/inventory/ItemDrawer';
import SupplierList from './pages/suppliers/SupplierList';
import CustomerList from './pages/customers/CustomerList';
import PurchasingDashboard from './pages/purchasing/PurchasingDashboard';
import POS from './pages/pos/POS';
import Promos from './pages/promos/PromoList';
import Accounting from './pages/accounting/Accounting';
import Reports from './pages/reports/Reports';
import Settings from './pages/settings/Settings';
import LoginPage from './pages/auth/LoginPage';
import ContextMenu from './components/layout/ContextMenu';
<<<<<<< Updated upstream
import { useAuthStore } from './store/AuthStore';
import { getCurrentUser } from './lib/api';
import { useSyncStore } from './store/SyncStore';
import { Package, Loader2 } from 'lucide-react';
import { useZoomStore } from './store/ZoomStore';
=======
import { useAuthStore, decodeSessionPayload } from './store/AuthStore';
import { getCurrentUser, kickCashDrawer, getSyncStatus, getSettings, setSetting, invoke, logoutUser } from './lib/api';
import { supabase } from './lib/supabase';
import { useSyncStore } from './store/SyncStore';
import { Package, Loader2 } from 'lucide-react';
import { useZoomStore } from './store/ZoomStore';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import SetupWizard from './pages/onboarding/SetupWizard';
import MobileNav from './components/layout/MobileNav';
import MobileMenuDrawer from './components/layout/MobileMenuDrawer';
import HostQrModal from './components/common/HostQrModal';
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
      return <ReportsAccountingPage initialTab="reports" />;
    case 'accounting':
    case 'buku-kas':
    case 'jurnal':
    case 'buku-besar':
      return <ReportsAccountingPage initialTab="accounting" />;
    case 'settings':
      return <Settings />;
    default:
      return (
        <div className="bg-card border border-line rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
          <div className="p-4 bg-muted rounded-2xl mb-4">
            <Package size={36} className="text-dim" />
          </div>
          <h3 className="text-base font-bold tracking-tight text-heading mb-1">
            Menu Tidak Ditemukan
          </h3>
          <p className="text-xs text-dim mb-5 max-w-xs">
            Halaman ini tidak ditemukan atau Anda tidak memiliki akses ke rute ini.
          </p>
          <button
            type="button"
            onClick={() => setActiveMenu('dashboard')}
            className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Kembali ke Dashboard
          </button>
        </div>
      );
  }
}

>>>>>>> Stashed changes

export default function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isHostQrOpen, setIsHostQrOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { token, user, setAuth, clearAuth } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);

  const { zoom, zoomIn, zoomOut, reset } = useZoomStore();
<<<<<<< Updated upstream
=======
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('kivo_sidebar_collapsed') ?? localStorage.getItem('chirasys_sidebar_collapsed');
    if (saved !== null) return saved === 'true';
    if (typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024) {
      return true;
    }
    return false;
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('kivo_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  // Check if first-run setup has been completed
  useEffect(() => {
    // Web clients (mobile/tablet terminals) never need to run setup wizard
    if (!isTauri()) {
      setHasCompletedSetup(true);
      return;
    }

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
>>>>>>> Stashed changes

  useEffect(() => {
    (document.documentElement.style as any).zoom = `${zoom}%`;
  }, [zoom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, reset]);

  useEffect(() => {
    const verifySession = async () => {
      let targetToken = token;
      let targetUser = user;

      // 1. Check if token or embedded session payload is passed in URL
      if (typeof window !== 'undefined') {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const sessionParam = urlParams.get('session');
          if (sessionParam) {
            const decoded = decodeSessionPayload(sessionParam);
            if (decoded) {
              targetToken = decoded.token;
              targetUser = decoded.user;
              setAuth(decoded.token, decoded.user);
            }
          }

          const urlToken = urlParams.get('auth_token') || urlParams.get('token');
          if (!targetToken && urlToken && urlToken.trim() !== '') {
            targetToken = urlToken.trim();
          }

          // Clean URL query parameters without reloading the page
          if (sessionParam || urlToken) {
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        } catch {}
      }

      // 2. If running as Web Client (!isTauri()) and no token, auto-fetch Host active session
      if (!targetToken && !isTauri()) {
        try {
          const hostUrl = getHostUrl();
          let res = await fetch(`${hostUrl}/api/lan/active_session`, {
            signal: AbortSignal.timeout(3000),
          }).catch(() => null);

          // Fallback to direct port 3699 if same-origin failed
          if (!res || !res.ok) {
            const fallbackUrl = `http://${window.location.hostname || 'localhost'}:3699`;
            res = await fetch(`${fallbackUrl}/api/lan/active_session`, {
              signal: AbortSignal.timeout(3000),
            }).catch(() => null);
          }

          if (res && res.ok) {
            const data = await res.json();
            if (data?.success && data?.token && data?.user) {
              setAuth(data.token, data.user);
              setIsVerifying(false);
              return;
            }
          }
        } catch (err) {
          console.log('[Web Auto-Login] Host active session check:', err);
        }
      }

      if (!targetToken) {
        setIsVerifying(false);
        return;
      }

      try {
        const validUser = await getCurrentUser(targetToken);
        setAuth(targetToken, validUser);

        // If running on desktop Host, register active token so web clients can auto-login
        if (isTauri()) {
          setSetting('active_host_token', targetToken).catch(() => {});
        }
      } catch (e: any) {
        // If we already have a user in memory (e.g. from session payload or store), do NOT wipe on network error!
        if (!targetUser) {
          console.error("Session invalid:", e);
          clearAuth();
        } else {
          console.warn("Retaining active user session despite verification warning:", e);
        }
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
      const { supabase } = await import('./lib/supabase');
      const { invoke } = await import('@tauri-apps/api/core');
      const { getSyncStatus } = await import('./lib/api');
      const { setStatus, setLastSyncTime } = useSyncStore.getState();

      setStatus('connecting');

      let workspaceId = '';
      try {
        const syncStatus = await getSyncStatus();
        workspaceId = syncStatus.workspace_id;
      } catch (err) {
        console.error("Failed to load sync status:", err);
      }

      if (!workspaceId) {
        console.log('⚠️ No active workspace connected. Realtime sync bypassed.');
        setStatus('error');
        return;
      }

      console.log('📡 Subscribing to Supabase Realtime for workspace:', workspaceId);

      let channel = supabase.channel(`chirasys-sync-${workspaceId}`);

      const tablesToSync = [
        'sales', 'stock_ledger', 'categories', 'brands', 'items', 'item_units', 'item_prices'
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

    const cleanup = setupRealtime();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [token]);

  if (isVerifying) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-[#09090b]">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#09090b]">
        <TitleBar />
        <div className="flex-1 overflow-y-auto">
          <LoginPage />
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    if (isTauri()) {
      setSetting('active_host_token', '').catch(() => {});
    }
    if (token) await logoutUser(token);
    clearAuth();
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#09090b] transition-colors duration-300">
      <ContextMenu />
      <TitleBar />
<<<<<<< Updated upstream
      <div className="flex flex-1 overflow-hidden pt-10">
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50 dark:bg-[#0B0F19]">
          <Topbar activeMenu={activeMenu} setActiveMenu={setActiveMenu} onOpenAIChat={() => setIsAIChatOpen(true)} />
          <div className={`flex-1 overflow-hidden relative flex flex-col ${activeMenu === 'pos' ? 'p-0' : 'p-6 md:p-8'}`}>
            {activeMenu === 'dashboard' ? <Dashboard setActiveMenu={setActiveMenu} /> :
              activeMenu === 'master-data' ? <MasterData /> :
                activeMenu === 'inventory' ? (
                  <StockOverview
                    refreshTrigger={refreshTrigger}
                    onEditItem={(itemId) => {
                      setEditItemId(itemId);
                      setIsDrawerOpen(true);
                    }}
                  />
                ) :
                  activeMenu === 'stock-opname' ? <StockOpname /> :
                    activeMenu === 'catalog' ? <ItemList refreshTrigger={refreshTrigger} onViewItem={(id) => { setActiveItemId(id); setActiveMenu('item-detail'); }} onEditItem={(id) => { setEditItemId(id); setIsDrawerOpen(true); }} onAddItem={() => { setEditItemId(null); setIsDrawerOpen(true); }} /> :
                      activeMenu === 'item-detail' && activeItemId ? <ItemDetail itemId={activeItemId} refreshTrigger={refreshTrigger} onBack={() => setActiveMenu('catalog')} onEditItem={() => { setEditItemId(activeItemId); setIsDrawerOpen(true); }} /> :
                        activeMenu === 'suppliers' ? <SupplierList /> :
                          activeMenu === 'customers' ? <CustomerList /> :
                            activeMenu === 'promos' ? <Promos /> :
                              activeMenu === 'accounting' ? <Accounting /> :
                                activeMenu === 'purchasing' ? <PurchasingDashboard /> :
                                  activeMenu === 'reports' ? <Reports /> :
                                    activeMenu === 'settings' ? <Settings /> :
                                      activeMenu === 'pos' ? <POS /> :
                                        (
                                          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 p-16 text-center h-full flex flex-col items-center justify-center shadow-sm">
                                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-full mb-6"><Package size={48} className="text-slate-500" /></div>
                                            <h3 className="text-2xl font-bold tracking-tight">{activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1)} Module</h3>
                                            <p className="text-slate-600">Sedang dalam pengembangan.</p>
                                          </div>
                                        )}
          </div>
          <ItemDrawer isOpen={isDrawerOpen} onClose={() => { setIsDrawerOpen(false); setEditItemId(null); }} onItemAdded={() => setRefreshTrigger(prev => prev + 1)} editItemId={editItemId} />



          <AIChat isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} branchId={user.branch_id || 'branch_001'} />
=======
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
>>>>>>> Stashed changes
        </main>
      </div>
    </div>
  );
}