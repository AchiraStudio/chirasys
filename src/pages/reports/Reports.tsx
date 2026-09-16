import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, TrendingUp, CreditCard, Package, AlertTriangle, 
  FileText, Truck, Users, BarChart3, ChevronRight, ArrowUpRight
} from 'lucide-react';
import LaporanPenjualan from './LaporanPenjualan';
import LaporanItemTerlaris from './LaporanItemTerlaris';
import LaporanMetodePembayaran from './LaporanMetodePembayaran';
import LaporanStok from './LaporanStok';
import LaporanKadaluarsa from './LaporanKadaluarsa';
import LaporanHutang from './LaporanHutang';
import LaporanPembelian from './LaporanPembelian';
import LaporanPelanggan from './LaporanPelanggan';

interface ReportCardItem {
  id: string;
  title: string;
  desc: string;
  tag: string;
  icon: any;
}

interface ReportCategory {
  id: string;
  categoryTitle: string;
  categoryDesc: string;
  items: ReportCardItem[];
}

const REPORT_TABS = [
  { id: 'all', label: 'Semua Laporan' },
  { id: 'penjualan', label: 'Penjualan & Kasir' },
  { id: 'inventaris', label: 'Inventori & Stok' },
  { id: 'pengadaan', label: 'Pengadaan & Hutang' },
  { id: 'pelanggan', label: 'Pelanggan & CRM' },
];

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'penjualan',
    categoryTitle: 'Penjualan, Kasir & Analisis Omset',
    categoryDesc: 'Laporan menyeluruh faktur penjualan, kasir, profitabilitas produk, dan cara bayar',
    items: [
      {
        id: 'penjualan',
        title: 'Laporan Penjualan Suite',
        desc: 'Rekap nota, rincian per item, rekap harian, kinerja per kasir & per pelanggan',
        tag: 'Paling Lengkap',
        icon: ShoppingCart,
      },
      {
        id: 'item-terlaris',
        title: 'Item Terlaris & Margin',
        desc: 'Peringkat produk dengan pendapatan dan kontribusi margin kotor tertinggi',
        tag: 'Fast Moving',
        icon: TrendingUp,
      },
      {
        id: 'metode-bayar',
        title: 'Distribusi Metode Pembayaran',
        desc: 'Rincian cara bayar: Tunai, QRIS / E-Wallet, Transfer Bank, dan Kartu Debit/Kredit',
        tag: 'Cashflow',
        icon: CreditCard,
      },
    ],
  },
  {
    id: 'inventaris',
    categoryTitle: 'Inventaris, Valuasi Stok & Kadaluarsa',
    categoryDesc: 'Monitoring nilai aset gudang, stok menipis, dan peringatan tanggal expired',
    items: [
      {
        id: 'stok',
        title: 'Valuasi Stok & Nilai Persediaan',
        desc: 'Perhitungan total nilai modal stok fisik berdasarkan metode HPP rata-rata berjalan',
        tag: 'Aset Gudang',
        icon: Package,
      },
      {
        id: 'kadaluarsa',
        title: 'Laporan Hampir Kadaluarsa',
        desc: 'Daftar batch obat yang mendekati tanggal expired dalam 30, 60, atau 90 hari',
        tag: 'Peringatan Dini',
        icon: AlertTriangle,
      },
    ],
  },
  {
    id: 'pengadaan',
    categoryTitle: 'Pengadaan, Hutang & Hubungan Supplier',
    categoryDesc: 'Riwayat pembelian barang masuk dan pelacakan hutang dagang jatuh tempo',
    items: [
      {
        id: 'pembelian',
        title: 'Rekap Pembelian Supplier',
        desc: 'Akumulasi nilai pengadaan barang dan rekap faktur pembelian per pemasok',
        tag: 'Pembelian',
        icon: Truck,
      },
      {
        id: 'hutang',
        title: 'Hutang Dagang (AP)',
        desc: 'Tagihan faktur pembelian yang belum lunas beserta sisa saldo hutang pemasok',
        tag: 'Hutang Dagang',
        icon: FileText,
      },
    ],
  },
  {
    id: 'pelanggan',
    categoryTitle: 'Pelanggan, CRM & Loyalitas',
    categoryDesc: 'Analisis segmentasi pelanggan, kebiasaan belanja, dan tier membership',
    items: [
      {
        id: 'pelanggan',
        title: 'Laporan Belanja Pelanggan',
        desc: 'Peringkat pelanggan dengan transaksi terbanyak dan total omset belanja',
        tag: 'CRM & Loyalitas',
        icon: Users,
      },
    ],
  },
];

const COMPONENTS: Record<string, React.FC<{ onBack: () => void }>> = {
  'penjualan':    LaporanPenjualan,
  'item-terlaris': LaporanItemTerlaris,
  'metode-bayar': LaporanMetodePembayaran,
  'stok':         LaporanStok,
  'kadaluarsa':   LaporanKadaluarsa,
  'hutang':       LaporanHutang,
  'pembelian':    LaporanPembelian,
  'pelanggan':    LaporanPelanggan,
};

export default function Reports() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');

  const visibleCategories = useMemo(() => {
    if (selectedCategoryTab === 'all') return REPORT_CATEGORIES;
    return REPORT_CATEGORIES.filter(c => c.id === selectedCategoryTab);
  }, [selectedCategoryTab]);

  if (activeReport) {
    if (activeReport === 'metode-bayar') {
      return <LaporanPenjualan onBack={() => setActiveReport(null)} initialSubtype="payment_methods" />;
    }
    const Component = COMPONENTS[activeReport];
    return Component ? <Component onBack={() => setActiveReport(null)} /> : null;
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in h-full overflow-y-auto custom-scrollbar pr-1 pb-8">
      {/* Hub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-card p-4 rounded-xl border border-line">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            <h1 className="text-base font-bold text-heading tracking-tight">
              Pusat Laporan & Analisis
            </h1>
          </div>
          <p className="text-xs text-dim mt-0.5">
            Akses laporan berkala penjualan, persediaan stok, pembelian, dan performa keuangan
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveReport('penjualan')}
            className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <ShoppingCart size={14} /> Laporan Penjualan <ArrowUpRight size={13} />
          </button>
        </div>
      </div>

      {/* Category Tabs Bar */}
      <div className="bg-card p-1 rounded-xl border border-line flex items-center gap-1 overflow-x-auto custom-scrollbar shrink-0">
        {REPORT_TABS.map(tab => {
          const isActive = selectedCategoryTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategoryTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-body hover:text-heading hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Categorized Report Cards */}
      <div className="space-y-5">
        {visibleCategories.map(cat => (
          <div key={cat.id} className="space-y-2.5">
            <div>
              <h2 className="text-xs font-bold text-dim uppercase tracking-wider">
                {cat.categoryTitle}
              </h2>
              <p className="text-[11px] text-dim">
                {cat.categoryDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cat.items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveReport(item.id)}
                    className="flex flex-col text-left p-4 rounded-xl border border-line bg-card hover:border-primary/50 hover:bg-muted/20 transition-all duration-150 group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <Icon size={18} />
                      </div>
                      <span className="text-[10px] font-semibold text-dim bg-muted px-2 py-0.5 rounded border border-line">
                        {item.tag}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-heading group-hover:text-primary transition-colors tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs text-dim mt-1 leading-relaxed line-clamp-2 flex-1">
                      {item.desc}
                    </p>

                    <div className="mt-3.5 pt-2.5 border-t border-line/60 flex items-center justify-between text-xs font-semibold text-dim group-hover:text-primary transition-colors">
                      <span>Buka Laporan</span>
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
