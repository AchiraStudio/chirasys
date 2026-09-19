import React from 'react';
import { Download, ArrowRight, ShieldCheck, Zap, Globe, Sparkles, Printer } from 'lucide-react';
import InteractiveAppWindow from './InteractiveAppWindow';
import { scrollToTarget } from '../../utils/scroll';

export const Hero: React.FC = () => {
  return (
    <section className="hero" id="top">
      <div className="wrap">
        <div className="hero-top">
          {/* Release Header */}
          <div className="hero-telemetry-header">
            <div className="telemetry-beacon">
              <span className="telemetry-dot" />
              <span>Kivo v1.3.2</span>
            </div>
            <span className="telemetry-sep">·</span>
            <span className="telemetry-meta">Native Desktop · Offline-First · Open Source</span>
          </div>

          {/* Headline */}
          <h1 className="hero-title">
            Retail, at Full Speed.<br />
            <span className="grad">Offline. Instant. Yours.</span>
          </h1>

          {/* Subtext */}
          <p className="hero-sub">
            A desktop POS built on Rust — no internet required, no subscriptions, no compromises.
          </p>

          {/* Action Group */}
          <div className="hero-cta">
            <a className="btn btn-primary hero-btn-download" href="#download">
              <Download size={18} />
              <div className="btn-label-group">
                <span className="btn-main-label">Download for Windows</span>
                <span className="btn-sub-label">v1.3.2 · 64-bit MSI / Portable</span>
              </div>
            </a>
            <button
              type="button"
              className="btn btn-secondary hero-btn-demo"
              onClick={() => {
                scrollToTarget('appWin', { offset: 80 });
              }}
            >
              <Sparkles size={16} className="text-primary" />
              <div className="btn-label-group">
                <span className="btn-main-label">Try Live Interactive App</span>
                <span className="btn-sub-label">Explore Real POS &amp; Ledger</span>
              </div>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Centerpiece: The Live Interactive Desktop Window */}
        <InteractiveAppWindow />

        {/* Architectural Telemetry Metrics Console */}
        <div className="hero-metrics-strip">
          <div className="hm-item">
            <div className="hm-icon-box color-warning">
              <Zap size={16} />
            </div>
            <div className="hm-info">
              <span className="hm-val">0.0ms</span>
              <span className="hm-desc">SSD SQLite Query Latency</span>
            </div>
          </div>

          <div className="hm-divider" />

          <div className="hm-item">
            <div className="hm-icon-box color-success">
              <ShieldCheck size={16} />
            </div>
            <div className="hm-info">
              <span className="hm-val">100%</span>
              <span className="hm-desc">Local Offline Resilience</span>
            </div>
          </div>

          <div className="hm-divider" />

          <div className="hm-item">
            <div className="hm-icon-box color-accent">
              <Globe size={16} />
            </div>
            <div className="hm-info">
              <span className="hm-val">34 Tables</span>
              <span className="hm-desc">Supabase Cloud Replication</span>
            </div>
          </div>

          <div className="hm-divider" />

          <div className="hm-item">
            <div className="hm-icon-box color-primary">
              <Printer size={16} />
            </div>
            <div className="hm-info">
              <span className="hm-val">Raw ESC/POS</span>
              <span className="hm-desc">Direct Thermal Hardware</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
