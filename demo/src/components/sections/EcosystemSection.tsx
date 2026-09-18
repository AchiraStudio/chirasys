import React, { useState } from 'react';
import {
  ShoppingCart,
  Package,
  Truck,
  BookOpen,
  Users,
  Sparkles,
  ArrowRight,
  Database,
  Cloud,
  Wifi,
  Printer,
} from 'lucide-react';
import { KivoMark } from '../common/BrandLogo';

interface EcosystemNode {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  tag: string;
  link: string;
  flowText: string;
}

const MODULE_NODES: EcosystemNode[] = [
  {
    id: 'pos',
    name: 'Blazing POS Checkout',
    subtitle: 'Barcode scanning, split payment & instant thermal receipt',
    icon: ShoppingCart,
    color: 'var(--primary)',
    tag: '0ms Latency',
    link: '#pos',
    flowText: 'Every checkout decrements stock and automatically posts balanced journal vouchers',
  },
  {
    id: 'inventory',
    name: 'Multi-Tier Inventory',
    subtitle: 'Carton → Pack → Piece hierarchy with batch lots & expiry',
    icon: Package,
    color: 'var(--accent)',
    tag: 'FIFO Tracking',
    link: '#inventory',
    flowText: 'Inventory counts update instantly across all units and registers',
  },
  {
    id: 'purchasing',
    name: 'Procurement (PO)',
    subtitle: 'Purchase orders, partial receiving & automated COGS',
    icon: Truck,
    color: 'var(--success)',
    tag: 'Auto Landed Cost',
    link: '#purchasing',
    flowText: 'Received items immediately enter stock and update accounts payable ledgers',
  },
  {
    id: 'accounting',
    name: 'General Ledger',
    subtitle: 'Self-balancing double entry, Profit & Loss and Balance Sheets',
    icon: BookOpen,
    color: 'var(--warning)',
    tag: 'Double-Entry',
    link: '#accounting',
    flowText: 'Automatic debit-credit journal posting with zero manual bookkeeper intervention',
  },
  {
    id: 'customers',
    name: 'Customers & CRM',
    subtitle: 'Loyalty points, credit limits & register promo engines',
    icon: Users,
    color: 'var(--accent)',
    tag: 'Member Tier',
    link: '#customers',
    flowText: 'Reward points & quantity discounts apply automatically at checkout',
  },
  {
    id: 'ai',
    name: 'Kivo AI Copilot',
    subtitle: 'Daily turnover metrics, reorder advisories & margin analysis',
    icon: Sparkles,
    color: 'var(--primary)',
    tag: 'NLP Insights',
    link: '#ai',
    flowText: 'Real-time analytical insights run against local SQLite without leaking raw business data',
  },
];

export const EcosystemSection: React.FC = () => {
  const [activeNode, setActiveNode] = useState<string>('pos');
  const currentNode = MODULE_NODES.find(n => n.id === activeNode) || MODULE_NODES[0];

  return (
    <section className="section" id="product">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot" />
            UNIFIED SYSTEM
          </div>
          <h2 className="h2">One Operational Core. Connecting Your Entire Business.</h2>
          <p className="lead">
            Not separate patched-together modules. A single local SQLite database powers point of sale, inventory, procurement, and accounting in one cohesive engine.
          </p>
        </div>

        {/* Modern Interactive Hub Showcase */}
        <div className="ecosystem-hub-container" data-reveal>
          {/* Core Central Banner */}
          <div className="eco-hub-center">
            <div className="eco-core-badge">
              <div className="eco-core-glow" />
              <KivoMark size={36} />
              <div className="eco-core-text">
                <span className="eco-core-title">Kivo Core Engine</span>
                <span className="eco-core-sub">SQLite Local WAL + Mesh Bus</span>
              </div>
            </div>
            <div className="eco-flow-banner">
              <span className="eco-flow-badge">Real-Time Data Pipeline</span>
              <p className="eco-flow-desc">{currentNode.flowText}</p>
            </div>
          </div>

          {/* Module Nodes Grid */}
          <div className="eco-nodes-grid">
            {MODULE_NODES.map(node => {
              const Icon = node.icon;
              const isActive = activeNode === node.id;
              return (
                <div
                  key={node.id}
                  className={`eco-node-card ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveNode(node.id)}
                  onMouseEnter={() => setActiveNode(node.id)}
                >
                  <div className="enc-header">
                    <div className="enc-icon" style={{ color: node.color }}>
                      <Icon size={20} />
                    </div>
                    <span className="enc-tag">{node.tag}</span>
                  </div>
                  <h3 className="enc-title">{node.name}</h3>
                  <p className="enc-sub">{node.subtitle}</p>
                  <div className="enc-footer">
                    <a href={node.link} className="enc-link">
                      <span>Explore Module</span>
                      <ArrowRight size={13} />
                    </a>
                    {isActive && <span className="enc-pulse-dot" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Foundation Infrastructure Bus */}
          <div className="eco-infra-bar">
            <div className="eib-item">
              <Database size={15} className="text-warning" />
              <span className="eib-label">SQLite Local Disk (0ms Latency)</span>
            </div>
            <div className="eib-arrow">→</div>
            <div className="eib-item">
              <Wifi size={15} className="text-success" />
              <span className="eib-label">Mesh LAN Auto-Discovery (UDP)</span>
            </div>
            <div className="eib-arrow">→</div>
            <div className="eib-item">
              <Cloud size={15} className="text-accent" />
              <span className="eib-label">34-Table Supabase Cloud Sync</span>
            </div>
            <div className="eib-arrow">→</div>
            <div className="eib-item">
              <Printer size={15} className="text-primary" />
              <span className="eib-label">Direct ESC/POS Thermal Printing</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EcosystemSection;
