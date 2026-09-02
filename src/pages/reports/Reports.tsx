import React, { useState } from 'react';
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
  color: string;
  bgLight: string;
  border: string;
}

interface ReportCategory {
  categoryTitle: string;
  categoryDesc: string;
  items: ReportCardItem[];
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    categoryTitle: 'Penjualan, Kasir & Analisis Omset',
    categoryDesc: 'Laporan menyeluruh faktur penjualan, kasir, profitabilitas produk, dan cara bayar',
    items: [
      {
        id: 'penjualan',
        title: 'Laporan Penjualan Suite',
        desc: 'Rekap nota, rincian per item, rekap harian, kinerja per kasir & per pelanggan',
        tag: 'Paling Lengkap',
        icon: ShoppingCart,
        color: 'from-emerald-500 to-teal-600',
        bgLight: 'bg-emerald-50 dark:bg-emerald-950/20',
        border: 'border-emerald-200 dark:border-emerald-800/40',
      },
      {
        id: 'item-terlaris',
        title: 'Item Terlaris & Margin',
        desc: 'Peringkat obat/produk dengan revenue dan kontribusi margin kotor tertinggi',
        tag: 'Fast Moving',
        icon: TrendingUp,
        color: 'from-blue-500 to-indigo-600',
        bgLight: 'bg-blue-50 dark:bg-blue-950/20',
        border: 'border-blue-200 dark:border-blue-800/40',
      },
      {
        id: 'metode-bayar',
        title: 'Distribusi Metode Pembayaran',
        desc: 'Persentase cara bayar: Tunai (Cash), QRIS, Transfer Bank, dan Debit Card',
        tag: 'Cashflow',
        icon: CreditCard,
        color: 'from-violet-500 to-purple-600',
        bgLight: 'bg-violet-50 dark:bg-violet-950/20',
        border: 'border-violet-200 dark:border-violet-800/40',
      },
    ],
  },
  {
    categoryTitle: 'Inventaris, Valuasi Stok & Kadaluarsa',
    categoryDesc: 'Monitoring nilai aset gudang, stok menipis, dan peringatan tanggal expired',
    items: [
      {
        id: 'stok',
        title: 'Valuasi Stok & Nilai Persediaan',
        desc: 'Perhitungan total nilai stok fisik berdasarkan metode HPP rata-rata berjalan',
        tag: 'Aset Gudang',
        icon: Package,
        color: 'from-amber-500 to-orange-600',
        bgLight: 'bg-amber-50 dark:bg-amber-950/20',
        border: 'border-amber-200 dark:border-amber-800/40',
      },
      {
        id: 'kadaluarsa',
        title: 'Laporan Hampir Kadaluarsa',
        desc: 'Daftar batch obat yang mendekati tanggal expired dalam 30, 60, atau 90 hari',
        tag: 'Early Warning',
        icon: AlertTriangle,
        color: 'from-rose-500 to-red-600',
        bgLight: 'bg-rose-50 dark:bg-rose-950/20',
        border: 'border-rose-200 dark:border-rose-800/40',
      },
    ],
  },
  {
    categoryTitle: 'Pengadaan, Hutang & Hubungan Supplier',
    categoryDesc: 'Riwayat pembelian barang masuk dan pelacakan hutang dagang jatuh tempo',
    items: [
      {
        id: 'pembelian',
        title: 'Rekap Pembelian Supplier',
        desc: 'Akumulasi nilai pengadaan barang dan rekap faktur pembelian per pemasok',
        tag: 'Purchasing',
        icon: Truck,
        color: 'from-indigo-500 to-blue-600',
        bgLight: 'bg-indigo-50 dark:bg-indigo-950/20',
        border: 'border-indigo-200 dark:border-indigo-800/40',
      },
      {
        id: 'hutang',
        title: 'Hutang Dagang (AP)',
        desc: 'Tagihan faktur pembelian yang belum lunas beserta sisa saldo hutang pemasok',
        tag: 'Accounts Payable',
        icon: FileText,
        color: 'from-orange-500 to-amber-600',
        bgLight: 'bg-orange-50 dark:bg-orange-950/20',
        border: 'border-orange-200 dark:border-orange-800/40',
      },
    ],
  },
  {
    categoryTitle: 'Pelanggan, CRM & Loyalitas',
    categoryDesc: 'Analisis segmentasi pelanggan, kebiasaan belanja, dan tier membership',
    items: [
      {
        id: 'pelanggan',
        title: 'Laporan Belanja Pelanggan',
        desc: 'Peringkat pelanggan dengan transaksi terbanyak dan total omset belanja',
        tag: 'CRM & Loyalty',
        icon: Users,
        color: 'from-teal-500 to-cyan-600',
        bgLight: 'bg-teal-50 dark:bg-teal-950/20',
        border: 'border-teal-200 dark:border-teal-800/40',
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

  if (activeReport) {
    if (activeReport === 'metode-bayar') {
      return <LaporanPenjualan onBack={() => setActiveReport(null)} initialSubtype="payment_methods" />;
    }
    const Component = COMPONENTS[activeReport];
    return Component ? <Component onBack={() => setActiveReport(null)} /> : null;
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full overflow-y-auto custom-scrollbar pr-1 pb-8">
      {/* Hub Hero Header */}
      <div className="bg-white dark:bg-[#0B0F19] p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 size={16} /> Business Intelligence & Analytics
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Pusat Laporan Eksekutif
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Akses analisis mendalam untuk penjualan, persediaan stok, laba rugi, pembelian supplier, serta rekonsiliasi kasir kasir harian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveReport('penjualan')}
            className="px-5 py-2.5 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold text-xs shadow-md shadow-brand/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ShoppingCart size={15} /> Buka Laporan Penjualan <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Categorized Sections */}
      <div className="space-y-6">
        {REPORT_CATEGORIES.map((cat, catIdx) => (
          <div key={catIdx} className="space-y-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                {cat.categoryTitle}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {cat.categoryDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {cat.items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveReport(item.id)}
                    className={`flex flex-col text-left p-5 rounded-3xl border ${item.bgLight} ${item.border} hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 group cursor-pointer relative overflow-hidden`}
                  >
                    <div className="flex items-center justify-between mb-3.5">
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                        {item.tag}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-brand transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                      {item.desc}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-brand transition-colors">
                      <span>Buka Laporan</span>
                      <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
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
