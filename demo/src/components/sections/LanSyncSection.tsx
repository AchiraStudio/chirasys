import React from 'react';
import { Wifi, Server, Lock, Cloud } from 'lucide-react';

export const LanSyncSection: React.FC = () => {
  return (
    <section className="section" id="lan">
      <div className="wrap split">
        <div data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>LOCAL LAN SYNC
          </div>
          <h2 className="h2">Multi-register sync without internet.</h2>
          <p className="lead">
            Registers connect automatically via UDP peer discovery over local Wi-Fi. Stock and transactions replicate in real-time.
          </p>
          <ul className="blist">
            <li>
              <Wifi size={16} />
              <span>
                <b>Zero-Config Peer Discovery</b> — auxiliary registers automatically detect the primary store server over local Wi-Fi.
              </span>
            </li>
            <li>
              <Server size={16} />
              <span>
                <b>Sub-Millisecond Replication</b> — checkout events sync across LAN registers with imperceptible latency.
              </span>
            </li>
            <li>
              <Lock size={16} />
              <span>
                <b>Role-Based Terminal Auth</b> — configure granular privileges between auxiliary registers and store manager nodes.
              </span>
            </li>
            <li>
              <Cloud size={16} />
              <span>
                <b>Cloud Mesh Synergy</b> — all locally collected offline ledger mutations drain cleanly to Supabase once online.
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

