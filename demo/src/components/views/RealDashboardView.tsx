import React, { useState } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Sparkles,
  PackageCheck,
  Banknote,
  Smartphone,
  ArrowRightLeft,
  CreditCard,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';

interface RealDashboardViewProps {
  onNavigateTo?: (menu: string) => void;
}

export const RealDashboardView: React.FC<RealDashboardViewProps> = ({ onNavigateTo }) => {
  const [period, setPeriod] = useState<'today' | '7days' | 'month'>('today');
  const [alertTab, setAlertTab] = useState<'lowStock' | 'expiring'>('lowStock');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const SALES_BARS = [
    { day: 'Sep 03', val: 78, label: '$7,800.00' },
    { day: 'Sep 04', val: 62, label: '$6,200.00' },
    { day: 'Sep 05', val: 85, label: '$8,500.00' },
    { day: 'Sep 06', val: 94, label: '$9,400.00' },
    { day: 'Sep 07', val: 110, label: '$11,000.00' },
    { day: 'Sep 08', val: 72, label: '$7,200.00' },
    { day: 'Sep 09', val: 88, label: '$8,800.00' },
    { day: 'Sep 10', val: 105, label: '$10,500.00' },
    { day: 'Sep 11', val: 92, label: '$9,200.00' },
    { day: 'Sep 12', val: 118, label: '$11,800.00' },
    { day: 'Sep 13', val: 135, label: '$13,500.00' },
    { day: 'Sep 14', val: 142, label: '$14,200.00' },
    { day: 'Sep 15', val: 120, label: '$12,000.00' },
    { day: 'Today', val: 124, label: '$12,450.00', isToday: true },
  ];

  const RECENT_SALES = [
    { id: '#KV-001284', time: '14:28', items: '3 items', total: '$86.00', method: 'Cash', icon: Banknote, color: 'text-success', status: 'Synced' },
    { id: '#KV-001283', time: '14:15', items: '1 item', total: '$12.50', method: 'QR Pay', icon: Smartphone, color: 'text-warning', status: 'Synced' },
    { id: '#KV-001282', time: '13:54', items: '7 items', total: '$214.50', method: 'Bank Wire', icon: ArrowRightLeft, color: 'text-accent', status: 'Synced' },
    { id: '#KV-001281', time: '13:30', items: '2 items', total: '$58.00', method: 'Debit Card', icon: CreditCard, color: 'text-primary', status: 'Synced' },
    { id: '#KV-001280', time: '13:12', items: '4 items', total: '$102.00', method: 'QR Pay', icon: Smartphone, color: 'text-warning', status: 'Synced' },
  ];

  const LOW_STOCK_ITEMS = [
    { name: 'Signature Brown Sugar Latte 250ml', sku: 'KV-0012', stock: 6, min: 24, unit: 'Btl' },
    { name: 'Classic Chocolate Brioche', sku: 'KV-0085', stock: 3, min: 15, unit: 'Bks' },
    { name: 'Botanical Herbal Bar Soap 75g', sku: 'KV-0144', stock: 2, min: 10, unit: 'Pcs' },
  ];

  const EXPIRING_ITEMS = [
    { name: 'Organic Whole Milk 1L', sku: 'KV-0044', days: '14 days left', exp: 'Oct 01, 2026', stock: 18 },
    { name: 'Strawberry Greek Yogurt 200ml', sku: 'KV-0091', days: '21 days left', exp: 'Oct 08, 2026', stock: 12 },
  ];

  return (
    <div className="real-view-container">
      {/* View Header with Period Filter */}
      <div className="real-view-header">
        <div>
          <h3 className="real-view-title">Store Business Overview</h3>
          <p className="real-view-subtitle">Tuesday, 14:32 EST · Flagship Store (HQ)</p>
        </div>

        <div className="tab-pill-group">
          <button
            type="button"
            className={`tab-pill-btn ${period === 'today' ? 'active' : ''}`}
            onClick={() => setPeriod('today')}
          >
            Today
          </button>
          <button
            type="button"
            className={`tab-pill-btn ${period === '7days' ? 'active' : ''}`}
            onClick={() => setPeriod('7days')}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            className={`tab-pill-btn ${period === 'month' ? 'active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            This Month
          </button>
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="real-stat-grid">
        <div className="real-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Today's Revenue</span>
            <div className="stat-icon-wrapper bg-success-soft text-success">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="stat-card-val tnum">$12,450.00</div>
          <div className="stat-card-footer">
            <span className="trend-badge positive">
              <ArrowUpRight size={12} />
              +8.2%
            </span>
            <span className="stat-card-sub">vs yesterday ($11.5k)</span>
          </div>
        </div>

        <div className="real-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Total Transactions</span>
            <div className="stat-icon-wrapper bg-accent-soft text-accent">
              <ShoppingCart size={16} />
            </div>
          </div>
          <div className="stat-card-val tnum">184</div>
          <div className="stat-card-footer">
            <span className="trend-badge positive">
              <ArrowUpRight size={12} />
              +12
            </span>
            <span className="stat-card-sub">avg $67.66 / order</span>
          </div>
        </div>

        <div className="real-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Low Stock &amp; Expiring</span>
            <div className="stat-icon-wrapper bg-warning-soft text-warning">
              <PackageCheck size={16} />
            </div>
          </div>
          <div className="stat-card-val tnum">3 SKUs</div>
          <div className="stat-card-footer">
            <span className="trend-badge warning">Attention</span>
            <span className="stat-card-sub">2 below safety threshold</span>
          </div>
        </div>

        <div className="real-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Estimated Gross Profit</span>
            <div className="stat-icon-wrapper bg-primary-soft text-primary">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="stat-card-val tnum">$3,820.00</div>
          <div className="stat-card-footer">
            <span className="trend-badge primary">Margin 30.7%</span>
            <span className="stat-card-sub">Real-time COGS computed</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="real-dashboard-cols">
        {/* Left Column: 14-Day Sales Chart & Payment Methods */}
        <div className="dashboard-col">
          {/* Sales Volume Bar Chart */}
          <div className="real-panel">
            <div className="real-panel-head">
              <div>
                <span className="real-panel-title">14-Day Sales Velocity</span>
                <span className="real-panel-sub">Daily transaction volume ($)</span>
              </div>
              <span className="badge-tag">SQLite Local Engine</span>
            </div>

            <div className="chart-wrapper">
              <div className="bars-container">
                {SALES_BARS.map((bar, idx) => {
                  const heightPercent = Math.min(100, Math.round((bar.val / 150) * 100));
                  const isHovered = hoveredBar === idx;
                  return (
                    <div
                      key={bar.day}
                      className="bar-col"
                      onMouseEnter={() => setHoveredBar(idx)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {isHovered && (
                        <div className="bar-tooltip">
                          <span className="tooltip-title">{bar.day}</span>
                          <span className="tooltip-val">{bar.label}</span>
                        </div>
                      )}
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${bar.isToday ? 'bar-today' : ''}`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="bar-label">{bar.day.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="real-panel">
            <div className="real-panel-head">
              <span className="real-panel-title">Payment Method Breakdown</span>
              <span className="real-panel-sub">Distribution across today's receipts</span>
            </div>

            <div className="payment-distribution-grid">
              <div className="pay-method-row">
                <div className="pay-method-left">
                  <div className="pay-icon-box bg-success-soft text-success">
                    <Banknote size={15} />
                  </div>
                  <div>
                    <div className="pay-method-name">Cash (Counter Till)</div>
                    <div className="pay-method-count">92 orders</div>
                  </div>
                </div>
                <div className="pay-method-right">
                  <div className="pay-method-total tnum">$5,620.00</div>
                  <div className="pay-method-bar">
                    <div className="pay-bar-fill bg-success" style={{ width: '45%' }} />
                  </div>
                </div>
              </div>

              <div className="pay-method-row">
                <div className="pay-method-left">
                  <div className="pay-icon-box bg-warning-soft text-warning">
                    <Smartphone size={15} />
                  </div>
                  <div>
                    <div className="pay-method-name">Dynamic QR Pay</div>
                    <div className="pay-method-count">56 orders</div>
                  </div>
                </div>
                <div className="pay-method-right">
                  <div className="pay-method-total tnum">$3,740.00</div>
                  <div className="pay-method-bar">
                    <div className="pay-bar-fill bg-warning" style={{ width: '30%' }} />
                  </div>
                </div>
              </div>

              <div className="pay-method-row">
                <div className="pay-method-left">
                  <div className="pay-icon-box bg-accent-soft text-accent">
                    <ArrowRightLeft size={15} />
                  </div>
                  <div>
                    <div className="pay-method-name">Bank Wire / ACH</div>
                    <div className="pay-method-count">21 orders</div>
                  </div>
                </div>
                <div className="pay-method-right">
                  <div className="pay-method-total tnum">$1,870.00</div>
                  <div className="pay-method-bar">
                    <div className="pay-bar-fill bg-accent" style={{ width: '15%' }} />
                  </div>
                </div>
              </div>

              <div className="pay-method-row">
                <div className="pay-method-left">
                  <div className="pay-icon-box bg-primary-soft text-primary">
                    <CreditCard size={15} />
                  </div>
                  <div>
                    <div className="pay-method-name">Debit &amp; Credit EDC</div>
                    <div className="pay-method-count">15 orders</div>
                  </div>
                </div>
                <div className="pay-method-right">
                  <div className="pay-method-total tnum">$1,220.00</div>
                  <div className="pay-method-bar">
                    <div className="pay-bar-fill bg-primary" style={{ width: '10%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Recent Transactions & Inventory Alerts */}
        <div className="dashboard-col">
          {/* Recent Transactions Table */}
          <div className="real-panel">
            <div className="real-panel-head">
              <div>
                <span className="real-panel-title">Live Counter Transactions</span>
                <span className="real-panel-sub">Direct local register feed</span>
              </div>
              <button
                type="button"
                className="panel-link-btn"
                onClick={() => onNavigateTo?.('pos')}
              >
                Open POS Register →
              </button>
            </div>

            <div className="real-table-wrapper">
              <table className="real-data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Time</th>
                    <th>Items</th>
                    <th className="text-right">Total</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_SALES.map(sale => {
                    const MethodIcon = sale.icon;
                    return (
                      <tr key={sale.id}>
                        <td>
                          <span className="mono font-bold text-heading">{sale.id}</span>
                        </td>
                        <td className="text-dim text-xs">{sale.time}</td>
                        <td>{sale.items}</td>
                        <td className="text-right font-bold text-heading tnum">{sale.total}</td>
                        <td>
                          <span className="flex items-center gap-1 text-xs">
                            <MethodIcon size={13} className={sale.color} />
                            <span>{sale.method}</span>
                          </span>
                        </td>
                        <td>
                          <span className="status-pill success">
                            <CheckCircle2 size={11} />
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock & Expiry Alerts Panel */}
          <div className="real-panel">
            <div className="real-panel-head">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`alert-tab-btn ${alertTab === 'lowStock' ? 'active' : ''}`}
                  onClick={() => setAlertTab('lowStock')}
                >
                  <AlertTriangle size={14} className="text-warning" />
                  <span>Low Stock ({LOW_STOCK_ITEMS.length})</span>
                </button>
                <button
                  type="button"
                  className={`alert-tab-btn ${alertTab === 'expiring' ? 'active' : ''}`}
                  onClick={() => setAlertTab('expiring')}
                >
                  <Clock size={14} className="text-accent" />
                  <span>Expiring Soon ({EXPIRING_ITEMS.length})</span>
                </button>
              </div>
              <button
                type="button"
                className="panel-link-btn"
                onClick={() => onNavigateTo?.('inventory')}
              >
                Manage Stock →
              </button>
            </div>

            {alertTab === 'lowStock' ? (
              <div className="alerts-list">
                {LOW_STOCK_ITEMS.map(item => (
                  <div key={item.sku} className="alert-item-card">
                    <div className="alert-item-info">
                      <span className="alert-item-name">{item.name}</span>
                      <span className="alert-item-meta">SKU: {item.sku} · Safety: {item.min} {item.unit}</span>
                    </div>
                    <div className="alert-item-badge warning">
                      <span>Only {item.stock} {item.unit} left</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alerts-list">
                {EXPIRING_ITEMS.map(item => (
                  <div key={item.sku} className="alert-item-card">
                    <div className="alert-item-info">
                      <span className="alert-item-name">{item.name}</span>
                      <span className="alert-item-meta">SKU: {item.sku} · Exp: {item.exp}</span>
                    </div>
                    <div className="alert-item-badge accent">
                      <span>{item.days} ({item.stock} pcs)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealDashboardView;
