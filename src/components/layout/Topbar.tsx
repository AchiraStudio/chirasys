import { Sun, Moon, Bell, Search, Cloud, CloudOff, RefreshCw, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';
import { useTheme } from '../ThemeProvider';
import { useSyncStore } from '../../store/SyncStore';
import { useZoomStore } from '../../store/ZoomStore';

interface TopbarProps {
  activeMenu: string;
  setActiveMenu?: (menu: string) => void;
  onOpenAIChat?: () => void;
}

export default function Topbar({ activeMenu, onOpenAIChat }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { status, lastSyncTime } = useSyncStore();
  const { zoom, zoomIn, zoomOut, reset } = useZoomStore();

  const PAGE_TITLES: Record<string, string> = {
    dashboard: 'Overview',
    pos: 'Kasir & Point of Sale',
    inventory: 'Inventaris & Produk',
    purchasing: 'Pembelian & Pemasok',
    customers: 'Pelanggan & Promosi',
    reports: 'Laporan & Akuntansi',
    settings: 'Pengaturan System',
  };

  const title = PAGE_TITLES[activeMenu] ?? activeMenu.replace(/-/g, ' ');

  return (
    <header className="h-20 glass border-b flex items-center px-8 justify-between sticky top-0 z-10 transition-colors duration-300">

      {/* Dynamic Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white capitalize tracking-tight">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-5">

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center bg-slate-100/80 dark:bg-slate-900/80 rounded-full px-4 py-2 border border-slate-200 dark:border-slate-800 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all shadow-inner">
          <Search size={16} className="text-slate-500 mr-2" />
          <input
            type="text"
            placeholder="Search transactions, items..."
            className="bg-transparent border-none outline-none text-sm w-56 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-0"
          />
          <kbd className="hidden lg:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
            ⌘K
          </kbd>
        </div>

        {/* Sync Status */}
        <div className="hidden md:flex items-center text-xs font-semibold" title={lastSyncTime ? `Last sync: ${lastSyncTime.toLocaleTimeString('id-ID')}` : 'Syncing...'}>
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

        {/* Notification Bell */}
        <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#09090b]"></span>
        </button>

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
            className="ml-2 flex items-center gap-2 bg-gradient-to-tr from-brand to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md shadow-brand/20 active:scale-[0.98] group"
            title="Tanya Achira"
          >
            <Sparkles size={18} className="group-hover:animate-pulse" aria-hidden="true" />
            <span>Tanya Achira</span>
          </button>
        )}
      </div>
    </header>
  );
}