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
              Offline-first desktop POS &amp; ERP software for retail stores, pharmacies, wholesale, and hospitality.
              Keep ringing up sales without an internet connection, automatically synced when back online.
            </p>
          </div>
          <div className="foot-col">
            <h5>Application Modules</h5>
            <a href="#pos">Point of Sale (POS)</a>
            <a href="#inventory">Multi-Tier Inventory</a>
            <a href="#purchasing">Procurement &amp; Landed Cost</a>
            <a href="#accounting">Double-Entry Accounting</a>
            <a href="#customers">Customer Loyalty &amp; Promos</a>
            <a href="#ai">Kivo AI Copilot</a>
          </div>
          <div className="foot-col">
            <h5>Architecture &amp; Core</h5>
            <a href="#cloud">Supabase Cloud Mesh</a>
            <a href="#offline">Offline SQLite Simulator</a>
            <a href="#how">Local LAN P2P Sync</a>
            <a href="#hardware">Thermal Printers &amp; Hardware</a>
            <a href="#security">Zero-Trust BYOK Security</a>
            <a href="#how">Native Rust Runtime</a>
          </div>
          <div className="foot-col">
            <h5>Resources &amp; Legal</h5>
            <a href="https://github.com/AchiraStudio/kivo" target="_blank" rel="noopener noreferrer">
              GitHub Repository
            </a>
            <a href="https://github.com/AchiraStudio/kivo#readme" target="_blank" rel="noopener noreferrer">
              Documentation Guide
            </a>
            <a href="https://github.com/AchiraStudio/kivo/releases" target="_blank" rel="noopener noreferrer">
              Release Notes (v1.3.2)
            </a>
            <a href="https://github.com/AchiraStudio/kivo/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
              MIT Open Source License
            </a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {currentYear} AchiraStudio · Kivo Platform</span>
          <span>Your Business. One Unified Engine. 100% Data Sovereignty.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
