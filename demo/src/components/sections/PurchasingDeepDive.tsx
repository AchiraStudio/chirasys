import React, { useState } from 'react';
import { Truck, Receipt, Package, Boxes, Coins, Calculator, CheckCircle2 } from 'lucide-react';

interface PurchaseStage {
  id: number;
  icon: React.ElementType;
  name: string;
  description: string;
  meta: string;
  badge: string;
}

const STAGES: PurchaseStage[] = [
  {
    id: 0,
    icon: Truck,
    name: '1. Registri Supplier',
    description: 'Database master supplier, riwayat harga beli, termin pembayaran, dan nomor kontak sales tersimpan rapi.',
    meta: '34 Supplier Aktif · Tempo 30 Hari',
    badge: 'Database Pemasok',
  },
  {
    id: 1,
    icon: Receipt,
    name: '2. Purchase Order (PO)',
    description: 'Terbitkan Surat Pesanan (PO) dengan kuantiti dan kesepakatan harga grosir yang terkunci tanpa salah paham.',
    meta: 'PO #0841 · 12 Item · Rp 8.240.000',
    badge: 'Penerbitan PO',
  },
  {
    id: 2,
    icon: Package,
    name: '3. Penerimaan Barang (GRN)',
    description: 'Terima barang utuh maupun bertahap (parsial). Catat nomor batch dan tanggal kadaluarsa saat barang dibongkar.',
    meta: 'GRN #0512 · Diterima 10 dari 12 Item',
    badge: 'Penerimaan Fisik',
  },
  {
    id: 3,
    icon: Boxes,
    name: '4. Masuk Inventaris & Kasir',
    description: 'Stok multi-satuan bertambah otomatis di database lokal. Barang langsung dapat di-scan dan dijual di kasir.',
    meta: '+240 PCS Kopi Susu Botol Masuk',
    badge: 'Stok Bertambah',
  },
  {
    id: 4,
    icon: Coins,
    name: '5. Hitung HPP Otomatis',
    description: 'Harga Pokok Penjualan (HPP / COGS) diperbarui otomatis dengan metode Moving Average begitu faktur diterima.',
    meta: 'HPP Kopi Susu Baru: Rp 5.940 / unit',
    badge: 'Kalkulasi Otomatis',
  },
  {
    id: 5,
    icon: Calculator,
    name: '6. Jurnal Hutang (AP)',
    description: 'Tagihan supplier otomatis masuk ke laporan hutang dagang (AP) dan jurnal akuntansi debit-kredit terposting sendiri.',
    meta: 'Hutang Diakui · Jurnal JE-#4412',
    badge: 'Pembukuan Beres',
  },
];

export const PurchasingDeepDive: React.FC = () => {
  const [activeStage, setActiveStage] = useState(0);
  const cur = STAGES[activeStage];
  const StageIcon = cur.icon;

  return (
    <section className="section" id="purchasing">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot" />
            PENGADAAN &amp; PEMBELIAN
          </div>
          <h2 className="h2">Dari Supplier ke Laporan Keuangan. Satu Rantai Tertutup.</h2>
          <p className="lead">
            Penerbitan PO, penerimaan barang bertahap, perhitungan HPP otomatis, hingga pengakuan hutang dagang tanpa spreadsheet ganda. Klik tahapan alur di bawah:
          </p>
        </div>

        <div data-reveal>
          {/* Interactive Stage Step Rail */}
          <div className="prail" id="pRail">
            {STAGES.map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.name}
                  type="button"
                  className={`pstage ${idx === activeStage ? 'on' : ''}`}
                  onClick={() => setActiveStage(idx)}
                >
                  <span className="pn">
                    <Icon size={16} />
                  </span>
                  <span className="pt">{s.name}</span>
                </button>
              );
            })}
          </div>

          {/* Detailed Stage Card */}
          <div className="card p-detail" id="pDetail" style={{ marginTop: '16px' }}>
            <span className="f-ic" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
              <StageIcon size={24} />
            </span>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="pill">{cur.badge}</span>
                <span className="mini-s" style={{ color: 'var(--success)' }}>
                  <CheckCircle2 size={12} /> Alur Aktif
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--heading)' }}>
                {cur.name}
              </h3>
              <p style={{ marginTop: '6px', fontSize: '14px', color: 'var(--body)', lineHeight: 1.55 }}>
                {cur.description}
              </p>
            </div>
            <div className="p-meta" style={{ minWidth: '220px', borderLeft: '1px solid var(--line)', paddingLeft: '18px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '.08em', color: 'var(--dim)', textTransform: 'uppercase' }}>
                Data Terverifikasi
              </span>
              <b style={{ display: 'block', marginTop: '4px', fontSize: '13.5px', color: 'var(--heading)' }}>
                {cur.meta}
              </b>
              <span className="pill" style={{ marginTop: '8px' }}>
                Otomatis via Kivo Engine
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PurchasingDeepDive;
