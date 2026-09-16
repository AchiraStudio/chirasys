import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Loader2, TrendingUp, ShoppingCart, Tag, DollarSign, 
  FileText, Filter, Printer, Download, Eye, Search,
  RefreshCw, BarChart3, CreditCard, Banknote, Smartphone, ArrowRightLeft,
  ChevronDown, ChevronUp, X, RotateCcw
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
import Select from '../../components/ui/Select';

interface Props { 
  onBack: () => void; 
  initialSubtype?: ReportSubtype;
}

type ReportSubtype = 'recap' | 'detailed' | 'daily' | 'payment_methods' | 'customer' | 'cashier' | 'product_margin';

const METHOD_CONFIG: Record<string, { label: string; icon: any; color: string; badgeBg: string; textCol: string }> = {
  cash:     { label: 'Tunai (Cash)',       icon: Banknote,       color: 'bg-emerald-500', badgeBg: 'bg-emerald-500/10', textCol: 'text-emerald-500' },
  transfer: { label: 'Transfer Bank',      icon: ArrowRightLeft, color: 'bg-blue-500',    badgeBg: 'bg-blue-500/10',    textCol: 'text-blue-500' },
  debit:    { label: 'Kartu Debit / EDC',  icon: CreditCard,     color: 'bg-indigo-500',  badgeBg: 'bg-indigo-500/10',  textCol: 'text-indigo-500' },
  credit:   { label: 'Kartu Kredit',       icon: CreditCard,     color: 'bg-purple-500',  badgeBg: 'bg-purple-500/10',  textCol: 'text-purple-500' },
  qris:     { label: 'QRIS / E-Wallet',    icon: Smartphone,     color: 'bg-amber-500',   badgeBg: 'bg-amber-500/10',   textCol: 'text-amber-500' },
  card:     { label: 'Kartu EDC',          icon: CreditCard,     color: 'bg-indigo-500',  badgeBg: 'bg-indigo-500/10',  textCol: 'text-indigo-500' },
  tempo:    { label: 'Tempo / Piutang',    icon: FileText,       color: 'bg-rose-500',    badgeBg: 'bg-rose-500/10',    textCol: 'text-rose-500' },
};

