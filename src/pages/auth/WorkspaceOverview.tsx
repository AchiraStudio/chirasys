import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, TrendingUp, Users, Package, ArrowLeft, RefreshCw } from 'lucide-react';
import { WorkspaceListInfo } from '../../lib/api';

export default function WorkspaceOverview({ workspace, onBack }: { workspace: WorkspaceListInfo, onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    salesCount: 0,
    totalMembers: 0,
    totalItems: 0,
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Sales
      const { data: sales, error: salesErr } = await supabase
        .from('sales')
        .select('grand_total')
        .eq('workspace_id', workspace.id)
        .eq('status', 'completed');
      
      if (salesErr) throw salesErr;
      
      const totalSales = sales.reduce((acc, s) => acc + (s.grand_total || 0), 0);
      const salesCount = sales.length;

      // 2. Members
      const { count: membersCount, error: membersErr } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id);
        
      if (membersErr) throw membersErr;

      // 3. Items
      const { count: itemsCount, error: itemsErr } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id);

      if (itemsErr) throw itemsErr;

      setMetrics({
        totalSales,
        salesCount,
        totalMembers: membersCount || 0,
        totalItems: itemsCount || 0,
      });

    } catch (e: any) {
      console.error(e);
      setError('Gagal memuat data dari cloud: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace.id]);

  return (
    <div className="space-y-6 animate-pop-in duration-200">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 text-dim hover:text-primary hover:bg-primary-soft dark:hover:bg-primary/30 rounded-xl transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-heading flex items-center gap-2">
            {workspace.name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs font-mono text-primary dark:text-primary bg-primary-soft dark:bg-primary/30 px-2 py-0.5 rounded">{workspace.code}</code>
            <span className="text-xs text-dim">Live Cloud View</span>
          </div>
        </div>
        <div className="flex-1" />
        <button 
          onClick={loadData}
          disabled={loading}
          className="p-2 text-dim hover:text-primary hover:bg-primary-soft dark:hover:bg-primary/30 rounded-xl transition-all disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger-soft border border-danger/30 text-danger rounded-xl dark:bg-danger/20 dark:border-danger/50 dark:text-danger text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-dim">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm">Menarik data live dari cloud...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card p-5 rounded-xl border border-line shadow-sm flex items-center gap-4">
            <div className="p-3 bg-primary-soft dark:bg-primary/30 text-primary rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-dim uppercase tracking-wider mb-1">Total Penjualan</p>
              <h3 className="text-xl font-bold text-heading">
                Rp {metrics.totalSales.toLocaleString('id-ID')}
              </h3>
              <p className="text-xs text-dim mt-0.5">{metrics.salesCount.toLocaleString()} Transaksi Selesai</p>
            </div>
          </div>

          <div className="bg-card p-5 rounded-xl border border-line shadow-sm flex items-center gap-4">
            <div className="p-3 bg-success-soft dark:bg-success/30 text-success rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-dim uppercase tracking-wider mb-1">Total Member</p>
              <h3 className="text-xl font-bold text-heading">
                {metrics.totalMembers.toLocaleString('id-ID')}
              </h3>
              <p className="text-xs text-dim mt-0.5">Pelanggan Terdaftar</p>
            </div>
          </div>

          <div className="bg-card p-5 rounded-xl border border-line shadow-sm flex items-center gap-4">
            <div className="p-3 bg-warning-soft dark:bg-warning/30 text-warning rounded-xl">
              <Package size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-dim uppercase tracking-wider mb-1">Total Item</p>
              <h3 className="text-xl font-bold text-heading">
                {metrics.totalItems.toLocaleString('id-ID')}
              </h3>
              <p className="text-xs text-dim mt-0.5">Katalog Produk</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
