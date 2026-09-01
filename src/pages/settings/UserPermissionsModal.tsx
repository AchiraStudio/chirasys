import { useState, useEffect } from 'react';
import { 
  Shield, Loader2, Check, RotateCcw, Search, CheckSquare, Square, AlertCircle, X, Sparkles
} from 'lucide-react';
import { 
  getPermissionDefinitions, 
  getUserPermissions, 
  updateUserPermissions,
  PermissionDef,
  UserPermissionsPayload
} from '../../lib/api';
import Modal from '../../components/ui/Modal';
import PermissionCategoryList from './PermissionCategoryList';

interface UserPermissionsModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserPermissionsModal({ userId, onClose, onSuccess }: UserPermissionsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [definitions, setDefinitions] = useState<PermissionDef[]>([]);
  const [userData, setUserData] = useState<UserPermissionsPayload | null>(null);
  
  const [isCustom, setIsCustom] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const [defs, userPerms] = await Promise.all([
          getPermissionDefinitions(),
          getUserPermissions(userId),
        ]);
        setDefinitions(defs);
        setUserData(userPerms);
        setIsCustom(userPerms.is_custom);
        
        if (userPerms.role.toLowerCase() === 'owner') {
          setSelectedPerms(new Set(defs.map((d: PermissionDef) => d.key)));
        } else {
          setSelectedPerms(new Set(userPerms.permissions));
        }
      } catch (err: any) {
        console.error('Failed to load permissions:', err);
        setErrorMsg(err?.toString() || 'Gagal memuat hak akses.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId]);

  const handleToggle = (key: string) => {
    if (userData?.role.toLowerCase() === 'owner') return;
    if (!isCustom) setIsCustom(true);

    const next = new Set(selectedPerms);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedPerms(next);
  };

  const handleToggleCategory = (categoryName: string, enable: boolean) => {
    if (userData?.role.toLowerCase() === 'owner') return;
    if (!isCustom) setIsCustom(true);

    const next = new Set(selectedPerms);
    const catItems = definitions.filter(d => d.category === categoryName);
    catItems.forEach(d => {
      if (enable) next.add(d.key);
      else next.delete(d.key);
    });
    setSelectedPerms(next);
  };

  const handleSelectAll = () => {
    if (!isCustom) setIsCustom(true);
    setSelectedPerms(new Set(definitions.map(d => d.key)));
  };

  const handleDeselectAll = () => {
    if (!isCustom) setIsCustom(true);
    setSelectedPerms(new Set());
  };

  const handleResetToDefault = () => {
    if (!userData) return;
    setIsCustom(false);
    setSelectedPerms(new Set(userData.role_defaults));
  };

  const handleSave = async () => {
    if (!userData) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await updateUserPermissions(userId, isCustom, Array.from(selectedPerms));
      setSuccessMsg('Hak akses berhasil disimpan!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Failed to save user permissions:', err);
      setErrorMsg(err?.toString() || 'Gagal menyimpan hak akses.');
      setSaving(false);
    }
  };

  const isOwner = userData?.role.toLowerCase() === 'owner';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="3xl"
      title="Pengaturan Hak Akses Pengguna"
      subtitle={userData ? `${userData.user_name} (@${userData.username})` : 'Memuat data...'}
      icon={Shield}
      badge={
        userData ? (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
            isOwner 
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' 
              : userData.role === 'admin' 
                ? 'bg-brand/10 text-brand' 
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
          }`}>
            {userData.role}
          </span>
        ) : null
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {successMsg ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <Check size={15} /> {successMsg}
              </span>
            ) : (
              <span>
                Total <strong>{selectedPerms.size}</strong> dari <strong>{definitions.length}</strong> izin aktif
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={loading || saving || isOwner}
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
                  <span>Simpan Hak Akses</span>
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
          <p className="text-sm font-semibold">Memuat konfigurasi hak akses...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Owner Notice or Mode Banner */}
          {isOwner ? (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-2xl flex items-center gap-3 text-purple-800 dark:text-purple-300">
              <Sparkles size={20} className="shrink-0 text-purple-600" />
              <p className="text-xs leading-relaxed">
                Pengguna dengan peran <strong>Owner</strong> memiliki akses penuh tanpa batasan pada semua fitur sistem.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Mode Hak Akses:
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                    isCustom 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300' 
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300'
                  }`}>
                    {isCustom ? 'Kustom (Khusus)' : 'Bawaan Peran (Default)'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isCustom 
                    ? 'Pengguna ini memiliki izin yang disesuaikan secara manual.'
                    : `Mengikuti izin standar untuk peran "${userData?.role}".`}
                </p>
              </div>

              {isCustom && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-brand hover:border-brand/40 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <RotateCcw size={13} /> Reset ke Default Peran
                </button>
              )}
            </div>
          )}

          {/* Search & Bulk Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari izin akses..."
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

            {!isOwner && (
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
            )}
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Clean Permission Category List */}
          <PermissionCategoryList
            definitions={definitions}
            selectedPerms={selectedPerms}
            searchQuery={searchQuery}
            onTogglePerm={handleToggle}
            onToggleCategory={handleToggleCategory}
            disabled={isOwner}
          />
        </div>
      )}
    </Modal>
  );
}
