import React, { useState } from 'react';

interface InvItem {
  name: string;
  unit: string;
  stock: number;
  min: number;
  exp: string;
  status: 'OK' | 'LOW' | 'EXPIRING';
  statusColor: 'g' | 'w';
  units: [string, string, string][];
  batches: [string, string, string, 'g' | 'w', string][];
  movements: [string, string, 'in' | 'out' | 'adj', string][];
}

const INVENTORY_DATA: InvItem[] = [
  {
    name: 'Kopi Susu Botol 250ml',
    unit: 'PCS',
    stock: 144,
    min: 48,
    exp: '2026-01-15',
    status: 'OK',
    statusColor: 'g',
    units: [
      ['BOX', '1 Box = 24 Pcs', 'Rp 192.000'],
      ['PACK', '1 Pack = 6 Pcs', 'Rp 49.800'],
      ['PCS', '144 in stock · min 48', 'Rp 8.500'],
    ],
    batches: [
      ['B-2409', '2025-11-28', '96 PCS', 'w', '34 hari lagi'],
      ['B-2410', '2026-01-15', '48 PCS', 'g', 'Aman (118 hari)'],
    ],
    movements: [
      ['2025-10-24', 'Penerimaan PO #0841', 'in', '+240 PCS'],
      ['2025-10-25', 'Penjualan Kasir POS', 'out', '−96 PCS'],
      ['2025-10-26', 'Stock Opname Bulanan #014', 'adj', '±0 variance'],
    ],
  },
  {
    name: 'Gula Pasir Kristal 1kg',
    unit: 'PACK',
    stock: 6,
    min: 20,
    exp: '2026-02-14',
    status: 'LOW',
    statusColor: 'w',
    units: [
      ['BOX', '1 Box = 20 Pack · 0 in stock', 'Rp 198.000'],
      ['PACK', '6 in stock · min 20', 'Rp 10.500'],
    ],
    batches: [['B-2410', '2026-02-14', '6 PACK', 'g', 'Aman']],
    movements: [
      ['2025-10-20', 'Penerimaan PO #0839', 'in', '+20 PACK'],
      ['2025-10-24', 'Penjualan Kasir', 'out', '−14 PACK'],
    ],
  },
  {
    name: 'Teh Celup Melati 25s',
    unit: 'BOX',
    stock: 3,
    min: 5,
    exp: '2025-10-30',
    status: 'EXPIRING',
    statusColor: 'w',
    units: [
      ['BOX', '1 Box = 10 Pack · 3 in stock', 'Rp 96.000'],
      ['PACK', '1 Pack = 20 sachet', 'Rp 9.800'],
    ],
    batches: [['B-2408', '2025-10-30', '3 BOX', 'w', '18 hari lagi']],
    movements: [
      ['2025-10-18', 'Penerimaan PO #0836', 'in', '+5 BOX'],
      ['2025-10-22', 'Penjualan Kasir', 'out', '−2 BOX'],
    ],
  },
  {
    name: 'Paracetamol 500mg Tablet',
    unit: 'PCS',
    stock: 420,
    min: 100,
    exp: '2026-08-02',
    status: 'OK',
    statusColor: 'g',
    units: [
      ['BOX', '1 Box = 20 strip', 'Rp 58.000'],
      ['STRIP', '1 Strip = 10 pcs', 'Rp 3.200'],
      ['PCS', '420 in stock', 'Rp 350'],
    ],
    batches: [['B-2411', '2026-08-02', '420 PCS', 'g', 'Aman']],
    movements: [
      ['2025-10-21', 'Penerimaan PO #0840', 'in', '+500 PCS'],
      ['2025-10-25', 'Penjualan Kasir', 'out', '−80 PCS'],
    ],
  },
  {
    name: 'Susu UHT Full Cream 1L',
    unit: 'PCS',
    stock: 72,
    min: 36,
    exp: '2025-12-15',
    status: 'OK',
    statusColor: 'g',
    units: [
      ['BOX', '1 Box = 12 Pcs · 6 in stock', 'Rp 228.000'],
      ['PCS', '72 in stock · min 36', 'Rp 19.500'],
    ],
    batches: [['B-2409', '2025-12-15', '72 PCS', 'g', 'Aman']],
    movements: [
      ['2025-10-19', 'Penerimaan PO #0838', 'in', '+120 PCS'],
      ['2025-10-25', 'Penjualan Kasir', 'out', '−48 PCS'],
    ],
  },
];

