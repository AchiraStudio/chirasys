import React, { useState } from 'react';
import {
  PackageCheck,
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Building2,
} from 'lucide-react';

export const RealPurchasingView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'receive' | 'suppliers'>('receive');
  const [searchQuery, setSearchQuery] = useState('');

  const PURCHASE_ORDERS = [
    {
      id: 'PO-2026-0841',
      date: '15 Sep 2026',
      supplier: 'PT Mayora Indah Tbk',
      itemsCount: '6 jenis barang',
      totalAmount: 'Rp 4.250.000',
      receiveStatus: 'Diterima',
      receiveType: 'success',
      paymentStatus: 'Lunas (BCA)',
      invoiceNo: 'INV-MYR-9921',
    },
    {
      id: 'PO-2026-0840',
      date: '14 Sep 2026',
      supplier: 'PT Indofood CBP Makmur',
      itemsCount: '12 jenis barang',
      totalAmount: 'Rp 8.720.000',
      receiveStatus: 'Diterima',
      receiveType: 'success',
      paymentStatus: 'Tempo 30 Hari',
      invoiceNo: 'INV-IDF-8114',
    },
    {
      id: 'PO-2026-0839',
      date: '12 Sep 2026',
      supplier: 'CV Sumber Rejeki Bakery',
      itemsCount: '4 jenis barang',
      totalAmount: 'Rp 1.150.000',
      receiveStatus: 'Parsial (2/4)',
      receiveType: 'warning',
      paymentStatus: 'Menunggu Faktur',
      invoiceNo: '-',
    },
    {
      id: 'PO-2026-0838',
      date: '10 Sep 2026',
      supplier: 'PT Sari Multi Utama',
      itemsCount: '8 jenis barang',
      totalAmount: 'Rp 3.400.000',
      receiveStatus: 'Diterima',
      receiveType: 'success',
      paymentStatus: 'Lunas (Mandiri)',
      invoiceNo: 'INV-SMU-1102',
    },
  ];

  const SUPPLIERS = [
    { name: 'PT Mayora Indah Tbk', contact: 'Budi Santoso (0812-3456-7890)', city: 'Tangerang', terms: 'Cash / 14 Hari', activePOs: 4 },
    { name: 'PT Indofood CBP Makmur', contact: 'Hendra Wijaya (0811-9876-5432)', city: 'Jakarta', terms: 'Tempo 30 Hari', activePOs: 6 },
    { name: 'CV Sumber Rejeki Bakery', contact: 'Ibu Ratna (0813-2233-4455)', city: 'Bandung', terms: 'Konsinyasi Mingguan', activePOs: 2 },
    { name: 'PT Sari Multi Utama', contact: 'Agus Salim (0818-5566-7788)', city: 'Bekasi', terms: 'Cash on Delivery', activePOs: 3 },
  ];

  return (
    <div className="real-view-container">
      {/* Top Segmented TabBar */}
      <div className="real-tab-bar-wrapper">
        <div className="segmented-tab-bar">
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'receive' ? 'active' : ''}`}
            onClick={() => setActiveTab('receive')}
          >
            <PackageCheck size={15} />
            <span>Penerimaan Barang (PO &amp; Direct Receiving)</span>
          </button>
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
            onClick={() => setActiveTab('suppliers')}
          >
            <Truck size={15} />
            <span>Data Pemasok (Suppliers)</span>
          </button>
        </div>

        <div className="tab-bar-right-actions">
          <button type="button" className="action-btn-primary">
            <Plus size={14} />
            <span>Buat PO Baru</span>
          </button>
        </div>
      </div>

      {activeTab === 'receive' && (
        <div className="real-panel mt-3">
          <div className="table-filter-bar">
            <div className="filter-search-box">
              <Search size={14} className="text-dim" />
              <input
                type="text"
                placeholder="Cari nomor PO, nama supplier, atau nomor invoice..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="filter-search-input"
              />
            </div>
            <span className="badge-tag">Otomatis Update HPP &amp; Jurnal Hutang</span>
          </div>

          <div className="real-table-wrapper">
            <table className="real-data-table">
              <thead>
                <tr>
                  <th>No. PO</th>
                  <th>Tanggal</th>
                  <th>Nama Pemasok (Supplier)</th>
                  <th>Items</th>
                  <th className="text-right">Total Tagihan</th>
                  <th>Status Penerimaan</th>
                  <th>Status Pembayaran</th>
                </tr>
              </thead>
              <tbody>
                {PURCHASE_ORDERS.map(po => (
                  <tr key={po.id}>
                    <td>
                      <span className="mono font-bold text-heading">{po.id}</span>
                      <span className="text-xs text-dim block">Inv: {po.invoiceNo}</span>
                    </td>
                    <td className="text-dim text-xs">{po.date}</td>
                    <td>
                      <span className="font-semibold text-heading">{po.supplier}</span>
                    </td>
                    <td className="text-xs text-dim">{po.itemsCount}</td>
                    <td className="text-right font-bold text-heading tnum">{po.totalAmount}</td>
                    <td>
                      <span className={`status-pill ${po.receiveType}`}>
                        {po.receiveType === 'success' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        {po.receiveStatus}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-dim">{po.paymentStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="real-panel mt-3">
          <div className="real-table-wrapper">
            <table className="real-data-table">
              <thead>
                <tr>
                  <th>Nama Perusahaan</th>
                  <th>Kontak &amp; Telepon</th>
                  <th>Kota</th>
                  <th>Syarat Pembayaran</th>
                  <th className="text-right">Total PO Aktif</th>
                </tr>
              </thead>
              <tbody>
                {SUPPLIERS.map(sup => (
                  <tr key={sup.name}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Building2 size={15} className="text-primary" />
                        <span className="font-bold text-heading">{sup.name}</span>
                      </div>
                    </td>
                    <td className="text-dim text-xs">{sup.contact}</td>
                    <td className="text-xs">{sup.city}</td>
                    <td>
                      <span className="category-tag">{sup.terms}</span>
                    </td>
                    <td className="text-right font-bold text-heading tnum">{sup.activePOs} PO</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealPurchasingView;
