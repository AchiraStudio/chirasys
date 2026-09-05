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
    dashboard: 'Kivo Overview',
    pos: 'Kivo POS — Kasir & Point of Sale',
    inventory: 'Kivo Inventory — Katalog & Stok',
    purchasing: 'Kivo Purchasing — Penerimaan & Pemasok',
    customers: 'Kivo Customers — Pelanggan & Promosi',
    reports: 'Kivo Reports — Laporan & Akuntansi',
    settings: 'Kivo Admin — Pengaturan & Cloud Sync',
  };

  const title = PAGE_TITLES[activeMenu] ?? activeMenu.replace(/-/g, ' ');

  return (
    <header className="h-16 bg-white dark:bg-[#0B0F19] border-b border-slate-200/80 dark:border-slate-800 flex items-center px-4 sm:px-6 justify-between sticky top-0 z-10 shrink-0">

      {/* Dynamic Page Title */}
      <div className="min-w-0 mr-2">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize tracking-tight truncate">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">

        {/* LAN Mesh Status */}
        <div className="hidden sm:flex items-center text-xs font-semibold" title={`LAN Mesh: ${lanPeerCount} perangkat terdeteksi di jaringan lokal`}>
          <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800/60">
            <Radio size={13} className={lanPeerCount > 1 ? "animate-pulse text-emerald-500" : "text-indigo-500"} />
            <span>LAN ({lanPeerCount})</span>
          </span>
        </div>

        {/* Sync Status */}
        <div className="hidden sm:flex items-center text-xs font-semibold" title={lastSyncTime ? `Last sync: ${lastSyncTime.toLocaleTimeString('id-ID')}` : 'Syncing...'}>
          {status === 'connected' ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
              <Cloud size={14} /> Online
            </span>
          ) : status === 'connecting' ? (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
              <RefreshCw size={14} className="animate-spin" /> Connecting
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-full">
              <CloudOff size={14} /> Offline
            </span>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1">
          <button
            onClick={zoomOut}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-800"
            title="Zoom Out (Ctrl -)"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={reset}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-0.5 rounded transition-colors hover:bg-white dark:hover:bg-slate-800"
            title="Reset Zoom (Ctrl 0)"
          >
            {zoom}%
          </button>
          <button
            onClick={zoomIn}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-800"
            title="Zoom In (Ctrl +)"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* AI Chat CTA — opens AI Assistant modal */}
        {onOpenAIChat && (
          <button
            onClick={onOpenAIChat}
            className="ml-1 sm:ml-2 flex items-center gap-1.5 sm:gap-2 bg-gradient-to-tr from-brand to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white px-3.5 sm:px-4 py-2 rounded-full font-semibold text-xs sm:text-sm transition-all shadow-md shadow-brand/20 active:scale-[0.98] group"
            title="Tanya Achira"
          >
            <Sparkles size={16} className="group-hover:animate-pulse" aria-hidden="true" />
            <span className="hidden sm:inline">Tanya Achira</span>
          </button>
        )}
      </div>
    </header>
  );
}