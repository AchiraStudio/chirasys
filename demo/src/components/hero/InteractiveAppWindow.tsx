import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  FileText,
  Users,
  Settings,
  Sparkles,
  Building2,
  Cloud,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Radio,
  Zap,
  Minus,
  Square,
  X,
} from 'lucide-react';
import { KivoMark } from '../common/BrandLogo';
import RealDashboardView from '../views/RealDashboardView';
import RealPosView from '../views/RealPosView';
import RealInventoryView from '../views/RealInventoryView';
import RealPurchasingView from '../views/RealPurchasingView';
import RealAccountingView from '../views/RealAccountingView';
import RealCustomersView from '../views/RealCustomersView';
import RealAiChatModal from '../views/RealAiChatModal';

export type AppMenuId =
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'purchasing'
  | 'reports'
  | 'customers'
  | 'settings';

interface InteractiveAppWindowProps {
  initialMenu?: AppMenuId;
}

export const InteractiveAppWindow: React.FC<InteractiveAppWindowProps> = ({
  initialMenu = 'dashboard',
}) => {
  const [activeMenu, setActiveMenu] = useState<AppMenuId>(initialMenu);
  const [branchIdx, setBranchIdx] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const BRANCHES = ['Cabang Utama (Main Store)', 'Cabang Dago Bandung', 'Cabang Surabaya Barat'];

  const switchBranch = () => {
    setBranchIdx(prev => (prev + 1) % BRANCHES.length);
  };

  const triggerTopSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  const PAGE_TITLES: Record<AppMenuId, string> = {
    dashboard: 'Overview Bisnis',
    pos: 'Point of Sale (Kasir Kilat)',
    inventory: 'Inventaris & Multi-Unit Produk',
    purchasing: 'Pengadaan & Penerimaan Barang',
    reports: 'Laporan Keuangan & Buku Besar',
    customers: 'Pelanggan & Program Promo CRM',
    settings: 'Pengaturan Sistem Toko',
  };

  const SIDEBAR_MENUS = [
    { id: 'dashboard' as AppMenuId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos' as AppMenuId, label: 'Kasir (POS)', icon: ShoppingCart },
    { id: 'inventory' as AppMenuId, label: 'Produk & Stok', icon: Package, badge: 3 },
    { id: 'purchasing' as AppMenuId, label: 'Pembelian (PO)', icon: Truck },
    { id: 'reports' as AppMenuId, label: 'Laporan & Akuntansi', icon: FileText },
    { id: 'customers' as AppMenuId, label: 'Pelanggan & Promo', icon: Users },
    { id: 'settings' as AppMenuId, label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="hero-showcase-stage">
      {/* Module Tour Switcher Bar */}
      <div className="hero-tour-nav">
        <div className="hero-tour-label">
          <span className="live-indicator-dot" />
          <span>EKSPLORASI FITUR:</span>
        </div>
        <div className="hero-tour-pills">
          {SIDEBAR_MENUS.map(m => (
            <button
              key={m.id}
              type="button"
              className={`hero-tour-pill ${activeMenu === m.id ? 'active' : ''}`}
              onClick={() => setActiveMenu(m.id)}
            >
              <m.icon size={13} />
              <span>{m.label}</span>
              {m.badge && <span className="hero-tour-badge">{m.badge}</span>}
            </button>
          ))}
          <button
            type="button"
            className={`hero-tour-pill ai-pill ${isAiOpen ? 'active' : ''}`}
            onClick={() => setIsAiOpen(true)}
          >
            <Sparkles size={13} />
            <span>Kivo AI</span>
          </button>
        </div>
      </div>

      {/* Ambient Lighting Glow behind App Window */}
      <div className="app-stage-ambient" />

      {/* App Window Wrapper with Floating Telemetry Badges */}
      <div className="app-win-wrapper">
        <div className="floating-telemetry float-left">
          <div className="ft-icon-wrap zap">
            <Zap size={14} />
          </div>
          <div className="ft-content">
            <span className="ft-title">SQLite Local Engine</span>
            <span className="ft-sub">0.14ms Latency · 100% Offline</span>
          </div>
        </div>

        <div className="floating-telemetry float-right">
          <div className="ft-icon-wrap sync">
            <RefreshCw size={14} />
          </div>
          <div className="ft-content">
            <span className="ft-title">Supabase Cloud Sync</span>
            <span className="ft-sub">34 Tables · Mesh Synchronized</span>
          </div>
        </div>

        <div className="app-win" id="appWin">
          {/* 1. Real Kivo TitleBar (Authentic to TitleBar.tsx) */}
          <div className="app-titlebar-root">
        {/* Left branding */}
        <div className="titlebar-left">
          <KivoMark size={18} />
          <span className="titlebar-brand-name">Kivo</span>
          <span className="titlebar-platform-badge">Platform</span>
        </div>

        {/* Center Title with Branch Switcher */}
        <div className="titlebar-center">
          <button
            type="button"
            className="titlebar-branch-pill"
            onClick={switchBranch}
            title="Klik untuk beralih cabang toko"
          >
            <Building2 size={11} className="text-accent" />
            <span>{BRANCHES[branchIdx]}</span>
          </button>
        </div>

        {/* Right Window Controls & Sync Pill */}
        <div className="titlebar-right">
          <button
            type="button"
            className="titlebar-sync-btn"
            onClick={triggerTopSync}
            disabled={isSyncing}
            title="Status sinkronisasi SQLite ke Supabase Cloud"
          >
            <span className={`sync-dot ${isSyncing ? 'pulse' : 'online'}`} />
            <span>{isSyncing ? 'SYNCING…' : 'ONLINE · 42ms'}</span>
          </button>

          <div className="titlebar-window-buttons">
            <button type="button" className="win-btn" title="Minimize">
              <Minus size={12} />
            </button>
            <button type="button" className="win-btn" title="Maximize">
              <Square size={10} />
            </button>
            <button type="button" className="win-btn win-close" title="Close">
              <X size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Window Flex (Sidebar + Topbar + Content) */}
      <div className="app-flex-root">
        {/* Real Sidebar (Authentic to Sidebar.tsx) */}
        <aside className="app-sidebar-root">
          <div className="sidebar-brand-box">
            <div className="sidebar-store-info">
              <span className="store-name">Kivo Store</span>
              <span className="store-branch">{BRANCHES[branchIdx].split(' ')[0]}</span>
            </div>
          </div>

          <nav className="sidebar-nav-list">
            {SIDEBAR_MENUS.map(menu => {
              const Icon = menu.icon;
              const isActive = activeMenu === menu.id;
              return (
                <button
                  key={menu.id}
                  type="button"
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveMenu(menu.id)}
                >
                  <Icon size={16} />
                  <span>{menu.label}</span>
                  {menu.badge && <span className="sidebar-item-badge">{menu.badge}</span>}
                </button>
              );
            })}
          </nav>

          {/* AI Copilot Trigger Banner inside Sidebar */}
          <div className="sidebar-ai-banner" onClick={() => setIsAiOpen(true)}>
            <div className="ai-banner-icon">
              <Sparkles size={14} />
            </div>
            <div className="ai-banner-text">
              <div className="ai-banner-title">Kivo AI Copilot</div>
              <div className="ai-banner-sub">Tanya analisa bisnis</div>
            </div>
          </div>

          {/* User Profile Footer */}
          <div className="sidebar-user-footer">
            <div className="user-avatar-circle">A</div>
            <div className="user-meta">
              <div className="user-name">admin · Owner</div>
              <div className="user-role">KIVO-MAIN · POS 01</div>
            </div>
          </div>
        </aside>

        {/* Main Application Area (Topbar + Real Views) */}
        <div className="app-main-root">
          {/* Real Topbar (Authentic to Topbar.tsx) */}
          <header className="app-topbar-root">
            <div className="topbar-title-section">
              <h2 className="topbar-page-title">{PAGE_TITLES[activeMenu]}</h2>
            </div>

            <div className="topbar-actions-section">
              {/* LAN Mesh Status */}
              <div className="topbar-chip-pill" title="Mesh LAN 0-latensi aktif di subnet lokal">
                <Radio size={12} className="text-success animate-pulse" />
                <span>LAN 1</span>
              </div>

              {/* Cloud Sync Status */}
              <div
                className="topbar-chip-pill cursor-pointer"
                onClick={triggerTopSync}
                title="Klik untuk trigger pull/push worker"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-warning" />
                    <span className="text-warning">Sinkron...</span>
                  </>
                ) : (
                  <>
                    <Cloud size={12} className="text-success" />
                    <span className="text-success font-semibold">Online</span>
                  </>
                )}
              </div>

              <div className="topbar-divider-v" />

              {/* Zoom Controls */}
              <div className="topbar-zoom-controls">
                <button
                  type="button"
                  className="zoom-btn"
                  onClick={() => setZoomLevel(prev => Math.max(80, prev - 10))}
                  title="Perkecil (Ctrl -)"
                >
                  <ZoomOut size={12} />
                </button>
                <span className="zoom-label tnum">{zoomLevel}%</span>
                <button
                  type="button"
                  className="zoom-btn"
                  onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
                  title="Perbesar (Ctrl +)"
                >
                  <ZoomIn size={12} />
                </button>
              </div>

              {/* AI Assistant Quick Trigger */}
              <button
                type="button"
                className="topbar-ai-btn"
                onClick={() => setIsAiOpen(true)}
                title="Buka Kivo AI Assistant"
              >
                <Sparkles size={13} />
                <span>Kivo AI</span>
              </button>
            </div>
          </header>

          {/* Real View Content */}
          <main className="app-view-container">
            {activeMenu === 'dashboard' && (
              <RealDashboardView onNavigateTo={menu => setActiveMenu(menu as AppMenuId)} />
            )}
            {activeMenu === 'pos' && <RealPosView />}
            {activeMenu === 'inventory' && <RealInventoryView />}
            {activeMenu === 'purchasing' && <RealPurchasingView />}
            {activeMenu === 'reports' && <RealAccountingView />}
            {activeMenu === 'customers' && <RealCustomersView />}
            {activeMenu === 'settings' && (
              <div className="real-view-container text-center py-16">
                <Settings size={44} className="text-primary mx-auto mb-3 opacity-70" />
                <h3 className="text-lg font-bold text-heading">Pengaturan Sistem &amp; Hardware</h3>
                <p className="text-dim text-xs max-w-md mx-auto mt-1">
                  Konfigurasi printer thermal ESC/POS (USB, Bluetooth, LAN), cash drawer kick pin, backup database SQLite lokal, dan kredensial Supabase BYOK.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

        </div>
      </div>

      {/* Real AI Chat Copilot Drawer Modal */}
      <RealAiChatModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />

      {/* Interactive App Window Hint Bar */}
      <div className="hero-window-hint">
        <span className="hint-badge">Live Interactive UI</span>
        <span>
          Ini adalah antarmuka asli dari Kivo Desktop. Klik tab modul di atas atau sidebar di dalam untuk mencoba transaksi kasir POS, cek konversi stok multi-satuan, atau aktifkan Kivo AI.
        </span>
      </div>
    </div>
  );
};

export default InteractiveAppWindow;
