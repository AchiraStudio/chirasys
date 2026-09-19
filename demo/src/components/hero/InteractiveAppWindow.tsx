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
              <div className="topbar-chip-pill" title="0-latency LAN mesh active on local subnet">
                <Radio size={12} className="text-success animate-pulse" />
                <span>LAN 1</span>
              </div>

              {/* Cloud Sync Status */}
              <div
                className="topbar-chip-pill cursor-pointer"
                onClick={triggerTopSync}
                title="Click to trigger pull/push sync worker"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-warning" />
                    <span className="text-warning">Syncing...</span>
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
                <Sparkles size={13} />
                <span>Kivo AI</span>
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
    </div>
  );
};

export default InteractiveAppWindow;
