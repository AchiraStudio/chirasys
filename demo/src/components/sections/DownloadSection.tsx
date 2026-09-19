import React from 'react';
import { Download } from 'lucide-react';
import { KivoMark, GithubIcon } from '../common/BrandLogo';

export const DownloadSection: React.FC = () => {
  return (
    <section className="section" id="download">
      <div className="wrap">
        {/* Presentation Closing Header */}
        <div className="sec-head center" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot" />
            03 // DEPLOYMENT
          </div>
          <h2 className="h2">Deploy Kivo to Your Store Terminals.</h2>
          <p className="lead">
            Lightning-fast, crash-resilient 64-bit desktop application. Free, open-source, and self-sovereign.
          </p>
        </div>

        {/* Central Keynote Download Stage */}
        <div style={{ maxWidth: '640px', margin: '0 auto' }} data-reveal>
          <div className="card dl-card" style={{ textAlign: 'center', padding: '44px 36px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <KivoMark size={48} />
            </div>

            <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--heading)' }}>
              Kivo Desktop for Windows
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--body)', marginTop: '6px', marginBottom: '26px' }}>
              Production Release v1.3.2 · Compatible with Windows 10 &amp; 11 (64-bit MSI / Portable)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <a
                className="btn btn-primary"
                href="https://github.com/AchiraStudio/kivo/releases"
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: '100%', justifyContent: 'center', height: '52px', fontSize: '15.5px' }}
              >
                <Download size={18} />
                <span>Download v1.3.2 Installer (.msi)</span>
              </a>

              <a
                className="btn btn-secondary"
                href="https://github.com/AchiraStudio/kivo"
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: '100%', justifyContent: 'center', height: '48px', fontSize: '14.5px' }}
              >
                <GithubIcon size={16} />
                <span>View Source Code on GitHub</span>
              </a>
            </div>

            {/* Technical Trust Strip (No pills) */}
            <div className="download-spec-row">
              <span className="spec-meta-item">
                <span className="spec-meta-dot g" /> 100% OFFLINE ENGINE
              </span>
              <span className="spec-meta-sep">/</span>
              <span className="spec-meta-item">
                <span className="spec-meta-dot c" /> MIT OPEN SOURCE
              </span>
              <span className="spec-meta-sep">/</span>
              <span className="spec-meta-item">
                <span className="spec-meta-dot p" /> ~15MB BINARY
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DownloadSection;
