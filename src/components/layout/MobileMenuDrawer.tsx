import { 
  X, Truck, Users, Settings, BookOpen, Sun, Moon, 
  LogOut, QrCode, ChevronRight 
} from 'lucide-react';
import { useAuthStore } from '../../store/AuthStore';
import { useTheme } from '../ThemeProvider';
import { usePermissions } from '../../lib/permissions';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onOpenHostQr: () => void;
  onLogout: () => void;
}

export default function MobileMenuDrawer({
  isOpen,
  onClose,
  activeMenu,
  setActiveMenu,
  onOpenHostQr,
  onLogout,
}: MobileMenuDrawerProps) {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { can } = usePermissions();

  if (!isOpen) return null;

  const handleSelect = (menuId: string) => {
    setActiveMenu(menuId);
    onClose();
  };

  const SECONDARY_ITEMS = [
    {
      id: 'purchasing',
      label: 'Pembelian & Pemasok',
      desc: 'Pesanan PO & penerimaan barang',
      icon: Truck,
      show: can('purchasing.view') || can('purchasing.create'),
    },
    {
      id: 'customers',
      label: 'Pelanggan & Promo CRM',
      desc: 'Member, poin loyalitas & voucher',
      icon: Users,
      show: can('crm.customers') || can('promos.manage'),
    },
    {
      id: 'accounting',
      label: 'Buku Kas & Akuntansi',
      desc: 'Arus kas, jurnal & neraca saldo',
      icon: BookOpen,
      show: can('accounting.manage') || can('reports.view'),
    },
    {
      id: 'settings',
      label: 'Pengaturan Sistem',
      desc: 'Konfigurasi toko, printer & database',
      icon: Settings,
      show: can('settings.general') || can('settings.hardware') || can('settings.users') || can('settings.database') || can('settings.lan'),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex select-none animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer Panel */}
      <div className="relative ml-auto w-full max-w-[340px] bg-card/95 dark:bg-[#0E131F]/95 backdrop-blur-2xl border-l border-line h-full flex flex-col shadow-2xl z-10 animate-slide-in-right pb-[env(safe-area-inset-bottom)]">
        
        {/* Header with User Info */}
        <div className="p-4 border-b border-line/80 bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-accent text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-primary/25">
              {user?.name?.slice(0, 2).toUpperCase() || 'KV'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-heading truncate">{user?.name || 'Staff Kasir'}</h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-primary-soft text-primary">
                  {user?.role || 'kasir'}
                </span>
              </div>
              <p className="text-[11px] text-dim flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                <span className="truncate">{user?.branch_id || 'Cabang Utama'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-dim hover:text-heading hover:bg-muted/80 rounded-xl transition-all active:scale-90 cursor-pointer border border-line/50"
            title="Tutup Menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-4">
          
          {/* Menu Sections */}
          <div>
            <div className="px-2 pb-2 text-[10px] font-bold text-dim uppercase tracking-wider">
              Modul Bisnis
            </div>

            <div className="space-y-1">
              {SECONDARY_ITEMS.filter(i => i.show).map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'text-body hover:text-heading hover:bg-muted/60 border border-transparent hover:border-line/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-muted text-primary'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <div className="text-left min-w-0">
                        <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-heading'}`}>
                          {item.label}
                        </p>
                        <p className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-dim'}`}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={14} className={isActive ? 'text-white/70' : 'text-dim'} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connected Device & Multi-Device Host Access */}
          <div>
            <div className="px-2 pb-2 text-[10px] font-bold text-dim uppercase tracking-wider">
              Akses Perangkat
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenHostQr();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary-soft/80 to-transparent border border-primary/20 hover:border-primary/40 transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-xs">
                  <QrCode size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-heading group-hover:text-primary transition-colors">
                    QR Code Host Kasir
                  </p>
                  <p className="text-[10px] text-dim">
                    Hubungkan HP atau Tablet lain
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-1 rounded-md bg-primary text-white shadow-xs">
                Akses
              </span>
            </button>
          </div>

          {/* Display & Theme Toggle */}
          <div>
            <div className="px-2 pb-2 text-[10px] font-bold text-dim uppercase tracking-wider">
              Preferensi Tampilan
            </div>

            <div className="p-1 bg-muted/60 rounded-xl border border-line/60 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-card text-heading shadow-xs font-bold'
                    : 'text-dim hover:text-heading'
                }`}
              >
                <Sun size={14} className={theme === 'light' ? 'text-warning' : ''} />
                <span>Terang</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-card text-heading shadow-xs font-bold'
                    : 'text-dim hover:text-heading'
                }`}
              >
                <Moon size={14} className={theme === 'dark' ? 'text-primary' : ''} />
                <span>Gelap</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Logout Action */}
        <div className="p-3.5 border-t border-line/80 bg-muted/20">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-danger hover:bg-danger-soft border border-danger/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <LogOut size={15} />
            <span>Keluar Akun (Logout)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
