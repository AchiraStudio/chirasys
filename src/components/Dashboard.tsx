import { useState, useEffect } from 'react';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { getLowStockAlerts, LowStockAlert } from '../lib/api';

interface DashboardProps {
  setActiveMenu: (menu: string) => void;
}

export default function Dashboard({ setActiveMenu }: DashboardProps) {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const DEFAULT_BRANCH_ID = 'branch_001';

  useEffect(() => {
    setAlertsLoading(true);
    getLowStockAlerts(DEFAULT_BRANCH_ID)
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setAlertsLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Overview</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Here is what's happening today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* LEFT: Placeholder for future real metrics */}
        <div className="xl:col-span-2 flex flex-col gap-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-10 flex flex-col items-center justify-center text-center min-h-[220px]">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
              <TrendingUp size={36} className="text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-300">Sales analytics coming soon</h3>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1 max-w-sm">
              Revenue, transaction count, and daily charts will appear here once sales data is recorded.
            </p>
            <button
              onClick={() => setActiveMenu('pos')}
              className="mt-6 px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm"
            >
              Start Selling via POS
            </button>
          </div>

          {/* Recent transactions placeholder */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recent Transactions</h3>
              <button
                onClick={() => setActiveMenu('pos')}
                className="text-sm font-medium text-brand hover:underline"
              >
                Go to POS
              </button>
            </div>
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-slate-500 dark:text-slate-500">No transactions recorded yet.</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">
                Completed sales will appear here automatically.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Low Stock Alerts (real data) */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="font-bold text-lg mb-5 flex items-center text-slate-900 dark:text-white">
              <span className="relative flex h-3 w-3 mr-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              Low Stock Alerts
            </h3>
            <div className="space-y-4">
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
              className="w-full mt-6 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-blue-600 transition-colors"
            >
              Create Purchase Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}