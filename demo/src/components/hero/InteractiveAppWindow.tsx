import React, { useState, useEffect } from 'react';
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
  Minus,
  Square,
  X,
  QrCode,
  Copy,
  Check,
  Smartphone,
  Tablet,
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
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const BRANCHES = ['Flagship Store (HQ)', 'Downtown Branch (Store 02)', 'West Coast Branch (Store 03)'];

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

  useEffect(() => {
    const handleSwitch = (e: Event) => {
      const customEvent = e as CustomEvent<AppMenuId>;
      if (customEvent.detail) {
        setActiveMenu(customEvent.detail);
      }
    };
    window.addEventListener('kivo-switch-tab', handleSwitch);
    return () => window.removeEventListener('kivo-switch-tab', handleSwitch);
  }, []);

  const PAGE_TITLES: Record<AppMenuId, string> = {
    dashboard: 'Business Overview',
    pos: 'Point of Sale (Rapid Checkout)',
    inventory: 'Inventory & Multi-Unit Catalog',
    purchasing: 'Purchasing & Dock Receiving',
    reports: 'Financial Reports & General Ledger',
    customers: 'Customers & CRM Loyalty Program',
    settings: 'System & Hardware Settings',
  };

  const SIDEBAR_MENUS = [
    { id: 'dashboard' as AppMenuId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos' as AppMenuId, label: 'Checkout (POS)', icon: ShoppingCart },
    { id: 'inventory' as AppMenuId, label: 'Products & Stock', icon: Package, badge: 3 },
    { id: 'purchasing' as AppMenuId, label: 'Purchasing (PO)', icon: Truck },
    { id: 'reports' as AppMenuId, label: 'Reports & Ledger', icon: FileText },
    { id: 'customers' as AppMenuId, label: 'Customers & Loyalty', icon: Users },
    { id: 'settings' as AppMenuId, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="hero-showcase-stage">
      {/* Ambient Lighting Glow behind App Window */}
      <div className="app-stage-ambient" />

      {/* App Window Wrapper */}
      <div className="app-win-wrapper">
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
            title="Click to switch store branch"
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
            title="SQLite to Supabase Cloud sync status"
          >
            <span className={`sync-dot ${isSyncing ? 'pulse' : 'online'}`} />
            <span>{isSyncing ? 'SYNCING…' : 'ONLINE'}</span>
            {!isSyncing && <span className="titlebar-latency-text"> · 42ms</span>}
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
              <div className="topbar-chip-pill topbar-lan-pill" title="0-latency LAN mesh active on local subnet">
                <Radio size={12} className="text-success animate-pulse shrink-0" />
                <span className="topbar-lan-text">LAN 1</span>
              </div>

              {/* v1.4.0 Host Web Terminal QR Button */}
              <button
                type="button"
                className="topbar-chip-pill topbar-host-qr-btn cursor-pointer"
                onClick={() => setIsQrModalOpen(true)}
                title="v1.4.0: Buka QR Host Terminal untuk Kasir HP / Tablet"
                style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.35)', color: 'var(--primary)' }}
              >
                <QrCode size={12} className="shrink-0" />
                <span className="host-qr-text-full" style={{ fontWeight: 700 }}>Host QR v1.4</span>
                <span className="host-qr-text-short" style={{ fontWeight: 700, display: 'none' }}>QR</span>
              </button>

              {/* Cloud Sync Status (Hidden on mobile to prevent clutter) */}
              <div
                className="topbar-chip-pill topbar-cloud-pill cursor-pointer"
                onClick={triggerTopSync}
                title="Click to trigger pull/push sync worker"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-warning shrink-0" />
                    <span className="text-warning">Syncing...</span>
                  </>
                ) : (
                  <>
                    <Cloud size={12} className="text-success shrink-0" />
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
                  title="Zoom Out (Ctrl -)"
                >
                  <ZoomOut size={12} />
                </button>
                <span className="zoom-label tnum">{zoomLevel}%</span>
                <button
                  type="button"
                  className="zoom-btn"
                  onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
                  title="Zoom In (Ctrl +)"
                >
                  <ZoomIn size={12} />
                </button>
              </div>

              {/* AI Assistant Quick Trigger */}
              <button
                type="button"
                className="topbar-ai-btn"
                onClick={() => setIsAiOpen(true)}
                title="Open Kivo AI Assistant"
              >
                <Sparkles size={13} className="shrink-0" />
                <span className="ai-btn-text-full">Kivo AI</span>
                <span className="ai-btn-text-short" style={{ display: 'none' }}>AI</span>
              </button>
            </div>
          </header>

          {/* Mobile View Switcher Strip (Only on mobile / small screens) */}
          <div className="app-mobile-nav-strip">
            {SIDEBAR_MENUS.map(menu => {
              const Icon = menu.icon;
              const isActive = activeMenu === menu.id;
              return (
                <button
                  key={menu.id}
                  type="button"
                  className={`app-mobile-nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveMenu(menu.id)}
                >
                  <Icon size={13} />
                  <span>{menu.label}</span>
                </button>
              );
            })}
          </div>

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
                <h3 className="text-lg font-bold text-heading">System &amp; Hardware Settings</h3>
                <p className="text-dim text-xs max-w-md mx-auto mt-1">
                  Configure ESC/POS thermal printers (USB, Bluetooth, LAN), cash drawer kick pins, local SQLite backups, and BYOK Supabase cloud credentials.
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

      {/* v1.4.0 Interactive Host QR Code Modal */}
      {isQrModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setIsQrModalOpen(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '430px',
              backgroundColor: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              color: 'var(--heading)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', paddingBottom: '14px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>Terminal Web Kasir (v1.4.0)</h3>
                  <p style={{ fontSize: '11px', color: 'var(--dim)', margin: '2px 0 0 0' }}>Buka kasir di smartphone / tablet staf via Wi-Fi lokal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--dim)', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* QR Visual Presentation */}
            <div style={{ margin: '18px 0', padding: '20px', borderRadius: '16px', backgroundColor: 'var(--muted)', border: '1px solid var(--line)', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', padding: '12px', background: '#ffffff', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <QrCode size={130} style={{ color: '#0f172a' }} strokeWidth={1.5} />
              </div>
              <div style={{ marginTop: '12px', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: 'var(--heading)' }}>
                http://192.168.1.7:3699
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText('http://192.168.1.7:3699');
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 1500);
                }}
                style={{
                  marginTop: '8px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                }}
              >
                {copiedUrl ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
                <span>{copiedUrl ? 'URL Berhasil Disalin!' : 'Salin Alamat URL'}</span>
              </button>
            </div>

            {/* Connected Live LAN Terminals */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '10.5px', fontWeight: 800, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Perangkat Kasir Terhubung (2)</span>
                <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }} /> Live LAN
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ padding: '8px 12px', borderRadius: '10px', backgroundColor: 'var(--muted)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tablet size={14} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 600 }}>iPad POS 02 (Meja Depan)</span>
                  </div>
                  <span style={{ fontSize: '9.5px', fontFamily: 'monospace', color: 'var(--success)', fontWeight: 700, background: 'rgba(20, 202, 122, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                    Auto-Login
                  </span>
                </div>

                <div style={{ padding: '8px 12px', borderRadius: '10px', backgroundColor: 'var(--muted)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Smartphone size={14} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontWeight: 600 }}>iPhone 15 (Pelayan / Waiter)</span>
                  </div>
                  <span style={{ fontSize: '9.5px', fontFamily: 'monospace', color: 'var(--success)', fontWeight: 700, background: 'rgba(20, 202, 122, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                    Auto-Login
                  </span>
                </div>
              </div>
            </div>

            {/* Action Close */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', height: '42px', fontSize: '13px', borderRadius: '12px' }}
            >
              Tutup &amp; Lanjutkan Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveAppWindow;
