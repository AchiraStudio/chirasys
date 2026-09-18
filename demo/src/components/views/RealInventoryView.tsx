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
  const [selectedCategory, setSelectedCategory] = useState('All');

  const INVENTORY_ITEMS = [
    {
      id: '1',
      name: 'Signature Iced Latte 250ml',
      sku: 'KV-COF-01',
      category: 'Beverages',
      baseUnit: 'Pcs',
      units: '1 Box = 24 Pcs · 1 Pack = 6 Pcs',
      priceRetail: '$4.50',
      priceWholesale: '$3.75',
      stock: 144,
      minStock: 48,
      status: 'Optimal',
      statusType: 'success',
      batches: [
        { batch: 'B-2409', expiry: '2026-11-28', qty: '96 Pcs', status: '34 days left', statusColor: 'warning' },
        { batch: 'B-2410', expiry: '2027-01-15', qty: '48 Pcs', status: 'Optimal', statusColor: 'success' },
      ],
    },
    {
      id: '2',
      name: 'Toasted Chocolate Brioche',
      sku: 'KV-BAK-04',
      category: 'Bakery',
      baseUnit: 'Pcs',
      units: '1 Crate = 20 Pcs',
      priceRetail: '$3.50',
      priceWholesale: '$2.80',
      stock: 6,
      minStock: 15,
      status: 'Low Stock',
      statusType: 'warning',
      batches: [
        { batch: 'B-2411', expiry: '2026-09-24', qty: '6 Pcs', status: '7 days left', statusColor: 'danger' },
      ],
    },
    {
      id: '3',
      name: 'Mountain Spring Water 600ml',
      sku: 'KV-WTR-03',
      category: 'Beverages',
      baseUnit: 'Btl',
      units: '1 Case = 24 Btl',
      priceRetail: '$1.50',
      priceWholesale: '$1.10',
      stock: 240,
      minStock: 72,
      status: 'Optimal',
      statusType: 'success',
      batches: [
        { batch: 'B-2401', expiry: '2027-05-10', qty: '240 Btl', status: 'Optimal', statusColor: 'success' },
      ],
    },
    {
      id: '4',
      name: 'Botanical Herbal Bar Soap 85g',
      sku: 'KV-SOAP-09',
      category: 'Personal Care',
      baseUnit: 'Pcs',
      units: '1 Dozen = 12 Pcs',
      priceRetail: '$4.00',
      priceWholesale: '$3.20',
      stock: 4,
      minStock: 12,
      status: 'Critical',
      statusType: 'danger',
      batches: [
        { batch: 'B-2399', expiry: '2027-08-20', qty: '4 Pcs', status: 'Optimal', statusColor: 'success' },
      ],
    },
    {
      id: '5',
      name: 'Organic Pure Olive Oil 1L',
      sku: 'KV-OIL-07',
      category: 'Groceries',
      baseUnit: 'Btl',
      units: '1 Carton = 6 Btl',
      priceRetail: '$12.50',
      priceWholesale: '$10.50',
      stock: 42,
      minStock: 18,
      status: 'Optimal',
      statusType: 'success',
      batches: [
        { batch: 'B-2412', expiry: '2027-03-30', qty: '42 Btl', status: 'Optimal', statusColor: 'success' },
      ],
    },
  ];

  const filteredItems = INVENTORY_ITEMS.filter(item => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
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
            <span>Product Catalog</span>
          </button>
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            <Package size={15} />
            <span>Multi-Unit &amp; Batches</span>
            <span className="tab-badge">2 Alerts</span>
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
            <span>Add Product</span>
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
                placeholder="Search product name, barcode, or SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="filter-search-input"
              />
            </div>

            <div className="category-filter-pills">
              {['All', 'Beverages', 'Bakery', 'Groceries', 'Personal Care'].map(cat => (
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
                  <th>Product &amp; SKU</th>
                  <th>Category</th>
                  <th>Multi-Unit Conversion</th>
                  <th>Retail / Wholesale Price</th>
                  <th className="text-right">In Stock</th>
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
                        <span className="text-dim block tnum">Wholesale: {item.priceWholesale}</span>
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
              <span className="real-panel-title">Multi-Unit Hierarchy &amp; Batch Expiry</span>
              <span className="real-panel-sub">Signature Iced Latte 250ml · SKU: KV-COF-01</span>
            </div>
            <span className="status-pill success">
              <CheckCircle2 size={11} /> Total 144 Pcs
            </span>
          </div>

          {/* Multi-Unit Conversion Hierarchy Card */}
          <div className="unit-conversion-hierarchy">
            <div className="unit-tier-card">
              <div className="tier-header">MASTER BOX (Tier 1)</div>
              <div className="tier-content">
                <span className="tier-ratio">1 Box = 24 Pcs</span>
                <span className="tier-stock tnum">6 Boxes</span>
                <span className="tier-price tnum">$90.00</span>
              </div>
            </div>

            <div className="tier-connector">
              <ArrowRight size={18} className="text-dim" />
            </div>

            <div className="unit-tier-card">
              <div className="tier-header">INNER PACK (Tier 2)</div>
              <div className="tier-content">
                <span className="tier-ratio">1 Pack = 6 Pcs</span>
                <span className="tier-stock tnum">24 Packs</span>
                <span className="tier-price tnum">$24.00</span>
              </div>
            </div>

            <div className="tier-connector">
              <ArrowRight size={18} className="text-dim" />
            </div>

            <div className="unit-tier-card primary-tier">
              <div className="tier-header">BASE PCS (Unit)</div>
              <div className="tier-content">
                <span className="tier-ratio">POS Counter Retail</span>
                <span className="tier-stock tnum text-primary font-bold">144 Pcs</span>
                <span className="tier-price tnum">$4.50</span>
              </div>
            </div>
          </div>

          {/* Batch Tracking Table */}
          <div className="mt-4">
            <h5 className="section-subheading">Batch Lot Tracking &amp; Expiry Timeline (FIFO)</h5>
            <div className="real-table-wrapper mt-2">
              <table className="real-data-table">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Expiry Date</th>
                    <th>Lot Stock</th>
                    <th>Shelf Location</th>
                    <th>Shelf Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold mono text-heading">B-2409</td>
                    <td className="text-dim">Nov 28, 2026</td>
                    <td className="font-bold tnum">96 Pcs</td>
                    <td>Shelf B2 (Front)</td>
                    <td>
                      <span className="status-pill warning">
                        <Clock size={11} /> 34 days left (Priority Sell)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold mono text-heading">B-2410</td>
                    <td className="text-dim">Jan 15, 2027</td>
                    <td className="font-bold tnum">48 Pcs</td>
                    <td>Warehouse Depot G-1</td>
                    <td>
                      <span className="status-pill success">
                        <CheckCircle2 size={11} /> Optimal (&gt; 90 days)
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
          <h4 className="font-bold text-heading text-base">Scheduled Stock Opname Module</h4>
          <p className="text-dim text-xs max-w-md mx-auto mt-1">
            Conduct physical shelf counts using wireless barcode scanners without halting live cashier checkouts.
          </p>
        </div>
      )}

      {activeTab === 'master' && (
        <div className="real-panel mt-3 text-center py-10">
          <Layers size={36} className="text-accent mx-auto mb-2 opacity-80" />
          <h4 className="font-bold text-heading text-base">Master Data &amp; Unit Hierarchy</h4>
          <p className="text-dim text-xs max-w-md mx-auto mt-1">
            Manage category taxonomies, manufacturer brands, custom unit multipliers, and multi-warehouse branch assignments.
          </p>
        </div>
      )}
    </div>
  );
};

export default RealInventoryView;
