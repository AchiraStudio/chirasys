import React from 'react';
import { UserCheck, TicketPercent, Coins, Crown, Gift } from 'lucide-react';

export const CustomersPromosSection: React.FC = () => {
  return (
    <section className="section" id="customers">
      <div className="wrap split rev">
        {/* Customer & Promo Interactive Preview */}
        <div className="vstack" data-reveal style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Member Profile Header */}
          <div className="panel" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div
              className="avatar"
              style={{
                width: '44px',
                height: '44px',
                fontSize: '16px',
                fontWeight: 800,
                background: 'var(--grad-primary)',
                color: '#fff',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              S
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <b style={{ color: 'var(--heading)', fontSize: '15px' }}>Sarah Jenkins</b>
                <span className="pill" style={{ background: 'color-mix(in srgb, var(--primary) 20%, transparent)', color: 'var(--primary)' }}>
                  <Crown size={11} /> VIP GOLD MEMBER
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--dim)', marginTop: '2px' }}>
                Member since 2023 · 214 orders · +1 (555) 234-5678
              </div>
            </div>
          </div>

          {/* Points & Credit Limit Meter */}
          <div className="panel">
            <div className="pl-row">
              <span style={{ color: 'var(--dim)' }}>Loyalty Reward Points</span>
              <span className="pl-bar">
                <i style={{ width: '62%', background: 'var(--primary)' }} />
              </span>
              <span style={{ fontWeight: 800, color: 'var(--primary)' }}>1,240 Pts</span>
            </div>

            <div className="pl-row">
              <span style={{ color: 'var(--dim)' }}>Active Accounts Receivable</span>
              <span className="pl-bar">
                <i style={{ width: '17%', background: 'var(--warning)' }} />
              </span>
              <span style={{ fontWeight: 700 }}>$340.00</span>
            </div>

            <div className="pl-row" style={{ paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--heading)', fontWeight: 700 }}>Store Credit Limit</span>
              <span className="pl-bar">
                <i style={{ width: '100%', background: 'var(--line-strong)' }} />
              </span>
              <span style={{ fontWeight: 800 }}>$2,000.00</span>
            </div>
          </div>

          {/* Active Promo Engine Chips */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="panel-title">Active POS Register Promotion Engine</span>
                <span className="panel-sub" style={{ display: 'block', marginTop: '2px' }}>Automatically applied during barcode scanning</span>
              </div>
            </div>
            <div className="f-frag" style={{ marginTop: '8px' }}>
              <span
                className="chip"
                style={{
                  borderColor: 'color-mix(in srgb, var(--primary) 40%, var(--line))',
                  background: 'var(--primary-soft)',
                  color: 'var(--heading)',
                }}
              >
                BUY 10+ · SAVE 10%
              </span>
              <span
                className="chip"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent) 40%, var(--line))',
                  background: 'var(--accent-soft)',
                  color: 'var(--heading)',
                }}
              >
                BUY 1 · GET 1 (BOGO)
              </span>
              <span className="chip">COMBO MEAL $12.50</span>
              <span className="chip">VIP GOLD −15%</span>
              <span className="chip">MEMBER REGULAR −5%</span>
            </div>
            <p style={{ fontSize: '12px', marginTop: '10px', color: 'var(--dim)', lineHeight: 1.5 }}>
              Promotional rules evaluate in real-time on the local register without cashiers calculating discounts manually.
            </p>
          </div>
        </div>

        {/* Informative Side */}
        <div data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
          <div className="eyebrow">
            <span className="eb-dot" />
            CUSTOMER LOYALTY &amp; PROMOTIONS
          </div>
          <h2 className="h2">Know Your Best Customers. Reward Them Instantly.</h2>
          <p className="lead">
            Member profiles with cross-branch order history, automated points accrual, credit limits, and dynamic promotion engines active at checkout.
          </p>
          <ul className="blist">
            <li>
              <UserCheck size={16} />
              <span>
                <b>Comprehensive Profiles</b> — track lifetime revenue, visit frequency, and favorite items across every retail branch.
              </span>
            </li>
            <li>
              <TicketPercent size={16} />
              <span>
                <b>Automated Loyalty Points</b> — accrue and redeem reward points directly as dollar discounts at the cash register.
              </span>
            </li>
            <li>
              <Coins size={16} />
              <span>
                <b>Credit &amp; Invoicing Safeguards</b> — allow trusted wholesale customers to charge purchases on account up to configured limits.
              </span>
            </li>
            <li>
              <Gift size={16} />
              <span>
                <b>Flexible Promotion Rules</b> — configure tiered bulk discounts, BOGO promotions, combo packs, and VIP member incentives effortlessly.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default CustomersPromosSection;
