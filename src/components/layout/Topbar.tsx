import { Sun, Moon, Bell, Search, Plus } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

interface TopbarProps {
  activeMenu: string;
  setActiveMenu?: (menu: string) => void;
}

export default function Topbar({ activeMenu, setActiveMenu }: TopbarProps) {
  const { theme, setTheme } = useTheme();

  const PAGE_TITLES: Record<string, string> = {
    dashboard: 'Overview',
    'master-data': 'Master Data',
    inventory: 'Stock Overview',
    catalog: 'Catalog',
    suppliers: 'Suppliers',
    customers: 'Customers',
    purchasing: 'Purchasing',
    pos: 'Point of Sale',
    promos: 'Promotions',
    accounting: 'Accounting',
    reports: 'Reports',
    settings: 'Settings',
  };

  const title = PAGE_TITLES[activeMenu] ?? activeMenu.replace(/-/g, ' ');

  return (
    <header className="h-20 bg-white/70 dark:bg-[#09090b]/70 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 flex items-center px-8 justify-between sticky top-0 z-10 transition-colors duration-300">
      
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

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

        {/* Notification Bell */}
        <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#09090b]"></span>
        </button>
        
        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* New Sale CTA — navigates to POS */}
        {setActiveMenu && (
          <button
            onClick={() => setActiveMenu('pos')}
            className="ml-2 flex items-center gap-2 bg-brand hover:bg-blue-600 text-white px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md shadow-brand/20 active:scale-[0.98]"
          >
            <Plus size={18} aria-hidden="true" />
            <span>New Sale</span>
          </button>
        )}
      </div>
    </header>
  );
}