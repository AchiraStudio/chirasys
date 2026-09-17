import React, { useState } from 'react';
import {
  BookOpen,
  Scale,
  CheckCircle2,
  Download,
} from 'lucide-react';

export const RealAccountingView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pl' | 'journal'>('journal');

  const JOURNAL_ENTRIES = [
    {
      date: '15/09 14:28',
      ref: 'POS #KV-1284',
      memo: 'Penjualan Kasir Kas Tunai (3 items)',
      debitAcc: '1-110 Kas Toko Kasir',
      creditAcc: '4-100 Pendapatan Penjualan Toko',
      debitVal: 'Rp 86.000',
      creditVal: 'Rp 86.000',
    },
    {
      date: '15/09 14:28',
      ref: 'HPP #KV-1284',
      memo: 'Pengakuan HPP Barang Terjual (FIFO)',
      debitAcc: '5-100 Beban Pokok Penjualan (HPP)',
      creditAcc: '1-130 Persediaan Barang Dagang',
      debitVal: 'Rp 59.500',
      creditVal: 'Rp 59.500',
    },
    {
      date: '15/09 14:15',
      ref: 'POS #KV-1283',
      memo: 'Penjualan QRIS Dinamis (Siti VIP)',
      debitAcc: '1-112 Kas Kliring QRIS',
      creditAcc: '4-100 Pendapatan Penjualan Toko',
      debitVal: 'Rp 12.500',
      creditVal: 'Rp 12.500',
    },
    {
      date: '15/09 11:20',
      ref: 'PO #KV-0841',
      memo: 'Pelunasan Penerimaan Barang PT Mayora',
      debitAcc: '1-130 Persediaan Barang Dagang',
      creditAcc: '1-111 Kas Bank Operasional BCA',
      debitVal: 'Rp 4.250.000',
      creditVal: 'Rp 4.250.000',
    },
    {
      date: '14/09 18:30',
      ref: 'SHIFT #46',
      memo: 'Penutupan Shift Kasir & Rekonsiliasi Kas',
      debitAcc: '1-111 Kas Bank Setoran',
      creditAcc: '1-110 Kas Toko Kasir',
      debitVal: 'Rp 11.450.000',
      creditVal: 'Rp 11.450.000',
    },
  ];

  return (
    <div className="real-view-container">
      {/* Top Segmented TabBar */}
      <div className="real-tab-bar-wrapper">
        <div className="segmented-tab-bar">
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'journal' ? 'active' : ''}`}
            onClick={() => setActiveTab('journal')}
          >
            <BookOpen size={15} />
            <span>Jurnal Otomatis &amp; Buku Besar (General Ledger)</span>
          </button>
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'pl' ? 'active' : ''}`}
            onClick={() => setActiveTab('pl')}
          >
            <Scale size={15} />
            <span>Laba Rugi &amp; Neraca (Realtime P&amp;L)</span>
          </button>
        </div>

        <div className="tab-bar-right-actions">
          <button type="button" className="action-btn-secondary">
            <Download size={14} />
            <span>Export PDF / Excel</span>
          </button>
        </div>
      </div>

      {activeTab === 'journal' && (
        <div className="real-panel mt-3">
          <div className="real-panel-head">
            <div>
              <span className="real-panel-title">Jurnal Pembukuan Berpasangan (Double-Entry)</span>
              <span className="real-panel-sub">Terposting otomatis setiap kasir menekan tombol Bayar</span>
            </div>
            <span className="status-pill success">
              <CheckCircle2 size={11} /> Neraca Seimbang 100% (Balanced)
            </span>
          </div>

          <div className="real-table-wrapper mt-2">
            <table className="real-data-table">
              <thead>
                <tr>
                  <th>Tgl / Jam</th>
                  <th>No. Referensi</th>
                  <th>Akun Debit &amp; Akun Kredit</th>
                  <th>Keterangan Transaksi</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Kredit</th>
                </tr>
              </thead>
              <tbody>
                {JOURNAL_ENTRIES.map((entry, idx) => (
                  <tr key={idx}>
                    <td className="text-dim text-xs font-mono">{entry.date}</td>
                    <td>
                      <span className="mono font-bold text-heading">{entry.ref}</span>
                    </td>
                    <td>
                      <div className="text-xs">
                        <div className="font-semibold text-primary">Dr. {entry.debitAcc}</div>
                        <div className="text-dim pl-3">Cr. {entry.creditAcc}</div>
                      </div>
                    </td>
                    <td className="text-xs text-body">{entry.memo}</td>
                    <td className="text-right font-bold text-heading tnum">{entry.debitVal}</td>
                    <td className="text-right font-bold text-heading tnum">{entry.creditVal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pl' && (
        <div className="real-panel mt-3">
          <div className="real-panel-head">
            <div>
              <span className="real-panel-title">Laporan Laba Rugi Berjalan (P&amp;L Statement)</span>
              <span className="real-panel-sub">Periode: 01 September 2026 – Hari Ini</span>
            </div>
            <span className="badge-tag">Otomatis Terintegrasi Transaksi Kasir</span>
          </div>

          <div className="pl-financial-cards mt-3">
            <div className="pl-stat-box">
              <span className="pl-stat-label">Total Pendapatan Penjualan</span>
              <div className="pl-stat-val tnum text-heading">Rp 42.850.000</div>
              <span className="text-xs text-dim">Dari 612 struk transaksi</span>
            </div>

            <div className="pl-stat-box">
              <span className="pl-stat-label">Beban Pokok Penjualan (HPP)</span>
              <div className="pl-stat-val tnum text-warning">Rp 29.600.000</div>
              <span className="text-xs text-dim">Metode FIFO persediaan barang</span>
            </div>

            <div className="pl-stat-box highlight">
              <span className="pl-stat-label">Laba Kotor (Gross Profit)</span>
              <div className="pl-stat-val tnum text-primary font-bold">Rp 13.250.000</div>
              <span className="text-xs text-success font-semibold">Margin Laba: 30.9%</span>
            </div>

            <div className="pl-stat-box">
              <span className="pl-stat-label">Beban Operasional Toko</span>
              <div className="pl-stat-val tnum text-dim">Rp 3.400.000</div>
              <span className="text-xs text-dim">Listrik, internet, kemasan</span>
            </div>

            <div className="pl-stat-box net-box">
              <span className="pl-stat-label font-bold">Laba Bersih Toko (Net Profit)</span>
              <div className="pl-stat-val tnum text-success font-extrabold text-lg">Rp 9.850.000</div>
              <span className="text-xs text-dim">Siap ditarik dividen owner</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealAccountingView;
