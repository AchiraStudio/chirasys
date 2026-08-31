import { useState, useEffect } from 'react';
import { AlertCircle, DollarSign, ShoppingCart, Activity, ArrowRight } from 'lucide-react';
import { getLowStockAlerts, LowStockAlert, getSalesSummary, SalesSummaryRow, getSales, Sale } from '../lib/api';

interface DashboardProps {
  setActiveMenu: (menu: string) => void;
}

export default function Dashboard({ setActiveMenu }: DashboardProps) {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const DEFAULT_BRANCH_ID = 'branch_001';

  const [summary, setSummary] = useState<SalesSummaryRow | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    setAlertsLoading(true);
    getLowStockAlerts(DEFAULT_BRANCH_ID)
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setAlertsLoading(false));
      
    const today = new Date().toISOString().split('T')[0];
    getSalesSummary(DEFAULT_BRANCH_ID, today, today).then(res => {
      if (res.length > 0) setSummary(res[0]);
    }).catch(console.error);
    
    getSales(DEFAULT_BRANCH_ID).then(res => {
      setSales(res.slice(0, 5));
    }).catch(console.error);
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 sm:gap-5 animate-in fade-in duration-500 w-full max-w-7xl mx-auto overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Overview</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Ringkasan aktivitas dan performa bisnis hari ini.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Metrics & Recent Transactions */}
        <div className="lg:col-span-2 flex flex-col gap-5 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
            <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Hari Ini</p>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <DollarSign size={18} />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">Rp {(summary?.total_revenue || 0).toLocaleString('id-ID')}</h3>
                <p className="text-xs text-slate-500 mt-1">Total Pendapatan</p>
              </div>
            </div>
            
            <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Transaksi</p>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                  <ShoppingCart size={18} />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">{summary?.transaction_count || 0}</h3>
                <p className="text-xs text-slate-500 mt-1">Penjualan Selesai</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Laba Kotor</p>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Activity size={18} />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">Rp {(summary?.gross_profit || 0).toLocaleString('id-ID')}</h3>
                <p className="text-xs text-slate-500 mt-1">Estimasi Kasar</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Transaksi Terakhir</h3>
              <button
                onClick={() => setActiveMenu('pos')}
                className="text-sm font-medium text-brand hover:underline flex items-center gap-1"
              >
                Buka POS <ArrowRight size={14} />
              </button>
            </div>
            {sales.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center flex-1">
                <p className="text-sm text-slate-500 dark:text-slate-500">Belum ada transaksi.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-3 px-6">Waktu</th>
                    <th className="py-3 px-6">No Transaksi</th>
                    <th className="py-3 px-6 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {sales.map(s => (
                    <tr key={s.id}>
                      <td className="py-3 px-6">{new Date(s.created_at).toLocaleTimeString()}</td>
                      <td className="py-3 px-6 font-mono text-slate-600">{s.transaction_no}</td>
                      <td className="py-3 px-6 text-right font-bold text-emerald-600">Rp {s.grand_total.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>

        {/* RIGHT: Low Stock Alerts (real data) */}
        <div className="flex flex-col min-h-0">
          <div className="glass-card rounded-2xl p-6 flex flex-col flex-1 min-h-0 overflow-hidden">
            <h3 className="font-bold text-lg mb-5 flex items-center text-slate-900 dark:text-white shrink-0">
              <span className="relative flex h-3 w-3 mr-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              Low Stock Alerts
            </h3>
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
              {alertsLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-500 text-center py-4">Loading...</p>
              ) : alerts.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">All stock levels look good!</p>
              ) : (
                alerts.map((alert, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex gap-3 items-center">
                      <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                        <AlertCircle size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{alert.item_name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">SKU: {alert.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{alert.current_qty} left</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Min: {alert.min_stock}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setActiveMenu('purchasing')}
              className="w-full mt-6 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-blue-600 transition-colors shrink-0"
            >
              Create Purchase Order
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}