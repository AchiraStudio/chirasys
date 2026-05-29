// src/pages/reports/Reports.tsx — Laporan Hub
import React, { useState } from 'react';
import { ShoppingCart, TrendingUp, CreditCard, Package, AlertTriangle, FileText, Truck, Users } from 'lucide-react';
import LaporanPenjualan from './LaporanPenjualan';
import LaporanItemTerlaris from './LaporanItemTerlaris';
import LaporanMetodePembayaran from './LaporanMetodePembayaran';
import LaporanStok from './LaporanStok';
import LaporanKadaluarsa from './LaporanKadaluarsa';
import LaporanHutang from './LaporanHutang';
import LaporanPembelian from './LaporanPembelian';
import LaporanPelanggan from './LaporanPelanggan';

const REPORTS = [
  {
    id: 'penjualan',
    title: 'Laporan Penjualan',
    desc: 'Ringkasan transaksi penjualan harian',
    icon: ShoppingCart,
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/10',
    border: 'border-emerald-200 dark:border-emerald-800/40',
  },
  {
    id: 'item-terlaris',
    title: 'Item Terlaris',
    desc: 'Produk dengan penjualan & margin tertinggi',
    icon: TrendingUp,
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-blue-200 dark:border-blue-800/40',
  },
  {
    id: 'metode-bayar',
    title: 'Metode Pembayaran',
    desc: 'Distribusi cara bayar pelanggan',
    icon: CreditCard,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50 dark:bg-violet-900/10',
    border: 'border-violet-200 dark:border-violet-800/40',
  },
  {
    id: 'stok',
    title: 'Valuasi Stok',
    desc: 'Nilai persediaan berdasarkan HPP rata-rata',
    icon: Package,
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-200 dark:border-amber-800/40',
  },
  {
    id: 'kadaluarsa',
    title: 'Hampir Kadaluarsa',
    desc: 'Produk mendekati tanggal expired',
    icon: AlertTriangle,
    color: 'from-rose-500 to-red-600',
    bgLight: 'bg-rose-50 dark:bg-rose-900/10',
    border: 'border-rose-200 dark:border-rose-800/40',
  },
  {
    id: 'hutang',
    title: 'Hutang Dagang',
    desc: 'Tagihan belum lunas ke pemasok',
    icon: FileText,
    color: 'from-orange-500 to-amber-600',
    bgLight: 'bg-orange-50 dark:bg-orange-900/10',
    border: 'border-orange-200 dark:border-orange-800/40',
  },
  {
    id: 'pembelian',
    title: 'Laporan Pembelian',
    desc: 'Ringkasan pembelian per pemasok',
    icon: Truck,
    color: 'from-indigo-500 to-blue-600',
    bgLight: 'bg-indigo-50 dark:bg-indigo-900/10',
    border: 'border-indigo-200 dark:border-indigo-800/40',
  },
  {
    id: 'pelanggan',
    title: 'Laporan Pelanggan',
    desc: 'Belanja terbanyak per pelanggan',
    icon: Users,
    color: 'from-teal-500 to-cyan-600',
    bgLight: 'bg-teal-50 dark:bg-teal-900/10',
    border: 'border-teal-200 dark:border-teal-800/40',
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
    const Component = COMPONENTS[activeReport];
    return Component ? <Component onBack={() => setActiveReport(null)} /> : null;
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Laporan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Analisis bisnis — pilih jenis laporan di bawah
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 flex-1">
        {REPORTS.map(r => {
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={`flex flex-col text-left p-6 rounded-2xl border ${r.bgLight} ${r.border} hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 group`}
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-shadow`}>
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{r.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1">{r.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-brand transition-colors">
                Buka Laporan <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
