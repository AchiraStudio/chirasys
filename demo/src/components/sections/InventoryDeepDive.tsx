import React from 'react';
import { Boxes, Timer, History, CheckCheck } from 'lucide-react';

export const InventoryDeepDive: React.FC = () => {
  return (
    <section className="section" id="inventory">
      <div className="wrap split rev">
        <div className="panel" data-reveal>
          <div className="panel-head">
            <span className="panel-title">Kopi Susu Botol 250ml</span>
            <span className="mini-s">
              <span className="dot g"></span>OK · SKU KV-0012
            </span>
          </div>
          <div className="unit-row">
            <span className="unit-chip">
              <b>BOX</b>
              <span>1 Box = 24 Pcs · 6 in stock</span>
            </span>
            <span className="unit-arr">→</span>
            <span className="unit-chip">
              <b>PACK</b>
              <span>1 Pack = 6 Pcs · 24 in stock</span>
            </span>
            <span className="unit-arr">→</span>
            <span className="unit-chip">
              <b>PCS</b>
              <span>144 in stock · min 48</span>
            </span>
          </div>
          <div className="unit-row" style={{ marginTop: '2px' }}>
            <span className="chip">BOX Rp 192.000</span>
            <span className="chip">PACK Rp 49.800</span>
            <span className="chip">PCS Rp 8.500</span>
          </div>
          <table className="k-table" style={{ marginTop: '12px' }}>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Expiry</th>
                <th>Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>B-2409</b></td>
                <td>2025-11-28</td>
                <td>96 PCS</td>
                <td>
                  <span className="mini-s" style={{ color: 'var(--warning)' }}>
                    <span className="dot w"></span>34 days
                  </span>
                </td>
              </tr>
              <tr>
                <td><b>B-2410</b></td>
                <td>2026-01-15</td>
                <td>48 PCS</td>
                <td>
                  <span className="mini-s" style={{ color: 'var(--success)' }}>
                    <span className="dot g"></span>OK
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: '12px' }}>
            <div className="mv">
              <span>2025-10-24 <span className="t">· PO #0841</span></span>
              <span className="in">+240 PCS</span>
            </div>
            <div className="mv">
              <span>2025-10-25 <span className="t">· sales</span></span>
              <span className="out">−96 PCS</span>
            </div>
            <div className="mv">
              <span>2025-10-26 <span className="t">· opname #014</span></span>
              <span className="adj">±0 variance</span>
            </div>
          </div>
        </div>

        <div data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
          <div className="eyebrow ep">
            <span className="eb-dot"></span>INVENTORY
          </div>
          <h2 className="h2">Stok multi-satuan &amp; batch expiry presisi.</h2>
          <p className="lead">
            Lacak mutasi stok, konversi bertingkat, dan peringatan kedaluwarsa secara real-time.
          </p>
          <ul className="blist">
            <li>
              <Boxes size={16} />
              <span>
                <b>Hierarki Satuan Bertingkat</b> — jual per Box, Pack, atau Pcs dengan konversi &amp; harga otomatis.
              </span>
            </li>
            <li>
              <Timer size={16} />
              <span>
                <b>Batch No &amp; Tanggal Kadaluarsa</b> — pantau item mendekati kadaluarsa di kasir dan laporan.
              </span>
            </li>
            <li>
              <History size={16} />
              <span>
                <b>Kartu Stok (Ledger) Akurat</b> — setiap mutasi tercatat permanen tanpa ditimpa.
              </span>
            </li>
            <li>
              <CheckCheck size={16} />
              <span>
                <b>Stock Opname Cepat</b> — selisih stok fisik langsung direkonsiliasi ke jurnal penyesuaian.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default InventoryDeepDive;

