import React from 'react';
import { KeyRound, Shield, HardDrive, Lock, RefreshCw, Users } from 'lucide-react';
import { RbacMatrix } from '../interactive/RbacMatrix';

export const SecuritySection: React.FC = () => {
  return (
    <section className="section tint" id="security">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>SECURITY
          </div>
          <h2 className="h2">Designed so you stay in control.</h2>
          <p className="lead">
            Kivo is designed around a pure Bring Your Own Key model — precise by intention, not vague by convenience.
          </p>
        </div>

        <div className="split" style={{ alignItems: 'start' }}>
          <div data-reveal>
            <h3 style={{ fontSize: '22px', marginBottom: '10px' }}>
              Your keys. Your infrastructure. Your data.
            </h3>
            <ul className="blist">
              <li>
                <KeyRound size={16} />
                <span>
                  <b>No baked-in credentials</b> — Kivo ships without API keys of any kind.
                </span>
              </li>
              <li>
                <Shield size={16} />
                <span>
                  <b>No hidden fallback secrets</b> — nothing silently routes through our servers.
                </span>
              </li>
              <li>
                <HardDrive size={16} />
                <span>
                  <b>Local credential storage</b> — your Supabase and OpenAI keys live on your machine.
                </span>
              </li>
              <li>
                <Lock size={16} />
                <span>
                  <b>Zero-trust design philosophy</b> — nothing is assumed trusted except you.
                </span>
              </li>
            </ul>
          </div>

          <div className="byok-diagram" data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
            <div className="bk-node hl">
              <b>You</b>
              <small>the only trusted party</small>
            </div>
            <div className="bk-link"></div>
            <div className="bk-keys">
              <span className="bk-key">
                <KeyRound size={13} /> Supabase URL + public key
              </span>
              <span className="bk-key">
                <KeyRound size={13} /> OpenAI API key
              </span>
            </div>
            <div className="bk-link"></div>
            <div className="bk-node">
              <b>Local configuration</b>
              <small>stored on your machine only</small>
            </div>
            <div className="bk-link"></div>
            <div className="bk-node hl">
              <b>Kivo</b>
              <small>desktop application</small>
            </div>
            <div className="bk-link"></div>
            <div className="bk-split">
              <div className="bk-node">
                <b>SQLite</b>
                <small>always local</small>
              </div>
              <div className="bk-node">
                <b>Your Supabase</b>
                <small>when you choose to sync</small>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
            marginTop: '52px',
          }}
          id="secSub"
        >
          <div className="card" data-reveal>
            <span className="f-ic" style={{ marginBottom: '14px' }}>
              <RefreshCw size={20} />
            </span>
            <h3 style={{ fontSize: '17px', marginBottom: '8px' }}>Safe Cloud Data Cleanup</h3>
            <p style={{ fontSize: '14px' }}>
              A controlled utility for clearing test or transactional data from your cloud workspace — while users, roles, and workspace structure stay protected.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <span className="chip">Test / transactional data</span>
              <span style={{ color: 'var(--dim)' }}>→</span>
              <span
                className="chip"
                style={{
                  borderColor: 'color-mix(in srgb, var(--danger) 45%, var(--line))',
                  color: 'var(--danger)',
                }}
              >
                PURGE
              </span>
              <span style={{ color: 'var(--dim)' }}>→</span>
              <span
                className="chip"
                style={{
                  borderColor: 'color-mix(in srgb, var(--success) 45%, var(--line))',
                }}
              >
                <span className="dot g"></span>Users &amp; roles protected
              </span>
            </div>
          </div>

          <div className="card" data-reveal style={{ '--d': '80ms' } as React.CSSProperties}>
            <span className="f-ic" style={{ marginBottom: '14px' }}>
              <Users size={20} />
            </span>
            <h3 style={{ fontSize: '17px', marginBottom: '8px' }}>Role-Based Access Control</h3>
            <p style={{ fontSize: '14px' }}>
              Role templates, granular permissions, and per-user overrides across six roles — from Owner to Staff.
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '16px' }}>
              <span className="chip">Owner</span>
              <span className="chip">Sysadmin</span>
              <span className="chip">Admin</span>
              <span className="chip">Manager</span>
              <span className="chip">Cashier</span>
              <span className="chip">Staff</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '14px' }} data-reveal>
          <RbacMatrix />
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;

