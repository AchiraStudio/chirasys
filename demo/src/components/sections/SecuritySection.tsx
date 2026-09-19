import React from 'react';
import { KeyRound, Shield, HardDrive } from 'lucide-react';
import { RbacMatrix } from '../interactive/RbacMatrix';

export const SecuritySection: React.FC = () => {
  return (
    <section className="section" id="security">
      <div className="wrap">
        {/* Keynote Header */}
        <div className="sec-head center" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot" />
            DATA SOVEREIGNTY &amp; PRIVACY
          </div>
          <h2 className="h2">100% BYOK. Zero Vendor Lock-in.</h2>
          <p className="lead">
            Bring Your Own Keys. Your database credentials stay encrypted on your hardware with direct connection to your private Supabase instance.
          </p>
        </div>

        {/* Presentation Split: Visual BYOK Diagram + Interactive RBAC */}
        <div className="split" style={{ alignItems: 'start' }}>
          {/* Visual Sovereignty Flow */}
          <div data-reveal>
            <div className="byok-diagram">
              <div className="bk-node hl">
                <Shield size={18} className="text-primary" />
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
                <HardDrive size={18} className="text-accent" />
                <b>Local Keyring Storage</b>
                <small>Secured on your workstation NVMe</small>
              </div>

              <div className="bk-link" />

              <div className="bk-split">
                <div className="bk-node">
                  <b>Local SQLite</b>
                  <small>0ms local SSD persistence</small>
                </div>
                <div className="bk-node">
                  <b>Your Supabase</b>
                  <small>Mesh sync across stores</small>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Role Permissions Inspector */}
          <div data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
            <RbacMatrix />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
