import React from 'react';
import { BookOpen, Database, TrendingUp, Coins, ShoppingCart, Package } from 'lucide-react';

export const AccountingDeepDive: React.FC = () => {
  return (
    <section className="section" id="accounting">
      <div className="wrap split">
        <div data-reveal>
          <div className="eyebrow ep">
            <span className="eb-dot" />
            AKUNTANSI &amp; PEMBUKUAN
          </div>
          <h2 className="h2">Buku Besar yang Menulis Dirinya Sendiri.</h2>
          <p className="lead">
            Setiap transaksi kasir, penerimaan supplier, dan retur barang otomatis dikonversi menjadi jurnal debit-kredit berpasangan yang seimbang hingga rupiah terakhir.
          </p>
          <ul className="blist">
            <li>
              <BookOpen size={16} />
              <span>
                <b>Jurnal Debit-Kredit Otomatis</b> — pembukuan seimbang tanpa perlu merekrut akuntan tambahan untuk input data ganda.
              </span>
            </li>
            <li>
              <Database size={16} />
              <span>
                <b>Bagan Akun (Chart of Accounts)</b> — standar akuntansi Indonesia untuk Aset, Kewajiban, Modal, Pendapatan, HPP, dan Beban Operasional.
              </span>
            </li>
            <li>
              <TrendingUp size={16} />
              <span>
                <b>Laporan Laba Rugi &amp; Neraca Real-Time</b> — pantau margin laba bersih harian, mingguan, dan bulanan tanpa jeda tutup buku.
              </span>
            </li>
            <li>
              <Coins size={16} />
              <span>
                <b>Valuasi Persediaan Otomatis</b> — perhitungan HPP Moving Average / FIFO akurat dengan nilai stok rupiah di neraca.
              </span>
            </li>
          </ul>
        </div>

        {/* Visual Workflow Card */}
        <div className="card" data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
          <div className="panel-head" style={{ marginBottom: '16px' }}>
            <div>
              <span className="panel-title">Otomasi Aliran Jurnal Akuntansi</span>
              <span className="panel-sub" style={{ display: 'block', marginTop: '2px' }}>Dari Kasir POS langsung ke Neraca Keuangan</span>
            </div>
            <span className="pill">REAL-TIME</span>
          </div>

          <div className="hiw">
            {/* Step 1 */}
            <div className="hiw-step">
              <span className="hs-ic" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
                <ShoppingCart size={16} />
              </span>
              <div>
                <b style={{ color: 'var(--heading)' }}>1. Penjualan Kasir POS #KV-1284</b>
                <p>Rp 86.000 lunas via QRIS Dinamis · 3 item produk terjual</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="hiw-step">
              <span className="hs-ic" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
                <Package size={16} />
              </span>
              <div>
                <b style={{ color: 'var(--heading)' }}>2. Mutasi Stok Fisik &amp; HPP Terhitung</b>
                <p>3 item berkurang dari persediaan · Total HPP terhitung Rp 51.500</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="hiw-step">
              <span className="hs-ic" style={{ background: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)' }}>
                <BookOpen size={16} />
              </span>
              <div>
                <b style={{ color: 'var(--heading)' }}>3. Jurnal Umum JE-#4412 Terposting</b>
                <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', marginTop: '3px' }}>
                  (Dr) Kas QRIS Rp 86.000 / (Cr) Pendapatan Rp 86.000<br />
                  (Dr) Beban HPP Rp 51.500 / (Cr) Persediaan Rp 51.500
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="hiw-step">
              <span className="hs-ic" style={{ background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)' }}>
                <TrendingUp size={16} />
              </span>
              <div>
                <b style={{ color: 'var(--heading)' }}>4. Laporan Laba Rugi &amp; Neraca Terupdate</b>
                <p>Laba Kotor +Rp 34.500 (Margin 40.1%) tercatat langsung di dashboard pemilik.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccountingDeepDive;
