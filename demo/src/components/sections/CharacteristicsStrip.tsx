import React from 'react';
import { WifiOff, GitBranch, KeyRound, Database, Cloud, Wifi, Code2, QrCode } from 'lucide-react';

export const CharacteristicsStrip: React.FC = () => {
  const items = [
    { icon: WifiOff, title: '100% Offline-First', desc: 'Kasir melayani transaksi tanpa internet', delay: '0ms' },
    { icon: QrCode, title: 'Web Terminal v1.4', desc: 'Scan QR buka kasir di HP & Tablet via LAN tanpa instalasi', delay: '50ms' },
    { icon: GitBranch, title: 'Multi-Cabang', desc: 'Satu workspace terhubung untuk semua toko', delay: '100ms' },
    { icon: KeyRound, title: 'Model BYOK', desc: 'Kunci API & database seutuhnya milik Anda', delay: '150ms' },
    { icon: Database, title: 'SQLite Lokal', desc: 'Performa SSD lokal super cepat 0ms latensi', delay: '200ms' },
    { icon: Cloud, title: 'Supabase Cloud', desc: 'Sinkronisasi otomatis di background saat online', delay: '250ms' },
    { icon: Wifi, title: 'LAN P2P Mesh', desc: 'Komunikasi antar kasir via UDP tanpa router internet', delay: '300ms' },
    { icon: Code2, title: 'Open Source', desc: 'Berlisensi MIT, transparan dan bebas biaya lock-in', delay: '350ms' },
  ];

  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow ep">
            <span className="eb-dot" />
            NILAI UTAMA PRODUK
          </div>
          <h2 className="h2">Didesain untuk Realitas Operasional Toko Fisik.</h2>
          <p className="lead">
            Kecepatan eksekusi native desktop, ketahanan tanpa internet, dan kedaulatan data tanpa ketergantungan langganan software vendor.
          </p>
        </div>

        <div className="strip-grid">
          {items.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="strip-item"
                data-reveal
                style={{ '--d': item.delay } as React.CSSProperties}
              >
                <Icon size={18} className="text-primary" />
                <b>{item.title}</b>
                <small>{item.desc}</small>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CharacteristicsStrip;
