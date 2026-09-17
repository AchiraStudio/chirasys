import React, { useState, useEffect } from 'react';
import {
  Store,
  Wallet,
  Barcode,
  CreditCard,
  Package,
  BookOpen,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

const STEPS = [
  {
    icon: Store,
    title: 'Buka Toko & Login',
    desc: 'Buka aplikasi Kivo dan langsung siap melayani dalam 1 detik. Seluruh data hidup di komputer lokal tanpa harus menunggu koneksi internet lambat.',
  },
  {
    icon: Wallet,
    title: 'Mulai Sesi Shift Kasir',
    desc: 'Hitung kas modal awal di laci, mulai shift kasir. Setiap rupiah kas masuk dan kas keluar tercatat akurat hingga rekonsiliasi tutup shift.',
  },
  {
    icon: Barcode,
    title: 'Penjualan Kilat (Barcode & Search)',
    desc: 'Scan barcode atau ketik 2 huruf nama produk. Tab kategori, grid produk, dan input cepat memastikan antrean pelanggan bergerak tanpa hambatan.',
  },
  {
    icon: CreditCard,
    title: 'Multi & Split Pembayaran',
    desc: 'Terima Tunai, QRIS, Kartu Debit, Transfer Bank, atau Piutang Member. Split pembayaran dalam satu transaksi dengan perhitungan kembalian instan.',
  },
  {
    icon: Package,
    title: 'Mutasi Stok & Batch Terpotong',
    desc: 'Stok inventaris, kartu stok (ledger), dan nomor batch otomatis berkurang begitu struk tercetak. Tidak perlu lagi input manual ganda.',
  },
  {
    icon: BookOpen,
    title: 'Jurnal Akuntansi Otomatis',
    desc: 'Jurnal debit-kredit langsung diposting secara real-time: Pendapatan, HPP, Kas, dan Persediaan seimbang hingga ke rupiah terkecil.',
  },
  {
    icon: RefreshCw,
    title: 'Sinkronisasi Multi-Cabang',
    desc: 'Transaksi otomatis masuk ke antrean sync lokal dan terunggah ke Supabase Cloud saat online, menyatukan laporan seluruh cabang.',
  },
  {
    icon: TrendingUp,
    title: 'Laporan Harian & Tutup Shift',
    desc: 'Rekap omset, laba kotor, produk terlaris, dan selisih uang laci kasir langsung tersedia saat shift ditutup dalam bentuk PDF atau struk thermal.',
  },
];

export const DayWithKivo: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % STEPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isHovered]);

  const CurrentIcon = STEPS[currentStep].icon;

  return (
    <section className="section tint" id="day">
      <div className="wrap">
        <div className="sec-head center">
          <div className="eyebrow ep">
            <span className="eb-dot" />
            <span>Alur Operasional Harian</span>
          </div>
          <h2 className="h2">Sehari Bersama Kivo di Toko Anda</h2>
          <p className="lead" style={{ textAlign: 'center' }}>
            Dari membuka pintu toko di pagi hari hingga tutup buku di malam hari, seluruh proses
            berjalan terintegrasi tanpa spreadsheet manual.
          </p>
        </div>

        <div className="day-card" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          {/* Progress Steps Rail */}
          <div className="rail" id="dayRail">
            <div
              className="fill"
              id="dayFill"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 87.5}%` }}
            />
            {STEPS.map((step, idx) => (
              <button
                key={step.title}
                type="button"
                className={`rstep ${idx < currentStep ? 'done' : ''} ${idx === currentStep ? 'cur' : ''}`}
                onClick={() => setCurrentStep(idx)}
                aria-label={step.title}
              >
                <span className="rn">{idx + 1}</span>
                <span className="rt">{step.title}</span>
              </button>
            ))}
          </div>

          {/* Step Detail Card */}
          <div className="day-detail" id="dayDetail">
            <div className="dd-anim" key={currentStep}>
              <div className="dd-ic">
                <CurrentIcon size={24} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--heading)', marginBottom: 8 }}>
                Langkah {currentStep + 1} · {STEPS[currentStep].title}
              </h3>
              <p style={{ fontSize: 15, color: 'var(--body)', lineHeight: 1.65, maxWidth: 650 }}>
                {STEPS[currentStep].desc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DayWithKivo;

