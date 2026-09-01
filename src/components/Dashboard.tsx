// src/components/Dashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, ShoppingCart, Sparkles, PackageCheck,
  ArrowRight, RefreshCw, Plus, Store, CheckCircle2, ChevronRight,
  CreditCard, Banknote, Smartphone, ArrowRightLeft, FileSpreadsheet, Eye
} from 'lucide-react';
import {
  getLowStockAlerts, LowStockAlert, getSalesSummary, SalesSummaryRow,
  getSales, Sale, getTopSellingItems, TopItemRow, getSalesByPaymentMethod,
  PaymentMethodRow, getStockValuation, getExpiringItems, ExpiringItemRow
} from '../lib/api';
import { useAuthStore } from '../store/AuthStore';
import SaleDetailModal from './pos/SaleDetailModal';

interface DashboardProps {
  setActiveMenu: (menu: string) => void;
}

type PeriodType = 'today' | '7days' | 'month';

const PAYMENT_ICON_MAP: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  cash:     { label: 'Tunai',        icon: Banknote,      color: 'text-emerald-500', bg: 'bg-emerald-500' },
  transfer: { label: 'Transfer',     icon: ArrowRightLeft, color: 'text-blue-500',    bg: 'bg-blue-500'   },
  debit:    { label: 'Debit',        icon: CreditCard,    color: 'text-indigo-500',  bg: 'bg-indigo-500'  },
  credit:   { label: 'Kredit',       icon: CreditCard,    color: 'text-purple-500',  bg: 'bg-purple-500'  },
  qris:     { label: 'QRIS',         icon: Smartphone,    color: 'text-amber-500',   bg: 'bg-amber-500'   },
};

