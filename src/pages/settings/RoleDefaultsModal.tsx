import { useState, useEffect } from 'react';
import { 
  Sliders, Loader2, Check, Search, CheckSquare, Square, AlertCircle, X
} from 'lucide-react';
import { 
  getPermissionDefinitions, 
  getRoleDefaultPermissions, 
  updateRoleDefaultPermissions,
  PermissionDef,
  RolePermissionItem
} from '../../lib/api';
import Modal from '../../components/ui/Modal';
import PermissionCategoryList from './PermissionCategoryList';

interface RoleDefaultsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

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

        const map: Record<string, Set<string>> = { staff: new Set(), admin: new Set() };
        defaultsList.forEach((item: RolePermissionItem) => {
          const r = item.role.toLowerCase();
          if (map[r]) map[r] = new Set(item.permissions);
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

  const handleToggle = (key: string) => {
    const next = new Set(currentPerms);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setRoleDefaults(prev => ({ ...prev, [activeRole]: next }));
  };

  const handleToggleCategory = (categoryName: string, enable: boolean) => {
    const next = new Set(currentPerms);
    const catItems = definitions.filter(d => d.category === categoryName);
    catItems.forEach(d => {
      if (enable) next.add(d.key);
      else next.delete(d.key);
    });
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
              className="px-6 py-2.5 bg-brand hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand/25 transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="animate-spin text-brand" size={32} />
          <p className="text-sm font-semibold">Memuat aturan baku hak akses...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
            {EDITABLE_ROLES.map((role) => {
              const isSelected = activeRole === role.value;
              const count = (roleDefaults[role.value] || new Set()).size;

              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setActiveRole(role.value as any)}
                  className={`p-4 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-[#0B0F19] shadow-sm border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm capitalize">{role.label}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected 
                        ? 'bg-brand/10 text-brand' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {count} Izin
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {role.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Search & Bulk Selection Toolbar */}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckSquare size={13} /> Pilih Semua
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Square size={13} /> Matikan Semua
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Clean Reusable Category List */}
          <PermissionCategoryList
            definitions={definitions}
            selectedPerms={currentPerms}
            searchQuery={searchQuery}
            onTogglePerm={handleToggle}
            onToggleCategory={handleToggleCategory}
          />
        </div>
      )}
    </Modal>
  );
}
