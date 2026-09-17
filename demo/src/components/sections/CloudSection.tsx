import React from 'react';
import { RefreshCw, Timer, Zap, Activity } from 'lucide-react';
import { CloudNetworkMap } from '../interactive/CloudNetworkMap';

export const CloudSection: React.FC = () => {
  return (
    <section className="section" id="cloud">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>KIVO CLOUD
          </div>
          <h2 className="h2">Multi-cabang terhubung otomatis ke cloud.</h2>
          <p className="lead">
            Sinkronisasi background via Supabase — kunci API pribadi, data 100% milik Anda.
          </p>
        </div>

        <div data-reveal>
          <CloudNetworkMap />
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '20px',
          }}
          data-reveal
        >
          <span className="chip">
            <RefreshCw size={13} />
            Background sync
          </span>
          <span className="chip">
            <Timer size={13} />
            Offline queue &amp; retry
          </span>
          <span className="chip">
            <Zap size={13} />
            Realtime updates
          </span>
          <span className="chip">
            <Activity size={13} />
            Sync health
          </span>
        </div>
      </div>
    </section>
  );
};

export default CloudSection;