const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function Dashboard({ setActiveMenu }: DashboardProps) {
  const { user } = useAuthStore();
  const branchId = user?.branch_id || 'branch_001';

  const [period, setPeriod] = useState<PeriodType>('today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [summary, setSummary] = useState<SalesSummaryRow | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<SalesSummaryRow[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [topItems, setTopItems] = useState<TopItemRow[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [expiringAlerts, setExpiringAlerts] = useState<ExpiringItemRow[]>([]);
  const [totalStockValuation, setTotalStockValuation] = useState<number>(0);

  // Tab inside Alerts Widget
  const [alertTab, setAlertTab] = useState<'lowStock' | 'expiring'>('lowStock');

  // Modal detail for recent transaction click
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Date range computation
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = formatDateLocal(now);

    if (period === 'today') {
      return { from: todayStr, to: todayStr };
    } else if (period === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 6);
      return { from: formatDateLocal(sevenDaysAgo), to: todayStr };
    } else {
      // Month
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatDateLocal(firstOfMonth), to: todayStr };
    }
  }, [period]);

  const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 6);
      const weekFromStr = formatDateLocal(sevenDaysAgo);
      const todayStr = formatDateLocal(now);

      const [
        summaryRes,
        weeklySummaryRes,
        salesRes,
        topItemsRes,
        paymentsRes,
        lowStockRes,
        expiringRes,
        valuationRes,
      ] = await Promise.all([
        getSalesSummary(branchId, dateRange.from, dateRange.to).catch(() => []),
        getSalesSummary(branchId, weekFromStr, todayStr).catch(() => []),
        getSales(branchId).catch(() => []),
        getTopSellingItems(branchId, dateRange.from, dateRange.to, 5).catch(() => []),
        getSalesByPaymentMethod(branchId, dateRange.from, dateRange.to).catch(() => []),
        getLowStockAlerts(branchId).catch(() => []),
        getExpiringItems(branchId, 90).catch(() => []),
        getStockValuation(branchId).catch(() => []),
      ]);

      // Aggregate Summary
      if (summaryRes.length > 0) {
        const aggregated: SalesSummaryRow = summaryRes.reduce(
          (acc, row) => ({
            period_label: period,
            transaction_count: acc.transaction_count + row.transaction_count,
            total_revenue: acc.total_revenue + row.total_revenue,
            total_discount: acc.total_discount + row.total_discount,
            total_cogs: acc.total_cogs + row.total_cogs,
            gross_profit: acc.gross_profit + row.gross_profit,
          }),
          {
            period_label: period,
            transaction_count: 0,
            total_revenue: 0,
            total_discount: 0,
            total_cogs: 0,
            gross_profit: 0,
          }
        );
        setSummary(aggregated);
      } else {
        setSummary(null);
      }

      setWeeklySummary(weeklySummaryRes);
      setSales(salesRes.slice(0, 6));
      setTopItems(topItemsRes);
      setPaymentMethods(paymentsRes);
      setLowStockAlerts(lowStockRes);
      setExpiringAlerts(expiringRes);

      const totalVal = valuationRes.reduce((s, r) => s + r.total_value, 0);
      setTotalStockValuation(totalVal);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period, branchId]);

  // Derived KPI Metrics
  const totalRevenue = summary?.total_revenue || 0;
  const transactionCount = summary?.transaction_count || 0;
  const grossProfit = summary?.gross_profit || 0;
  const avgBasket = transactionCount > 0 ? Math.round(totalRevenue / transactionCount) : 0;
  const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

  const totalPaymentsAmount = paymentMethods.reduce((s, p) => s + p.total_amount, 0);

  // Maximum revenue in 7 days for relative chart scaling
  const maxDayRevenue = useMemo(() => {
    if (weeklySummary.length === 0) return 100000;
    const maxVal = Math.max(...weeklySummary.map(d => d.total_revenue));
    return maxVal > 0 ? maxVal : 100000;
  }, [weeklySummary]);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0 flex flex-col gap-6 animate-in fade-in duration-300 w-full max-w-7xl mx-auto pb-10 pr-1">
      
      {/* ─── 1. EXECUTIVE HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-white/70 dark:bg-[#0B0F19]/80 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Executive Overview
            </h1>
            <span className="bg-brand/10 text-brand text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full bg-brand ${loading ? 'animate-ping' : 'animate-pulse'}`}></span>
              {loading ? 'MEMUAT...' : user?.role ? user.role.toUpperCase() : 'ADMIN'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Selamat datang kembali, <strong className="text-slate-700 dark:text-slate-200">{user?.name || user?.username || 'Operator'}</strong>! Pantau performa bisnis dan stok secara real-time.
          </p>
        </div>

        {/* Period Selector & Refresh */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl flex items-center border border-slate-200/60 dark:border-slate-800">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'today'
                  ? 'bg-white dark:bg-slate-800 text-brand shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setPeriod('7days')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === '7days'
                  ? 'bg-white dark:bg-slate-800 text-brand shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'month'
                  ? 'bg-white dark:bg-slate-800 text-brand shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bulan Ini
            </button>
          </div>

          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-50"
            title="Muat ulang data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-brand' : ''} />
          </button>
        </div>
      </div>

      {/* ─── 2. CORE FINANCIAL KPI CARDS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-white to-transparent dark:from-emerald-500/15 dark:via-[#0B0F19] dark:to-[#0B0F19] p-5 rounded-3xl border border-emerald-500/20 dark:border-emerald-500/20 shadow-sm flex flex-col justify-between group hover:border-emerald-500/40 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Pendapatan</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> Penjualan lunas tercatat
            </p>
          </div>
        </div>

        {/* Transaction Count & Basket */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-white to-transparent dark:from-blue-500/15 dark:via-[#0B0F19] dark:to-[#0B0F19] p-5 rounded-3xl border border-blue-500/20 dark:border-blue-500/20 shadow-sm flex flex-col justify-between group hover:border-blue-500/40 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Transaksi Kasir</span>
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShoppingCart size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {transactionCount} <span className="text-sm font-semibold text-slate-500">Struk</span>
            </h3>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
              Rata-rata: Rp {avgBasket.toLocaleString('id-ID')} / trx
            </p>
          </div>
        </div>

        {/* Gross Profit & Margin */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-white to-transparent dark:from-purple-500/15 dark:via-[#0B0F19] dark:to-[#0B0F19] p-5 rounded-3xl border border-purple-500/20 dark:border-purple-500/20 shadow-sm flex flex-col justify-between group hover:border-purple-500/40 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estimasi Laba Kotor</span>
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Rp {grossProfit.toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-1">
              Margin Laba: <strong className="font-bold">{profitMargin}%</strong>
            </p>
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-white to-transparent dark:from-amber-500/15 dark:via-[#0B0F19] dark:to-[#0B0F19] p-5 rounded-3xl border border-amber-500/20 dark:border-amber-500/20 shadow-sm flex flex-col justify-between group hover:border-amber-500/40 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Valuasi Persediaan</span>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <PackageCheck size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Rp {totalStockValuation.toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
              Total modal persediaan aktif
            </p>
          </div>
        </div>

      </div>

      {/* ─── 3. QUICK ACTION SHORTCUTS ──────────────────────────────────── */}
      <div className="bg-white/80 dark:bg-[#0B0F19]/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
          <Store size={16} className="text-brand" /> Pintasan Cepat:
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveMenu('pos')}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand hover:bg-blue-600 text-white text-xs font-bold shadow-sm shadow-brand/20 transition-all cursor-pointer"
          >
            <ShoppingCart size={14} /> Kasir POS <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">F1</span>
          </button>

          <button
            onClick={() => setActiveMenu('inventory')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            <Plus size={14} className="text-brand" /> Tambah Barang
          </button>

          <button
            onClick={() => setActiveMenu('purchasing')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            <PackageCheck size={14} className="text-emerald-500" /> Terima Barang
          </button>

          <button
            onClick={() => setActiveMenu('opname')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-amber-500" /> Stok Opname
          </button>

          <button
            onClick={() => setActiveMenu('laporan-penjualan')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            <TrendingUp size={14} className="text-purple-500" /> Laporan Penjualan
          </button>
        </div>
      </div>

      {/* ─── 4. MAIN ANALYTICS GRID (2 COLUMNS) ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ─── LEFT COLUMN (7 Cols): Trend & Recent Transactions & Top Items ─── */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 7-Day Revenue Mini Chart */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Tren Penjualan 7 Hari Terakhir</h3>
                <p className="text-xs text-slate-500">Aktivitas omzet dan jumlah transaksi harian</p>
              </div>
              <span className="text-xs font-bold text-brand bg-brand/10 px-3 py-1 rounded-full">Live Monitor</span>
            </div>

            {weeklySummary.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Belum ada data penjualan dalam 7 hari terakhir.</div>
            ) : (
              <div className="flex items-end justify-between gap-3 h-36 pt-4 px-2">
                {weeklySummary.map((day, idx) => {
                  const heightPercent = Math.max(12, Math.min(100, (day.total_revenue / maxDayRevenue) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-xl pointer-events-none z-20 whitespace-nowrap">
                        Rp {day.total_revenue.toLocaleString('id-ID')} ({day.transaction_count} trx)
                      </div>

                      <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-xl h-28 flex items-end p-1 overflow-hidden">
                        <div
                          className="w-full bg-gradient-to-t from-brand to-indigo-400 dark:from-brand dark:to-indigo-500 rounded-lg transition-all duration-500 group-hover:brightness-110"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-full">
                        {day.period_label.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Transactions Table */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Transaksi Kasir Terkini</h3>
                <p className="text-xs text-slate-500">Struk penjualan terakhir yang diproses</p>
              </div>
              <button
                onClick={() => setActiveMenu('pos')}
                className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                Buka Kasir <ArrowRight size={14} />
              </button>
            </div>

            {sales.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">Belum ada transaksi tercatat.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-5">Waktu</th>
                      <th className="py-3 px-5">No Transaksi</th>
                      <th className="py-3 px-5">Pelanggan</th>
                      <th className="py-3 px-5 text-right">Total</th>
                      <th className="py-3 px-5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sales.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-slate-500">
                          {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white">
                          {s.transaction_no}
                        </td>
                        <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                          {(s as any).customer_name || (s.customer_id ? 'Pelanggan Terdaftar' : 'Pelanggan Umum')}
                        </td>
                        <td className="py-3.5 px-5 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                          Rp {s.grand_total.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <button
                            onClick={() => setSelectedSaleId(s.id)}
                            className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-all"
                            title="Lihat Detail Struk"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Selling Products Leaderboard */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Top 5 Produk Terlaris</h3>
                <p className="text-xs text-slate-500">Barang paling diminati berdasarkan volume penjualan</p>
              </div>
              <button
                onClick={() => setActiveMenu('laporan-item')}
                className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                Semua Produk <ChevronRight size={14} />
              </button>
            </div>

            {topItems.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">Belum ada data barang terjual pada periode ini.</p>
            ) : (
              <div className="space-y-3">
                {topItems.map((item, idx) => {
                  const maxQty = topItems[0]?.qty_sold || 1;
                  const percent = Math.min(100, Math.round((item.qty_sold / maxQty) * 100));
                  return (
                    <div key={item.sku || idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300' :
                        idx === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                        idx === 2 ? 'bg-amber-800/10 text-amber-800 dark:bg-amber-900/30 dark:text-amber-600' :
                        'bg-slate-100 text-slate-500 dark:bg-slate-900'
                      }`}>
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{item.item_name}</p>
                          <span className="font-extrabold text-xs text-brand shrink-0 ml-2">{item.qty_sold} terjual</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ─── RIGHT COLUMN (5 Cols): Contained Alerts Center & Payment Methods ─── */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Contained Alerts Center (NO ENDLESS SCROLL!) */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col max-h-[460px]">
            
            {/* Header & Tabs */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Pusat Peringatan</h3>
              </div>

              {/* Alert Tabs */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                <button
                  onClick={() => setAlertTab('lowStock')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    alertTab === 'lowStock'
                      ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Menipis ({lowStockAlerts.length})
                </button>
                <button
                  onClick={() => setAlertTab('expiring')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    alertTab === 'expiring'
                      ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Kadaluarsa ({expiringAlerts.length})
                </button>
              </div>
            </div>

            {/* Alert List Body (Strictly Scroll-Capped!) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pt-3 space-y-2.5 pr-1">
              {alertTab === 'lowStock' ? (
                lowStockAlerts.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center">
                    <CheckCircle2 size={36} className="text-emerald-500 mb-2 opacity-80" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Semua stok dalam batas aman!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Tidak ada barang di bawah batas minimum.</p>
                  </div>
                ) : (
                  lowStockAlerts.map((item, idx) => (
                    <div key={item.sku || idx} className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{item.item_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku || '-'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 rounded-md">
                          {item.current_qty} {item.unit_name}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-0.5 font-semibold">Min: {item.min_stock}</p>
                      </div>
                    </div>
                  ))
                )
              ) : (
                expiringAlerts.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center">
                    <CheckCircle2 size={36} className="text-emerald-500 mb-2 opacity-80" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Tidak ada obat mendekati expired!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Semua batch dalam masa berlaku &gt; 90 hari.</p>
                  </div>
                ) : (
                  expiringAlerts.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{item.item_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Batch: {item.batch_no || '-'} • Exp: {item.expiry_date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-md">
                          {item.days_left} hari lagi
                        </span>
                        <p className="text-[9px] text-slate-400 mt-0.5 font-semibold">Sisa: {item.qty}</p>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

            {/* Footer Shortcut */}
            <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setActiveMenu('inventory')}
                className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                Kelola Semua Stok di Master Data <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Metode Pembayaran</h3>
                <p className="text-xs text-slate-500">Distribusi kas masuk periode ini</p>
              </div>
              <button
                onClick={() => setActiveMenu('laporan-metode-pembayaran')}
                className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                Detail <ChevronRight size={14} />
              </button>
            </div>

            {paymentMethods.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">Belum ada pembayaran masuk pada periode ini.</p>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map(pm => {
                  const info = PAYMENT_ICON_MAP[pm.method] || { label: pm.method, icon: CreditCard, color: 'text-slate-500', bg: 'bg-slate-500' };
                  const Icon = info.icon;
                  const percent = totalPaymentsAmount > 0 ? ((pm.total_amount / totalPaymentsAmount) * 100).toFixed(1) : '0';

                  return (
                    <div key={pm.method} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <Icon size={14} className={info.color} />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{info.label}</span>
                          <span className="text-[10px] text-slate-400">({pm.transaction_count} trx)</span>
                        </div>
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          Rp {pm.total_amount.toLocaleString('id-ID')} <span className="text-[10px] text-slate-400 font-medium">({percent}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${info.bg} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ─── 5. SALE DETAIL MODAL ───────────────────────────────────────── */}
      {selectedSaleId && (
        <SaleDetailModal saleId={selectedSaleId} onClose={() => setSelectedSaleId(null)} />
      )}

    </div>
  );
}