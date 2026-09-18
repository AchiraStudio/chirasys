import React from 'react';
import { KeyRound, Shield, HardDrive, Lock, RefreshCw, Users } from 'lucide-react';
import { RbacMatrix } from '../interactive/RbacMatrix';

export const SecuritySection: React.FC = () => {
  return (
    <section className="section" id="security">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot" />
            SECURITY &amp; DATA PRIVACY
          </div>
          <h2 className="h2">Complete Sovereignty with 100% BYOK Model.</h2>
          <p className="lead">
            Bring Your Own Key — your business data and cloud credentials stay encrypted on your local hardware, with zero intermediary vendor servers.
          </p>
        </div>

        <div className="split" style={{ alignItems: 'start' }}>
          <div data-reveal>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--heading)', marginBottom: '12px' }}>
              Your Keys. Your Database. Absolute Sovereignty.
            </h3>
            <ul className="blist">
              <li>
                <KeyRound size={16} />
                <span>
                  <b>No Hardcoded Vendor Keys</b> — the application is strictly free from proprietary master keys or backdoor tracking.
                </span>
              </li>
              <li>
                <Shield size={16} />
                <span>
                  <b>Zero Intermediary Servers</b> — direct, encrypted connections from the desktop app to your private Supabase project.
                </span>
              </li>
              <li>
                <HardDrive size={16} />
                <span>
                  <b>Local OS Credential Encryption</b> — tokens and API keys are stored in native system keychains without ever pinging third parties.
                </span>
              </li>
              <li>
                <Lock size={16} />
                <span>
                  <b>Granular Role-Based Access (RBAC)</b> — restrict cashiers from viewing gross profit margins, modifying unit prices, or processing unauthorized voids.
                </span>
              </li>
            </ul>
          </div>

          {/* BYOK Flow Diagram */}
          <div className="byok-diagram" data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
            <div className="bk-node hl">
              <b>Business Owner</b>
              <small>Sole credentials holder</small>
            </div>
            <div className="bk-link" />
            <div className="bk-keys">
              <span className="bk-key">
                <KeyRound size={13} /> Supabase URL + Anon Key
              </span>
              <span className="bk-key">
                <KeyRound size={13} /> OpenAI / Anthropic Key
              </span>
            </div>
            <div className="bk-link" />
            <div className="bk-node">
              <b>Encrypted Local Storage</b>
              <small>Secured on your workstation NVMe</small>
            </div>
            <div className="bk-link" />
            <div className="bk-node hl">
              <b>Kivo Desktop App</b>
              <small>Native Tauri + Rust Runtime</small>
            </div>
            <div className="bk-link" />
            <div className="bk-split">
              <div className="bk-node">
                <b>Local SQLite</b>
                <small>0ms · 100% offline-ready</small>
              </div>
              <div className="bk-node">
                <b>Your Supabase Project</b>
                <small>Multi-branch cloud mesh sync</small>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Sub-cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '14px',
            marginTop: '44px',
          }}
          id="secSub"
        >
          <div className="card" data-reveal>
            <span className="f-ic" style={{ marginBottom: '14px', background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
              <RefreshCw size={20} />
            </span>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--heading)', marginBottom: '8px' }}>
              Safe Staging Data Purge Utilities
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--body)', lineHeight: 1.55 }}>
              Managed utilities to flush test transactions and simulated sales cleanly — user accounts, role permissions, and product catalog remain preserved.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              <span className="chip">Simulated Sales Data</span>
              <span style={{ color: 'var(--dim)' }}>→</span>
              <span
                className="chip"
                style={{
                  borderColor: 'color-mix(in srgb, var(--danger) 45%, var(--line))',
                  color: 'var(--danger)',
                }}
              >
                FLUSH / PURGE
              </span>
              <span style={{ color: 'var(--dim)' }}>→</span>
              <span
                className="chip"
                style={{
                  borderColor: 'color-mix(in srgb, var(--success) 45%, var(--line))',
                }}
              >
                <span className="dot g" />
                Master Catalog Preserved
              </span>
            </div>
          </div>

          <div className="card" data-reveal style={{ '--d': '80ms' } as React.CSSProperties}>
            <span className="f-ic" style={{ marginBottom: '14px', background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
              <Users size={20} />
            </span>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--heading)', marginBottom: '8px' }}>
              Granular Role-Based Access Control (RBAC)
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--body)', lineHeight: 1.55 }}>
              Precision authority gating across 6 discrete personnel tiers — prevent receipt voids without supervisor overrides and safeguard accounting books.
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '16px' }}>
              <span className="chip">Owner</span>
              <span className="chip">Sysadmin</span>
              <span className="chip">Admin</span>
              <span className="chip">Manager</span>
              <span className="chip">Cashier</span>
              <span className="chip">Warehouse Staff</span>
            </div>
          </div>
        </div>

        {/* Live Interactive RBAC Matrix */}
        <div style={{ marginTop: '14px' }} data-reveal>
          <RbacMatrix />
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
