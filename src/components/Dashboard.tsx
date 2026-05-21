import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Package, DollarSign, AlertCircle, TrendingUp, MoreHorizontal, Clock, ShoppingBag } from 'lucide-react';
import { getLowStockAlerts, LowStockAlert } from '../lib/api';

interface DashboardProps {
  setActiveMenu: (menu: string) => void;
}

export default function Dashboard({ setActiveMenu }: DashboardProps) {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const DEFAULT_BRANCH_ID = 'branch_001';

  useEffect(() => {
    getLowStockAlerts(DEFAULT_BRANCH_ID).then(setAlerts).catch(console.error);
  }, []);

  const stats = [
    { title: "Today's Revenue", value: "$4,250.00", trend: "+12.5%", isUp: true, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { title: "Transactions", value: "142", trend: "+5.2%", isUp: true, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { title: "Items Sold", value: "384", trend: "-2.1%", isUp: false, icon: Package, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" }
  ];

  const transactions = [
    { id: "INV-2026-001", customer: "Walk-in Customer", time: "11:24 AM", total: "$42.50", status: "Completed" },
    { id: "INV-2026-002", customer: "Sarah Jenkins", time: "11:15 AM", total: "$128.00", status: "Completed" },
    { id: "INV-2026-003", customer: "Marcus Thorne", time: "10:59 AM", total: "$15.00", status: "Pending" },
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-bold tracking-tight">Overview</h1><p className="text-sm text-slate-600 mt-1">Here is what's happening today.</p></div>
        <button className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200">Export Report</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
                  <div className="flex justify-between items-start mb-4"><div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}><Icon size={22} strokeWidth={2.5} /></div><button className="text-slate-500"><MoreHorizontal size={20} /></button></div>
                  <div><h3 className="text-3xl font-bold">{stat.value}</h3><div className="flex items-center justify-between mt-2"><p className="text-sm font-medium text-slate-600">{stat.title}</p><div className="flex items-center text-xs font-semibold">{stat.isUp ? <ArrowUpRight size={14} className="text-emerald-500 mr-1" /> : <ArrowDownRight size={14} className="text-rose-500 mr-1" />}<span className={stat.isUp ? 'text-emerald-600' : 'text-rose-600'}>{stat.trend}</span></div></div></div>
                </div>
              );
            })}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-lg">Recent Transactions</h3><button className="text-sm font-medium text-brand">View All Sales</button></div>
            <table className="w-full text-left border-collapse"><thead className="bg-slate-50/50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-100"><tr><th className="py-4 px-6">ID</th><th className="py-4 px-6">Customer</th><th className="py-4 px-6">Time</th><th className="py-4 px-6">Status</th><th className="py-4 px-6 text-right">Amount</th></tr></thead><tbody className="text-sm divide-y divide-slate-100">{transactions.map((row, i) => (<tr key={i} className="hover:bg-slate-50"><td className="py-4 px-6 font-medium flex items-center gap-3"><div className="p-2 bg-slate-100 rounded-lg"><ShoppingBag size={16} /></div>{row.id}</td><td className="py-4 px-6 text-slate-600">{row.customer}</td><td className="py-4 px-6 text-slate-600 flex items-center gap-1.5"><Clock size={14} /> {row.time}</td><td className="py-4 px-6"><span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100">{row.status}</span></td><td className="py-4 px-6 text-right font-bold">{row.total}</td></tr>))}</tbody></table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-lg mb-5 flex items-center">
              <span className="relative flex h-3 w-3 mr-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span></span>
              Low Stock Alerts
            </h3>
            <div className="space-y-4">
              {alerts.length === 0 ? <p className="text-sm text-slate-600 text-center py-4">All stock levels look good!</p> : alerts.map((alert, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><AlertCircle size={18} /></div>
                    <div><p className="font-semibold text-sm">{alert.item_name}</p><p className="text-xs text-slate-600 mt-0.5">SKU: {alert.sku}</p></div>
                  </div>
                  <div className="text-right"><p className="text-sm font-bold text-rose-600">{alert.current_qty} left</p><p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Min: {alert.min_stock}</p></div>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveMenu('purchasing')} className="w-full mt-6 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold shadow-sm">Create Purchase Order</button>
          </div>
        </div>
      </div>
    </div>
  );
}