import React from 'react';
import {
  ArrowUpRight,
  ShoppingCart,
  Package,
  Truck,
  Calculator,
  Users,
  Cloud,
  Wifi,
  Sparkles,
  ShieldCheck,
  Printer,
  KeyRound,
} from 'lucide-react';

export const FeatureGrid: React.FC = () => {
  return (
    <section className="section" id="features">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>MODULES
          </div>
          <h2 className="h2">Ten modules. One source of truth.</h2>
          <p className="lead">
            Each module does real work on its own — and gets better because the others are there.
          </p>
        </div>
        <div className="fgrid">
          <a className="fcard" style={{ '--sp': 3 } as React.CSSProperties} href="#pos" data-reveal>
            <span className="f-go"><ArrowUpRight size={16} /></span>
            <span className="f-ic"><ShoppingCart size={20} /></span>
            <h3>Kivo POS</h3>
            <p>
              A cashier environment built for speed — instant search, barcode-first flow, and split payments across cash, QRIS, cards, and customer credit.
            </p>
            <div className="f-frag">
              <span className="chip">CASH</span>
              <span className="chip">QRIS</span>
              <span className="chip">CARD</span>
              <span className="chip">TRANSFER</span>
              <span className="chip">CREDIT · PIUTANG</span>
            </div>
          </a>

          <a className="fcard" style={{ '--sp': 3, '--d': '70ms' } as React.CSSProperties} href="#inventory" data-reveal>
            <span className="f-go"><ArrowUpRight size={16} /></span>
            <span className="f-ic"><Package size={20} /></span>
            <h3>Inventory</h3>
            <p>
              Multi-unit stock with batches, expiry dates, a complete stock ledger, and Stock Opname counts that reconcile variance automatically.
            </p>
            <div className="f-frag">
              <span className="chip">BOX</span>
              <span className="chip">↓</span>
              <span className="chip">PACK</span>
              <span className="chip">↓</span>
              <span className="chip">PCS</span>
            </div>
          </a>

          <a className="fcard" href="#purchasing" data-reveal>
            <span className="f-go"><ArrowUpRight size={16} /></span>
            <span className="f-ic"><Truck size={20} /></span>
            <h3>Purchasing</h3>
            <p>
              Purchase orders, goods receiving, supplier bills, and payables — costs flow straight into HPP and the general ledger.
            </p>
          </a>

          <a className="fcard" href="#accounting" data-reveal style={{ '--d': '60ms' } as React.CSSProperties}>
            <span className="f-go"><ArrowUpRight size={16} /></span>
            <span className="f-ic"><Calculator size={20} /></span>
            <h3>Accounting</h3>
            <p>
              Double-entry books that write themselves. Every sale, receipt, and adjustment becomes a balanced journal entry.
            </p>
          </a>

          <a className="fcard" href="#customers" data-reveal style={{ '--d': '120ms' } as React.CSSProperties}>
            <span className="f-go"><ArrowUpRight size={16} /></span>
            <span className="f-ic"><Users size={20} /></span>
            <h3>Customers &amp; Promotions</h3>
            <p>
              Profiles, loyalty points, credit limits, and promotions from BOGO to quantity tiers and VIP pricing — applied at the register.
            </p>
          </a>

          <a className="fcard" href="#cloud" data-reveal>
            <span className="f-go"><ArrowUpRight size={16} /></span>
            <span className="f-ic"><Cloud size={20} /></span>
            <h3>Kivo Cloud</h3>
            <p>
              A multi-branch workspace on Supabase — your credentials, your project, your data.
            </p>
          </a>

          <a className="fcard" href="#lan" data-reveal style={{ '--d': '60ms' } as React.CSSProperties}>
            <span className="f-go"><ArrowUpRight size={16} /></span>
            <span className="f-ic"><Wifi size={20} /></span>
            <h3>LAN Sync</h3>
            <p>
              Terminals discover each other over UDP and synchronize over your local network — no internet needed.
            </p>
          </a>

          <a className="fcard" href="#ai" data-reveal style={{ '--d': '120ms' } as React.CSSProperties}>
            <span className="f-go"><ArrowUpRight size={16} /></span>
            <span className="f-ic"><Sparkles size={20} /></span>
            <h3>Kivo AI</h3>
            <p>
              Ask business questions in plain language. Answers come from your data through function calling.
            </p>
          </a>

          <a className="fcard" style={{ '--sp': 3 } as React.CSSProperties} href="#security" data-reveal>
            <span className="f-go"><ArrowUpRight size={16} /></span>
            <span className="f-ic"><ShieldCheck size={20} /></span>
            <h3>Security</h3>
            <p>
              BYOK credentials, role-based access control, and a controlled cloud data cleanup utility — designed so you stay in control.
            </p>
            <div className="f-frag">
              <span className="chip"><KeyRound size={12} /> Supabase key</span>
              <span className="chip"><KeyRound size={12} /> OpenAI key</span>
              <span className="chip">stored locally</span>
            </div>
          </a>

          <a className="fcard" style={{ '--sp': 3, '--d': '70ms' } as React.CSSProperties} href="#hardware" data-reveal>
            <span className="f-go"><ArrowUpRight size={16} /></span>
            <span className="f-ic"><Printer size={20} /></span>
            <h3>Hardware</h3>
            <p>
              Thermal printers via ESC/POS or the HPRT SDK, cash drawers, and barcode scanners — over USB, network, or Bluetooth.
            </p>
            <div className="f-frag">
              <span className="chip">ESC/POS</span>
              <span className="chip">HPRT SDK</span>
              <span className="chip">58 / 80 mm</span>
              <span className="chip">USB · NET · BT</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;