export const InventoryView: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedItem = INVENTORY_DATA[selectedIdx];

  return (
    <div className="inv-sim">
      {/* Table List Column */}
      <div className="inv-table-col">
        <table className="k-table">
          <thead>
            <tr>
              <th>Nama Produk</th>
              <th>Satuan</th>
              <th>Stok</th>
              <th>Min</th>
              <th>Kadaluarsa</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="invBody">
            {INVENTORY_DATA.map((item, idx) => (
              <tr
                key={item.name}
                className={`click ${idx === selectedIdx ? 'sel' : ''}`}
                onClick={() => setSelectedIdx(idx)}
              >
                <td>
                  <b>{item.name}</b>
                </td>
                <td>{item.unit}</td>
                <td className="mono">{item.stock}</td>
                <td className="mono">{item.min}</td>
                <td className="mono">{item.exp}</td>
                <td>
                  <span
                    className="mini-s"
                    style={{
                      color:
                        item.statusColor === 'g'
                          ? 'var(--success)'
                          : 'var(--warning)',
                    }}
                  >
                    <span className={`dot ${item.statusColor}`} />
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Item Detail & Hierarchical Units Column */}
      <div className="inv-detail-col" id="invDetail">
        <div className="panel-head">
          <span className="panel-title">{selectedItem.name}</span>
          <span
            className="mini-s"
            style={{
              color:
                selectedItem.statusColor === 'g'
                  ? 'var(--success)'
                  : 'var(--warning)',
            }}
          >
            <span className={`dot ${selectedItem.statusColor}`} />
            {selectedItem.status}
          </span>
        </div>

        {/* Hierarchical Unit Conversions */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', marginBottom: 6 }}>
            KONVERSI MULTI-SATUAN
          </div>
          <div className="unit-row">
            {selectedItem.units.map((u, j) => (
              <React.Fragment key={u[0]}>
                {j > 0 && <span className="unit-arr">→</span>}
                <span className="unit-chip">
                  <b>{u[0]}</b>
                  <span>{u[1]}</span>
                </span>
              </React.Fragment>
            ))}
          </div>
          <div className="unit-row" style={{ marginTop: 6 }}>
            {selectedItem.units.map(u => (
              <span key={u[0]} className="chip">
                {u[0]} · {u[2]}
              </span>
            ))}
          </div>
        </div>

        {/* Batches & Expiration */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', marginBottom: 6 }}>
            BATCH &amp; TANGGAL KADALUARSA
          </div>
          <table className="k-table">
            <thead>
              <tr>
                <th>Batch No</th>
                <th>Expired</th>
                <th>Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedItem.batches.map(b => (
                <tr key={b[0]}>
                  <td>
                    <b>{b[0]}</b>
                  </td>
                  <td className="mono">{b[1]}</td>
                  <td>{b[2]}</td>
                  <td>
                    <span
                      className="mini-s"
                      style={{
                        color: b[3] === 'g' ? 'var(--success)' : 'var(--warning)',
                      }}
                    >
                      <span className={`dot ${b[3]}`} />
                      {b[4]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stock Ledger Movements */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', marginBottom: 6 }}>
            KARTU STOK MUTASI TERAKHIR
          </div>
          <div>
            {selectedItem.movements.map((m, idx) => (
              <div key={idx} className="mv">
                <span>
                  {m[0]} <span className="t">· {m[1]}</span>
                </span>
                <span className={m[2]}>{m[3]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryView;

