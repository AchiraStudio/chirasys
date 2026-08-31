import { useState, useEffect, useMemo } from 'react';
import { 
  Sliders, 
  Loader2, 
  Check, 
  Search, 
  CheckSquare, 
  Square, 
  ShoppingCart, 
  Package, 
  Truck, 
  Users, 
  FileText, 
  Settings as SettingsIcon,
  AlertCircle,
  X
} from 'lucide-react';
import { 
  getPermissionDefinitions, 
  getRoleDefaultPermissions, 
  updateRoleDefaultPermissions,
  PermissionDef,
  RolePermissionItem
} from '../../lib/api';
import Modal from '../../components/ui/Modal';

interface RoleDefaultsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Penjualan (POS)': ShoppingCart,
  'Inventaris & Produk': Package,
  'Pembelian & Pemasok': Truck,
  'Pelanggan & Promo': Users,
  'Laporan & Keuangan': FileText,
  'Pengaturan & Sistem': SettingsIcon,
};

const EDITABLE_ROLES = [
  { value: 'staff', label: 'Staff', desc: 'Kasir, operasional gudang, dan staf penjualan harian' },
  { value: 'admin', label: 'Admin', desc: 'Supervisi cabang, manajer operasional, dan kasir senior' },
];

export default function RoleDefaultsModal({ onClose, onSuccess }: RoleDefaultsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [definitions, setDefinitions] = useState<PermissionDef[]>([]);
  const [roleDefaults, setRoleDefaults] = useState<Record<string, Set<string>>>({});
  const [activeRole, setActiveRole] = useState<'staff' | 'admin'>('staff');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const [defs, defaultsList] = await Promise.all([
          getPermissionDefinitions(),
          getRoleDefaultPermissions(),
        ]);
        setDefinitions(defs);

        const map: Record<string, Set<string>> = {
          staff: new Set(),
          admin: new Set(),
        };

        defaultsList.forEach((item: RolePermissionItem) => {
          const r = item.role.toLowerCase();
          if (map[r]) {
            map[r] = new Set(item.permissions);
          }
        });

        setRoleDefaults(map);
      } catch (err: any) {
        console.error('Failed to load role defaults:', err);
        setErrorMsg(err?.toString() || 'Gagal memuat aturan hak akses peran.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const currentPerms = roleDefaults[activeRole] || new Set<string>();

  // Group definitions by category
  const categories = useMemo(() => {
    const groups: Record<string, PermissionDef[]> = {};
    for (const def of definitions) {
      if (!groups[def.category]) {
        groups[def.category] = [];
      }
      if (!searchQuery || 
          def.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          def.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          def.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        groups[def.category].push(def);
      }
    }
    return groups;
  }, [definitions, searchQuery]);

  const handleToggle = (key: string) => {
    const next = new Set(currentPerms);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setRoleDefaults(prev => ({ ...prev, [activeRole]: next }));
  };

  const handleToggleCategory = (categoryName: string) => {
    const items = categories[categoryName] || [];
    const allActive = items.every(i => currentPerms.has(i.key));
    const next = new Set(currentPerms);

    if (allActive) {
      items.forEach(i => next.delete(i.key));
    } else {
      items.forEach(i => next.add(i.key));
    }
    setRoleDefaults(prev => ({ ...prev, [activeRole]: next }));
  };

  const handleSelectAll = () => {
    setRoleDefaults(prev => ({ 
      ...prev, 
      [activeRole]: new Set(definitions.map(d => d.key)) 
    }));
  };

  const handleDeselectAll = () => {
    setRoleDefaults(prev => ({ 
      ...prev, 
      [activeRole]: new Set() 
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      await updateRoleDefaultPermissions(activeRole, Array.from(currentPerms));
      setSuccessMsg(`Hak akses baku peran "${activeRole.toUpperCase()}" berhasil disimpan!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Failed to save role defaults:', err);
      setErrorMsg(err?.toString() || 'Gagal menyimpan aturan hak akses peran.');
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="3xl"
      title="Hak Akses Baku Peran (Role Defaults)"
      subtitle="Tentukan hak akses standar yang otomatis berlaku bagi pengguna yang memakai default role."
      icon={Sliders}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {successMsg ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <Check size={15} /> {successMsg}
              </span>
            ) : (
              <span>
                Peran <strong>{activeRole}</strong> memiliki <strong>{currentPerms.size}</strong> izin aktif
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={loading || saving}
              onClick={handleSave}
              className="px-6 py-2.5 bg-brand hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand/25 transition-all active:scale-[0.98] flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Simpan Default Peran
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      {/* Role Tab Selector */}
      <div className="pb-5 mb-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
        {EDITABLE_ROLES.map((r) => {
          const isActive = activeRole === r.value;
          return (
            <button
              key={r.value}
              onClick={() => setActiveRole(r.value as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-brand text-white shadow-md shadow-brand/20'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              <span>Peran: {r.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-900 text-slate-500'
              }`}>
                {(roleDefaults[r.value]?.size || 0)} Izin
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Body */}
      {loading ? (
        <div className="py-28 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="animate-spin text-brand mb-4" size={36} />
          <p className="text-sm font-medium">Memuat konfigurasi hak akses peran...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Actions & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari izin akses (contoh: harga, hapus, pos)..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <CheckSquare size={13} /> Pilih Semua
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Square size={13} /> Matikan Semua
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Categories & Switches */}
          <div className="space-y-6">
            {Object.entries(categories).map(([catName, items]) => {
              if (items.length === 0) return null;
              const Icon = CATEGORY_ICONS[catName] || Sliders;
              const activeCount = items.filter(i => currentPerms.has(i.key)).length;
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

                    <button
                      type="button"
                      onClick={() => handleToggleCategory(catName)}
                      className="text-[11px] font-semibold text-brand hover:underline transition-all"
                    >
                      {allActive ? 'Matikan Bagian Ini' : 'Aktifkan Semua'}
                    </button>
                  </div>

                  {/* Permission Items */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {items.map((def) => {
                      const isChecked = currentPerms.has(def.key);

                      return (
                        <div
                          key={def.key}
                          onClick={() => handleToggle(def.key)}
                          className={`p-4 flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                            isChecked 
                              ? 'bg-brand/[0.02] dark:bg-brand/[0.03] hover:bg-brand/[0.04]' 
                              : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {def.name}
                              </p>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {def.key}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                              {def.description}
                            </p>
                          </div>

                          {/* iOS Style Switch Toggle */}
                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleToggle(def.key); }}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isChecked 
                                  ? 'bg-brand' 
                                  : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  isChecked ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
