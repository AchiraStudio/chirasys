import React from 'react';

export const EcosystemSection: React.FC = () => {
  return (
    <section className="section" id="product">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>THE SYSTEM
          </div>
          <h2 className="h2">Everything your business needs. In one system.</h2>
          <p className="lead">
            Kivo is not a POS with an accounting add-on. It is one connected platform — every sale, every stock movement, and every rupiah flows through the same local database, so your numbers always agree.
          </p>
        </div>

        <svg className="eco-svg" viewBox="0 0 900 610" data-reveal aria-label="Kivo module ecosystem diagram">
          <g className="e-lines" strokeWidth="1.5">
            <path id="el1" className="e-line" fill="none" d="M450 83 L450 226" />
            <path id="el2" className="e-line" fill="none" d="M165 173 L375 240" />
            <path id="el3" className="e-line" fill="none" d="M165 353 L375 280" />
            <path id="el4" className="e-line" fill="none" d="M450 463 L450 294" />
            <path id="el5" className="e-line" fill="none" d="M735 353 L525 280" />
            <path id="el6" className="e-line" fill="none" d="M735 173 L525 240" />
            <path className="e-line" fill="none" d="M450 486 L450 525" />
          </g>
          <g className="flow-particles">
            <circle r="3" fill="var(--primary)">
              <animateMotion dur="3.8s" repeatCount="indefinite">
                <mpath href="#el1" />
              </animateMotion>
            </circle>
            <circle r="3" fill="var(--accent)">
              <animateMotion dur="4.4s" begin="1.2s" repeatCount="indefinite">
                <mpath href="#el5" />
              </animateMotion>
            </circle>
            <circle r="3" fill="var(--accent)">
              <animateMotion dur="4.1s" begin="2.1s" repeatCount="indefinite">
                <mpath href="#el3" />
              </animateMotion>
            </circle>
            <circle r="3" fill="var(--primary)">
              <animateMotion dur="3.6s" begin="0.6s" repeatCount="indefinite">
                <mpath href="#el6" />
              </animateMotion>
            </circle>
          </g>
          <a href="#pos" className="eco-node">
            <rect x="375" y="60" width="150" height="46" rx="12" />
            <circle cx="450" cy="75" r="3.5" fill="var(--primary)" />
            <text x="450" y="96" textAnchor="middle">POS</text>
          </a>
          <a href="#inventory" className="eco-node">
            <rect x="90" y="150" width="150" height="46" rx="12" />
            <circle cx="165" cy="165" r="3.5" fill="var(--accent)" />
            <text x="165" y="186" textAnchor="middle">Inventory</text>
          </a>
          <a href="#customers" className="eco-node">
            <rect x="90" y="330" width="150" height="46" rx="12" />
            <circle cx="165" cy="345" r="3.5" fill="var(--accent)" />
            <text x="165" y="366" textAnchor="middle">Customers</text>
          </a>
          <a href="#purchasing" className="eco-node">
            <rect x="375" y="440" width="150" height="46" rx="12" />
            <circle cx="450" cy="455" r="3.5" fill="var(--primary)" />
            <text x="450" y="476" textAnchor="middle">Purchasing</text>
          </a>
          <a href="#accounting" className="eco-node">
            <rect x="660" y="330" width="150" height="46" rx="12" />
            <circle cx="735" cy="345" r="3.5" fill="var(--accent)" />
            <text x="735" y="366" textAnchor="middle">Accounting</text>
          </a>
          <a href="#customers" className="eco-node">
            <rect x="660" y="150" width="150" height="46" rx="12" />
            <circle cx="735" cy="165" r="3.5" fill="var(--primary)" />
            <text x="735" y="186" textAnchor="middle">Promotions</text>
          </a>
          <g className="eco-core">
            <rect x="375" y="226" width="150" height="68" rx="16" />
            {/* Direct Kivo Mark SVG */}
            <g transform="translate(394, 244) scale(0.625)">
              <rect width="48" height="48" rx="11" fill="#CB3CFF" />
              <path d="M13.5 11.5h5.6v25h-5.6z" fill="#fff" />
              <path d="M23.5 24 33.6 11.5h6.9L30 24z" fill="#fff" />
              <path d="M23.5 24H30l10.5 12.5h-6.9z" fill="#00C2FF" />
            </g>
            <text x="442" y="266" style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '.08em' }}>KIVO</text>
          </g>
          <text className="eco-label" x="170" y="516">PLATFORM LAYER</text>
          <g className="eco-bar">
            <rect x="170" y="525" width="560" height="54" rx="14" fill="var(--input)" stroke="var(--line-strong)" />
            <text x="450" y="558" textAnchor="middle">KIVO CLOUD · LAN SYNC · MULTI-BRANCH · KIVO AI</text>
          </g>
        </svg>

        <div className="eco-list" data-reveal>
          <span className="chip"><span className="dot p"></span>POS</span>
          <span className="chip"><span className="dot c"></span>Inventory</span>
          <span className="chip"><span className="dot p"></span>Purchasing</span>
          <span className="chip"><span className="dot c"></span>Accounting</span>
          <span className="chip"><span className="dot p"></span>Customers &amp; Promotions</span>
          <span className="chip"><span className="dot c"></span>Cloud · LAN · AI</span>
        </div>
        <p className="tour-hint" style={{ marginTop: '18px' }} data-reveal>
          Illustrative diagram — every module reads and writes the same local database.
        </p>
      </div>
    </section>
  );
};

export default EcosystemSection;

