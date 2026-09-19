import React, { useState } from 'react';
import {
  Smartphone,
  Tablet,
  Laptop,
  Radio,
  QrCode,
  Wifi,
  Zap,
  CheckCircle2,
  Key,
  ShoppingCart,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface MockProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  color: string;
}

const PRODUCTS: MockProduct[] = [
  { id: '1', name: 'Kopi Susu Aren', price: 22000, category: 'Minuman', color: '#CB3CFF' },
  { id: '2', name: 'Matcha Latte', price: 26000, category: 'Minuman', color: '#14CA7A' },
  { id: '3', name: 'Butter Croissant', price: 18000, category: 'Bakery', color: '#FFB547' },
  { id: '4', name: 'Almond Danish', price: 24000, category: 'Bakery', color: '#00C2FF' },
];

export const HostSyncSection: React.FC = () => {
  const [deviceType, setDeviceType] = useState<'phone' | 'tablet' | 'laptop'>('phone');
  const [cart, setCart] = useState<{ product: MockProduct; qty: number }[]>([
    { product: PRODUCTS[0], qty: 1 },
    { product: PRODUCTS[2], qty: 1 },
  ]);
  const [syncedOrders, setSyncedOrders] = useState<{ id: string; time: string; total: number; items: number }[]>([
    { id: '#TRX-1082', time: '18:24:10', total: 40000, items: 2 },
    { id: '#TRX-1081', time: '18:22:45', total: 68000, items: 3 },
  ]);
  const [lastSyncSignal, setLastSyncSignal] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleAddToCart = (product: MockProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { product, qty: 1 }];
    });
    triggerSyncPing();
  };

  const triggerSyncPing = () => {
    setLastSyncSignal(true);
    setTimeout(() => setLastSyncSignal(false), 800);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const newTrx = {
      id: `#TRX-${Math.floor(1000 + Math.random() * 9000)}`,
      time: timeStr,
      total: cartTotal,
      items: cartItemCount,
    };

    setSyncedOrders((prev) => [newTrx, ...prev.slice(0, 3)]);
    setCheckoutSuccess(true);
    triggerSyncPing();
    setCart([]);

    setTimeout(() => {
      setCheckoutSuccess(false);
    }, 2000);
  };

  const handleResetDemo = () => {
    setCart([
      { product: PRODUCTS[0], qty: 1 },
      { product: PRODUCTS[2], qty: 1 },
    ]);
    setCheckoutSuccess(false);
  };

  return (
    <section className="section" id="host">
      <div className="wrap">
        {/* Section Header */}
        <div className="sec-head center" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>MULTI-DEVICE HOST SYSTEM
          </div>
          <h2 className="h2">
            Turn Any Phone or Tablet <br className="hide-m" />
            <span className="grad">into a Cashier Instantly.</span>
          </h2>
          <p className="lead" style={{ maxWidth: '640px', margin: '0 auto' }}>
            No app downloads. No passwords to remember. Just scan the host QR code and your staff can immediately ring up sales, take orders at tables, and check inventory.
          </p>
        </div>

        {/* Interactive Dual-Device Stage */}
        <div className="host-showcase-container" data-reveal style={{ marginTop: '40px' }}>
          {/* Controls bar */}
          <div className="host-stage-header">
            <div className="host-stage-badge">
              <span className="live-pulsar"></span>
              <span>LIVE LAN SIMULATOR</span>
            </div>

            <div className="device-switcher">
              <span className="switch-label">Preview Terminal:</span>
              <div className="switch-buttons">
                <button
                  type="button"
                  className={`dev-btn ${deviceType === 'phone' ? 'active' : ''}`}
                  onClick={() => setDeviceType('phone')}
                >
                  <Smartphone size={14} />
                  <span>Phone</span>
                </button>
                <button
                  type="button"
                  className={`dev-btn ${deviceType === 'tablet' ? 'active' : ''}`}
                  onClick={() => setDeviceType('tablet')}
                >
                  <Tablet size={14} />
                  <span>Tablet / iPad</span>
                </button>
                <button
                  type="button"
                  className={`dev-btn ${deviceType === 'laptop' ? 'active' : ''}`}
                  onClick={() => setDeviceType('laptop')}
                >
                  <Laptop size={14} />
                  <span>Laptop</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dual Hardware Sandbox Grid */}
          <div className="host-stage-grid">
            {/* Host PC Terminal (Left) */}
            <div className="host-terminal-card">
              <div className="terminal-topbar">
                <div className="term-indicator">
                  <Radio size={14} className="animate-pulse" style={{ color: 'var(--success)' }} />
                  <span className="term-title">Kivo Host PC (Main Server)</span>
                </div>
                <span className="term-ip-pill mono">192.168.1.15:1420</span>
              </div>

              <div className="terminal-body">
                {/* Host session summary */}
                <div className="host-session-banner">
                  <div className="hsb-icon">
                    <Key size={16} />
                  </div>
                  <div className="hsb-meta">
                    <span className="hsb-title">Auto-Login Active</span>
                    <span className="hsb-desc">Connected devices sign in automatically as <b>"Admin Store"</b></span>
                  </div>
                </div>

                {/* QR Code Presentation Box */}
                <div className="host-qr-box">
                  <div className="qr-graphic">
                    <QrCode size={110} strokeWidth={1.4} style={{ color: 'var(--heading)' }} />
                    <div className="qr-scan-line"></div>
                  </div>
                  <div className="qr-instructions">
                    <span className="qr-lead">Scan to Connect</span>
                    <span className="qr-sub">Zero-lag pairing via standard Wi-Fi</span>
                    <div className="qr-latency-tag">
                      <Zap size={12} style={{ color: 'var(--warning)' }} />
                      <span>Sub-millisecond SQLite replication</span>
                    </div>
                  </div>
                </div>

                {/* Live Host Ledger Feed */}
                <div className="host-ledger-feed">
                  <div className="feed-header">
                    <span>Host Live Ledger (SQLite WAL)</span>
                    <span className={`sync-flash ${lastSyncSignal ? 'flashing' : ''}`}>
                      <Wifi size={12} /> {lastSyncSignal ? 'Syncing...' : 'Realtime'}
                    </span>
                  </div>
                  <div className="feed-list">
                    {syncedOrders.map((ord) => (
                      <div key={ord.id} className="feed-row animate-fade-in">
                        <div className="fr-left">
                          <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                          <span className="mono bold">{ord.id}</span>
                          <span className="dim-time">{ord.time}</span>
                        </div>
                        <div className="fr-right">
                          <span className="item-count">{ord.items} Items</span>
                          <span className="total-val">Rp {ord.total.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Wi-Fi Beam / Synapse Link */}
            <div className={`host-synapse-beam ${lastSyncSignal ? 'active-beam' : ''}`}>
              <div className="beam-line"></div>
              <div className="beam-pulse-dot"></div>
              <div className="beam-badge">
                <Zap size={13} />
                <span>0.4ms Sync</span>
              </div>
            </div>

            {/* Mobile / Tablet Client Terminal (Right) */}
            <div className={`mobile-terminal-wrapper device-${deviceType}`}>
              <div className="mobile-bezel">
                <div className="mobile-notch">
                  <span className="camera-lens"></span>
                  <span className="speaker-bar"></span>
                </div>

                <div className="mobile-screen">
                  {/* Browser Bar */}
                  <div className="mobile-browser-bar">
                    <div className="mbb-url mono">
                      <span>kivo.local ┬╖ Cashier</span>
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="mobile-pos-header">
                    <div className="mph-left">
                      <span className="mph-brand">Kivo POS</span>
                      <span className="mph-tag">Mobile Web</span>
                    </div>
                    <button type="button" className="mph-reset" onClick={handleResetDemo} title="Reset demo cart">
                      <RotateCcw size={12} />
                    </button>
                  </div>

                  {/* Interactive Catalog */}
                  <div className="mobile-catalog-grid">
                    {PRODUCTS.map((prod) => {
                      const inCart = cart.find((i) => i.product.id === prod.id);
                      return (
                        <div
                          key={prod.id}
                          className="mobile-product-card"
                          onClick={() => handleAddToCart(prod)}
                        >
                          <div className="mpc-top">
                            <span className="mpc-cat">{prod.category}</span>
                            <div className="mpc-add-btn">
                              <Plus size={12} />
                            </div>
                          </div>
                          <div className="mpc-name">{prod.name}</div>
                          <div className="mpc-price">Rp {prod.price.toLocaleString('id-ID')}</div>
                          {inCart && <span className="mpc-badge">{inCart.qty}</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Floating Bottom Cart Bar */}
                  <div className="mobile-cart-bar">
                    {checkoutSuccess ? (
                      <div className="cart-success-banner">
                        <CheckCircle2 size={16} />
                        <span>Order Synced to Host!</span>
                      </div>
                    ) : (
                      <div className="cart-active-row">
                        <div className="cart-meta">
                          <div className="cart-qty-badge">
                            <ShoppingCart size={13} />
                            <span>{cartItemCount} Item</span>
                          </div>
                          <div className="cart-total-amt">
                            Rp {cartTotal.toLocaleString('id-ID')}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="cart-checkout-btn"
                          disabled={cart.length === 0}
                          onClick={handleCheckout}
                        >
                          <span>Bayar</span>
                          <Sparkles size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Value Cards */}
        <div className="host-features-strip" data-reveal style={{ marginTop: '48px' }}>
          <div className="hfs-card">
            <div className="hfs-icon">
              <Smartphone size={22} style={{ color: 'var(--primary)' }} />
            </div>
            <h3 className="hfs-title">Zero Installation</h3>
            <p className="hfs-desc">
              Staff can use any personal smartphone, iPad, or Android tablet. No App Store or Play Store account requiredΓÇöruns natively in Safari and Chrome.
            </p>
          </div>

          <div className="hfs-card">
            <div className="hfs-icon">
              <Key size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="hfs-title">Instant Auto-Login</h3>
            <p className="hfs-desc">
              Connected devices securely inherit the active host user session from the QR code. Zero credential input needed for instant multi-register access.
            </p>
          </div>

          <div className="hfs-card">
            <div className="hfs-icon">
              <Zap size={22} style={{ color: 'var(--success)' }} />
            </div>
            <h3 className="hfs-title">Sub-Millisecond Dual Sync</h3>
            <p className="hfs-desc">
              Transactions commit immediately to the local desktop SQLite WAL file with zero latency, then drain in the background to Supabase Cloud when online.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HostSyncSection;

