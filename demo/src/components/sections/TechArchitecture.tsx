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
  ShieldCheck,
} from 'lucide-react';

export const TechArchitecture: React.FC = () => {
  return (
    <section className="section" id="how">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot" />
            NATIVE ARCHITECTURE
          </div>
          <h2 className="h2">High-Performance Desktop Architecture Powered by Rust.</h2>
          <p className="lead">
            A native desktop application built around an embedded local SQLite engine — instant response times, minimal RAM footprint, and zero stutter.
          </p>
        </div>

        <div className="arch">
          {/* Layer Stack Diagram */}
          <div className="stack" data-reveal>
            <div className="layer">
              <span className="l-ic">
                <LayoutDashboard size={18} />
              </span>
              <div>
                <b>React 19 + TypeScript UI</b>
                <small>Fast, type-safe, reactive interface running in your desktop window</small>
              </div>
            </div>

            <span className="bk-link" />

            <div className="layer">
              <span className="l-ic">
                <Cpu size={18} />
              </span>
              <div>
                <b>Tauri v2 · Rust Native Core</b>
                <small>Compact installer footprint (~15MB), low RAM overhead, memory-safe execution</small>
              </div>
            </div>

            <span className="bk-link" />

            <div className="layer">
              <span className="l-ic">
                <Database size={18} />
              </span>
              <div>
                <b>Local SQLite (WAL Mode)</b>
                <small>Data resides directly on your workstation NVMe SSD, 0ms transaction commits</small>
              </div>
            </div>

            <div className="arch-branches">
              <div className="bk-node">
                <b>LAN Mesh</b>
                <small>Store register P2P</small>
              </div>
              <div className="bk-node">
                <b>Supabase</b>
                <small>Cloud mesh sync</small>
              </div>
              <div className="bk-node">
                <b>OpenAI / Claude</b>
                <small>Kivo AI (BYOK)</small>
              </div>
            </div>
          </div>

          {/* Tech Stack Chips & Details */}
          <div data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
            <p className="lead" style={{ marginBottom: '10px' }}>
              Engineered with best-in-class modern technologies:
            </p>
            <div className="tech-chips">
              <span className="chip">
                <Cpu size={13} />
                Rust Core
              </span>
              <span className="chip">
                <LayoutDashboard size={13} />
                Tauri v2
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
                Tailwind CSS v4
              </span>
              <span className="chip">
                <Database size={13} />
                SQLite (WAL)
              </span>
              <span className="chip">
                <Cloud size={13} />
                Supabase
              </span>
              <span className="chip">
                <Boxes size={13} />
                Zustand Store
              </span>
            </div>

            <div className="tech-details" style={{ marginTop: '16px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '14px', padding: '18px' }}>
              <b style={{ color: 'var(--heading)', fontSize: '13.5px', display: 'block', marginBottom: '10px' }}>
                Technical Architecture Highlights:
              </b>
              <ul className="blist" style={{ marginTop: '10px', gap: '10px' }}>
                <li>
                  <Wifi size={16} />
                  <span>
                    Checkout terminals discover peers via <b>local UDP broadcast</b>, synchronizing transactions peer-to-peer across the store LAN with zero internet required.
                  </span>
                </li>
                <li>
                  <RefreshCw size={16} />
                  <span>
                    Cloud synchronization runs completely non-blocking in background threads with <b>automated offline buffers</b> — registers never freeze on slow connections.
                  </span>
                </li>
                <li>
                  <KeyRound size={16} />
                  <span>
                    Credentials reside encrypted on your local system; <b>strictly zero embedded master keys</b> in binaries; data sovereignty is 100% yours.
                  </span>
                </li>
                <li>
                  <ShieldCheck size={16} />
                  <span>
                    Reactive UI state is synchronized via <b>Zustand stores</b> directly with the local SQLite persistence layer through high-throughput Tauri Rust IPC commands.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechArchitecture;
