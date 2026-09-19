import React, { useState } from 'react';
import {
  ShoppingCart,
  Package,
  BookOpen,
  Truck,
  Users,
  Cloud,
  ArrowRight,
  Sparkles,
  ArrowUpRight,
  Smartphone,
} from 'lucide-react';
import { scrollToTarget } from '../../utils/scroll';

interface PillarItem {
  id: string;
  tabId: string;
  name: string;
  headline: string;
  summary: string;
  telemetryTag: string;
  icon: React.ElementType;
  color: string;
  highlights: { label: string; detail: string }[];
}

const PILLARS: PillarItem[] = [
  {
    id: 'pos',
    tabId: 'pos',
    name: 'Point of Sale',
    headline: 'Sub-Millisecond Barcode Checkout',
    summary: 'Instant product search, split tender across Cash, Cards, and QRIS, and direct ESC/POS thermal printing.',
    telemetryTag: '0ms Commit',
    icon: ShoppingCart,
    color: 'var(--primary)',
    highlights: [
      { label: '0-Delay Search', detail: 'Instant barcode scan & 2-char fuzzy product search' },
      { label: 'Split Tender', detail: 'Combine Cash, QRIS, Credit/Debit, and Store Credit' },
      { label: 'Hardware Native', detail: 'Direct raw ESC/POS printing & cash drawer auto-kick' },
    ],
  },
  {
    id: 'inventory',
    tabId: 'inventory',
    name: 'Multi-Unit Catalog',
    headline: 'Hierarchical Box → Pack → Pcs Conversions',
    summary: 'Automated tiered conversions, FIFO expiry batch lifecycles, and rapid reconciliation stock opname.',
    telemetryTag: '3-Tier Units',
    icon: Package,
    color: 'var(--accent)',
    highlights: [
      { label: 'Nested Units', detail: 'Carton → Inner Pack → Base PCS auto-conversion' },
      { label: 'Batch Lot & Expiry', detail: 'Strict FIFO tracking with proactive expiry warnings' },
      { label: 'Stock Opname', detail: 'Variance tracking with single-click ledger reconciliation' },
    ],
  },
  {
    id: 'accounting',
    tabId: 'reports',
    name: 'General Ledger',
    headline: 'Real-Time Double-Entry Books',
    summary: 'Every register sale, receiving slip, and return automatically creates balanced debit-credit journal vouchers.',
    telemetryTag: 'Double-Entry',
    icon: BookOpen,
    color: 'var(--warning)',
    highlights: [
      { label: 'Auto Journaling', detail: 'Zero manual bookkeeping needed for daily operations' },
      { label: 'Live Financials', detail: 'Instant Profit & Loss, Balance Sheet, and Trial Balance' },
      { label: 'Standard COA', detail: 'Standard Chart of Accounts for Assets, Liabilities & Equity' },
    ],
  },
  {
    id: 'purchasing',
    tabId: 'purchasing',
    name: 'Procurement',
    headline: 'Seamless PO to Goods Receiving',
    summary: 'Purchase orders, partial shipment receipts, automatic COGS calculations, and transparent accounts payable.',
    telemetryTag: 'Auto COGS',
    icon: Truck,
    color: 'var(--success)',
    highlights: [
      { label: 'Supplier POs', detail: 'Create, issue, and track purchase orders effortlessly' },
      { label: 'GRN Receiving', detail: 'Inspect goods received with immediate inventory increment' },
      { label: 'Payables Aging', detail: 'Track supplier invoices and due dates without surprises' },
    ],
  },
  {
    id: 'customers',
    tabId: 'customers',
    name: 'Loyalty & CRM',
    headline: 'Dynamic Member Rewards & VIP Tiers',
    summary: 'Cross-branch customer profiles, automated points accrual, credit limits, and automated promo rules.',
    telemetryTag: 'VIP Tiers',
    icon: Users,
    color: 'var(--primary)',
    highlights: [
      { label: 'Omnichannel Profiles', detail: 'Track lifetime spend and purchase frequency across stores' },
      { label: 'Points Accrual', detail: 'Automatic reward points redeemable directly at checkout' },
      { label: 'Store Credit Limit', detail: 'Safe credit lines for trusted wholesale and VIP clients' },
    ],
  },
  {
    id: 'cloud',
    tabId: 'dashboard',
    name: 'Supabase Mesh',
    headline: '100% BYOK Multi-Branch Cloud Sync',
    summary: 'Direct connection to your private Supabase database. Your data stays sovereign on your local SSD and replicates when online.',
    telemetryTag: 'BYOK Sync',
    icon: Cloud,
    color: 'var(--accent)',
    highlights: [
      { label: 'Zero Middleman', detail: 'Connect directly to your private Supabase credentials' },
      { label: 'Local-First SSD', detail: 'Transactions commit locally first, then replicate in background' },
      { label: 'Multi-Store Mesh', detail: 'Centralized catalog and branch reports across all outlets' },
    ],
  },
  {
    id: 'host',
    tabId: 'settings',
    name: 'Host & Multi-Device',
    headline: 'Instant Cashier Terminals via QR Code',
    summary: 'Turn any smartphone, tablet, or secondary laptop into a live cashier terminal with automatic session syncing and zero app installation.',
    telemetryTag: 'LAN Auto-Sync',
    icon: Smartphone,
    color: '#00C2FF',
    highlights: [
      { label: 'Zero Install', detail: 'Open any mobile browser or scan host QR to access immediately' },
      { label: 'Auto Authentication', detail: 'One-click tokenized auto-login with zero credentials typing' },
      { label: 'Realtime SQLite WAL', detail: 'Sub-millisecond local network sync straight to primary database' },
    ],
  },
];

