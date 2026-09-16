// src/components/Dashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, ShoppingCart, Sparkles, PackageCheck,
  ArrowRight, RefreshCw, Plus, Store, CheckCircle2, ChevronRight,
  CreditCard, Banknote, Smartphone, ArrowRightLeft, FileSpreadsheet, Eye, BarChart3
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
  cash:     { label: 'Tunai',        icon: Banknote,      color: 'text-success', bg: 'bg-success' },
  transfer: { label: 'Transfer',     icon: ArrowRightLeft, color: 'text-accent',    bg: 'bg-accent'   },
  debit:    { label: 'Debit',        icon: CreditCard,    color: 'text-primary',  bg: 'bg-primary'  },
  credit:   { label: 'Kredit',       icon: CreditCard,    color: 'text-primary',  bg: 'bg-primary'  },
  qris:     { label: 'QRIS',         icon: Smartphone,    color: 'text-warning',   bg: 'bg-warning'   },
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
    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0 flex flex-col gap-5 animate-fade-in w-full pb-8 pr-1">
      
      {/* ─── 1. EXECUTIVE HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 py-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-heading">
              Ringkasan Bisnis
            </h1>
            <span className="bg-primary-soft text-primary text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full bg-primary ${loading ? 'animate-ping' : ''}`} />
              {loading ? 'MEMUAT...' : user?.role ? user.role.toUpperCase() : 'ADMIN'}
            </span>
          </div>
          <p className="text-xs text-dim mt-0.5">
            Ringkasan performa penjualan, laba kotor, dan pergerakan stok real-time.
          </p>
        </div>

        {/* Period Selector & Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-muted p-1 rounded-xl flex items-center border border-line">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === 'today'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-dim hover:text-heading'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === '7days'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-dim hover:text-heading'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === 'month'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-dim hover:text-heading'
              }`}
            >
              Bulan Ini
            </button>
          </div>

          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-line hover:bg-muted text-dim hover:text-heading transition-all disabled:opacity-50 cursor-pointer shadow-xs bg-card"
            title="Muat ulang data"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-primary' : ''} />
          </button>
        </div>
      </div>

      {/* ─── 2. CORE FINANCIAL KPI CARDS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="relative overflow-hidden bg-card p-5 rounded-xl border border-success/20 dark:border-success/20 shadow-sm flex flex-col justify-between group hover:border-success/40 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-dim uppercase tracking-wider">Total Pendapatan</span>
            <div className="p-2.5 rounded-xl bg-success/10 text-success dark:text-success">
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-heading tracking-tight">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-success dark:text-success font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> Penjualan lunas tercatat
            </p>
          </div>
        </div>

        {/* Transaction Count & Basket */}
        <div className="relative overflow-hidden bg-card p-5 rounded-xl border border-accent/20 dark:border-accent/20 shadow-sm flex flex-col justify-between group hover:border-accent/40 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-dim uppercase tracking-wider">Transaksi Kasir</span>
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent dark:text-accent">
              <ShoppingCart size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-heading tracking-tight">
              {transactionCount} <span className="text-sm font-semibold text-dim">Struk</span>
            </h3>
            <p className="text-[11px] text-accent dark:text-accent font-semibold mt-1">
              Rata-rata: Rp {avgBasket.toLocaleString('id-ID')} / trx
            </p>
          </div>
        </div>

        {/* Gross Profit & Margin */}
        <div className="relative overflow-hidden bg-card p-5 rounded-xl border border-primary/20 dark:border-primary/20 shadow-sm flex flex-col justify-between group hover:border-primary/40 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-dim uppercase tracking-wider">Estimasi Laba Kotor</span>
            <div className="p-2.5 rounded-xl bg-primary-soft text-primary ">
              <Sparkles size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-heading tracking-tight">
              Rp {grossProfit.toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-primary  font-semibold mt-1">
              Margin Laba: <strong className="font-bold">{profitMargin}%</strong>
            </p>
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="relative overflow-hidden bg-card p-5 rounded-xl border border-warning/20 dark:border-warning/20 shadow-sm flex flex-col justify-between group hover:border-warning/40 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-dim uppercase tracking-wider">Valuasi Persediaan</span>
            <div className="p-2.5 rounded-xl bg-warning/10 text-warning dark:text-warning">
              <PackageCheck size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-heading tracking-tight">
              Rp {totalStockValuation.toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-warning dark:text-warning font-semibold mt-1">
              Total modal persediaan aktif
            </p>
          </div>
        </div>

      </div>

      {/* ─── 3. QUICK ACTION SHORTCUTS ──────────────────────────────────── */}
      <div className="bg-card border border-line rounded-xl p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-dim uppercase tracking-wider pl-1">
          <Store size={16} className="text-primary" /> Pintasan Cepat:
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveMenu('pos')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm shadow-primary/20 transition-all cursor-pointer"
          >
            <ShoppingCart size={14} /> Kasir POS <span className="bg-card/20 px-1.5 py-0.5 rounded text-[10px]">F1</span>
          </button>

          <button
            onClick={() => setActiveMenu('inventory')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted hover:bg-line dark:hover:bg-line-strong text-body dark:text-heading text-xs font-bold transition-all cursor-pointer"
          >
            <Plus size={14} className="text-primary" /> Tambah Barang
          </button>

          <button
            onClick={() => setActiveMenu('purchasing')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted hover:bg-line dark:hover:bg-line-strong text-body dark:text-heading text-xs font-bold transition-all cursor-pointer"
          >
            <PackageCheck size={14} className="text-success" /> Terima Barang
          </button>

          <button
            onClick={() => setActiveMenu('inventory')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted hover:bg-line dark:hover:bg-line-strong text-body dark:text-heading text-xs font-bold transition-all cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-warning" /> Stok Opname
          </button>

          <button
            onClick={() => setActiveMenu('reports')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted hover:bg-line dark:hover:bg-line-strong text-body dark:text-heading text-xs font-bold transition-all cursor-pointer"
          >
            <TrendingUp size={14} className="text-primary" /> Laporan Penjualan
          </button>
        </div>
      </div>

      {/* ─── 4. MAIN ANALYTICS GRID (2 COLUMNS) ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ─── LEFT COLUMN (7 Cols): Trend & Recent Transactions & Top Items ─── */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* 7-Day Revenue Mini Chart */}
          <div className="bg-card rounded-xl border border-line p-5 sm:p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-base font-extrabold text-heading">Tren Penjualan 7 Hari Terakhir</h3>
                <p className="text-xs text-dim">Aktivitas omzet dan jumlah transaksi harian</p>
              </div>
              <span className="text-xs font-bold text-primary bg-primary-soft px-3 py-1 rounded-full">Live Monitor</span>
            </div>

            {weeklySummary.length === 0 ? (
              <div className="py-6 text-center text-xs text-dim flex flex-col items-center justify-center gap-2">
                <BarChart3 size={28} className="text-dim dark:text-body" />
                <span>Belum ada data penjualan dalam 7 hari terakhir. Mulai transaksi melalui Kasir POS.</span>
              </div>
            ) : (
              <div className="flex items-end justify-between gap-3 h-36 pt-4 px-2">
                {weeklySummary.map((day, idx) => {
                  const heightPercent = Math.max(12, Math.min(100, (day.total_revenue / maxDayRevenue) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-heading text-card text-[10px] font-bold py-1 px-2 rounded-lg shadow-xl pointer-events-none z-20 whitespace-nowrap">
                        Rp {day.total_revenue.toLocaleString('id-ID')} ({day.transaction_count} trx)
                      </div>

                      <div className="w-full bg-muted/80 rounded-xl h-28 flex items-end p-1 overflow-hidden">
                        <div
                          className="w-full bg-primary rounded-lg transition-all duration-500 group-hover:brightness-110"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-dim truncate max-w-full">
                        {day.period_label.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Transactions Table */}
          <div className="bg-card rounded-xl border border-line shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 sm:px-6 py-4 border-b border-line flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-heading text-base">Transaksi Kasir Terkini</h3>
                <p className="text-xs text-dim">Struk penjualan terakhir yang diproses</p>
              </div>
              <button
                onClick={() => setActiveMenu('pos')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                Buka Kasir <ArrowRight size={14} />
              </button>
            </div>

            {sales.length === 0 ? (
              <div className="py-8 px-6 text-center text-dim text-xs flex flex-col items-center justify-center gap-2">
                <ShoppingCart size={24} className="text-dim dark:text-body" />
                <span>Belum ada transaksi tercatat. Tekan Kasir POS untuk membuat transaksi baru.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/70 dark:bg-card/50 border-b border-line text-dim font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-5">Waktu</th>
                      <th className="py-3 px-5">No Transaksi</th>
                      <th className="py-3 px-5">Pelanggan</th>
                      <th className="py-3 px-5 text-right">Total</th>
                      <th className="py-3 px-5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line dark:divide-line">
                    {sales.map(s => (
                      <tr key={s.id} className="hover:bg-muted/50 dark:hover:bg-card/30 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-dim">
                          {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-5 font-mono font-bold text-heading">
                          {s.transaction_no}
                        </td>
                        <td className="py-3.5 px-5 text-heading">
                          {(s as any).customer_name || (s.customer_id ? 'Pelanggan Terdaftar' : 'Pelanggan Umum')}
                        </td>
                        <td className="py-3.5 px-5 text-right font-extrabold text-success dark:text-success">
                          Rp {s.grand_total.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <button
                            onClick={() => setSelectedSaleId(s.id)}
                            className="p-1.5 text-dim hover:text-primary hover:bg-primary-soft rounded-lg transition-all"
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
          <div className="bg-card rounded-xl border border-line p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-heading text-base">Top 5 Produk Terlaris</h3>
                <p className="text-xs text-dim">Barang paling diminati berdasarkan volume penjualan</p>
              </div>
              <button
                onClick={() => setActiveMenu('reports')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                Semua Produk <ChevronRight size={14} />
              </button>
            </div>

            {topItems.length === 0 ? (
              <p className="text-center text-xs text-dim py-4">Belum ada data barang terjual pada periode ini.</p>
            ) : (
              <div className="space-y-3">
                {topItems.map((item, idx) => {
                  const maxQty = topItems[0]?.qty_sold || 1;
                  const percent = Math.min(100, Math.round((item.qty_sold / maxQty) * 100));
                  return (
                    <div key={item.sku || idx} className="p-3 rounded-xl bg-muted/40 border border-line flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        idx === 0 ? 'bg-warning-soft text-warning border border-warning/40' :
                        idx === 1 ? 'bg-muted text-body' :
                        idx === 2 ? 'bg-warning-soft/60 text-warning' :
                        'bg-muted text-dim'
                      }`}>
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-xs text-heading truncate">{item.item_name}</p>
                          <span className="font-extrabold text-xs text-primary shrink-0 ml-2">{item.qty_sold} terjual</span>
                        </div>
                        <div className="h-1.5 bg-line dark:bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
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
        <div className="lg:col-span-5 space-y-5">
          
          {/* Contained Alerts Center (NO ENDLESS SCROLL!) */}
          <div className="bg-card rounded-xl border border-line shadow-sm p-5 sm:p-6 flex flex-col max-h-[460px]">
            
            {/* Header & Tabs */}
            <div className="flex items-center justify-between pb-3.5 border-b border-line shrink-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-danger"></span>
                </span>
                <h3 className="font-extrabold text-heading text-base">Pusat Peringatan</h3>
              </div>

              {/* Alert Tabs */}
              <div className="flex items-center bg-muted p-1 rounded-xl">
                <button
                  onClick={() => setAlertTab('lowStock')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    alertTab === 'lowStock'
                      ? 'bg-card dark:bg-muted text-danger shadow-sm'
                      : 'text-dim hover:text-heading dark:hover:text-white'
                  }`}
                >
                  Menipis ({lowStockAlerts.length})
                </button>
                <button
                  onClick={() => setAlertTab('expiring')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    alertTab === 'expiring'
                      ? 'bg-card dark:bg-muted text-warning shadow-sm'
                      : 'text-dim hover:text-heading dark:hover:text-white'
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
                  <div className="py-6 text-center flex flex-col items-center justify-center">
                    <CheckCircle2 size={32} className="text-success mb-1.5 opacity-80" />
                    <p className="text-xs font-bold text-heading">Semua stok dalam batas aman!</p>
                    <p className="text-[11px] text-dim mt-0.5">Tidak ada barang di bawah batas minimum.</p>
                  </div>
                ) : (
                  lowStockAlerts.map((item, idx) => (
                    <div key={item.sku || idx} className="p-3 rounded-xl bg-danger-soft/50 border border-danger/20 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-heading truncate">{item.item_name}</p>
                        <p className="text-[10px] text-dim font-mono">SKU: {item.sku || '-'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-danger dark:text-danger bg-danger-soft px-2 py-0.5 rounded-md">
                          {item.current_qty} {item.unit_name}
                        </span>
                        <p className="text-[9px] text-dim mt-0.5 font-semibold">Min: {item.min_stock}</p>
                      </div>
                    </div>
                  ))
                )
              ) : (
                expiringAlerts.length === 0 ? (
                  <div className="py-6 text-center flex flex-col items-center justify-center">
                    <CheckCircle2 size={32} className="text-success mb-1.5 opacity-80" />
                    <p className="text-xs font-bold text-heading">Tidak ada obat mendekati expired!</p>
                    <p className="text-[11px] text-dim mt-0.5">Semua batch dalam masa berlaku &gt; 90 hari.</p>
                  </div>
                ) : (
                  expiringAlerts.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-warning-soft/50 border border-warning/20 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-heading truncate">{item.item_name}</p>
                        <p className="text-[10px] text-dim font-mono">Batch: {item.batch_no || '-'} • Exp: {item.expiry_date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-warning dark:text-warning bg-warning-soft px-2 py-0.5 rounded-md">
                          {item.days_left} hari lagi
                        </span>
                        <p className="text-[9px] text-dim mt-0.5 font-semibold">Sisa: {item.qty}</p>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

            {/* Footer Shortcut */}
            <div className="pt-3 mt-2 border-t border-line flex justify-end shrink-0">
              <button
                onClick={() => setActiveMenu('inventory')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                Kelola Semua Stok di Master Data <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="bg-card rounded-xl border border-line p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-heading text-base">Metode Pembayaran</h3>
                <p className="text-xs text-dim">Distribusi kas masuk periode ini</p>
              </div>
              <button
                onClick={() => setActiveMenu('reports')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                Detail <ChevronRight size={14} />
              </button>
            </div>

            {paymentMethods.length === 0 ? (
              <p className="text-center text-xs text-dim py-4">Belum ada pembayaran masuk pada periode ini.</p>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map(pm => {
                  const info = PAYMENT_ICON_MAP[pm.method] || { label: pm.method, icon: CreditCard, color: 'text-dim', bg: 'bg-dim' };
                  const Icon = info.icon;
                  const percent = totalPaymentsAmount > 0 ? ((pm.total_amount / totalPaymentsAmount) * 100).toFixed(1) : '0';

                  return (
                    <div key={pm.method} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <Icon size={14} className={info.color} />
                          <span className="font-bold text-heading">{info.label}</span>
                          <span className="text-[10px] text-dim">({pm.transaction_count} trx)</span>
                        </div>
                        <div className="font-extrabold text-heading">
                          Rp {pm.total_amount.toLocaleString('id-ID')} <span className="text-[10px] text-dim font-medium">({percent}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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