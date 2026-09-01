import { useMemo } from 'react';
import { 
  ShoppingCart, Package, Truck, Users, FileText, 
  Settings as SettingsIcon, Sliders 
} from 'lucide-react';
import { PermissionDef } from '../../lib/api';

interface PermissionCategoryListProps {
  definitions: PermissionDef[];
  selectedPerms: Set<string>;
  searchQuery: string;
  onTogglePerm: (key: string) => void;
  onToggleCategory: (catName: string, enable: boolean) => void;
  disabled?: boolean;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Penjualan (POS)': ShoppingCart,
  'Inventaris & Produk': Package,
  'Pembelian & Pemasok': Truck,
  'Pelanggan & Promo': Users,
  'Laporan & Keuangan': FileText,
  'Pengaturan & Sistem': SettingsIcon,
};

export default function PermissionCategoryList({
  definitions,
  selectedPerms,
  searchQuery,
  onTogglePerm,
  onToggleCategory,
  disabled = false,
}: PermissionCategoryListProps) {
  const categories = useMemo(() => {
    const groups: Record<string, PermissionDef[]> = {};
    const q = searchQuery.toLowerCase().trim();

    for (const def of definitions) {
      if (!groups[def.category]) {
        groups[def.category] = [];
      }
      if (
        !q ||
        def.name.toLowerCase().includes(q) ||
        def.key.toLowerCase().includes(q) ||
        def.description.toLowerCase().includes(q)
      ) {
        groups[def.category].push(def);
      }
    }
    return groups;
  }, [definitions, searchQuery]);

  return (
    <div className="space-y-6">
      {Object.entries(categories).map(([catName, items]) => {
        if (items.length === 0) return null;
        const Icon = CATEGORY_ICONS[catName] || Sliders;
        const activeCount = items.filter(i => selectedPerms.has(i.key)).length;
        const allActive = activeCount === items.length;

        return (
          <div 
            key={catName}
            className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm transition-colors"
          >
            {/* Category Header */}
            <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
                  <Icon size={16} />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {catName}
                </h3>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  allActive 
                    ? 'bg-brand/10 text-brand' 
                    : activeCount > 0 
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' 
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {activeCount}/{items.length} Aktif
                </span>
              </div>

              {!disabled && (
                <button
                  type="button"
                  onClick={() => onToggleCategory(catName, !allActive)}
                  className="text-xs font-bold text-slate-500 hover:text-brand transition-colors cursor-pointer"
                >
                  {allActive ? 'Matikan Semua Kategori' : 'Pilih Semua Kategori'}
                </button>
              )}
            </div>

            {/* Permission Items Grid */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {items.map((item) => {
                const isChecked = selectedPerms.has(item.key);
                return (
                  <label
                    key={item.key}
                    className={`px-5 py-3.5 flex items-start justify-between gap-4 transition-colors ${
                      disabled 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-900/40 cursor-pointer'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </span>
                        <code className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {item.key}
                        </code>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={disabled}
                        onChange={() => onTogglePerm(item.key)}
                        className="w-4 h-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
