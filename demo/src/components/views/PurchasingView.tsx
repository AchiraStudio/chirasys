import React from 'react';
import { Truck, CheckCircle2 } from 'lucide-react';

export const PurchasingView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="panel-head">
        <div>
          <span className="panel-title">Pengadaan &amp; Purchase Orders (PO)</span>
          <p className="panel-sub">Pelacakan PO supplier, penerimaan barang, dan kalkulasi HPP otomatis.</p>
        </div>
        <span className="pill">
          <span className="dot g" />
          3 PO Aktif
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 800, color: 'var(--heading)' }}>PO #0841 · PT Sumber Pangan</span>
            <span className="pill" style={{ height: 22 }}>Received</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>
            12 Line Items · Kopi Susu Botol, Gula Pasir, Susu UHT
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
            <span>Total Nilai PO</span>
            <span className="mono" style={{ color: 'var(--heading)' }}>Rp 8.240.000</span>
          </div>
          <div style={{ marginTop: 10, padding: 8, borderRadius: 8, background: 'var(--muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
            <span>HPP Kopi Susu diperbarui: <strong>Rp 5.940 / unit</strong> (AVG)</span>
          </div>
        </div>

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 800, color: 'var(--heading)' }}>PO #0842 · CV Farmasi Utama</span>
            <span className="pill" style={{ height: 22, color: 'var(--warning)' }}>
              <span className="dot w" />
              Menunggu Kiriman
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>
            Paracetamol 500mg, Amoxicillin 500mg, Vitamin C
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
            <span>Total Nilai PO</span>
            <span className="mono" style={{ color: 'var(--heading)' }}>Rp 4.150.000</span>
          </div>
          <div style={{ marginTop: 10, padding: 8, borderRadius: 8, background: 'var(--muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Truck size={13} style={{ color: 'var(--accent)' }} />
            <span>Estimasi Tiba: Besok, 18 Sep 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchasingView;

