import React from 'react';
import { Boxes, Timer, History, CheckCheck } from 'lucide-react';

export const InventoryDeepDive: React.FC = () => {
  return (
    <section className="section tint" id="inventory">
      <div className="wrap split rev">
        {/* Multi-Unit & Batch Interactive Panel */}
        <div className="panel" data-reveal>
          <div className="panel-head">
            <div>
              <span className="panel-title">Kopi Susu Botol 250ml</span>
              <span className="panel-sub" style={{ display: 'block', marginTop: '2px' }}>SKU: KV-0012 · Kategori: Minuman</span>
            </div>
            <span className="mini-s">
              <span className="dot g" />
              Stok Aman · Total 144 PCS
            </span>
          </div>

          {/* Unit Conversion Hierarchy */}
          <div className="unit-row">
            <span className="unit-chip">
              <b>DUS / BOX</b>
              <span>1 Box = 24 Pcs · 6 Box</span>
            </span>
            <span className="unit-arr">→</span>
            <span className="unit-chip">
              <b>PACK</b>
              <span>1 Pack = 6 Pcs · 24 Pack</span>
            </span>
            <span className="unit-arr">→</span>
            <span className="unit-chip">
              <b>PCS (Dasar)</b>
              <span>144 Pcs · Min 48</span>
            </span>
          </div>

          <div className="unit-row" style={{ marginTop: '4px' }}>
            <span className="chip">Harga Box: Rp 192.000</span>
            <span className="chip">Harga Pack: Rp 49.800</span>
            <span className="chip">Harga Pcs: Rp 8.500</span>
          </div>

          {/* FIFO Batch & Expiry Table */}
          <table className="k-table" style={{ marginTop: '14px' }}>
            <thead>
              <tr>
                <th>Nomor Batch</th>
                <th>Tgl Kadaluarsa</th>
                <th>Sisa Stok</th>
                <th>Status FIFO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>BATCH-2409</b></td>
                <td>28 Nov 2026</td>
                <td>96 PCS</td>
                <td>
                  <span className="mini-s" style={{ color: 'var(--warning)' }}>
                    <span className="dot w" />
                    Prioritas Jual (34 Hari)
                  </span>
                </td>
              </tr>
              <tr>
                <td><b>BATCH-2410</b></td>
                <td>15 Jan 2027</td>
                <td>48 PCS</td>
                <td>
                  <span className="mini-s" style={{ color: 'var(--success)' }}>
                    <span className="dot g" />
                    Aman (&gt; 90 Hari)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Real-time Movement Ledger Log */}
          <div style={{ marginTop: '14px' }}>
            <div className="mv">
              <span>24 Okt 2026 <span className="t">· Penerimaan PO #0841</span></span>
              <span className="in">+240 PCS (10 Box)</span>
            </div>
            <div className="mv">
              <span>25 Okt 2026 <span className="t">· Kasir POS (38 Transaksi)</span></span>
              <span className="out">−96 PCS</span>
            </div>
            <div className="mv">
              <span>26 Okt 2026 <span className="t">· Stock Opname Fisik #014</span></span>
              <span className="adj">±0 Selisih Pas</span>
            </div>
          </div>
        </div>

        {/* Informative Side */}
        <div data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
          <div className="eyebrow ep">
            <span className="eb-dot" />
            INVENTARIS &amp; STOK
          </div>
          <h2 className="h2">Stok Multi-Satuan &amp; Batch Expiry Presisi.</h2>
          <p className="lead">
            Konversi otomatis Box ke Pcs, pelacakan tanggal kadaluarsa dengan prioritas FIFO, serta kartu stok permanen yang terhubung ke kasir dan pengadaan.
          </p>
          <ul className="blist">
            <li>
              <Boxes size={16} />
              <span>
                <b>Hierarki Multi-Satuan Otomatis</b> — beli dalam Box/Dus dari supplier, jual eceran per Pack atau Pcs di kasir dengan pengurang stok otomatis.
              </span>
            </li>
            <li>
              <Timer size={16} />
              <span>
                <b>Pelacakan Batch &amp; Tanggal Kadaluarsa</b> — cegah kerugian barang expired dengan rekomendasi FIFO (First-In, First-Out) langsung di kasir.
              </span>
            </li>
            <li>
              <History size={16} />
              <span>
                <b>Kartu Stok Mutasi Permanen</b> — setiap pemasukan, penjualan, dan retur tercatat permanen; jejak audit tidak pernah hilang.
              </span>
            </li>
            <li>
              <CheckCheck size={16} />
              <span>
                <b>Stock Opname Tanpa Tutup Toko</b> — hitung fisik stok berkala dengan cetak lembar hitung dan rekonsiliasi selisih instan.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default InventoryDeepDive;
