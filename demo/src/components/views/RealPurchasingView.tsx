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
      supplier: 'Mayora Consumer Brands Inc',
      itemsCount: '6 line items',
      totalAmount: '$4,250.00',
      receiveStatus: 'Received',
      receiveType: 'success',
      paymentStatus: 'Paid (Wire)',
      invoiceNo: 'INV-MYR-9921',
    },
    {
      id: 'PO-2026-0840',
      date: '14 Sep 2026',
      supplier: 'Global Food Supplies Co',
      itemsCount: '12 line items',
      totalAmount: '$8,720.00',
      receiveStatus: 'Received',
      receiveType: 'success',
      paymentStatus: 'Net 30 Days',
      invoiceNo: 'INV-GFS-8114',
    },
    {
      id: 'PO-2026-0839',
      date: '12 Sep 2026',
      supplier: 'Artisan Bakery Craft Ltd',
      itemsCount: '4 line items',
      totalAmount: '$1,150.00',
      receiveStatus: 'Partial (2/4)',
      receiveType: 'warning',
      paymentStatus: 'Awaiting Invoice',
      invoiceNo: '—',
    },
    {
      id: 'PO-2026-0838',
      date: '10 Sep 2026',
      supplier: 'Premier Beverage Distributors',
      itemsCount: '8 line items',
      totalAmount: '$3,400.00',
      receiveStatus: 'Received',
      receiveType: 'success',
      paymentStatus: 'Paid (ACH)',
      invoiceNo: 'INV-PBD-1102',
    },
  ];

  const SUPPLIERS = [
    { name: 'Mayora Consumer Brands Inc', contact: 'Brian Vance (555-019-2831)', city: 'New York', terms: 'Net 14 Days', activePOs: 4 },
    { name: 'Global Food Supplies Co', contact: 'Elena Rostova (555-014-9923)', city: 'Chicago', terms: 'Net 30 Days', activePOs: 6 },
    { name: 'Artisan Bakery Craft Ltd', contact: 'Sarah Miller (555-012-7744)', city: 'Boston', terms: 'Weekly Consignment', activePOs: 2 },
    { name: 'Premier Beverage Distributors', contact: 'David Kim (555-018-3355)', city: 'Seattle', terms: 'Cash on Delivery', activePOs: 3 },
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
            <span>Goods Receiving (PO &amp; Direct Receiving)</span>
          </button>
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
            onClick={() => setActiveTab('suppliers')}
          >
            <Truck size={15} />
            <span>Supplier Directory</span>
          </button>
        </div>

        <div className="tab-bar-right-actions">
          <button type="button" className="action-btn-primary">
            <Plus size={14} />
            <span>Create New PO</span>
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
                placeholder="Search PO number, supplier name, or invoice..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="filter-search-input"
              />
            </div>
            <span className="badge-tag">Auto-Updates COGS &amp; Accounts Payable Ledger</span>
          </div>

          <div className="real-table-wrapper">
            <table className="real-data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Date</th>
                  <th>Supplier Name</th>
                  <th>Items</th>
                  <th className="text-right">Total Invoice</th>
                  <th>Receiving Status</th>
                  <th>Payment Status</th>
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
                  <th>Company Name</th>
                  <th>Contact &amp; Phone</th>
                  <th>City</th>
                  <th>Payment Terms</th>
                  <th className="text-right">Active POs</th>
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
                    <td className="text-right font-bold text-heading tnum">{sup.activePOs} POs</td>
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
