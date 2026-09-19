import { ShoppingCart, LayoutDashboard, Package, FileText, Menu } from 'lucide-react';
import { usePermissions } from '../../lib/permissions';

interface MobileNavProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onOpenMenuDrawer: () => void;
  cartCount?: number;
}

export default function MobileNav({
  activeMenu,
  setActiveMenu,
  onOpenMenuDrawer,
  cartCount = 0,
}: MobileNavProps) {
  const { can } = usePermissions();

  const NAV_ITEMS = [
    {
      id: 'pos',
      label: 'Kasir',
      icon: ShoppingCart,
      show: can('sales.create'),
      badge: cartCount > 0 ? cartCount : null,
    },
    {
      id: 'dashboard',
      label: 'Ringkasan',
      icon: LayoutDashboard,
      show: true,
    },
    {
      id: 'inventory',
      label: 'Produk',
      icon: Package,
      show: can('items.view') || can('inventory.view'),
    },
    {
      id: 'reports',
      label: 'Laporan',
      icon: FileText,
      show: can('reports.view') || can('accounting.manage'),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2">
      <nav className="pointer-events-auto max-w-md mx-auto bg-card/90 dark:bg-[#0d121f]/90 backdrop-blur-xl border border-line/80 dark:border-line/50 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 flex items-center justify-around p-1.5 select-none transition-all">
        {NAV_ITEMS.filter(item => item.show).map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveMenu(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1.5 rounded-xl transition-all duration-200 relative active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-primary/12 text-primary font-bold shadow-xs'
                  : 'text-dim hover:text-heading font-medium hover:bg-muted/40'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon size={19} strokeWidth={isActive ? 2.4 : 1.9} />
                {item.badge ? (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[62px] ${isActive ? 'text-primary' : 'text-dim'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-primary mt-0.5 animate-pulse" />
              )}
            </button>
          );
        })}

        {/* Menu / Lainnya Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMenuDrawer}
          className="flex flex-col items-center justify-center flex-1 py-1.5 px-1.5 rounded-xl text-dim hover:text-heading font-medium hover:bg-muted/40 transition-all duration-200 relative active:scale-95 cursor-pointer"
        >
          <div className="relative flex items-center justify-center">
            <Menu size={19} strokeWidth={1.9} />
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Menu</span>
        </button>
      </nav>
    </div>
  );
}
