import React from 'react';
import { UserCheck, TicketPercent, Coins } from 'lucide-react';

export const CustomersPromosSection: React.FC = () => {
  return (
    <section className="section" id="customers">
      <div className="wrap split rev">
        <div className="vstack" data-reveal style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="panel" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <span className="avatar" style={{ width: '44px', height: '44px', fontSize: '16px' }}>
              S
            </span>
            <div style={{ flex: 1 }}>
              <b style={{ color: 'var(--heading)', fontSize: '14.5px' }}>Siti Rahma</b>
              <div style={{ fontSize: '12px', color: 'var(--dim)' }}>Member since 2023 · 214 transactions</div>
            </div>
            <span className="pill">
              <span className="dot p"></span>MEMBER
            </span>
          </div>

          <div className="panel">
            <div className="pl-row">
              <span style={{ color: 'var(--dim)' }}>Loyalty points</span>
              <span className="pl-bar">
                <i style={{ width: '62%', background: 'var(--primary)' }}></i>
              </span>
              <span>1.240</span>
            </div>
            <div className="pl-row">
              <span style={{ color: 'var(--dim)' }}>Credit used</span>
              <span className="pl-bar">
                <i style={{ width: '17%', background: 'var(--warning)' }}></i>
              </span>
              <span>340.000</span>
            </div>
            <div className="pl-row">
              <span style={{ color: 'var(--heading)', fontWeight: 700 }}>Credit limit — Piutang</span>
              <span className="pl-bar">
                <i style={{ width: '100%', background: 'var(--line-strong)' }}></i>
              </span>
              <span>2.000.000</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Active promotions</span>
            </div>
            <div className="f-frag">
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
                BUY 1 · GET 1
              </span>
              <span className="chip">BUNDLE Rp 25.000</span>
              <span className="chip">VIP −15%</span>
              <span className="chip">MEMBER −5%</span>
            </div>
            <p style={{ fontSize: '12px', marginTop: '10px', color: 'var(--dim)' }}>
              Percentage &amp; nominal discounts, quantity tiers, bundles, member and VIP pricing — business rules, not storefront gimmicks.
            </p>
          </div>
        </div>

        <div data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
          <div className="eyebrow">
            <span className="eb-dot"></span>CUSTOMERS &amp; PROMOTIONS
          </div>
          <h2 className="h2">Kenali pelanggan setia. Berikan reward tepat.</h2>
          <p className="lead">
            Profil pelanggan, batas piutang, poin loyalitas, serta promo otomatis di kasir.
          </p>
          <ul className="blist">
            <li>
              <UserCheck size={16} />
              <span>
                <b>Profil &amp; Riwayat Belanja</b> — pantau riwayat transaksi di seluruh cabang.
              </span>
            </li>
            <li>
              <TicketPercent size={16} />
              <span>
                <b>Poin Loyalitas &amp; Diskon</b> — perolehan dan penukaran poin instan di kasir.
              </span>
            </li>
            <li>
              <Coins size={16} />
              <span>
                <b>Batas Kredit (Piutang)</b> — kontrol jatuh tempo dan saldo piutang pelanggan.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default CustomersPromosSection;

