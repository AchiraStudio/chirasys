import React from 'react';
import {
  ShoppingCart,
  Package,
  BookOpen,
  Truck,
  Users,
  Cloud,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { scrollToTarget } from '../../utils/scroll';

interface FeatureCardProps {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  badge: string;
  title: string;
  description: string;
  appTabId?: string;
  spanClass?: string;
}

const FEATURE_ITEMS: FeatureCardProps[] = [
  {
    id: 'pos',
    icon: ShoppingCart,
    iconColor: 'var(--primary)',
    badge: '0ms Offline Engine',
    title: 'Kasir Kilat Responsif Tanpa Hambatan Koneksi',
    title: 'Blazing-Fast POS Unhindered by Network Drops',
    description:
      'Scanning barcode instan, pencarian produk cepat, dan cetak struk thermal ESC/POS tanpa jeda jaringan. Mendukung split payment Tunai, QRIS, EDC Kartu, dan Piutang Member.',
      'Instant barcode scanning, sub-millisecond product search, and direct ESC/POS thermal printing with zero cloud latency. Full split tender across Cash, Card, QRIS/Digital, and Member Credit.',
    appTabId: 'pos',
    spanClass: 'bento-span-4',
  },
  {
    id: 'inventory',
    icon: Package,
    iconColor: 'var(--accent)',
    badge: 'Hierarki Konversi Otomatis',
    title: 'Inventaris Multi-Satuan & Pelacakan Batch',
    badge: 'Hierarchical Unit Conversion',
    title: 'Multi-Tier Inventory & Batch Lot Tracking',
    description:
      'Konversi otomatis berjenjang dari Dus, Pack, hingga Pcs. Manajemen tanggal kadaluarsa metode FIFO, nomor batch pabrik, serta stock opname rekonsiliasi selisih stok.',
      'Automatic conversions across Master Carton, Inner Pack, and Base Units. FIFO expiry date lifecycles, batch lot numbers, and rapid reconciliation stock opname counts.',
    appTabId: 'inventory',
    spanClass: 'bento-span-2',
  },
  {
    id: 'accounting',
    icon: BookOpen,
    iconColor: 'var(--warning)',
    badge: 'Double-Entry Real-time',
    title: 'Akuntansi Otomatis Tanpa Input Manual',
    badge: 'Real-Time Double-Entry',
    title: 'Automated General Ledger Without Manual Journaling',
    description:
      'Setiap penjualan kasir dan penerimaan barang langsung diposting ke jurnal debit-kredit seimbang. Laporan Laba Rugi dan Neraca selalu up-to-date setiap detik.',
      'Every checkout and goods receipt automatically generates balanced debit-credit journal vouchers. Profit & Loss statements and Balance Sheets update in real-time.',
    appTabId: 'reports',
    spanClass: 'bento-span-2',
  },
  {
    id: 'purchasing',
    icon: Truck,
    iconColor: 'var(--success)',
    badge: 'Alur Pengadaan Terpadu',
    title: 'Penerbitan PO & Penerimaan Barang (GRN)',
    badge: 'Unified Procurement',
    title: 'Purchase Orders & Goods Received Notes (GRN)',
    description:
      'Penerbitan Purchase Order ke supplier, penerimaan barang bertahap, perhitungan HPP otomatis, serta pelacakan jatuh tempo hutang dagang secara transparan.',
      'Streamlined supplier purchase orders, partial shipment receipts, automatic COGS recalculations, and transparent accounts payable aging tracking.',
    appTabId: 'purchasing',
    spanClass: 'bento-span-2',
  },
  {
    id: 'customers',
    icon: Users,
    iconColor: 'var(--accent)',
    badge: 'Loyalitas & Promosi',
    title: 'Manajemen Member & Promo Dinamis',
    badge: 'Loyalty & Dynamic Promos',
    title: 'Member Tiers & Automated Discount Engine',
    description:
      'Sistem poin reward pelanggan setia, batas kredit piutang toko, serta aturan diskon kuantiti dan promo otomatis yang langsung terpasang di meja kasir.',
      'Automated loyalty points accrual, credit limits, wholesale tiered pricing, and combo rules evaluated instantly at the register.',
    appTabId: 'customers',
    spanClass: 'bento-span-2',
  },
  {
    id: 'cloud',
    icon: Cloud,
    iconColor: 'var(--primary)',
    badge: '100% Model BYOK',
    title: 'Sinkronisasi Multi-Cabang ke Cloud Supabase',
    badge: '100% BYOK Architecture',
    title: 'Multi-Branch Mesh Sync via Supabase Cloud',
    description:
      'Koneksikan langsung ke database Supabase Anda sendiri dengan kunci API pribadi. Data tetap berdaulat di SSD toko dan tersinkronisasi mulus antar cabang saat online.',
      'Connect directly to your private Supabase database using your personal API keys. Data remains sovereign on your local SSD and syncs seamlessly across branches when online.',
    appTabId: 'dashboard',
    spanClass: 'bento-span-6',
  },
];

export const FeatureGrid: React.FC = () => {
  const jumpToAppTab = (tabId?: string) => {
    if (!tabId) return;
    scrollToTarget('appWin', { offset: 90 });
  };

  return (
    <section className="section bento-section" id="features">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot" />
            KAPABILITAS INTI
            CORE CAPABILITIES
          </div>
          <h2 className="h2">Arsitektur Terpadu. Satu Sumber Kebenaran.</h2>
          <h2 className="h2">Unified Architecture. Single Source of Truth.</h2>
          <p className="lead">
            Bukan modul terpisah yang ditempel. Satu mesin lokal menggerakkan kasir, inventaris, pengadaan, dan pembukuan dalam satu kesatuan performa tinggi.
            Not disparate patchwork tools stitched together. A single local engine powers POS, inventory, procurement, and accounting in one high-performance desktop native application.
          </p>
        </div>

        <div className="bento-grid">
          {FEATURE_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                id={item.id}
                className={`bento-card ${item.spanClass || ''}`}
                data-reveal
              >
                <div className="bento-card-header">
                  <div className="bento-icon-wrapper" style={{ color: item.iconColor }}>
                    <Icon size={22} />
                  </div>
                  <span className="bento-badge">{item.badge}</span>
                </div>

                <div className="bento-card-body">
                  <h3 className="bento-title">{item.title}</h3>
                  <p className="bento-desc">{item.description}</p>
                </div>

                {item.appTabId && (
                  <div className="bento-card-footer">
                    <button
                      type="button"
                      className="bento-action-btn"
                      onClick={() => jumpToAppTab(item.appTabId)}
                    >
                      <Sparkles size={13} className="text-primary" />
                      <span>Coba di Demo Interaktif</span>
                      <span>Explore in Interactive Demo</span>
                      <ArrowUpRight size={14} className="bento-arrow" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;
