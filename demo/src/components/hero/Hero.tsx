import React from 'react';
import { Download, ArrowRight, ShieldCheck, Zap, Globe, Sparkles, Server } from 'lucide-react';
import InteractiveAppWindow from './InteractiveAppWindow';

export const Hero: React.FC = () => {
  return (
    <section className="hero" id="top">
      <div className="wrap">
        <div className="hero-top">
          {/* Announcement pill */}
          <a href="#download" className="hero-announcement">
            <span className="announcement-pill-badge">v1.3.2 RELEASE</span>
            <span className="announcement-text">
              Offline-First SQLite Engine + Supabase Cloud Mesh Sync
            </span>
            <ArrowRight size={13} className="announcement-arrow" />
          </a>

          {/* Headline */}
          <h1 className="hero-title">
            Run your business locally.<br />
            <span className="grad">Sync everywhere instantly.</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-sub">
            Sistem kasir (POS) &amp; ERP desktop modern. Kencang tanpa internet, otomatis sinkron ke cloud multi-cabang.
          </p>

          {/* CTA Buttons */}
          <div className="hero-cta">
            <a className="btn btn-primary hero-btn-download" href="#download">
              <Download size={18} />
              <div className="btn-label-group">
                <span className="btn-main-label">Download untuk Windows</span>
                <span className="btn-sub-label">v1.3.2 · Windows 10/11 (64-bit)</span>
              </div>
            </a>
            <button
              type="button"
              className="btn btn-secondary hero-btn-demo"
              onClick={() => {
                document.getElementById('appWin')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <Sparkles size={16} className="text-primary" />
              <div className="btn-label-group">
                <span className="btn-main-label">Coba Demo Interaktif</span>
                <span className="btn-sub-label">Eksplorasi Fitur Langsung</span>
              </div>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Key Capability Metrics Strip */}
          <div className="hero-metrics-strip">
            <div className="hm-item">
              <div className="hm-icon-box color-warning">
                <Zap size={16} />
              </div>
              <div className="hm-info">
                <span className="hm-val">0ms Latency</span>
                <span className="hm-desc">Query SQLite lokal di SSD</span>
              </div>
            </div>

            <div className="hm-divider" />

            <div className="hm-item">
              <div className="hm-icon-box color-success">
                <ShieldCheck size={16} />
              </div>
              <div className="hm-info">
                <span className="hm-val">100% Offline</span>
                <span className="hm-desc">Kasir aktif tanpa koneksi internet</span>
              </div>
            </div>

            <div className="hm-divider" />

            <div className="hm-item">
              <div className="hm-icon-box color-accent">
                <Globe size={16} />
              </div>
              <div className="hm-info">
                <span className="hm-val">34 Tabel Cloud</span>
                <span className="hm-desc">Sinkronisasi otomatis Supabase</span>
              </div>
            </div>

            <div className="hm-divider" />

            <div className="hm-item">
              <div className="hm-icon-box color-primary">
                <Server size={16} />
              </div>
              <div className="hm-info">
                <span className="hm-val">Raw ESC/POS</span>
                <span className="hm-desc">Printer thermal &amp; laci kasir</span>
              </div>
            </div>
          </div>
        </div>

        {/* The Live Interactive App Window */}
        <InteractiveAppWindow />
      </div>
    </section>
  );
};

export default Hero;

