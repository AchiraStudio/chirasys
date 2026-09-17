import React, { useState } from 'react';
import { Cloud, RefreshCw } from 'lucide-react';

export const CloudView: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncedJustNow, setSyncedJustNow] = useState(false);

  const handleManualSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncedJustNow(true);
      setTimeout(() => setSyncedJustNow(false), 3000);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="panel-head">
        <div>
          <span className="panel-title">Kivo Cloud &amp; Multi-Branch Sync</span>
          <p className="panel-sub">Sinkronisasi 34 tabel Supabase dua arah secara otomatis dan aman.</p>
        </div>
        <span className="pill">
          <span className="dot g" />
          Terhubung (42ms)
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="panel">
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)' }}>TABEL TERSINKRON</span>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--heading)', margin: '4px 0' }}>34 / 34</p>
          <span style={{ fontSize: 11, color: 'var(--success)' }}>Semua skema aktif</span>
        </div>
        <div className="panel">
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)' }}>ANTREAN SYNC (PENDING)</span>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--heading)', margin: '4px 0' }}>0</p>
          <span style={{ fontSize: 11, color: 'var(--dim)' }}>Semua transaksi terunggah</span>
        </div>
        <div className="panel">
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)' }}>WORKSPACE AKTIF</span>
          <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)', margin: '8px 0' }}>KIVO-MAIN-2026</p>
          <span style={{ fontSize: 11, color: 'var(--dim)' }}>Multi-Tenant Terisolasi</span>
        </div>
      </div>

      <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Cloud size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--heading)' }}>
              {syncedJustNow ? 'Sinkronisasi Selesai!' : 'Sinkronisasi Otomatis Berjalan'}
            </span>
            <p style={{ fontSize: 11, color: 'var(--dim)' }}>
              Realtime WebSocket aktif via Supabase Channel
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleManualSync}
          disabled={syncing}
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
          <span>{syncing ? 'Menyinkronkan…' : 'Push Manual Sekarang'}</span>
        </button>
      </div>
    </div>
  );
};

export default CloudView;

