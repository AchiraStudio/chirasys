import { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Dashboard from './components/Dashboard';
import TitleBar from './components/TitleBar';
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
import { useAuthStore } from './store/AuthStore';
import { getCurrentUser } from './lib/api';
import { useSyncStore } from './store/SyncStore';
import { Package, Loader2 } from 'lucide-react';
import { useZoomStore } from './store/ZoomStore';

export default function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 

  const { token, user, setAuth, clearAuth } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);

  const { zoom, zoomIn, zoomOut, reset } = useZoomStore();

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
      const { supabase } = await import('./lib/supabase');
      const { invoke } = await import('@tauri-apps/api/core');
      const { setStatus, setLastSyncTime } = useSyncStore.getState();

      setStatus('connecting');

      let channel = supabase.channel('chirasys-sync');

      const tablesToSync = [
        'sales', 'stock_ledger', 'categories', 'brands', 'items', 'item_units', 'item_prices'
      ];

      tablesToSync.forEach(table => {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
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
        <div className="flex-1 overflow-hidden pt-10">
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
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50 dark:bg-[#0B0F19]">
        <Topbar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
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
      </main>
      </div>
    </div>
  );
}