export const FeatureGrid: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = PILLARS[activeIdx];
  const ActiveIcon = active.icon;

  const jumpToInteractiveApp = (tabId: string, pillarId?: string) => {
    if (pillarId === 'host') {
      scrollToTarget('host', { offset: 80 });
      return;
    }
    window.dispatchEvent(new CustomEvent('kivo-switch-tab', { detail: tabId }));
    scrollToTarget('appWin', { offset: 80 });
  };

  return (
    <section className="section" id="features">
      <div className="wrap">
        {/* Section Header with Refined Framing */}
        <div className="sec-head center" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot" />
            01 // CAPABILITY MATRIX
          </div>
          <h2 className="h2">Unified Architecture. Zero Bloat.</h2>
          <p className="lead">
            Every store capability running on a single native local engine. Switch modules with zero latency.
          </p>
        </div>

        {/* Architectural Segmented Deck (No pill buttons) */}
        <div className="pillar-stage" data-reveal>
          <div className="deck-tabs" role="tablist">
            {PILLARS.map((p, idx) => {
              const isSelected = idx === activeIdx;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`deck-tab ${isSelected ? 'active' : ''}`}
                  onClick={() => setActiveIdx(idx)}
                >
                  <span className="deck-num">0{idx + 1}</span>
                  <span className="deck-name">{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Pillar Showcase Card */}
          <div className="deck-display">
            <div className="deck-telemetry">
              <div className="deck-spec-row">
                <div className="deck-icon-bubble" style={{ color: active.color, background: `color-mix(in srgb, ${active.color} 14%, transparent)` }}>
                  <ActiveIcon size={24} />
                </div>
                <div>
                  <span className="deck-spec-tag">{active.telemetryTag}</span>
                  <h3 className="deck-title">{active.headline}</h3>
                </div>
              </div>
            </div>

            <p className="deck-summary">{active.summary}</p>

            {/* 3 Presentation Highlights */}
            <div className="deck-hl-grid">
              {active.highlights.map((h, i) => (
                <div key={i} className="deck-hl-item">
                  <div className="deck-hl-bar" style={{ background: active.color }} />
                  <div>
                    <h4 className="deck-hl-label">{h.label}</h4>
                    <p className="deck-hl-detail">{h.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Direct Action Link to Interactive App */}
            <div className="deck-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => jumpToInteractiveApp(active.tabId, active.id)}
              >
                <Sparkles size={15} />
                <span>{active.id === 'host' ? 'Experience Multi-Device Simulator' : `Launch ${active.name} in Live App`}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Architectural Monolith Tiles (No pill badges) */}
        <div className="deck-card-grid" data-reveal>
          {PILLARS.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === activeIdx;
            return (
              <div
                key={item.id}
                className={`deck-card ${isSelected ? 'active' : ''}`}
                onClick={() => setActiveIdx(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveIdx(idx);
                  }
                }}
              >
                <span className="deck-card-watermark">0{idx + 1}</span>
                <div className="deck-card-header">
                  <div className="deck-card-icon" style={{ color: item.color }}>
                    <Icon size={20} />
                  </div>
                  <span className="deck-card-spec">{item.telemetryTag}</span>
                </div>
                <h4 className="deck-card-name">{item.name}</h4>
                <p className="deck-card-summary">{item.summary}</p>
                <div className="deck-card-arrow">
                  <span>Explore Module</span>
                  <ArrowUpRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;
