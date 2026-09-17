import React from 'react';
import { Monitor, Download, ArrowRight } from 'lucide-react';
import { KivoMark, GithubIcon } from '../common/BrandLogo';

export const DownloadSection: React.FC = () => {
  return (
    <>
      <section className="section" id="download">
        <div className="wrap">
          <div className="sec-head center" data-reveal>
            <div className="eyebrow">
              <span className="eb-dot"></span>DOWNLOAD
            </div>
            <h2 className="h2">Bring Kivo to your business.</h2>
            <p className="lead">
              Desktop-first, exactly like the product itself. Latest release: v1.3.2.
            </p>
          </div>

          <div className="dl-grid">
            <div className="card dl-card" data-reveal>
              <span className="f-ic">
                <Monitor size={22} />
              </span>
              <h3>Windows</h3>
              <p>Windows 10 / 11 · 64-bit</p>
              <a
                className="btn btn-primary"
                href="https://github.com/AchiraStudio/kivo/releases"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={16} />
                <span>Download .exe / .msi</span>
              </a>
            </div>

            {/* <div className="card dl-card" data-reveal style={{ '--d': '70ms' } as React.CSSProperties}>
              <span className="f-ic">
                <Monitor size={22} />
              </span>
              <h3>macOS</h3>
              <p>macOS 11 and newer (Apple &amp; Intel)</p>
              <a
                className="btn btn-primary"
                href="https://github.com/AchiraStudio/kivo/releases"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={16} />
                <span>Download .dmg</span>
              </a>
            </div>

            <div className="card dl-card" data-reveal style={{ '--d': '140ms' } as React.CSSProperties}>
              <span className="f-ic">
                <Cpu size={22} />
              </span>
              <h3>Linux</h3>
              <p>Modern 64-bit distributions (.AppImage / .deb)</p>
              <a
                className="btn btn-primary"
                href="https://github.com/AchiraStudio/kivo/releases"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={16} />
                <span>Download</span>
              </a>
            </div> */}
          </div>

          <div className="dl-note" data-reveal>
            <span>MIT License</span>
            <span>·</span>
            <a href="https://github.com/AchiraStudio/kivo#readme" target="_blank" rel="noopener noreferrer">
              Installation guide
            </a>
            <span>·</span>
            <a href="https://github.com/AchiraStudio/kivo" target="_blank" rel="noopener noreferrer">
              GitHub Repository
            </a>
          </div>
        </div>
      </section>

      {/* Open Source CTA */}
      <section className="section" style={{ paddingTop: '20px' }}>
        <div className="wrap">
          <div className="oss" data-reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
              <KivoMark size={44} />
            </div>
            <h2>Kivo is open source.</h2>
            <p className="lead" style={{ margin: '0 auto 26px' }}>
              Every line is inspectable — no black box between you and your business data.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                className="btn btn-primary"
                href="https://github.com/AchiraStudio/kivo"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon size={16} />
                <span>Explore Kivo on GitHub</span>
              </a>
              <a
                className="btn btn-secondary"
                href="https://github.com/AchiraStudio/kivo#readme"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Read the Documentation</span>
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

