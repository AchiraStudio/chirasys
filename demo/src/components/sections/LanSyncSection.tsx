import React from 'react';
import { Wifi, Server, Lock, Cloud } from 'lucide-react';

export const LanSyncSection: React.FC = () => {
  return (
    <section className="section tint" id="lan">
      <div className="wrap split">
        <div data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>LAN SYNC
          </div>
          <h2 className="h2">Your counters, in sync — no internet required.</h2>
          <p className="lead">
            Terminals discover each other over UDP and synchronize over HTTP on your local network. A companion to Kivo Cloud, not a replacement — ideal for multi-register stores.
          </p>
          <ul className="blist">
            <li>
              <Wifi size={16} />
              <span>
                <b>UDP discovery</b> — terminals find the server automatically on the network.
              </span>
            </li>
            <li>
              <Server size={16} />
              <span>
                <b>HTTP peer synchronization</b> between the main terminal and every register.
              </span>
            </li>
            <li>
              <Lock size={16} />
              <span>
                <b>Configurable permissions</b> — decide which terminals may sync what.
              </span>
            </li>
            <li>
              <Cloud size={16} />
              <span>
                <b>Works alongside Kivo Cloud</b> — the whole store syncs when any uplink returns.
              </span>
            </li>
          </ul>
        </div>

        <div className="card lanbus" data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
          <div className="lan-server">
            <b>Kivo Server</b>
            <div style={{ fontSize: '11px', color: 'var(--dim)' }}>
              Main terminal · holds the store database
            </div>
          </div>
          <div className="lan-rail"></div>
          <div className="lan-line">
            <span>WI-FI / LAN · UDP DISCOVERY</span>
          </div>
          <div className="lan-terms">
            <div>
              <div className="lan-drop"></div>
              <div className="lan-t">
                <b>Cashier 1</b>
                <small>synced 4 s ago</small>
              </div>
            </div>
            <div>
              <div className="lan-drop"></div>
              <div className="lan-t">
                <b>Cashier 2</b>
                <small>synced 4 s ago</small>
              </div>
            </div>
            <div>
              <div className="lan-drop"></div>
              <div className="lan-t">
                <b>Cashier 3</b>
                <small>synced 6 s ago</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LanSyncSection;

