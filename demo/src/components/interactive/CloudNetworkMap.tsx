import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';

interface BranchNode {
  name: string;
  location: string;
  sales: number;
  status: 'ONLINE' | 'SYNCING';
}

export const CloudNetworkMap: React.FC = () => {
  const [branches, setBranches] = useState<BranchNode[]>([
    { name: 'Toko Utama (HQ)', location: 'Jakarta Barat', sales: 7240000, status: 'ONLINE' },
    { name: 'Cabang Dago', location: 'Bandung', sales: 3180000, status: 'ONLINE' },
    { name: 'Cabang Gubeng', location: 'Surabaya', sales: 2030000, status: 'ONLINE' },
  ]);

  const [syncLog, setSyncLog] = useState<string[]>([
    'Toko Utama · 14 baris tersinkronisasi · 84ms',
    'Cabang Dago · 8 baris tersinkronisasi · 96ms',
    'Cabang Gubeng · 6 baris tersinkronisasi · 110ms',
  ]);

  const fmtRp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

  useEffect(() => {
    const interval = setInterval(() => {
      const targetBranch = Math.floor(Math.random() * 3);
      const addedSales = (20 + Math.floor(Math.random() * 80)) * 5000;

      setBranches(prev =>
        prev.map((b, i) => (i === targetBranch ? { ...b, sales: b.sales + addedSales } : b))
      );

      const branchName = branches[targetBranch].name;
      const now = new Date().toTimeString().slice(0, 8);
      setSyncLog(prev => [
        `${now}  ${branchName} · Sync #${Math.floor(Math.random() * 900) + 100} · +${fmtRp(addedSales)}`,
        ...prev.slice(0, 3),
      ]);
    }, 4200);

    return () => clearInterval(interval);
  }, [branches]);

  return (
    <div className="card" style={{ padding: 24, marginTop: 24 }}>
      <div className="panel-head">
        <div>
          <span className="panel-title">Topologi Sinkronisasi Multi-Cabang (Supabase Cloud BYOK)</span>
          <p className="panel-sub">Arsitektur multi-tenant dengan isolasi data per workspace_id.</p>
        </div>
        <span className="pill">
          <span className="dot g" />
          Semua Cabang Aktif
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 12 }}>
        {branches.map(b => (
          <div key={b.name} className="panel" style={{ border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={14} style={{ color: 'var(--accent)' }} />
                <b style={{ fontSize: 13, color: 'var(--heading)' }}>{b.name}</b>
              </div>
              <span className="pill" style={{ height: 20, fontSize: 9 }}>
                <span className="dot g" />
                {b.status}
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 8 }}>{b.location}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: 11, color: 'var(--dim)' }}>Omset Hari Ini</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--heading)' }}>
                {fmtRp(b.sales)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--muted)', fontSize: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--dim)', marginBottom: 6, textTransform: 'uppercase' }}>
          Log Transmisi Data Cloud Terkini:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {syncLog.map((log, idx) => (
            <div key={idx} className="mono" style={{ color: 'var(--body)', fontSize: 11 }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CloudNetworkMap;

