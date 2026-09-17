import React, { useState } from 'react';
import {
  Users,
  Sparkles,
  Search,
  Plus,
  Crown,
  CheckCircle2,
} from 'lucide-react';

export const RealCustomersView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customers' | 'promos'>('customers');
  const [searchQuery, setSearchQuery] = useState('');

  const CUSTOMERS = [
    {
      name: 'Siti Nurhaliza',
      phone: '0812-9988-7766',
      tier: 'Member VIP',
      discount: 'Diskon 5% Semua Menu',
      totalSpent: 'Rp 3.450.000',
      points: '345 Poin',
      txCount: 28,
    },
    {
      name: 'Ahmad Dani',
      phone: '0813-1122-3344',
      tier: 'Member Grosir',
      discount: 'Tier Harga Grosir',
      totalSpent: 'Rp 14.800.000',
      points: '1.480 Poin',
      txCount: 14,
    },
    {
      name: 'Rina Wulandari',
      phone: '0857-4455-6677',
      tier: 'Member Reguler',
      discount: 'Poin Belanja',
      totalSpent: 'Rp 1.120.000',
      points: '112 Poin',
      txCount: 9,
    },
    {
      name: 'Hendrik Pratama',
      phone: '0878-3344-5566',
      tier: 'Member VIP',
      discount: 'Diskon 5% Semua Menu',
      totalSpent: 'Rp 4.900.000',
      points: '490 Poin',
      txCount: 34,
    },
  ];

  const PROMOS = [
    {
      code: 'VIP-AUTO-5',
      title: 'Diskon Member VIP 5%',
      type: 'Diskon Persentase',
      rule: 'Otomatis terpotong saat scan member VIP di kasir',
      period: 'Berlaku Selamanya',
      status: 'Aktif',
    },
    {
      code: 'KOPI-ROTI-BUNDLE',
      title: 'Paket Sarapan Pagi (Kopi + Roti)',
      type: 'Bundling Produk',
      rule: 'Beli 1 Kopi Susu 250ml + 1 Roti Coklat hemat Rp 4.000',
      period: '07:00 – 11:00 WIB',
      status: 'Aktif',
    },
    {
      code: 'HEMAT-JUMAT-BERKAH',
      title: 'Jumat Berkah Diskon Sembako 10%',
      type: 'Hari Tertentu',
      rule: 'Min. belanja Rp 100.000 kategori Sembako',
      period: 'Setiap Jumat',
      status: 'Aktif',
    },
  ];

  return (
    <div className="real-view-container">
      {/* Top Segmented TabBar */}
      <div className="real-tab-bar-wrapper">
        <div className="segmented-tab-bar">
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            <Users size={15} />
            <span>Data Pelanggan &amp; Member CRM</span>
          </button>
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'promos' ? 'active' : ''}`}
            onClick={() => setActiveTab('promos')}
          >
            <Sparkles size={15} />
            <span>Program Promo &amp; Diskon Otomatis</span>
          </button>
        </div>

        <div className="tab-bar-right-actions">
          <button type="button" className="action-btn-primary">
            <Plus size={14} />
            <span>{activeTab === 'customers' ? 'Tambah Pelanggan' : 'Buat Promo Baru'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'customers' && (
        <div className="real-panel mt-3">
          <div className="table-filter-bar">
            <div className="filter-search-box">
              <Search size={14} className="text-dim" />
              <input
                type="text"
                placeholder="Cari nama pelanggan, nomor telepon, atau nomor kartu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="filter-search-input"
              />
            </div>
            <span className="badge-tag">Terintegrasi Database Lokal Kasir</span>
          </div>

          <div className="real-table-wrapper">
            <table className="real-data-table">
              <thead>
                <tr>
                  <th>Nama Pelanggan</th>
                  <th>No. Telepon / WhatsApp</th>
                  <th>Tier Keanggotaan</th>
                  <th>Benefit Harga</th>
                  <th className="text-right">Total Akumulasi</th>
                  <th>Poin Aktif</th>
                </tr>
              </thead>
              <tbody>
                {CUSTOMERS.map(c => (
                  <tr key={c.name}>
                    <td>
                      <span className="font-bold text-heading">{c.name}</span>
                      <span className="text-xs text-dim block">{c.txCount}x belanja</span>
                    </td>
                    <td className="text-dim text-xs font-mono">{c.phone}</td>
                    <td>
                      <span className="member-tier-badge">
                        <Crown size={12} className="text-warning" />
                        <span>{c.tier}</span>
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-primary font-semibold">{c.discount}</span>
                    </td>
                    <td className="text-right font-bold text-heading tnum">{c.totalSpent}</td>
                    <td>
                      <span className="points-pill tnum font-bold">{c.points}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'promos' && (
        <div className="real-panel mt-3">
          <div className="real-table-wrapper">
            <table className="real-data-table">
              <thead>
                <tr>
                  <th>Kode Promo</th>
                  <th>Nama Program Promosi</th>
                  <th>Jenis Skema</th>
                  <th>Ketentuan &amp; Syarat</th>
                  <th>Periode Waktu</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {PROMOS.map(p => (
                  <tr key={p.code}>
                    <td>
                      <span className="mono font-bold text-primary">{p.code}</span>
                    </td>
                    <td>
                      <span className="font-bold text-heading">{p.title}</span>
                    </td>
                    <td>
                      <span className="category-tag">{p.type}</span>
                    </td>
                    <td className="text-xs text-body">{p.rule}</td>
                    <td className="text-xs text-dim">{p.period}</td>
                    <td>
                      <span className="status-pill success">
                        <CheckCircle2 size={11} />
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealCustomersView;
