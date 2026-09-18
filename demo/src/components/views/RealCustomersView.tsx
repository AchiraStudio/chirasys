import React, { useState } from 'react';
import {
  Users,
  Sparkles,
  Search,
  Plus,
  Crown,
  CheckCircle2,
} from 'lucide-react';

export const RealCustomersView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customers' | 'promos'>('customers');
  const [searchQuery, setSearchQuery] = useState('');

  const CUSTOMERS = [
    {
      name: 'Sarah Jenkins',
      phone: '555-019-8833',
      tier: 'VIP Member',
      discount: '5% Off All Orders',
      totalSpent: '$3,450.00',
      points: '345 Pts',
      txCount: 28,
    },
    {
      name: 'Alex Morgan',
      phone: '555-014-2211',
      tier: 'Wholesale Member',
      discount: 'Tiered Wholesale Rates',
      totalSpent: '$14,800.00',
      points: '1,480 Pts',
      txCount: 14,
    },
    {
      name: 'Rachel Adams',
      phone: '555-017-5599',
      tier: 'Regular Member',
      discount: 'Reward Points Earning',
      totalSpent: '$1,120.00',
      points: '112 Pts',
      txCount: 9,
    },
    {
      name: 'Henry Vance',
      phone: '555-011-4477',
      tier: 'VIP Member',
      discount: '5% Off All Orders',
      totalSpent: '$4,900.00',
      points: '490 Pts',
      txCount: 34,
    },
  ];

  const PROMOS = [
    {
      code: 'VIP-AUTO-5',
      title: 'VIP Member 5% Auto-Discount',
      type: 'Percentage Discount',
      rule: 'Automatically applied upon scanning VIP member badge at POS',
      period: 'Evergreen / Always Active',
      status: 'Active',
    },
    {
      code: 'MORNING-COMBO',
      title: 'Morning Breakfast Bundle (Latte + Brioche)',
      type: 'Product Bundle',
      rule: 'Buy 1 Signature Latte 250ml + 1 Chocolate Brioche, save $1.50',
      period: '07:00 – 11:00 Daily',
      status: 'Active',
    },
    {
      code: 'WEEKEND-GROCERY',
      title: 'Weekend Groceries 10% Off',
      type: 'Category Discount',
      rule: 'Min. order $50.00 across Groceries catalog',
      period: 'Every Sat & Sun',
      status: 'Active',
    },
  ];

  return (
    <div className="real-view-container">
      {/* Top Segmented TabBar */}
      <div className="real-tab-bar-wrapper">
        <div className="segmented-tab-bar">
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            <Users size={15} />
            <span>Customer Directory &amp; CRM Members</span>
          </button>
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'promos' ? 'active' : ''}`}
            onClick={() => setActiveTab('promos')}
          >
            <Sparkles size={15} />
            <span>Promotion Engine &amp; Auto-Discounts</span>
          </button>
        </div>

        <div className="tab-bar-right-actions">
          <button type="button" className="action-btn-primary">
            <Plus size={14} />
            <span>{activeTab === 'customers' ? 'Add Customer' : 'Create New Promo'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'customers' && (
        <div className="real-panel mt-3">
          <div className="table-filter-bar">
            <div className="filter-search-box">
              <Search size={14} className="text-dim" />
              <input
                type="text"
                placeholder="Search customer name, phone number, or card ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="filter-search-input"
              />
            </div>
            <span className="badge-tag">Integrated with Local POS Database</span>
          </div>

          <div className="real-table-wrapper">
            <table className="real-data-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone / WhatsApp</th>
                  <th>Membership Tier</th>
                  <th>Pricing Benefit</th>
                  <th className="text-right">Lifetime Spend</th>
                  <th>Active Points</th>
                </tr>
              </thead>
              <tbody>
                {CUSTOMERS.map(c => (
                  <tr key={c.name}>
                    <td>
                      <span className="font-bold text-heading">{c.name}</span>
                      <span className="text-xs text-dim block">{c.txCount} orders</span>
                    </td>
                    <td className="text-dim text-xs font-mono">{c.phone}</td>
                    <td>
                      <span className="member-tier-badge">
                        <Crown size={12} className="text-warning" />
                        <span>{c.tier}</span>
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-primary font-semibold">{c.discount}</span>
                    </td>
                    <td className="text-right font-bold text-heading tnum">{c.totalSpent}</td>
                    <td>
                      <span className="points-pill tnum font-bold">{c.points}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'promos' && (
        <div className="real-panel mt-3">
          <div className="real-table-wrapper">
            <table className="real-data-table">
              <thead>
                <tr>
                  <th>Promo Code</th>
                  <th>Promotion Program Name</th>
                  <th>Scheme Type</th>
                  <th>Rules &amp; Qualifications</th>
                  <th>Active Period</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {PROMOS.map(p => (
                  <tr key={p.code}>
                    <td>
                      <span className="mono font-bold text-primary">{p.code}</span>
                    </td>
                    <td>
                      <span className="font-bold text-heading">{p.title}</span>
                    </td>
                    <td>
                      <span className="category-tag">{p.type}</span>
                    </td>
                    <td className="text-xs text-body">{p.rule}</td>
                    <td className="text-xs text-dim">{p.period}</td>
                    <td>
                      <span className="status-pill success">
                        <CheckCircle2 size={11} />
                        {p.status}
                      </span>
                    </td>
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

export default RealCustomersView;
