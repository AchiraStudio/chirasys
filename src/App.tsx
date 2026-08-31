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
import { getCurrentUser, getSettings, kickCashDrawer, getSyncStatus } from './lib/api';
import { supabase } from './lib/supabase';
import { invoke } from '@tauri-apps/api/core';
import { useSyncStore } from './store/SyncStore';
import { Package, Loader2 } from 'lucide-react';
import { useZoomStore } from './store/ZoomStore';
import { useRealtimeSync } from './hooks/useRealtimeSync';

export default function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { token, user, setAuth, clearAuth } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);

  const { zoom, zoomIn, zoomOut, reset } = useZoomStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('chirasys_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('chirasys_sidebar_collapsed', String(next));
      return next;
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

      // Global Shortcut for Cash Drawer (Alt + C)
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        try {
          const data = await getSettings();
          const pName = data.find((s: any) => s.key === 'printer_name')?.value;
          if (pName) {
            console.log(`[Global Shortcut] Kicking cash drawer on printer: ${pName}`);
            await kickCashDrawer(pName);
          } else {
            console.warn('[Global Shortcut] No printer configured for cash drawer kick.');
          }
        } catch (err) {
          console.error('[Global Shortcut] Failed to kick cash drawer:', err);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, reset, toggleSidebar]);

  useEffect(() => {
    const verifySession = async () => {
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
      let autoSync = true;
      try {
        const syncStatus = await getSyncStatus();
        workspaceId = syncStatus.workspace_id;
        autoSync = syncStatus.auto_sync;
      } catch (err) {
        console.error("Failed to load sync status:", err);
      }

      if (!workspaceId) {
        console.log('⚠️ No active workspace connected. Realtime sync bypassed.');
        setStatus('error');
        return;
      }

      if (!autoSync) {
        console.log('⏸️ Automatic sync disabled in settings. Realtime sync bypassed.');
        setStatus('disconnected');
        return;
      }

      console.log('📡 Subscribing to Supabase Realtime for workspace:', workspaceId);

      let channel = supabase.channel(`chirasys-sync-${workspaceId}`);

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
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative">
          <LoginPage />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#09090b] transition-colors duration-300">
      <ContextMenu />
      <TitleBar />
      <div className="flex flex-1 overflow-hidden pt-10">
        <Sidebar 
          activeMenu={activeMenu} 
          setActiveMenu={setActiveMenu} 
          onOpenAIChat={() => setIsAIChatOpen(true)} 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50 dark:bg-[#0B0F19]">
          <Topbar activeMenu={activeMenu} setActiveMenu={setActiveMenu} onOpenAIChat={() => setIsAIChatOpen(true)} />
          <div className={`flex-1 overflow-hidden relative flex flex-col ${activeMenu === 'pos' ? 'p-0' : 'p-3 sm:p-4 lg:p-6'}`}>
            {activeMenu === 'dashboard' ? <Dashboard setActiveMenu={setActiveMenu} /> :
              activeMenu === 'pos' ? <POS /> :
                activeMenu === 'inventory' ? (
                  <InventoryPage
                    refreshTrigger={refreshTrigger}
                    onEditItem={(itemId) => {
                      setEditItemId(itemId);
                      setIsDrawerOpen(true);
                    }}
                    onAddItem={() => {
                      setEditItemId(null);
                      setIsDrawerOpen(true);
                    }}
                  />
                ) :
                  activeMenu === 'purchasing' ? <PurchasingPage /> :
                    activeMenu === 'customers' ? <CustomerPromoPage /> :
                      activeMenu === 'reports' ? <ReportsAccountingPage /> :
                        activeMenu === 'settings' ? <Settings /> :
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
        </main>
      </div>
    </div>
  );
}