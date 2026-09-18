import React from 'react';
import { Monitor, Download, ArrowRight, CheckCircle2, ShieldCheck, Terminal } from 'lucide-react';
import { KivoMark, GithubIcon } from '../common/BrandLogo';

export const DownloadSection: React.FC = () => {
  return (
    <>
      <section className="section" id="download">
        <div className="wrap">
          <div className="sec-head center" data-reveal>
            <div className="eyebrow">
              <span className="eb-dot" />
              DESKTOP DOWNLOADS
            </div>
            <h2 className="h2">Deploy Kivo to Your Store Terminals Today.</h2>
            <p className="lead">
              Fast, memory-efficient, crash-resilient 64-bit desktop application. Latest production release: v1.3.2.
            </p>
          </div>

          <div style={{ maxWidth: '520px', margin: '0 auto' }}>
            <div className="card dl-card" data-reveal style={{ textAlign: 'center', padding: '36px 28px' }}>
              <span className="f-ic" style={{ margin: '0 auto 16px', background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)', width: '56px', height: '56px' }}>
                <Monitor size={28} />
              </span>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--heading)' }}>
                Windows Desktop (64-bit)
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--body)', marginTop: '6px', marginBottom: '22px' }}>
                Fully compatible with Windows 10 &amp; Windows 11 (MSI Installer &amp; Standalone Portable).
              </p>

              <a
                className="btn btn-primary"
                href="https://github.com/AchiraStudio/kivo/releases"
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: '100%', justifyContent: 'center', height: '50px', fontSize: '15px' }}
              >
                <Download size={18} />
                <span>Download v1.3.2 Installer (.exe / .msi)</span>
              </a>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '18px', flexWrap: 'wrap' }}>
                <span className="mini-s" style={{ color: 'var(--success)' }}>
                  <CheckCircle2 size={13} /> 100% Offline-Ready
                </span>
                <span className="mini-s" style={{ color: 'var(--accent)' }}>
                  <ShieldCheck size={13} /> Verified &amp; Secure
                </span>
                <span className="mini-s">
                  <Terminal size={13} /> SQLite WAL Active
                </span>
              </div>
            </div>
          </div>

          <div className="dl-note" data-reveal style={{ marginTop: '24px' }}>
            <span>Open Source MIT License</span>
            <span>·</span>
            <a href="https://github.com/AchiraStudio/kivo#readme" target="_blank" rel="noopener noreferrer">
              Installation &amp; Setup Guide
            </a>
            <span>·</span>
            <a href="https://github.com/AchiraStudio/kivo" target="_blank" rel="noopener noreferrer">
              GitHub AchiraStudio/kivo
            </a>
          </div>
        </div>
      </section>

      {/* Open Source Banner */}
      <section className="section" style={{ paddingTop: '10px', paddingBottom: '70px' }}>
        <div className="wrap">
          <div className="oss" data-reveal style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <KivoMark size={52} />
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: 'var(--heading)' }}>
              Kivo is Free, Open-Source &amp; Self-Sovereign.
            </h2>
            <p className="lead" style={{ margin: '12px auto 28px', maxWidth: '64ch' }}>
              Every line of code is open for transparent security audits — zero black-box telemetries and zero forced vendor subscriptions between you and your business ledgers.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                className="btn btn-primary"
                href="https://github.com/AchiraStudio/kivo"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon size={16} />
                <span>View Source on GitHub</span>
              </a>
              <a
                className="btn btn-secondary"
                href="https://github.com/AchiraStudio/kivo#readme"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Read Full Documentation</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default DownloadSection;