const SUB_REPORTS: { id: ReportSubtype; label: string; desc: string }[] = [
  { id: 'recap', label: 'Rekap Faktur', desc: 'Ringkasan per nota faktur penjualan' },
  { id: 'detailed', label: 'Rincian Item', desc: 'Detail setiap baris produk terjual' },
  { id: 'payment_methods', label: 'Metode Bayar', desc: 'Distribusi omset per cara pembayaran' },
  { id: 'daily', label: 'Penjualan Harian', desc: 'Agregasi omset dan laba per hari' },
  { id: 'customer', label: 'Per Pelanggan', desc: 'Frekuensi & total belanja pelanggan' },
  { id: 'cashier', label: 'Per Kasir', desc: 'Rekap penjualan & laci per kasir' },
  { id: 'product_margin', label: 'Profit Per Item', desc: 'Peringkat margin laba produk' },
];

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

  // Expandable Advanced Filters Panel
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

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

  // Count active advanced filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCustomerId) count++;
    if (selectedUserId) count++;
    if (selectedPaymentMethod !== 'all') count++;
    if (selectedCategoryId) count++;
    if (selectedPriceType !== 'all') count++;
    if (txFrom.trim()) count++;
    if (txTo.trim()) count++;
    return count;
  }, [selectedCustomerId, selectedUserId, selectedPaymentMethod, selectedCategoryId, selectedPriceType, txFrom, txTo]);

  const resetFilters = () => {
    setSelectedCustomerId('');
    setSelectedUserId('');
    setSelectedPaymentMethod('all');
    setSelectedCategoryId('');
    setSelectedPriceType('all');
    setTxFrom('');
    setTxTo('');
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
      // Fetch payment methods breakdown for the timeframe
      getSalesByPaymentMethod(branchId, dateFrom, dateTo)
        .then(setPaymentMethodData)
        .catch(console.error);

      if (activeSubtype === 'detailed') {
        const data = await getDetailedSalesLines(filter);
        setDetailedData(data);
      } else {
        // Always fetch recap to provide stable KPI numbers and customer grouping
        const recapPromise = getSalesRecapReport(filter).then(setRecapData);
        if (activeSubtype === 'daily') {
          const data = await getDailySalesRecap(filter);
          setDailyData(data);
        } else if (activeSubtype === 'cashier') {
          const data = await getSalesByCashierSummary(filter);
          setCashierData(data);
        } else if (activeSubtype === 'product_margin') {
          const data = await getTopSellingItems(branchId, dateFrom, dateTo, 100);
          setProductMarginData(data);
        }
        await recapPromise;
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

  return (
    <div className="flex flex-col h-full gap-4 animate-fade-in">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card px-4 py-3 rounded-xl border border-line">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-muted text-body hover:text-heading hover:bg-line transition-colors"
            title="Kembali ke Menu Laporan"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-bold text-heading tracking-tight flex items-center gap-2">
              Laporan Penjualan & Analisis
            </h1>
            <p className="text-xs text-dim">
              Ringkasan omset, laba kotor, metode pembayaran, dan rincian transaksi kasir
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="p-2 bg-muted text-body hover:text-heading hover:bg-line rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3 py-2 bg-muted hover:bg-line text-body hover:text-heading rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <Printer size={14} /> Cetak
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-primary text-white hover:bg-primary-hover rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* 2. Top KPI Metric Cards (Compact 5-Metric Strip) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card px-4 py-3 rounded-xl border border-line flex flex-col justify-between">
          <div className="flex items-center justify-between text-dim">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Omset</span>
            <DollarSign size={14} className="text-primary" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-heading">
              Rp {kpi.revenue.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="text-[10px] text-dim font-medium mt-0.5">
            {kpi.count.toLocaleString('id-ID')} {activeSubtype === 'detailed' ? 'Item' : 'Transaksi'}
          </div>
        </div>

        <div className="bg-card px-4 py-3 rounded-xl border border-line flex flex-col justify-between">
          <div className="flex items-center justify-between text-dim">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Diskon</span>
            <Tag size={14} className="text-danger" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-danger">
              Rp {kpi.discount.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="text-[10px] text-dim font-medium mt-0.5">
            Potongan Promo & Member
          </div>
        </div>

        <div className="bg-card px-4 py-3 rounded-xl border border-line flex flex-col justify-between">
          <div className="flex items-center justify-between text-dim">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Modal (HPP)</span>
            <ShoppingCart size={14} className="text-dim" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-heading">
              Rp {kpi.cogs.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="text-[10px] text-dim font-medium mt-0.5">
            HPP Berjalan Produk
          </div>
        </div>

        <div className="bg-card px-4 py-3 rounded-xl border border-line flex flex-col justify-between">
          <div className="flex items-center justify-between text-dim">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Laba Kotor</span>
            <TrendingUp size={14} className="text-success" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-success">
              Rp {kpi.profit.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="text-[10px] text-dim font-medium mt-0.5">
            Omset Bersih - HPP
          </div>
        </div>

        <div className="bg-card px-4 py-3 rounded-xl border border-line flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-dim">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Margin Laba</span>
            <BarChart3 size={14} className="text-primary" />
          </div>
          <div className="mt-1">
            <span className="text-base font-bold text-primary">
              {kpi.margin.toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] text-dim font-medium mt-0.5">
            Persentase Laba Kotor
          </div>
        </div>
      </div>

      {/* 3. Horizontal Sub-Reports Tab Strip */}
      <div className="bg-card p-1.5 rounded-xl border border-line flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {SUB_REPORTS.map(sub => {
          const isActive = activeSubtype === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubtype(sub.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-primary text-white font-semibold shadow-xs'
                  : 'text-body hover:text-heading hover:bg-muted'
              }`}
              title={sub.desc}
            >
              <FileText size={13} className={isActive ? 'text-white' : 'text-dim'} />
              <span>{sub.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Filter Toolbar & Search Bar */}
      <div className="bg-card p-3 rounded-xl border border-line flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Preset Buttons & Date Picker */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg">
              {[
                { id: 'today', label: 'Hari Ini' },
                { id: '7days', label: '7 Hari' },
                { id: 'month', label: 'Bulan Ini' },
                { id: 'this_year', label: 'Tahun Ini' },
                { id: 'all', label: 'Semua' },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    presetPeriod === p.id 
                      ? 'bg-card text-heading font-semibold shadow-xs' 
                      : 'text-dim hover:text-heading'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center gap-1.5 text-xs text-dim">
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPresetPeriod('custom'); }}
                className="px-2 py-1 bg-muted border border-line rounded-lg text-heading text-xs font-medium focus:outline-none focus:border-primary"
              />
              <span>s/d</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPresetPeriod('custom'); }}
                className="px-2 py-1 bg-muted border border-line rounded-lg text-heading text-xs font-medium focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Search & Advanced Filters Toggle */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                placeholder="Cari tabel..."
                value={searchTableQuery}
                onChange={e => setSearchTableQuery(e.target.value)}
                className="w-full pl-7 pr-7 py-1 bg-muted border border-line rounded-lg text-heading text-xs font-medium focus:outline-none focus:border-primary"
              />
              <Search className="absolute left-2 top-2 text-dim" size={12} />
              {searchTableQuery && (
                <button
                  onClick={() => setSearchTableQuery('')}
                  className="absolute right-2 top-2 text-dim hover:text-heading"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                showAdvancedFilters || activeFilterCount > 0
                  ? 'bg-primary-soft text-primary border-primary/30'
                  : 'bg-muted text-body border-line hover:text-heading hover:bg-line'
              }`}
            >
              <Filter size={12} />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              {showAdvancedFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 animate-fade-in">
            {/* Customer Filter */}
            <div>
              <label className="block text-[10px] font-semibold text-dim uppercase mb-1">Pelanggan</label>
              <Select
                value={selectedCustomerId}
                onChange={v => setSelectedCustomerId(v)}
                className="w-full text-xs"
              >
                <option value="">Semua Pelanggan</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            {/* Cashier Filter */}
            <div>
              <label className="block text-[10px] font-semibold text-dim uppercase mb-1">Kasir / User</label>
              <Select
                value={selectedUserId}
                onChange={v => setSelectedUserId(v)}
                className="w-full text-xs"
              >
                <option value="">Semua Kasir</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>{u.name || u.username}</option>
                ))}
              </Select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-[10px] font-semibold text-dim uppercase mb-1">Metode Bayar</label>
              <Select
                value={selectedPaymentMethod}
                onChange={v => setSelectedPaymentMethod(v)}
                className="w-full text-xs"
              >
                <option value="all">Semua Metode</option>
                <option value="cash">Tunai (Cash)</option>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer Bank</option>
                <option value="debit">Kartu Debit</option>
                <option value="credit">Kartu Kredit</option>
              </Select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[10px] font-semibold text-dim uppercase mb-1">Kategori Produk</label>
              <Select
                value={selectedCategoryId}
                onChange={v => setSelectedCategoryId(v)}
                className="w-full text-xs"
              >
                <option value="">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            {/* Price Type Filter */}
            <div>
              <label className="block text-[10px] font-semibold text-dim uppercase mb-1">Tipe Harga</label>
              <Select
                value={selectedPriceType}
                onChange={v => setSelectedPriceType(v)}
                className="w-full text-xs"
              >
                <option value="all">Semua Tipe</option>
                <option value="retail">Eceran (Retail)</option>
                <option value="wholesale">Grosir (Wholesale)</option>
              </Select>
            </div>

            {/* Reset Action */}
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-line bg-muted hover:bg-line text-body disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw size={12} /> Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Full Width Data Table Area */}
      <div className="flex-1 min-h-0 bg-card rounded-xl border border-line flex flex-col overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-4 py-2.5 border-b border-line flex items-center justify-between gap-3 bg-muted/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-heading">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <span>{SUB_REPORTS.find(s => s.id === activeSubtype)?.label}</span>
            {loading && <Loader2 size={13} className="animate-spin text-primary ml-1" />}
          </div>

          <div className="text-[11px] text-dim font-medium">
            {activeSubtype === 'recap' && `${recapData.length} Faktur`}
            {activeSubtype === 'detailed' && `${detailedData.length} Baris Produk`}
            {activeSubtype === 'payment_methods' && `${paymentMethodData.length} Metode Bayar`}
            {activeSubtype === 'daily' && `${dailyData.length} Hari`}
            {activeSubtype === 'customer' && `${customerGrouped.length} Pelanggan`}
            {activeSubtype === 'cashier' && `${cashierData.length} Kasir`}
            {activeSubtype === 'product_margin' && `${productMarginData.length} Produk`}
          </div>
        </div>

        {/* Table Body Content */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {/* SUB-REPORT 1: REKAP FAKTUR */}
          {activeSubtype === 'recap' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/70 border-b border-line text-[11px] font-semibold uppercase text-dim sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-4">No. Transaksi</th>
                  <th className="py-2.5 px-4">Pelanggan</th>
                  <th className="py-2.5 px-4">Kasir</th>
                  <th className="py-2.5 px-4 text-right">Total Jual</th>
                  <th className="py-2.5 px-4 text-right">HPP</th>
                  <th className="py-2.5 px-4 text-right">Laba Kotor</th>
                  <th className="py-2.5 px-4 text-center">Bayar</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recapData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-dim">
                      Tidak ada transaksi penjualan pada periode ini.
                    </td>
                  </tr>
                ) : (
                  recapData
                    .filter(r => !searchTableQuery || r.transaction_no.toLowerCase().includes(searchTableQuery.toLowerCase()) || r.customer_name.toLowerCase().includes(searchTableQuery.toLowerCase()))
                    .map((row) => (
                      <tr key={row.sale_id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 px-4 text-dim font-mono text-[11px]">
                          {new Date(row.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-heading font-mono">
                          {row.transaction_no}
                        </td>
                        <td className="py-2.5 px-4 text-heading">
                          {row.customer_name}
                        </td>
                        <td className="py-2.5 px-4 text-body">
                          {row.cashier_name}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-heading">
                          Rp {row.grand_total.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right text-dim font-medium">
                          Rp {row.total_cogs.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-success">
                          Rp {row.gross_profit.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-body">
                            {row.payment_methods}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => setSelectedSaleId(row.sale_id)}
                            className="p-1 text-dim hover:text-primary hover:bg-primary-soft rounded-md transition-colors"
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

          {/* SUB-REPORT 2: RINCIAN ITEM */}
          {activeSubtype === 'detailed' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/70 border-b border-line text-[11px] font-semibold uppercase text-dim sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">No. Nota</th>
                  <th className="py-2.5 px-3">Nama Produk / Obat</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Harga Jual</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 text-right">HPP</th>
                  <th className="py-2.5 px-3 text-right">Laba Baris</th>
                  <th className="py-2.5 px-3 text-center">Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {detailedData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-dim">
                      Tidak ada rincian item penjualan pada periode ini.
                    </td>
                  </tr>
                ) : (
                  detailedData
                    .filter(r => !searchTableQuery || r.item_name.toLowerCase().includes(searchTableQuery.toLowerCase()) || r.transaction_no.toLowerCase().includes(searchTableQuery.toLowerCase()))
                    .map((row) => (
                      <tr key={row.line_id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 font-mono text-body">
                          {row.transaction_no}
                        </td>
                        <td className="py-2 px-3 font-medium text-heading">
                          {row.item_name}
                          <span className="block text-[10px] text-dim">SKU: {row.sku}</span>
                        </td>
                        <td className="py-2 px-3 text-dim text-[11px]">
                          {row.category_name || '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-heading">
                          {row.qty} {row.unit_name}
                        </td>
                        <td className="py-2 px-3 text-right text-heading">
                          Rp {row.price.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-heading">
                          Rp {row.subtotal.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3 text-right text-dim font-medium">
                          Rp {row.line_cogs.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-success">
                          Rp {row.line_profit.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-body">
                            {row.payment_methods}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          )}

          {/* SUB-REPORT 3: DISTRIBUSI METODE PEMBAYARAN */}
          {activeSubtype === 'payment_methods' && (
            <div className="p-4 flex flex-col gap-5">
              {paymentMethodData.length === 0 ? (
                <div className="text-center py-16 text-dim">
                  Tidak ada data transaksi pembayaran pada periode ini.
                </div>
              ) : (
                <>
                  {/* Modern Method Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {paymentMethodData.map(r => {
                      const m = METHOD_CONFIG[r.method.toLowerCase()] || { 
                        label: r.method.toUpperCase(), 
                        icon: CreditCard, 
                        color: 'bg-dim', 
                        badgeBg: 'bg-muted', 
                        textCol: 'text-heading' 
                      };
                      const Icon = m.icon;
                      const totalAll = paymentMethodData.reduce((acc, curr) => acc + curr.total_amount, 0);
                      const pct = totalAll > 0 ? (r.total_amount / totalAll * 100) : 0;
                      const avgPerNota = r.transaction_count > 0 ? Math.round(r.total_amount / r.transaction_count) : 0;

                      return (
                        <div key={r.method} className="bg-card rounded-xl border border-line p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg ${m.color} flex items-center justify-center shrink-0`}>
                                  <Icon size={16} className="text-white" />
                                </div>
                                <div>
                                  <p className="font-bold text-heading text-xs">{m.label}</p>
                                  <p className="text-[11px] text-dim">{r.transaction_count} transaksi</p>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-soft text-primary">
                                {pct.toFixed(1)}%
                              </span>
                            </div>

                            <div className="text-base font-bold text-heading mb-2">
                              Rp {r.total_amount.toLocaleString('id-ID')}
                            </div>

                            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                              <div 
                                className={`h-full ${m.color} rounded-full transition-all duration-500`} 
                                style={{ width: `${pct}%` }} 
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-line text-[11px] text-dim">
                            <span>Rata-rata / Nota:</span>
                            <span className="font-semibold text-heading">
                              Rp {avgPerNota.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Table */}
                  <div className="rounded-xl border border-line overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-muted/70 border-b border-line text-[11px] font-semibold uppercase text-dim">
                        <tr>
                          <th className="py-2.5 px-4">#</th>
                          <th className="py-2.5 px-4">Metode Pembayaran</th>
                          <th className="py-2.5 px-4 text-center">Jumlah Nota</th>
                          <th className="py-2.5 px-4 text-right">Rata-rata Nota</th>
                          <th className="py-2.5 px-4 text-right">Total Nominal</th>
                          <th className="py-2.5 px-4 text-center">Porsi (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {paymentMethodData
                          .filter(r => !searchTableQuery || r.method.toLowerCase().includes(searchTableQuery.toLowerCase()))
                          .map((row, idx) => {
                            const m = METHOD_CONFIG[row.method.toLowerCase()] || { 
                              label: row.method.toUpperCase(), 
                              color: 'bg-dim'
                            };
                            const totalAll = paymentMethodData.reduce((acc, curr) => acc + curr.total_amount, 0);
                            const pct = totalAll > 0 ? (row.total_amount / totalAll * 100) : 0;
                            const avgPerNota = row.transaction_count > 0 ? Math.round(row.total_amount / row.transaction_count) : 0;

                            return (
                              <tr key={row.method} className="hover:bg-muted/50 transition-colors">
                                <td className="py-2.5 px-4 font-mono text-dim">{idx + 1}</td>
                                <td className="py-2.5 px-4 font-medium text-heading">
                                  <span className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${m.color}`}></span>
                                    {m.label}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-center font-medium text-heading">
                                  {row.transaction_count}
                                </td>
                                <td className="py-2.5 px-4 text-right text-body">
                                  Rp {avgPerNota.toLocaleString('id-ID')}
                                </td>
                                <td className="py-2.5 px-4 text-right font-bold text-heading">
                                  Rp {row.total_amount.toLocaleString('id-ID')}
                                </td>
                                <td className="py-2.5 px-4 text-center font-bold text-primary">
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

          {/* SUB-REPORT 4: PENJUALAN HARIAN */}
          {activeSubtype === 'daily' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/70 border-b border-line text-[11px] font-semibold uppercase text-dim sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4">Tanggal</th>
                  <th className="py-2.5 px-4 text-center">Jumlah Nota</th>
                  <th className="py-2.5 px-4 text-right">Tunai (Cash)</th>
                  <th className="py-2.5 px-4 text-right">Non-Tunai</th>
                  <th className="py-2.5 px-4 text-right">Total Omset</th>
                  <th className="py-2.5 px-4 text-right">HPP</th>
                  <th className="py-2.5 px-4 text-right">Laba Kotor</th>
                  <th className="py-2.5 px-4 text-center">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dailyData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-dim">
                      Tidak ada data harian pada periode ini.
                    </td>
                  </tr>
                ) : (
                  dailyData
                    .filter(r => !searchTableQuery || r.date_label.toLowerCase().includes(searchTableQuery.toLowerCase()))
                    .map((row) => (
                      <tr key={row.date} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-heading">
                          {row.date_label}
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-heading">
                          {row.transaction_count}
                        </td>
                        <td className="py-2.5 px-4 text-right text-heading">
                          Rp {row.total_cash.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right text-heading">
                          Rp {row.total_non_cash.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-heading">
                          Rp {row.total_revenue.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right text-dim font-medium">
                          Rp {row.total_cogs.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-success">
                          Rp {row.gross_profit.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-primary">
                          {row.gross_margin.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          )}

          {/* SUB-REPORT 5: PER PELANGGAN */}
          {activeSubtype === 'customer' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/70 border-b border-line text-[11px] font-semibold uppercase text-dim sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4">Nama Pelanggan</th>
                  <th className="py-2.5 px-4">Tier Membership</th>
                  <th className="py-2.5 px-4 text-center">Jumlah Transaksi</th>
                  <th className="py-2.5 px-4 text-right">Total Belanja</th>
                  <th className="py-2.5 px-4 text-right">Rata-rata Nota</th>
                  <th className="py-2.5 px-4 text-right">Kontribusi Laba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {customerGrouped.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-dim">
                      Tidak ada riwayat transaksi pelanggan pada periode ini.
                    </td>
                  </tr>
                ) : (
                  customerGrouped
                    .filter(r => !searchTableQuery || r.name.toLowerCase().includes(searchTableQuery.toLowerCase()))
                    .map((row) => (
                      <tr key={row.name} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-heading">
                          {row.name}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary-soft text-primary">
                            {row.tier}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-heading">
                          {row.txCount}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-heading">
                          Rp {row.totalSpent.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right text-body">
                          Rp {row.txCount > 0 ? Math.round(row.totalSpent / row.txCount).toLocaleString('id-ID') : 0}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-success">
                          Rp {row.totalProfit.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          )}

          {/* SUB-REPORT 6: PER KASIR */}
          {activeSubtype === 'cashier' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/70 border-b border-line text-[11px] font-semibold uppercase text-dim sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4">Nama Kasir / Staff</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4 text-center">Jumlah Nota</th>
                  <th className="py-2.5 px-4 text-right">Uang Tunai (Laci)</th>
                  <th className="py-2.5 px-4 text-right">Non-Tunai</th>
                  <th className="py-2.5 px-4 text-right">Total Penjualan</th>
                  <th className="py-2.5 px-4 text-right">Total Laba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cashierData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-dim">
                      Tidak ada data kinerja kasir pada periode ini.
                    </td>
                  </tr>
                ) : (
                  cashierData
                    .filter(r => !searchTableQuery || r.cashier_name.toLowerCase().includes(searchTableQuery.toLowerCase()) || r.role.toLowerCase().includes(searchTableQuery.toLowerCase()))
                    .map((row) => (
                      <tr key={row.user_id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-heading">
                          {row.cashier_name}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-muted text-body">
                            {row.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-heading">
                          {row.transaction_count}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-success">
                          Rp {row.total_cash.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-heading">
                          Rp {row.total_non_cash.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-heading">
                          Rp {row.total_revenue.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-success">
                          Rp {row.gross_profit.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          )}

          {/* SUB-REPORT 7: PROFIT MARGIN PER ITEM */}
          {activeSubtype === 'product_margin' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/70 border-b border-line text-[11px] font-semibold uppercase text-dim sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Nama Produk / Obat</th>
                  <th className="py-2.5 px-4">Kategori</th>
                  <th className="py-2.5 px-4 text-center">Qty Terjual</th>
                  <th className="py-2.5 px-4 text-right">Total Omset</th>
                  <th className="py-2.5 px-4 text-right">Total HPP</th>
                  <th className="py-2.5 px-4 text-right">Margin (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {productMarginData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-dim">
                      Tidak ada data penjualan produk pada periode ini.
                    </td>
                  </tr>
                ) : (
                  productMarginData
                    .filter(r => !searchTableQuery || r.item_name.toLowerCase().includes(searchTableQuery.toLowerCase()) || r.sku.toLowerCase().includes(searchTableQuery.toLowerCase()))
                    .map((row, idx) => (
                      <tr key={row.sku} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-dim">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-medium text-heading">
                          {row.item_name}
                          <span className="block text-[10px] text-dim">SKU: {row.sku}</span>
                        </td>
                        <td className="py-2.5 px-4 text-dim text-[11px]">
                          {row.category_name || '-'}
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-heading">
                          {row.qty_sold}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-heading">
                          Rp {row.total_revenue.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right text-dim font-medium">
                          Rp {row.total_cogs.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-success">
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
