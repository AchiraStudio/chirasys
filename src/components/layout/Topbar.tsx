import { useState, useEffect } from 'react';
import { Sun, Moon, Cloud, CloudOff, RefreshCw, ZoomIn, ZoomOut, Sparkles, Radio } from 'lucide-react';
import { useTheme } from '../ThemeProvider';
import { useSyncStore } from '../../store/SyncStore';
import { useZoomStore } from '../../store/ZoomStore';
import { getLanPeers, LanPeer } from '../../lib/api';
import { listen } from '@tauri-apps/api/event';

interface TopbarProps {
  activeMenu: string;
  setActiveMenu?: (menu: string) => void;
  onOpenAIChat?: () => void;
}

export default function Topbar({ activeMenu, onOpenAIChat }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { status, lastSyncTime } = useSyncStore();
  const { zoom, zoomIn, zoomOut, reset } = useZoomStore();
  const [lanPeerCount, setLanPeerCount] = useState(0);

  useEffect(() => {
    getLanPeers().then(p => setLanPeerCount(p.length)).catch(() => {});
    let unlisten: (() => void) | undefined;
    listen<LanPeer[]>('chirasys:lan_peers_updated', e => {
      setLanPeerCount(e.payload.length);
    }).then(u => {
      unlisten = u;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const PAGE_TITLES: Record<string, string> = {
    dashboard: 'Overview',
    pos: 'Point of Sale',
    inventory: 'Inventaris & Produk',
    purchasing: 'Pembelian & Pemasok',
    customers: 'Pelanggan & Promo',
    reports: 'Laporan & Keuangan',
    settings: 'Pengaturan',
  };

  const title = PAGE_TITLES[activeMenu] ?? activeMenu.replace(/-/g, ' ');

  return (
    <header className="h-13 sm:h-14 bg-card border-b border-line flex items-center px-4 sm:px-6 justify-between sticky top-0 z-10 shrink-0">

      {/* Dynamic Page Title */}
      <div className="min-w-0 mr-3">
        <h2 className="text-sm sm:text-base font-bold text-heading tracking-tight truncate">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

        {/* LAN Mesh Status */}
        <div 
          className="hidden sm:flex items-center" 
          title={`LAN: ${lanPeerCount} perangkat terdeteksi di jaringan lokal`}
        >
          <span className="flex items-center gap-1.5 text-xs font-medium text-dim bg-muted/70 px-2.5 py-1 rounded-full border border-line">
            <Radio size={12} className={lanPeerCount > 1 ? "animate-pulse text-success" : "text-dim"} />
            <span>LAN {lanPeerCount}</span>
          </span>
        </div>

        {/* Sync Status */}
        <div 
          className="hidden sm:flex items-center" 
          title={status === 'connected' ? (lastSyncTime ? `Online • Terakhir: ${lastSyncTime.toLocaleTimeString('id-ID')}` : 'Online') : status === 'connecting' ? 'Menghubungkan ke Cloud...' : 'Mode Lokal (Offline)'}
        >
          {status === 'connected' ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-success bg-success-soft px-2.5 py-1 rounded-full border border-success/20">
              <Cloud size={13} /> Online
            </span>
          ) : status === 'connecting' ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-warning bg-warning-soft px-2.5 py-1 rounded-full border border-warning/20">
              <RefreshCw size={12} className="animate-spin" /> Sinkron...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-dim bg-muted/70 px-2.5 py-1 rounded-full border border-line">
              <CloudOff size={13} /> Lokal
            </span>
          )}
        </div>

        <div className="h-5 w-px bg-line mx-0.5 hidden sm:block"></div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 bg-muted/60 border border-line rounded-lg p-0.5">
          <button
            onClick={zoomOut}
            className="text-dim hover:text-heading transition-colors p-1 rounded hover:bg-card cursor-pointer"
            title="Perkecil Tampilan (Ctrl -)"
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={reset}
            className="text-[11px] font-semibold text-dim hover:text-heading px-1.5 py-0.5 rounded transition-colors hover:bg-card font-mono cursor-pointer"
            title="Reset Zoom 100% (Ctrl 0)"
          >
            {zoom}%
          </button>
          <button
            onClick={zoomIn}
            className="text-dim hover:text-heading transition-colors p-1 rounded hover:bg-card cursor-pointer"
            title="Perbesar Tampilan (Ctrl +)"
          >
            <ZoomIn size={13} />
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-dim hover:text-heading transition-colors p-1.5 rounded-lg hover:bg-muted cursor-pointer"
          title="Ganti Tema (Light / Dark)"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* AI Chat CTA — opens AI Assistant modal */}
        {onOpenAIChat && (
          <button
            onClick={onOpenAIChat}
            className="ml-0.5 flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold text-xs transition-all active:scale-[0.98] shadow-xs cursor-pointer"
            title="Tanya Kivo AI Assistant"
          >
            <Sparkles size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Tanya Kivo AI</span>
          </button>
        )}
      </div>
    </header>
  );
}
