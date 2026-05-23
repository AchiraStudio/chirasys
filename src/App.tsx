import { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Dashboard from './components/Dashboard';
import TitleBar from './components/TitleBar';
import MasterData from './pages/inventory/MasterData'; 
import StockOverview from './pages/inventory/StockOverview'; 
import ItemList from './pages/inventory/ItemList';
import ItemDetail from './pages/inventory/ItemDetail';
import ItemDrawer from './pages/inventory/ItemDrawer';
import SupplierList from './pages/suppliers/SupplierList';
import CustomerList from './pages/customers/CustomerList';
import PurchasingDashboard from './pages/purchasing/PurchasingDashboard';
import POS from './pages/pos/POS';
import Suppliers from './pages/purchasing/Suppliers';
import Purchasing from './pages/purchasing/Purchasing';
import Promos from './pages/promos/PromoList';
import Accounting from './pages/accounting/Accounting';
import Reports from './pages/reports/Reports';
import Settings from './pages/settings/Settings';
import LoginPage from './pages/auth/LoginPage';
import { useAuthStore } from './store/AuthStore';
import { getCurrentUser } from './lib/api';
import { Package, Loader2 } from 'lucide-react';

export default function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 

  const { token, user, setAuth, clearAuth } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);

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

      const channel = supabase
        .channel('chirasys-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sales' },
          (payload) => {
            console.log('🔄 Cloud update received (sales):', payload);
            invoke('receive_cloud_sync', { tableName: 'sales', payload: payload.new })
              .then(() => setRefreshTrigger(p => p + 1))
              .catch(console.error);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'stock_ledger' },
          (payload) => {
            console.log('🔄 Cloud update received (stock_ledger):', payload);
            invoke('receive_cloud_sync', { tableName: 'stock_ledger', payload: payload.new })
              .then(() => setRefreshTrigger(p => p + 1))
              .catch(console.error);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Connected to Supabase Realtime');
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
      <TitleBar />
      <div className="flex flex-1 overflow-hidden pt-10">
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <Topbar activeMenu={activeMenu} />
        <div className={`flex-1 overflow-y-auto custom-scrollbar relative ${activeMenu === 'pos' ? 'p-0 bg-slate-100 dark:bg-[#0B0F19]' : 'p-8'}`}>
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