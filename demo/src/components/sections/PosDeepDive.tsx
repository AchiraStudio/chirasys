import React from 'react';
import { Zap, CreditCard, Wallet, History, RefreshCw } from 'lucide-react';

export const PosDeepDive: React.FC = () => {
  return (
    <section className="section" id="pos">
      <div className="wrap split">
        <div data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>POINT OF SALE
          </div>
          <h2 className="h2">Kasir cepat tanpa jeda.</h2>
          <p className="lead">
            Scanning barcode, pencarian produk, hingga pembayaran dieksekusi 100% lokal di kasir.
          </p>
          <ul className="blist">
            <li>
              <Zap size={16} />
              <span>
                <b>Pencarian &amp; Barcode Kilat</b> — scan barcode dan temukan produk instan tanpa delay server.
              </span>
            </li>
            <li>
              <CreditCard size={16} />
              <span>
                <b>Split Payment Fleksibel</b> — dukung Tunai, QRIS, Transfer, EDC, dan Piutang dalam satu transaksi.
              </span>
            </li>
            <li>
              <Wallet size={16} />
              <span>
                <b>Manajemen Shift Kasir</b> — modal awal, kas masuk/keluar, dan rekonsiliasi laci otomatis.
              </span>
            </li>
            <li>
              <History size={16} />
              <span>
                <b>Retur Penjualan Instan</b> — stok dan pembukuan langsung disesuaikan di kasir.
              </span>
            </li>
          </ul>
        </div>

        <div className="vstack" data-reveal style={{ '--d': '100ms', display: 'flex', flexDirection: 'column', gap: '14px' } as React.CSSProperties}>
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Payment — Sale #001284</span>
              <span className="panel-sub">split across 2 methods</span>
            </div>
            <div className="jrow">
              <span style={{ color: 'var(--heading)' }}>Total</span>
              <span></span>
              <span style={{ textAlign: 'right', fontWeight: 800, color: 'var(--heading)' }}>Rp 86.000</span>
            </div>
            <div className="jrow">
              <span style={{ paddingLeft: '14px' }}>Cash</span>
              <span></span>
              <span style={{ textAlign: 'right' }}>
                Rp 50.000 <span className="mini-s" style={{ color: 'var(--success)' }}>✓</span>
              </span>
            </div>
            <div className="jrow">
              <span style={{ paddingLeft: '14px' }}>QRIS</span>
              <span></span>
              <span style={{ textAlign: 'right' }}>
                Rp 36.000 <span className="mini-s" style={{ color: 'var(--success)' }}>✓</span>
              </span>
            </div>
            <div className="jrow">
              <span style={{ color: 'var(--dim)' }}>Remaining</span>
              <span></span>
              <span style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 700 }}>Rp 0 — paid</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Cash Shift #47 · Andini</span>
              <span className="panel-sub">open since 08:02</span>
            </div>
            <div className="pl-row">
              <span style={{ color: 'var(--dim)' }}>Starting cash</span>
              <span className="pl-bar">
                <i style={{ width: '46%', background: 'var(--line-strong)' }}></i>
              </span>
              <span>Rp 500.000</span>
            </div>
            <div className="pl-row">
              <span style={{ color: 'var(--dim)' }}>Cash sales</span>
              <span className="pl-bar">
                <i style={{ width: '40%', background: 'var(--primary)' }}></i>
              </span>
              <span>Rp 436.500</span>
            </div>
            <div className="pl-row">
              <span style={{ color: 'var(--dim)' }}>Cash in / out</span>
              <span className="pl-bar">
                <i style={{ width: '14%', background: 'var(--warning)' }}></i>
              </span>
              <span>+250 / −100 k</span>
            </div>
            <div className="pl-row">
              <span style={{ color: 'var(--heading)', fontWeight: 800 }}>Expected drawer</span>
              <span className="pl-bar">
                <i style={{ width: '100%', background: 'var(--success)' }}></i>
              </span>
              <span>Rp 1.086.500</span>
            </div>
            <div style={{ marginTop: '10px' }}>
              <span className="chip">
                <RefreshCw size={13} />
                <span>End shift → reconciliation</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PosDeepDive;

