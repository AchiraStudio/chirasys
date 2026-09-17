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
    { day: '03 Sep', val: 78, label: 'Rp 7.800.000' },
    { day: '04 Sep', val: 62, label: 'Rp 6.200.000' },
    { day: '05 Sep', val: 85, label: 'Rp 8.500.000' },
    { day: '06 Sep', val: 94, label: 'Rp 9.400.000' },
    { day: '07 Sep', val: 110, label: 'Rp 11.000.000' },
    { day: '08 Sep', val: 72, label: 'Rp 7.200.000' },
    { day: '09 Sep', val: 88, label: 'Rp 8.800.000' },
    { day: '10 Sep', val: 105, label: 'Rp 10.500.000' },
    { day: '11 Sep', val: 92, label: 'Rp 9.200.000' },
    { day: '12 Sep', val: 118, label: 'Rp 11.800.000' },
    { day: '13 Sep', val: 135, label: 'Rp 13.500.000' },
    { day: '14 Sep', val: 142, label: 'Rp 14.200.000' },
    { day: '15 Sep', val: 120, label: 'Rp 12.000.000' },
    { day: 'Hari ini', val: 124, label: 'Rp 12.450.000', isToday: true },
  ];

  const RECENT_SALES = [
    { id: '#KV-001284', time: '14:28', items: '3 items', total: 'Rp 86.000', method: 'Tunai', icon: Banknote, color: 'text-success', status: 'Synced' },
    { id: '#KV-001283', time: '14:15', items: '1 item', total: 'Rp 12.500', method: 'QRIS', icon: Smartphone, color: 'text-warning', status: 'Synced' },
    { id: '#KV-001282', time: '13:54', items: '7 items', total: 'Rp 214.500', method: 'Transfer', icon: ArrowRightLeft, color: 'text-accent', status: 'Synced' },
    { id: '#KV-001281', time: '13:30', items: '2 items', total: 'Rp 58.000', method: 'Debit BCA', icon: CreditCard, color: 'text-primary', status: 'Synced' },
    { id: '#KV-001280', time: '13:12', items: '4 items', total: 'Rp 102.000', method: 'QRIS', icon: Smartphone, color: 'text-warning', status: 'Synced' },
  ];

  const LOW_STOCK_ITEMS = [
    { name: 'Kopi Susu Botol 250ml', sku: 'KV-0012', stock: 6, min: 24, unit: 'Btl' },
    { name: 'Roti Coklat Klasik', sku: 'KV-0085', stock: 3, min: 15, unit: 'Bks' },
    { name: 'Sabun Mandi Herbal 75g', sku: 'KV-0144', stock: 2, min: 10, unit: 'Pcs' },
  ];

  const EXPIRING_ITEMS = [
    { name: 'Susu UHT Full Cream 1L', sku: 'KV-0044', days: '14 hari', exp: '01 Okt 2026', stock: 18 },
    { name: 'Yogurt Strawberry 200ml', sku: 'KV-0091', days: '21 hari', exp: '08 Okt 2026', stock: 12 },
  ];

  return (
    <div className="real-view-container">
      {/* View Header with Period Filter */}
      <div className="real-view-header">
        <div>
          <h3 className="real-view-title">Overview Bisnis Toko</h3>
          <p className="real-view-subtitle">Selasa, 14:32 WIB · Cabang Utama (Main Store)</p>
        </div>

        <div className="tab-pill-group">
          <button
            type="button"
            className={`tab-pill-btn ${period === 'today' ? 'active' : ''}`}
            onClick={() => setPeriod('today')}
          >
            Hari Ini
          </button>
          <button
            type="button"
            className={`tab-pill-btn ${period === '7days' ? 'active' : ''}`}
            onClick={() => setPeriod('7days')}
          >
            7 Hari Terakhir
          </button>
          <button
            type="button"
            className={`tab-pill-btn ${period === 'month' ? 'active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            Bulan Ini
          </button>
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="real-stat-grid">
        <div className="real-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Penjualan Hari Ini</span>
            <div className="stat-icon-wrapper bg-success-soft text-success">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="stat-card-val tnum">Rp 12.450.000</div>
          <div className="stat-card-footer">
            <span className="trend-badge positive">
              <ArrowUpRight size={12} />
              +8.2%
            </span>
            <span className="stat-card-sub">vs kemarin (Rp 11.5M)</span>
          </div>
        </div>

        <div className="real-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Total Transaksi</span>
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
            <span className="stat-card-sub">rata-rata Rp 67.663/struk</span>
          </div>
        </div>

        <div className="real-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Stok Menipis &amp; Exp</span>
            <div className="stat-icon-wrapper bg-warning-soft text-warning">
              <PackageCheck size={16} />
            </div>
          </div>
          <div className="stat-card-val tnum">3 SKU</div>
          <div className="stat-card-footer">
            <span className="trend-badge warning">Perhatian</span>
            <span className="stat-card-sub">2 di bawah stok minimum</span>
          </div>
        </div>

        <div className="real-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Estimasi Laba Kotor</span>
            <div className="stat-icon-wrapper bg-primary-soft text-primary">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="stat-card-val tnum">Rp 3.820.000</div>
          <div className="stat-card-footer">
            <span className="trend-badge primary">Margin 30.7%</span>
            <span className="stat-card-sub">HPP otomatis terhitung</span>
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
                <span className="real-panel-title">Tren Penjualan 14 Hari Terakhir</span>
                <span className="real-panel-sub">Volume transaksi harian (Rp)</span>
              </div>
              <span className="badge-tag">Terintegrasi SQLite</span>
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
              <span className="real-panel-title">Metode Pembayaran Kasir</span>
              <span className="real-panel-sub">Distribusi transaksi hari ini</span>
            </div>

            <div className="payment-distribution-grid">
              <div className="pay-method-row">
                <div className="pay-method-left">
                  <div className="pay-icon-box bg-success-soft text-success">
                    <Banknote size={15} />
                  </div>
                  <div>
                    <div className="pay-method-name">Tunai (Cash)</div>
                    <div className="pay-method-count">92 transaksi</div>
                  </div>
                </div>
                <div className="pay-method-right">
                  <div className="pay-method-total tnum">Rp 5.620.000</div>
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
                    <div className="pay-method-name">QRIS Statis &amp; Dinamis</div>
                    <div className="pay-method-count">56 transaksi</div>
                  </div>
                </div>
                <div className="pay-method-right">
                  <div className="pay-method-total tnum">Rp 3.740.000</div>
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
                    <div className="pay-method-name">Transfer Bank / VA</div>
                    <div className="pay-method-count">21 transaksi</div>
                  </div>
                </div>
                <div className="pay-method-right">
                  <div className="pay-method-total tnum">Rp 1.870.000</div>
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
                    <div className="pay-method-name">Kartu Debit &amp; Kredit EDC</div>
                    <div className="pay-method-count">15 transaksi</div>
                  </div>
                </div>
                <div className="pay-method-right">
                  <div className="pay-method-total tnum">Rp 1.220.000</div>
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
                <span className="real-panel-title">Transaksi Terkini di Kasir</span>
                <span className="real-panel-sub">Live feed kasir lokal</span>
              </div>
              <button
                type="button"
                className="panel-link-btn"
                onClick={() => onNavigateTo?.('pos')}
              >
                Buka Kasir POS →
              </button>
            </div>

            <div className="real-table-wrapper">
              <table className="real-data-table">
                <thead>
                  <tr>
                    <th>No. Faktur</th>
                    <th>Jam</th>
                    <th>Items</th>
                    <th className="text-right">Total</th>
                    <th>Metode</th>
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
                  <span>Stok Menipis ({LOW_STOCK_ITEMS.length})</span>
                </button>
                <button
                  type="button"
                  className={`alert-tab-btn ${alertTab === 'expiring' ? 'active' : ''}`}
                  onClick={() => setAlertTab('expiring')}
                >
                  <Clock size={14} className="text-accent" />
                  <span>Kadaluarsa ({EXPIRING_ITEMS.length})</span>
                </button>
              </div>
              <button
                type="button"
                className="panel-link-btn"
                onClick={() => onNavigateTo?.('inventory')}
              >
                Kelola Stok →
              </button>
            </div>

            {alertTab === 'lowStock' ? (
              <div className="alerts-list">
                {LOW_STOCK_ITEMS.map(item => (
                  <div key={item.sku} className="alert-item-card">
                    <div className="alert-item-info">
                      <span className="alert-item-name">{item.name}</span>
                      <span className="alert-item-meta">SKU: {item.sku} · Min: {item.min} {item.unit}</span>
                    </div>
                    <div className="alert-item-badge warning">
                      <span>Sisa {item.stock} {item.unit}</span>
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
                      <span>{item.days} lagi ({item.stock} pcs)</span>
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
