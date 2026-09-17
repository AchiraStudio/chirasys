import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Database,
  Atom,
  Braces,
  Wind,
  Cloud,
  Boxes,
  Wifi,
  RefreshCw,
  KeyRound,
} from 'lucide-react';

export const TechArchitecture: React.FC = () => {
  return (
    <section className="section" id="how">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>UNDER THE HOOD
          </div>
          <h2 className="h2">How Kivo works.</h2>
          <p className="lead">
            A desktop application with a local database at its core — connected when you choose to be.
          </p>
        </div>

        <div className="arch">
          <div className="stack" data-reveal>
            <div className="layer">
              <span className="l-ic">
                <LayoutDashboard size={18} />
              </span>
              <div>
                <b>React 19 + TypeScript UI</b>
                <small>the interface you just used above</small>
              </div>
            </div>

            <span className="bk-link"></span>

            <div className="layer">
              <span className="l-ic">
                <Cpu size={18} />
              </span>
              <div>
                <b>Tauri 2 · Rust core</b>
                <small>fast, small, native desktop runtime</small>
              </div>
            </div>

            <span className="bk-link"></span>

            <div className="layer">
              <span className="l-ic">
                <Database size={18} />
              </span>
              <div>
                <b>Local SQLite</b>
                <small>your data, on your machine, first</small>
              </div>
            </div>

            <div className="arch-branches">
              <div className="bk-node">
                <b>LAN</b>
                <small>local terminals</small>
              </div>
              <div className="bk-node">
                <b>Supabase</b>
                <small>cloud sync</small>
              </div>
              <div className="bk-node">
                <b>OpenAI</b>
                <small>Kivo AI · your key</small>
              </div>
            </div>
          </div>

          <div data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
            <p className="lead" style={{ marginBottom: '6px' }}>
              Built with modern technologies.
            </p>
            <div className="tech-chips">
              <span className="chip">
                <Cpu size={13} />
                Rust
              </span>
              <span className="chip">
                <LayoutDashboard size={13} />
                Tauri 2
              </span>
              <span className="chip">
                <Atom size={13} />
                React 19
              </span>
              <span className="chip">
                <Braces size={13} />
                TypeScript
              </span>
              <span className="chip">
                <Wind size={13} />
                Tailwind CSS
              </span>
              <span className="chip">
                <Database size={13} />
                SQLite
              </span>
              <span className="chip">
                <Cloud size={13} />
                Supabase
              </span>
              <span className="chip">
                <Boxes size={13} />
                Zustand
              </span>
            </div>

            <details className="tech-details">
              <summary>Technical details</summary>
              <ul className="blist" style={{ marginTop: '14px' }}>
                <li>
                  <Wifi size={16} />
                  <span>
                    LAN terminals are discovered via <b>UDP broadcast</b> and synchronized over <b>HTTP</b> peer connections.
                  </span>
                </li>
                <li>
                  <RefreshCw size={16} />
                  <span>
                    Cloud sync runs in the background with an <b>offline queue and retry behavior</b> — records never block a sale.
                  </span>
                </li>
                <li>
                  <KeyRound size={16} />
                  <span>
                    Credentials are configured locally; <b>no keys ship with the binary</b> and there are no fallback secrets.
                  </span>
                </li>
                <li>
                  <Boxes size={16} />
                  <span>
                    Application state is managed with <b>Zustand</b>; styling uses the same token system this website uses.
                  </span>
                </li>
              </ul>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechArchitecture;

