import React, { useState } from 'react';
import {
  Package,
  ClipboardList,
  Layers,
  Search,
  Plus,
  ArrowRight,
  Boxes,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export const RealInventoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'stock' | 'opname' | 'master'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  const INVENTORY_ITEMS = [
    {
      id: '1',
      name: 'Kopi Susu Botol 250ml',
      sku: 'KV-COF-01',
      category: 'Minuman',
      baseUnit: 'Pcs',
      units: '1 Box = 24 Pcs · 1 Pack = 6 Pcs',
      priceRetail: 'Rp 18.000',
      priceWholesale: 'Rp 15.000',
      stock: 144,
      minStock: 48,
      status: 'Aman',
      statusType: 'success',
      batches: [
        { batch: 'B-2409', expiry: '2026-11-28', qty: '96 Pcs', status: '34 hari lagi', statusColor: 'warning' },
        { batch: 'B-2410', expiry: '2027-01-15', qty: '48 Pcs', status: 'Aman', statusColor: 'success' },
      ],
    },
    {
      id: '2',
      name: 'Roti Coklat Keju Panggang',
      sku: 'KV-BAK-04',
      category: 'Makanan',
      baseUnit: 'Bks',
      units: '1 Krat = 20 Bks',
      priceRetail: 'Rp 14.000',
      priceWholesale: 'Rp 12.000',
      stock: 6,
      minStock: 15,
      status: 'Menipis',
      statusType: 'warning',
      batches: [
        { batch: 'B-2411', expiry: '2026-09-24', qty: '6 Bks', status: '7 hari lagi', statusColor: 'danger' },
      ],
    },
    {
      id: '3',
      name: 'Air Mineral Pegunungan 600ml',
      sku: 'KV-WTR-03',
      category: 'Minuman',
      baseUnit: 'Btl',
      units: '1 Dus = 24 Btl',
      priceRetail: 'Rp 5.000',
      priceWholesale: 'Rp 4.200',
      stock: 240,
      minStock: 72,
      status: 'Aman',
      statusType: 'success',
      batches: [
        { batch: 'B-2401', expiry: '2027-05-10', qty: '240 Btl', status: 'Aman', statusColor: 'success' },
      ],
    },
    {
      id: '4',
      name: 'Sabun Mandi Herbal Alami 85g',
      sku: 'KV-SOAP-09',
      category: 'Perawatan',
      baseUnit: 'Pcs',
      units: '1 Lusin = 12 Pcs',
      priceRetail: 'Rp 16.500',
      priceWholesale: 'Rp 14.000',
      stock: 4,
      minStock: 12,
      status: 'Kritis',
      statusType: 'danger',
      batches: [
        { batch: 'B-2399', expiry: '2027-08-20', qty: '4 Pcs', status: 'Aman', statusColor: 'success' },
      ],
    },
    {
      id: '5',
      name: 'Minyak Goreng Sawit 2L',
      sku: 'KV-OIL-07',
      category: 'Sembako',
      baseUnit: 'Pch',
      units: '1 Karton = 6 Pch',
      priceRetail: 'Rp 34.500',
      priceWholesale: 'Rp 32.000',
      stock: 42,
      minStock: 18,
      status: 'Aman',
      statusType: 'success',
      batches: [
        { batch: 'B-2412', expiry: '2027-03-30', qty: '42 Pch', status: 'Aman', statusColor: 'success' },
      ],
    },
  ];

  const filteredItems = INVENTORY_ITEMS.filter(item => {
    const matchesCat = selectedCategory === 'Semua' || item.category === selectedCategory;
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="real-view-container">
      {/* Top Segmented TabBar (exact replica of TabBar.tsx) */}
      <div className="real-tab-bar-wrapper">
        <div className="segmented-tab-bar">
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            <Boxes size={15} />
            <span>Katalog Produk</span>
          </button>
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            <Package size={15} />
            <span>Stok Multi-Unit &amp; Batch</span>
            <span className="tab-badge">2 Alert</span>
          </button>
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'opname' ? 'active' : ''}`}
            onClick={() => setActiveTab('opname')}
          >
            <ClipboardList size={15} />
            <span>Stock Opname</span>
          </button>
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'master' ? 'active' : ''}`}
            onClick={() => setActiveTab('master')}
          >
            <Layers size={15} />
            <span>Master Data</span>
          </button>
        </div>

        <div className="tab-bar-right-actions">
          <button type="button" className="action-btn-secondary">
            <FileSpreadsheet size={14} />
            <span>Import / Export Excel</span>
          </button>
          <button type="button" className="action-btn-primary">
            <Plus size={14} />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {activeTab === 'catalog' && (
        <div className="real-panel mt-3">
          {/* Filter & Search Bar */}
          <div className="table-filter-bar">
            <div className="filter-search-box">
              <Search size={14} className="text-dim" />
              <input
                type="text"
                placeholder="Cari nama barang, barcode atau SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="filter-search-input"
              />
            </div>

            <div className="category-filter-pills">
              {['Semua', 'Minuman', 'Makanan', 'Sembako', 'Perawatan'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`cat-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Data Table */}
          <div className="real-table-wrapper">
            <table className="real-data-table">
              <thead>
                <tr>
                  <th>Produk &amp; SKU</th>
                  <th>Kategori</th>
                  <th>Konversi Multi-Unit</th>
                  <th>Harga Ecer / Grosir</th>
                  <th className="text-right">Sisa Stok</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="item-cell-name">
                        <span className="font-bold text-heading">{item.name}</span>
                        <span className="mono text-xs text-dim">{item.sku}</span>
                      </div>
                    </td>
                    <td>
                      <span className="category-tag">{item.category}</span>
                    </td>
                    <td>
                      <span className="multi-unit-tag">{item.units}</span>
                    </td>
                    <td>
                      <div className="text-xs">
                        <span className="font-semibold text-heading tnum">{item.priceRetail}</span>
                        <span className="text-dim block tnum">Grosir: {item.priceWholesale}</span>
                      </div>
                    </td>
                    <td className="text-right font-bold text-heading tnum">
                      {item.stock} {item.baseUnit}
                    </td>
                    <td>
                      <span className={`status-pill ${item.statusType}`}>
                        {item.statusType === 'success' && <CheckCircle2 size={11} />}
                        {item.statusType === 'warning' && <AlertTriangle size={11} />}
                        {item.statusType === 'danger' && <AlertTriangle size={11} />}
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="real-panel mt-3">
          <div className="real-panel-head">
            <div>
              <span className="real-panel-title">Detail Multi-Unit &amp; Batch Expiry</span>
              <span className="real-panel-sub">Kopi Susu Botol 250ml · SKU: KV-COF-01</span>
            </div>
            <span className="status-pill success">
              <CheckCircle2 size={11} /> Total 144 Pcs
            </span>
          </div>

          {/* Multi-Unit Conversion Hierarchy Card */}
          <div className="unit-conversion-hierarchy">
            <div className="unit-tier-card">
              <div className="tier-header">BOX (Tingkat 1)</div>
              <div className="tier-content">
                <span className="tier-ratio">1 Box = 24 Pcs</span>
                <span className="tier-stock tnum">6 Box</span>
                <span className="tier-price tnum">Rp 192.000</span>
              </div>
            </div>

            <div className="tier-connector">
              <ArrowRight size={18} className="text-dim" />
            </div>

            <div className="unit-tier-card">
              <div className="tier-header">PACK (Tingkat 2)</div>
              <div className="tier-content">
                <span className="tier-ratio">1 Pack = 6 Pcs</span>
                <span className="tier-stock tnum">24 Pack</span>
                <span className="tier-price tnum">Rp 49.800</span>
              </div>
            </div>

            <div className="tier-connector">
              <ArrowRight size={18} className="text-dim" />
            </div>

            <div className="unit-tier-card primary-tier">
              <div className="tier-header">PCS (Unit Dasar)</div>
              <div className="tier-content">
                <span className="tier-ratio">Unit Terkecil Kasir</span>
                <span className="tier-stock tnum text-primary font-bold">144 Pcs</span>
                <span className="tier-price tnum">Rp 8.500</span>
              </div>
            </div>
          </div>

          {/* Batch Tracking Table */}
          <div className="mt-4">
            <h5 className="section-subheading">Tracking Batch Nomor &amp; Tanggal Kadaluarsa (FIFO)</h5>
            <div className="real-table-wrapper mt-2">
              <table className="real-data-table">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Tgl Kadaluarsa</th>
                    <th>Stok Batch</th>
                    <th>Lokasi Rak</th>
                    <th>Status Usia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold mono text-heading">B-2409</td>
                    <td className="text-dim">28 Nov 2026</td>
                    <td className="font-bold tnum">96 Pcs</td>
                    <td>Rak B2 (Depan)</td>
                    <td>
                      <span className="status-pill warning">
                        <Clock size={11} /> 34 hari lagi (Prioritas Jual)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold mono text-heading">B-2410</td>
                    <td className="text-dim">15 Jan 2027</td>
                    <td className="font-bold tnum">48 Pcs</td>
                    <td>Gudang Belakang G-1</td>
                    <td>
                      <span className="status-pill success">
                        <CheckCircle2 size={11} /> Aman (&gt; 90 hari)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'opname' && (
        <div className="real-panel mt-3 text-center py-10">
          <ClipboardList size={36} className="text-primary mx-auto mb-2 opacity-80" />
          <h4 className="font-bold text-heading text-base">Modul Stock Opname Terjadwal</h4>
          <p className="text-dim text-xs max-w-md mx-auto mt-1">
            Lakukan perhitungan fisik stok di rak menggunakan barcode scanner portabel tanpa menghentikan transaksi kasir yang sedang berjalan.
          </p>
        </div>
      )}

      {activeTab === 'master' && (
        <div className="real-panel mt-3 text-center py-10">
          <Layers size={36} className="text-accent mx-auto mb-2 opacity-80" />
          <h4 className="font-bold text-heading text-base">Konfigurasi Master Data &amp; Satuan</h4>
          <p className="text-dim text-xs max-w-md mx-auto mt-1">
            Kelola hierarki kategori, master merk pabrik, satuan unit kustom, dan relasi multi-gudang cabang.
          </p>
        </div>
      )}
    </div>
  );
};

export default RealInventoryView;
