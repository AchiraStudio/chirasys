import React from 'react';
import { BrandLogo } from '../common/BrandLogo';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <a className="brand" href="#top">
              <BrandLogo size={28} />
            </a>
            <p>
              Modern Offline-First POS &amp; ERP for retail, pharmacy, wholesale, and F&amp;B.
              Connected when you need it, fully functional when you don’t.
            </p>
          </div>
          <div className="foot-col">
            <h5>Product</h5>
            <a href="#pos">Point of Sale (POS)</a>
            <a href="#inventory">Inventory &amp; Batches</a>
            <a href="#purchasing">Purchasing &amp; COGS</a>
            <a href="#accounting">Double-Entry Accounting</a>
            <a href="#ai">Kivo AI Assistant</a>
            <a href="#cloud">Kivo Cloud Sync</a>
          </div>
          <div className="foot-col">
            <h5>Resources</h5>
            <a href="https://github.com/AchiraStudio/kivo#readme" target="_blank" rel="noopener noreferrer">
              Documentation
            </a>
            <a href="https://github.com/AchiraStudio/kivo" target="_blank" rel="noopener noreferrer">
              GitHub Repository
            </a>
            <a href="https://github.com/AchiraStudio/kivo/releases" target="_blank" rel="noopener noreferrer">
              Release Notes (v1.3.2)
            </a>
            <a href="#offline">Offline Simulator</a>
          </div>
          <div className="foot-col">
            <h5>Company &amp; Legal</h5>
            <a href="https://github.com/AchiraStudio" target="_blank" rel="noopener noreferrer">
              AchiraStudio
            </a>
            <a href="https://github.com/AchiraStudio/kivo/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
              MIT License
            </a>
            <a href="#security">100% BYOK Privacy Model</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {currentYear} AchiraStudio · Kivo Platform</span>
          <span>Your business. One system. Zero downtime.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

