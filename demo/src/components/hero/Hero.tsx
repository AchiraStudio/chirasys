import React from 'react';
import { Download, ArrowRight, ShieldCheck, Zap, Globe, Sparkles, Server } from 'lucide-react';
import InteractiveAppWindow from './InteractiveAppWindow';
import { scrollToTarget } from '../../utils/scroll';

export const Hero: React.FC = () => {
  return (
    <section className="hero" id="top">
      <div className="wrap">
        <div className="hero-top">

          {/* Headline */}
          <h1 className="hero-title">
            Run your business locally.<br />
            <span className="grad">Sync everywhere instantly.</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-sub">
            Next-generation offline-first desktop POS &amp; ERP. Blazing fast without internet, seamlessly synced across multi-branch cloud.
          </p>

          {/* CTA Buttons */}
          <div className="hero-cta">
            <a className="btn btn-primary hero-btn-download" href="#download">
              <Download size={18} />
              <div className="btn-label-group">
                <span className="btn-main-label">Download for Windows</span>
                <span className="btn-sub-label">v1.3.2 · Windows 10/11 (64-bit)</span>
              </div>
            </a>
            <button
              type="button"
              className="btn btn-secondary hero-btn-demo"
              onClick={() => {
                scrollToTarget('appWin', { offset: 90 });
              }}
            >
              <Sparkles size={16} className="text-primary" />
              <div className="btn-label-group">
                <span className="btn-main-label">Try Interactive Demo</span>
                <span className="btn-sub-label">Explore Live Features</span>
              </div>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* The Live Interactive App Window */}
        <InteractiveAppWindow />

        {/* Key Capability Metrics Strip below the app window */}
        <div className="hero-metrics-strip">
          <div className="hm-item">
            <div className="hm-icon-box color-warning">
              <Zap size={16} />
            </div>
            <div className="hm-info">
              <span className="hm-val">0ms Latency</span>
              <span className="hm-desc">Local SQLite queries on SSD</span>
            </div>
          </div>

          <div className="hm-divider" />

          <div className="hm-item">
            <div className="hm-icon-box color-success">
              <ShieldCheck size={16} />
            </div>
            <div className="hm-info">
              <span className="hm-val">100% Offline</span>
              <span className="hm-desc">Fully operational without internet</span>
            </div>
          </div>

          <div className="hm-divider" />

          <div className="hm-item">
            <div className="hm-icon-box color-accent">
              <Globe size={16} />
            </div>
            <div className="hm-info">
              <span className="hm-val">34 Cloud Tables</span>
              <span className="hm-desc">Automated Supabase sync</span>
            </div>
          </div>

          <div className="hm-divider" />

          <div className="hm-item">
            <div className="hm-icon-box color-primary">
              <Server size={16} />
            </div>
            <div className="hm-info">
              <span className="hm-val">Raw ESC/POS</span>
              <span className="hm-desc">Thermal printers &amp; cash drawers</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

