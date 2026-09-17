import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export const AccountingView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="panel-head">
        <div>
          <span className="panel-title">Jurnal Otomatis (Double-Entry Bookkeeping)</span>
          <p className="panel-sub">Setiap transaksi kasir &amp; penerimaan barang langsung membentuk jurnal debit-kredit.</p>
        </div>
        <span className="pill">
          <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />
          Seimbang (Balanced)
        </span>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--heading)' }}>
            Jurnal Umum #JE-2026-0916 · Penjualan POS Kasir
          </span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--dim)' }}>
            16 Sep 2026 14:32 WIB
          </span>
        </div>

        <table className="k-table">
          <thead>
            <tr>
              <th>Kode Akun</th>
              <th>Nama Akun</th>
              <th style={{ textAlign: 'right' }}>Debet</th>
              <th style={{ textAlign: 'right' }}>Kredit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="mono">1101</td>
              <td><b>Kas Kasir (Drawer Cash)</b></td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--success)' }}>Rp 1.450.000</td>
              <td className="mono" style={{ textAlign: 'right' }}>—</td>
            </tr>
            <tr>
              <td className="mono">1102</td>
              <td><b>Bank BCA / QRIS Settlement</b></td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--success)' }}>Rp 790.000</td>
              <td className="mono" style={{ textAlign: 'right' }}>—</td>
            </tr>
            <tr>
              <td className="mono">5101</td>
              <td><b>Beban Pokok Pendapatan (HPP/COGS)</b></td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--success)' }}>Rp 1.340.000</td>
              <td className="mono" style={{ textAlign: 'right' }}>—</td>
            </tr>
            <tr>
              <td className="mono">4101</td>
              <td><b>Pendapatan Penjualan Ritel</b></td>
              <td className="mono" style={{ textAlign: 'right' }}>—</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--primary)' }}>Rp 2.240.000</td>
            </tr>
            <tr>
              <td className="mono">1301</td>
              <td><b>Persediaan Barang Dagang</b></td>
              <td className="mono" style={{ textAlign: 'right' }}>—</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--primary)' }}>Rp 1.340.000</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 800, borderTop: '2px solid var(--line)' }}>
              <td colSpan={2}>TOTAL BALANCE</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--success)' }}>Rp 3.580.000</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--success)' }}>Rp 3.580.000</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default AccountingView;

