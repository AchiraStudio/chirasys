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
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {workspace.name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{workspace.code}</code>
            <span className="text-xs text-slate-400">Live Cloud View</span>
          </div>
        </div>
        <div className="flex-1" />
        <button 
          onClick={loadData}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <p className="text-sm">Menarik data live dari cloud...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#0B0F19] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Penjualan</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Rp {metrics.totalSales.toLocaleString('id-ID')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{metrics.salesCount.toLocaleString()} Transaksi Selesai</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0B0F19] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Member</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {metrics.totalMembers.toLocaleString('id-ID')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Pelanggan Terdaftar</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0B0F19] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
              <Package size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Item</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {metrics.totalItems.toLocaleString('id-ID')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Katalog Produk</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
