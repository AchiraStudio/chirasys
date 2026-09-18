import React from 'react';
import { Zap, CreditCard, Wallet, RotateCcw, Printer, CheckCircle2 } from 'lucide-react';

export const PosDeepDive: React.FC = () => {
  return (
    <section className="section" id="pos">
      <div className="wrap split">
        <div data-reveal>
          <div className="eyebrow">
            <span className="eb-dot" />
            POINT OF SALE
          </div>
          <h2 className="h2">Kasir Kilat Tanpa Jeda. Siap di Jam Tersibuk Toko.</h2>
          <p className="lead">
            Scanning barcode instan, pencarian produk tanpa jeda, dan cetak struk thermal langsung. Transaksi berjalan 100% lokal di kasir toko Anda.
          </p>
          <ul className="blist">
            <li>
              <Zap size={16} />
              <span>
                <b>Scan Barcode &amp; Pencarian 0-Detik</b> — ketik 2 huruf atau scan barcode; produk langsung masuk ke keranjang belanja seketika.
              </span>
            </li>
            <li>
              <CreditCard size={16} />
              <span>
                <b>Split Pembayaran Bebas Ribet</b> — pecah tagihan antar Tunai, QRIS, Transfer Bank, EDC Debit/Kredit, dan Piutang Member.
              </span>
            </li>
            <li>
              <Wallet size={16} />
              <span>
                <b>Manajemen Sesi Shift Kasir</b> — catat modal awal, kas masuk/keluar, hingga rekonsiliasi uang laci kasir otomatis saat tutup shift.
              </span>
            </li>
            <li>
              <RotateCcw size={16} />
              <span>
                <b>Retur Penjualan Terintegrasi</b> — kembalikan barang langsung di kasir; stok dan jurnal pembukuan disesuaikan otomatis.
              </span>
            </li>
            <li>
              <Printer size={16} />
              <span>
                <b>Cetak Struk ESC/POS Instan</b> — format 58mm &amp; 80mm dengan kick laci kasir otomatis tanpa driver lambat.
              </span>
            </li>
          </ul>
        </div>

        <div className="vstack" data-reveal style={{ '--d': '100ms', display: 'flex', flexDirection: 'column', gap: '14px' } as React.CSSProperties}>
          {/* Split Payment Preview Card */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="panel-title">Pembayaran — Faktur #KV-001284</span>
                <span className="panel-sub" style={{ display: 'block', marginTop: '2px' }}>Split 2 Metode Pembayaran</span>
              </div>
              <span className="pill" style={{ background: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)' }}>
                <CheckCircle2 size={12} /> LUNAS
              </span>
            </div>

            <div className="jrow" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--heading)', fontWeight: 700 }}>Total Tagihan</span>
              <span />
              <span style={{ textAlign: 'right', fontWeight: 800, fontSize: '16px', color: 'var(--heading)' }}>
                Rp 86.000
              </span>
            </div>

            <div className="jrow" style={{ marginTop: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="dot g" />
                <span>Kas Tunai</span>
              </span>
              <span />
              <span style={{ textAlign: 'right', fontWeight: 700 }}>Rp 50.000</span>
            </div>

            <div className="jrow">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="dot g" />
                <span>QRIS Dinamis</span>
              </span>
              <span />
              <span style={{ textAlign: 'right', fontWeight: 700 }}>Rp 36.000</span>
            </div>

            <div className="jrow" style={{ paddingTop: '8px', borderTop: '1px dashed var(--line)' }}>
              <span style={{ color: 'var(--dim)' }}>Sisa Tagihan / Kembalian</span>
              <span />
              <span style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 800 }}>
                Rp 0 (Pas)
              </span>
            </div>
          </div>

          {/* Cash Shift Reconciliation Card */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="panel-title">Shift Kasir #47 · Kasir Andini</span>
                <span className="panel-sub" style={{ display: 'block', marginTop: '2px' }}>Mulai buka sejak 08:00 WIB</span>
              </div>
              <span className="pill">AKTIF</span>
            </div>

            <div className="pl-row">
              <span style={{ color: 'var(--dim)' }}>Modal Kas Awal</span>
              <span className="pl-bar">
                <i style={{ width: '46%', background: 'var(--line-strong)' }} />
              </span>
              <span style={{ fontWeight: 700 }}>Rp 500.000</span>
            </div>

            <div className="pl-row">
              <span style={{ color: 'var(--dim)' }}>Penjualan Tunai</span>
              <span className="pl-bar">
                <i style={{ width: '40%', background: 'var(--primary)' }} />
              </span>
              <span style={{ fontWeight: 700 }}>Rp 436.500</span>
            </div>

            <div className="pl-row">
              <span style={{ color: 'var(--dim)' }}>Kas Masuk / Keluar</span>
              <span className="pl-bar">
                <i style={{ width: '14%', background: 'var(--warning)' }} />
              </span>
              <span style={{ fontWeight: 700 }}>+Rp 250k / −Rp 100k</span>
            </div>

            <div className="pl-row" style={{ paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--heading)', fontWeight: 800 }}>Uang Fisik di Laci</span>
              <span className="pl-bar">
                <i style={{ width: '100%', background: 'var(--success)' }} />
              </span>
              <span style={{ fontWeight: 800, color: 'var(--success)' }}>Rp 1.086.500</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PosDeepDive;
