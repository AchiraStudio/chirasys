import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Loader2, TrendingUp, ShoppingCart, Tag, DollarSign, 
  FileText, Filter, Printer, Download, Eye, Search,
  RefreshCw, BarChart3, CreditCard, Banknote, Smartphone, ArrowRightLeft,
  ChevronRight
} from 'lucide-react';
import { 
  getSalesRecapReport, getDetailedSalesLines, getSalesByCashierSummary, getDailySalesRecap,
  getTopSellingItems, getSalesByPaymentMethod, getCustomers, getUsers, getCategories,
  SalesRecapReportRow, SalesLineReportRow, CashierSalesReportRow, DailySalesRecapRow,
  PaymentMethodRow, Customer, Category, TopItemRow
} from '../../lib/api';
import { downloadCsv } from '../../lib/exportCsv';
import SaleDetailModal from '../../components/pos/SaleDetailModal';
import PrintReportModal from '../../components/reports/PrintReportModal';
import { useAuthStore } from '../../store/AuthStore';

interface Props { 
  onBack: () => void; 
  initialSubtype?: ReportSubtype;
}

type ReportSubtype = 'recap' | 'detailed' | 'daily' | 'payment_methods' | 'customer' | 'cashier' | 'product_margin';

const METHOD_CONFIG: Record<string, { label: string; icon: any; color: string; badgeBg: string; textCol: string }> = {
  cash:     { label: 'Tunai (Cash)',       icon: Banknote,      color: 'bg-emerald-500', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40', textCol: 'text-emerald-700 dark:text-emerald-300' },
  transfer: { label: 'Transfer Bank',      icon: ArrowRightLeft, color: 'bg-blue-500',    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',    textCol: 'text-blue-700 dark:text-blue-300' },
  debit:    { label: 'Kartu Debit / EDC',  icon: CreditCard,    color: 'bg-indigo-500',  badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',textCol: 'text-indigo-700 dark:text-indigo-300' },
  credit:   { label: 'Kartu Kredit',       icon: CreditCard,    color: 'bg-purple-500',  badgeBg: 'bg-purple-50 dark:bg-purple-950/40',textCol: 'text-purple-700 dark:text-purple-300' },
  qris:     { label: 'QRIS / E-Wallet',    icon: Smartphone,    color: 'bg-amber-500',   badgeBg: 'bg-amber-50 dark:bg-amber-950/40',  textCol: 'text-amber-700 dark:text-amber-300' },
  card:     { label: 'Kartu EDC',          icon: CreditCard,    color: 'bg-indigo-500',  badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',textCol: 'text-indigo-700 dark:text-indigo-300' },
  tempo:    { label: 'Tempo / Piutang',    icon: FileText,      color: 'bg-rose-500',    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',    textCol: 'text-rose-700 dark:text-rose-300' },
};

export default function LaporanPenjualan({ onBack, initialSubtype = 'recap' }: Props) {
  const { user } = useAuthStore();
  const branchId = user?.branch_id || 'branch_001';

  // Sub-report selection
  const [activeSubtype, setActiveSubtype] = useState<ReportSubtype>(initialSubtype);

  // Filter States
  const [presetPeriod, setPresetPeriod] = useState<string>('month');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [txFrom, setTxFrom] = useState<string>('');
  const [txTo, setTxTo] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedPriceType, setSelectedPriceType] = useState<string>('all');

  // Search keyword inside loaded data
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');

  // Dropdown master records
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Report Data States
  const [loading, setLoading] = useState(false);
  const [recapData, setRecapData] = useState<SalesRecapReportRow[]>([]);
  const [detailedData, setDetailedData] = useState<SalesLineReportRow[]>([]);
  const [dailyData, setDailyData] = useState<DailySalesRecapRow[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodRow[]>([]);
  const [cashierData, setCashierData] = useState<CashierSalesReportRow[]>([]);
  const [productMarginData, setProductMarginData] = useState<TopItemRow[]>([]);

  // Detail Modal & Print Modal
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Load dropdown lists on mount
  useEffect(() => {
    getCustomers('', '', true).then(setCustomers).catch(console.error);
    getUsers().then(setUsersList).catch(console.error);
    getCategories().then(setCategories).catch(console.error);
  }, []);

  // Quick Preset Period Handler
  const applyPreset = (preset: string) => {
    setPresetPeriod(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (preset === 'today') {
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
      setDateFrom(yStr);
      setDateTo(yStr);
    } else if (preset === '7days') {
      const last7 = new Date();
      last7.setDate(last7.getDate() - 6);
      setDateFrom(`${last7.getFullYear()}-${pad(last7.getMonth() + 1)}-${pad(last7.getDate())}`);
      setDateTo(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    } else if (preset === '30days') {
      const last30 = new Date();
      last30.setDate(last30.getDate() - 29);
      setDateFrom(`${last30.getFullYear()}-${pad(last30.getMonth() + 1)}-${pad(last30.getDate())}`);
      setDateTo(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    } else if (preset === 'month') {
      setDateFrom(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      setDateTo(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(`${firstDayLastMonth.getFullYear()}-${pad(firstDayLastMonth.getMonth() + 1)}-01`);
      setDateTo(`${lastDayLastMonth.getFullYear()}-${pad(lastDayLastMonth.getMonth() + 1)}-${pad(lastDayLastMonth.getDate())}`);
    } else if (preset === 'this_year') {
      setDateFrom(`${now.getFullYear()}-01-01`);
      setDateTo(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    } else if (preset === 'all') {
      setDateFrom('2020-01-01');
      setDateTo(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    }
  };

  // Main Fetch Function
  const fetchReportData = async () => {
    setLoading(true);
    const filter = {
      branch_id: branchId,
      date_from: dateFrom ? `${dateFrom} 00:00:00` : undefined,
      date_to: dateTo ? `${dateTo} 23:59:59` : undefined,
      tx_from: txFrom.trim() || undefined,
      tx_to: txTo.trim() || undefined,
      customer_id: selectedCustomerId || undefined,
      user_id: selectedUserId || undefined,
      payment_method: selectedPaymentMethod !== 'all' ? selectedPaymentMethod : undefined,
      category_id: selectedCategoryId || undefined,
      price_type: selectedPriceType !== 'all' ? selectedPriceType : undefined,
    };

    try {
      // Always fetch payment methods breakdown for the timeframe
      getSalesByPaymentMethod(branchId, dateFrom, dateTo)
        .then(setPaymentMethodData)
        .catch(console.error);

      if (activeSubtype === 'recap' || activeSubtype === 'customer') {
        const data = await getSalesRecapReport(filter);
        setRecapData(data);
      } else if (activeSubtype === 'detailed') {
        const data = await getDetailedSalesLines(filter);
        setDetailedData(data);
      } else if (activeSubtype === 'daily') {
        const data = await getDailySalesRecap(filter);
        setDailyData(data);
      } else if (activeSubtype === 'cashier') {
        const data = await getSalesByCashierSummary(filter);
        setCashierData(data);
      } else if (activeSubtype === 'product_margin') {
        const data = await getTopSellingItems(branchId, dateFrom, dateTo, 100);
        setProductMarginData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeSubtype, dateFrom, dateTo, selectedCustomerId, selectedUserId, selectedPaymentMethod, selectedCategoryId, selectedPriceType]);

  // Aggregated KPI Calculations
  const kpi = useMemo(() => {
    if (activeSubtype === 'detailed') {
      const revenue = detailedData.reduce((acc, row) => acc + row.subtotal, 0);
      const discount = detailedData.reduce((acc, row) => acc + row.line_discount, 0);
      const cogs = detailedData.reduce((acc, row) => acc + row.line_cogs, 0);
      const profit = revenue - cogs;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { revenue, discount, cogs, profit, margin, count: detailedData.length };
    } else {
      // Default to recap data
      const revenue = recapData.reduce((acc, row) => acc + row.grand_total, 0);
      const discount = recapData.reduce((acc, row) => acc + row.discount_amount, 0);
      const cogs = recapData.reduce((acc, row) => acc + row.total_cogs, 0);
      const profit = revenue - cogs;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { revenue, discount, cogs, profit, margin, count: recapData.length };
    }
  }, [activeSubtype, recapData, detailedData]);

  // Grouped Customer Data
  const customerGrouped = useMemo(() => {
    const map = new Map<string, { name: string; tier: string; txCount: number; totalSpent: number; totalProfit: number }>();
    for (const r of recapData) {
      const key = r.customer_name;
      if (!map.has(key)) {
        map.set(key, { name: r.customer_name, tier: r.customer_tier, txCount: 0, totalSpent: 0, totalProfit: 0 });
      }
      const entry = map.get(key)!;
      entry.txCount += 1;
      entry.totalSpent += r.grand_total;
      entry.totalProfit += r.gross_profit;
    }
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [recapData]);

  // Export CSV Handler
  const handleExportCsv = () => {
    const filename = `Laporan_Penjualan_${activeSubtype}_${dateFrom}_sd_${dateTo}.csv`;
    if (activeSubtype === 'recap') {
      const headers = ['#', 'No Transaksi', 'Waktu', 'Pelanggan', 'Kasir', 'Total Jual', 'Diskon', 'HPP', 'Laba Kotor', 'Margin (%)', 'Cara Bayar'];
      const rows = recapData.map((r, i) => [
        i + 1, r.transaction_no, r.created_at, r.customer_name, r.cashier_name,
        r.grand_total, r.discount_amount, r.total_cogs, r.gross_profit, r.gross_margin, r.payment_methods
      ]);
      downloadCsv(filename, headers, rows);
    } else if (activeSubtype === 'detailed') {
      const headers = ['#', 'No Transaksi', 'Waktu', 'Pelanggan', 'Kasir', 'SKU', 'Nama Barang', 'Kategori', 'Qty', 'Satuan', 'Harga', 'Diskon', 'Subtotal', 'HPP', 'Laba Baris', 'Cara Bayar'];
      const rows = detailedData.map((r, i) => [
        i + 1, r.transaction_no, r.created_at, r.customer_name, r.cashier_name,
        r.sku, r.item_name, r.category_name, r.qty, r.unit_name, r.price, r.line_discount,
        r.subtotal, r.line_cogs, r.line_profit, r.payment_methods
      ]);
      downloadCsv(filename, headers, rows);
    } else if (activeSubtype === 'daily') {
      const headers = ['Tanggal', 'Jumlah Transaksi', 'Total Tunai', 'Total Non-Tunai', 'Total Omset', 'Diskon', 'HPP', 'Laba Kotor', 'Margin (%)'];
      const rows = dailyData.map(r => [
        r.date_label, r.transaction_count, r.total_cash, r.total_non_cash, r.total_revenue,
        r.total_discount, r.total_cogs, r.gross_profit, r.gross_margin
      ]);
      downloadCsv(filename, headers, rows);
    } else if (activeSubtype === 'cashier') {
      const headers = ['Kasir / Staff', 'Role', 'Jumlah Transaksi', 'Total Tunai', 'Total Non-Tunai', 'Total Penjualan', 'Total Laba'];
      const rows = cashierData.map(r => [
        r.cashier_name, r.role, r.transaction_count, r.total_cash, r.total_non_cash, r.total_revenue, r.gross_profit
      ]);
      downloadCsv(filename, headers, rows);
    } else if (activeSubtype === 'payment_methods') {
      const totalAll = paymentMethodData.reduce((acc, curr) => acc + curr.total_amount, 0);
      const headers = ['#', 'Metode Pembayaran', 'Jumlah Transaksi', 'Total Nominal (Rp)', 'Rata-rata per Transaksi (Rp)', 'Kontribusi (%)'];
      const rows = paymentMethodData.map((r, i) => {
        const m = METHOD_CONFIG[r.method.toLowerCase()]?.label || r.method.toUpperCase();
        const pct = totalAll > 0 ? ((r.total_amount / totalAll) * 100).toFixed(1) : '0';
        const avg = r.transaction_count > 0 ? Math.round(r.total_amount / r.transaction_count) : 0;
        return [i + 1, m, r.transaction_count, r.total_amount, avg, `${pct}%`];
      });
      downloadCsv(filename, headers, rows);
    } else if (activeSubtype === 'customer') {
      const headers = ['Nama Pelanggan', 'Tier', 'Jumlah Transaksi', 'Total Belanja', 'Rata-rata Nota', 'Total Profit'];
      const rows = customerGrouped.map(r => [
        r.name, r.tier, r.txCount, r.totalSpent, r.txCount > 0 ? (r.totalSpent / r.txCount).toFixed(0) : 0, r.totalProfit
      ]);
      downloadCsv(filename, headers, rows);
    } else if (activeSubtype === 'product_margin') {
      const headers = ['#', 'Nama Produk / Obat', 'SKU', 'Kategori', 'Qty Terjual', 'Total Omset', 'Total HPP', 'Margin (%)'];
      const rows = productMarginData.map((r, i) => [
        i + 1, r.item_name, r.sku, r.category_name || '-', r.qty_sold, r.total_revenue, r.total_cogs, r.gross_margin
      ]);
      downloadCsv(filename, headers, rows);
    }
  };

  const SUB_REPORTS = [
    { id: 'recap', label: 'Laporan Penjualan Rekap', desc: 'Ringkasan per Nota Faktur Penjualan' },
    { id: 'detailed', label: 'Laporan Penjualan Detail', desc: 'Rincian setiap baris obat/item terjual' },
    { id: 'payment_methods', label: 'Distribusi Metode Pembayaran', desc: 'Rincian omset per metode: Tunai, QRIS, Transfer, Debit, dll' },
    { id: 'daily', label: 'Laporan Penjualan Harian', desc: 'Agregasi omset, tunai vs non-tunai harian' },
    { id: 'customer', label: 'Laporan Jual Per Pelanggan', desc: 'Frekuensi & total belanja per pelanggan' },
    { id: 'cashier', label: 'Laporan Jual Per Kasir', desc: 'Rekap shift kasir & penerimaan laci kasir' },
    { id: 'product_margin', label: 'Laporan Profit Per Item', desc: 'Peringkat margin laba produk' },
  ];

  return (
    <div className="flex flex-col h-full gap-5 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#0B0F19] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Kembali ke Menu Laporan"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Laporan Penjualan & Analisis Transaksi
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pantau arus kas masuk, distribusi metode pembayaran, laba kotor, dan rincian transaksi kasir
            </p>
          </div>
        </div>

        {/* Export & Print Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <Printer size={15} /> Cetak Laporan
          </button>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Top KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">Total Omset</span>
            <DollarSign size={16} className="text-emerald-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
            Rp {kpi.revenue.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
            {kpi.count} Transaksi
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">Total Diskon</span>
            <Tag size={16} className="text-rose-500" />
          </div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
            Rp {kpi.discount.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
            Potongan Promo & Member
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">Total HPP (Modal)</span>
            <ShoppingCart size={16} className="text-blue-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
            Rp {kpi.cogs.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
            HPP Berjalan Produk
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">Laba Kotor</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
            Rp {kpi.profit.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
            Omset Bersih - HPP
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase">Margin Profit</span>
            <BarChart3 size={16} className="text-purple-500" />
          </div>
          <div className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1">
            {kpi.margin.toFixed(1)}%
          </div>
          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
            Persentase Laba Kotor
          </div>
        </div>
      </div>

      {/* Interactive Quick Payment Method Distribution Bar */}
      <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-brand" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Distribusi Metode Pembayaran
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              ({paymentMethodData.reduce((acc, curr) => acc + curr.transaction_count, 0)} transaksi pada periode terpilih)
            </span>
          </div>
          <button
            onClick={() => setActiveSubtype('payment_methods')}
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
          >
            Buka Laporan Metode Pembayaran <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {paymentMethodData.length === 0 ? (
            <div className="col-span-full text-center py-2 text-xs text-slate-400">
              Belum ada transaksi pembayaran pada rentang tanggal ini.
            </div>
          ) : (
            paymentMethodData.map(p => {
              const m = METHOD_CONFIG[p.method.toLowerCase()] || { 
                label: p.method.toUpperCase(), 
                icon: CreditCard, 
                color: 'bg-slate-500', 
                badgeBg: 'bg-slate-100 dark:bg-slate-800', 
                textCol: 'text-slate-700 dark:text-slate-300' 
              };
              const Icon = m.icon;
              const totalAll = paymentMethodData.reduce((acc, curr) => acc + curr.total_amount, 0);
              const pct = totalAll > 0 ? (p.total_amount / totalAll) * 100 : 0;

              return (
                <div
                  key={p.method}
                  onClick={() => {
                    setSelectedPaymentMethod(p.method);
                    setActiveSubtype('recap');
                  }}
                  className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 hover:border-brand/50 hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-all cursor-pointer group"
                  title={`Klik untuk memfilter faktur dengan cara bayar ${m.label}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-lg ${m.color} flex items-center justify-center shrink-0`}>
                        <Icon size={12} className="text-white" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[80px]">
                        {m.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                    Rp {p.total_amount.toLocaleString('id-ID')}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                    <span>{p.transaction_count} Nota</span>
                    <span className="text-[9px] text-brand opacity-0 group-hover:opacity-100 transition-opacity font-bold">Filter →</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Layout: Left Filter Panel + Right Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left Filter & Sub-Report Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
          {/* Sub-report selector buttons */}
          <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Pilih Format / Jenis Laporan:
            </label>
            <div className="space-y-1.5">
              {SUB_REPORTS.map(sub => {
                const isActive = activeSubtype === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubtype(sub.id as any)}
                    className={`w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-brand text-white shadow-md shadow-brand/20 font-bold'
                        : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <FileText size={16} className={`mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold">{sub.label}</div>
                      <div className={`text-[10px] mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                        {sub.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deep Filter Parameters Box */}
          <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wide">
              <Filter size={15} /> Parameter Filter
            </div>

            {/* Period Quick Presets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Preset Periode Waktu</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'today', label: 'Hari Ini' },
                  { id: 'yesterday', label: 'Kemarin' },
                  { id: '7days', label: '7 Hari' },
                  { id: '30days', label: '30 Hari' },
                  { id: 'month', label: 'Bulan Ini' },
                  { id: 'last_month', label: 'Bulan Lalu' },
                  { id: 'this_year', label: 'Tahun Ini' },
                  { id: 'all', label: 'Semua' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
                      presetPeriod === p.id 
                        ? 'bg-brand text-white shadow-sm' 
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setPresetPeriod('custom'); }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setPresetPeriod('custom'); }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold"
                />
              </div>
            </div>

            {/* Transaction No Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">No. Transaksi Dari</label>
                <input
                  type="text"
                  placeholder="0001/KSR/..."
                  value={txFrom}
                  onChange={e => setTxFrom(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sampai</label>
                <input
                  type="text"
                  placeholder="9999/KSR/..."
                  value={txTo}
                  onChange={e => setTxTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium"
                />
              </div>
            </div>

            {/* Customer Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter Pelanggan</label>
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold"
              >
                <option value="">Semua Pelanggan (Umum & Member)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.customer_tier.toUpperCase()})</option>
                ))}
              </select>
            </div>

            {/* Cashier / User Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter Kasir / User</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold"
              >
                <option value="">Semua Kasir & Staff</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>{u.name || u.username} ({u.role?.toUpperCase() || 'STAFF'})</option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cara Bayar / Modul</label>
              <select
                value={selectedPaymentMethod}
                onChange={e => setSelectedPaymentMethod(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold"
              >
                <option value="all">Semua Metode Pembayaran</option>
                <option value="cash">Tunai (Cash)</option>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer Bank</option>
                <option value="debit">Kartu Debit</option>
                <option value="credit">Kartu Kredit</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kategori Produk</label>
              <select
                value={selectedCategoryId}
                onChange={e => setSelectedCategoryId(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold"
              >
                <option value="">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Price Type Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipe Harga Penjualan</label>
              <select
                value={selectedPriceType}
                onChange={e => setSelectedPriceType(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold"
              >
                <option value="all">Semua Tipe Harga</option>
                <option value="retail">Eceran (Retail)</option>
                <option value="wholesale">Grosir (Wholesale)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Data Table Area (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-brand"></span>
              <span>{SUB_REPORTS.find(s => s.id === activeSubtype)?.label}</span>
              {loading && <Loader2 size={14} className="animate-spin text-brand ml-2" />}
            </div>

            <div className="relative w-64">
              <input
                type="text"
                placeholder="Cari dalam tabel..."
                value={searchTableQuery}
                onChange={e => setSearchTableQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
            </div>
          </div>

          {/* Table Content Switcher */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            {/* 1. REKAP PENJUALAN */}
            {activeSubtype === 'recap' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">No. Transaksi</th>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Kasir</th>
                    <th className="py-3 px-4 text-right">Total Jual</th>
                    <th className="py-3 px-4 text-right">HPP</th>
                    <th className="py-3 px-4 text-right">Laba Kotor</th>
                    <th className="py-3 px-4 text-center">Bayar</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recapData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-slate-400">
                        Tidak ada transaksi penjualan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    recapData
                      .filter(r => !searchTableQuery || r.transaction_no.toLowerCase().includes(searchTableQuery.toLowerCase()) || r.customer_name.toLowerCase().includes(searchTableQuery.toLowerCase()))
                      .map((row) => (
                        <tr key={row.sale_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(row.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-mono">
                            {row.transaction_no}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {row.customer_name}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {row.cashier_name}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                            Rp {row.grand_total.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 font-medium">
                            Rp {row.total_cogs.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            Rp {row.gross_profit.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {row.payment_methods}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setSelectedSaleId(row.sale_id)}
                              className="p-1 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                              title="Lihat Struk Detail"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            )}

            {/* 2. DETAIL PENJUALAN (PER ITEM) */}
            {activeSubtype === 'detailed' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3">No. Nota</th>
                    <th className="py-3 px-3">Nama Produk / Obat</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3 text-right">Harga Jual</th>
                    <th className="py-3 px-3 text-right">Subtotal</th>
                    <th className="py-3 px-3 text-right">HPP</th>
                    <th className="py-3 px-3 text-right">Laba Baris</th>
                    <th className="py-3 px-3 text-center">Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {detailedData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-slate-400">
                        Tidak ada rincian item penjualan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    detailedData
                      .filter(r => !searchTableQuery || r.item_name.toLowerCase().includes(searchTableQuery.toLowerCase()) || r.transaction_no.toLowerCase().includes(searchTableQuery.toLowerCase()))
                      .map((row) => (
                        <tr key={row.line_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-600 dark:text-slate-400">
                            {row.transaction_no}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            {row.item_name}
                            <span className="block text-[10px] font-normal text-slate-400">SKU: {row.sku}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {row.category_name}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                            {row.qty} {row.unit_name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                            Rp {row.price.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                            Rp {row.subtotal.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500 font-medium">
                            Rp {row.line_cogs.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            Rp {row.line_profit.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {row.payment_methods}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            )}

            {/* 3. DISTRIBUSI METODE PEMBAYARAN */}
            {activeSubtype === 'payment_methods' && (
              <div className="p-5 flex flex-col gap-6">
                {paymentMethodData.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    Tidak ada data transaksi pembayaran pada periode ini.
                  </div>
                ) : (
                  <>
                    {/* Method Distribution Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {paymentMethodData.map(r => {
                        const m = METHOD_CONFIG[r.method.toLowerCase()] || { 
                          label: r.method.toUpperCase(), 
                          icon: CreditCard, 
                          color: 'bg-slate-500', 
                          badgeBg: 'bg-slate-100 dark:bg-slate-800', 
                          textCol: 'text-slate-700 dark:text-slate-300' 
                        };
                        const Icon = m.icon;
                        const totalAll = paymentMethodData.reduce((acc, curr) => acc + curr.total_amount, 0);
                        const pct = totalAll > 0 ? (r.total_amount / totalAll * 100) : 0;
                        const avgPerNota = r.transaction_count > 0 ? Math.round(r.total_amount / r.transaction_count) : 0;

                        return (
                          <div key={r.method} className="bg-slate-50/60 dark:bg-[#080B12] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between shadow-sm">
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-11 h-11 rounded-2xl ${m.color} flex items-center justify-center shadow-md shadow-slate-900/10`}>
                                    <Icon size={20} className="text-white"/>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{m.label}</p>
                                    <p className="text-xs text-slate-500">{r.transaction_count} transaksi faktur</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-base font-extrabold text-slate-900 dark:text-white">
                                    Rp {r.total_amount.toLocaleString('id-ID')}
                                  </p>
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand/10 text-brand mt-0.5">
                                    {pct.toFixed(1)}% Kontribusi
                                  </span>
                                </div>
                              </div>

                              <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                                <div 
                                  className={`h-full ${m.color} rounded-full transition-all duration-500`} 
                                  style={{ width: `${pct}%` }} 
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500">
                              <span>Rata-rata per Nota:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                Rp {avgPerNota.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed Table for Payment Methods */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100/70 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                          <tr>
                            <th className="py-3 px-4">#</th>
                            <th className="py-3 px-4">Metode Pembayaran</th>
                            <th className="py-3 px-4 text-center">Jumlah Nota</th>
                            <th className="py-3 px-4 text-right">Rata-rata Nota</th>
                            <th className="py-3 px-4 text-right">Total Penerimaan (Omset)</th>
                            <th className="py-3 px-4 text-center">Porsi (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {paymentMethodData.map((row, idx) => {
                            const m = METHOD_CONFIG[row.method.toLowerCase()] || { 
                              label: row.method.toUpperCase(), 
                              icon: CreditCard, 
                              color: 'bg-slate-500', 
                              badgeBg: 'bg-slate-100 dark:bg-slate-800', 
                              textCol: 'text-slate-700 dark:text-slate-300' 
                            };
                            const totalAll = paymentMethodData.reduce((acc, curr) => acc + curr.total_amount, 0);
                            const pct = totalAll > 0 ? (row.total_amount / totalAll * 100) : 0;
                            const avgPerNota = row.transaction_count > 0 ? Math.round(row.total_amount / row.transaction_count) : 0;

                            return (
                              <tr key={row.method} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                                <td className="py-3 px-4 font-mono text-slate-400 font-bold">{idx + 1}</td>
                                <td className="py-3 px-4">
                                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${m.color}`}></span>
                                    {m.label}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                                  {row.transaction_count}
                                </td>
                                <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 font-medium">
                                  Rp {avgPerNota.toLocaleString('id-ID')}
                                </td>
                                <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                                  Rp {row.total_amount.toLocaleString('id-ID')}
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-brand">
                                  {pct.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 4. PENJUALAN HARIAN */}
            {activeSubtype === 'daily' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="py-3.5 px-4">Tanggal</th>
                    <th className="py-3.5 px-4 text-center">Jumlah Nota</th>
                    <th className="py-3.5 px-4 text-right">Tunai (Cash)</th>
                    <th className="py-3.5 px-4 text-right">Non-Tunai (QRIS/Trf)</th>
                    <th className="py-3.5 px-4 text-right">Total Omset</th>
                    <th className="py-3.5 px-4 text-right">HPP</th>
                    <th className="py-3.5 px-4 text-right">Laba Kotor</th>
                    <th className="py-3.5 px-4 text-center">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {dailyData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-400">
                        Tidak ada data harian pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    dailyData.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {row.date_label}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {row.transaction_count}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                          Rp {row.total_cash.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                          Rp {row.total_non_cash.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          Rp {row.total_revenue.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-medium">
                          Rp {row.total_cogs.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          Rp {row.gross_profit.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-purple-600 dark:text-purple-400">
                          {row.gross_margin.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 4. PER PELANGGAN */}
            {activeSubtype === 'customer' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="py-3.5 px-4">Nama Pelanggan</th>
                    <th className="py-3.5 px-4">Tier Membership</th>
                    <th className="py-3.5 px-4 text-center">Jumlah Transaksi</th>
                    <th className="py-3.5 px-4 text-right">Total Belanja</th>
                    <th className="py-3.5 px-4 text-right">Rata-rata Nota</th>
                    <th className="py-3.5 px-4 text-right">Kontribusi Laba</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {customerGrouped.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-400">
                        Tidak ada riwayat transaksi pelanggan.
                      </td>
                    </tr>
                  ) : (
                    customerGrouped.map((row) => (
                      <tr key={row.name} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {row.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                            {row.tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {row.txCount}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          Rp {row.totalSpent.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400">
                          Rp {row.txCount > 0 ? Math.round(row.totalSpent / row.txCount).toLocaleString('id-ID') : 0}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          Rp {row.totalProfit.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 5. PER KASIR */}
            {activeSubtype === 'cashier' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="py-3.5 px-4">Nama Kasir / Staff</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4 text-center">Jumlah Nota</th>
                    <th className="py-3.5 px-4 text-right">Uang Tunai (Laci)</th>
                    <th className="py-3.5 px-4 text-right">Non-Tunai (QRIS/Trf)</th>
                    <th className="py-3.5 px-4 text-right">Total Penjualan</th>
                    <th className="py-3.5 px-4 text-right">Total Laba</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {cashierData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-400">
                        Tidak ada data kinerja kasir pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    cashierData.map((row) => (
                      <tr key={row.user_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {row.cashier_name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {row.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {row.transaction_count}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          Rp {row.total_cash.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-blue-600 dark:text-blue-400">
                          Rp {row.total_non_cash.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          Rp {row.total_revenue.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          Rp {row.gross_profit.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 6. PROFIT MARGIN PER ITEM */}
            {activeSubtype === 'product_margin' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="py-3.5 px-4">#</th>
                    <th className="py-3.5 px-4">Nama Produk / Obat</th>
                    <th className="py-3.5 px-4">Kategori</th>
                    <th className="py-3.5 px-4 text-center">Qty Terjual</th>
                    <th className="py-3.5 px-4 text-right">Total Omset</th>
                    <th className="py-3.5 px-4 text-right">Total HPP</th>
                    <th className="py-3.5 px-4 text-right">Margin (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {productMarginData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-400">
                        Tidak ada data penjualan produk pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    productMarginData.map((row, idx) => (
                      <tr key={row.sku} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {row.item_name}
                          <span className="block text-[10px] font-normal text-slate-400">SKU: {row.sku}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {row.category_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {row.qty_sold}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          Rp {row.total_revenue.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-medium">
                          Rp {row.total_cogs.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {row.gross_margin.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Sale Detail Receipt Modal */}
      {selectedSaleId && (
        <SaleDetailModal
          saleId={selectedSaleId}
          onClose={() => setSelectedSaleId(null)}
        />
      )}

      {/* Print Official Report Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={SUB_REPORTS.find(s => s.id === activeSubtype)?.label || 'Laporan Penjualan'}
        periodLabel={`${dateFrom} s/d ${dateTo}`}
        filterDetails={[
          { label: 'Cara Bayar', value: selectedPaymentMethod.toUpperCase() },
          { label: 'Kasir', value: selectedUserId ? 'Filter Tertentu' : 'Semua Kasir' },
          { label: 'Pelanggan', value: selectedCustomerId ? 'Filter Tertentu' : 'Semua Pelanggan' },
        ]}
        columns={
          activeSubtype === 'detailed'
            ? [
                { header: 'No. Nota', accessor: r => r.transaction_no },
                { header: 'Nama Produk', accessor: r => r.item_name },
                { header: 'Qty', accessor: r => `${r.qty} ${r.unit_name}`, align: 'center' },
                { header: 'Harga', accessor: r => `Rp ${r.price.toLocaleString('id-ID')}`, align: 'right' },
                { header: 'Subtotal', accessor: r => `Rp ${r.subtotal.toLocaleString('id-ID')}`, align: 'right' },
                { header: 'Laba', accessor: r => `Rp ${r.line_profit.toLocaleString('id-ID')}`, align: 'right' },
              ]
            : [
                { header: 'No. Transaksi', accessor: r => r.transaction_no },
                { header: 'Waktu', accessor: r => new Date(r.created_at).toLocaleDateString('id-ID') },
                { header: 'Pelanggan', accessor: r => r.customer_name },
                { header: 'Total Belanja', accessor: r => `Rp ${r.grand_total.toLocaleString('id-ID')}`, align: 'right' },
                { header: 'HPP', accessor: r => `Rp ${r.total_cogs.toLocaleString('id-ID')}`, align: 'right' },
                { header: 'Laba Kotor', accessor: r => `Rp ${r.gross_profit.toLocaleString('id-ID')}`, align: 'right' },
                { header: 'Bayar', accessor: r => r.payment_methods.toUpperCase(), align: 'center' },
              ]
        }
        data={activeSubtype === 'detailed' ? detailedData : recapData}
        summaryItems={[
          { label: 'Total Omset', value: `Rp ${kpi.revenue.toLocaleString('id-ID')}`, isHighlight: true },
          { label: 'Total Diskon', value: `Rp ${kpi.discount.toLocaleString('id-ID')}` },
          { label: 'Total HPP', value: `Rp ${kpi.cogs.toLocaleString('id-ID')}` },
          { label: 'Total Laba Kotor', value: `Rp ${kpi.profit.toLocaleString('id-ID')}`, isHighlight: true },
        ]}
      />
    </div>
  );
}
