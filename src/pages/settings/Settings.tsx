import { useState, useEffect } from 'react';
import { Database, CheckCircle2, Loader2, Save, AlertTriangle, X, Settings as SettingsIcon } from 'lucide-react';
import { optimizeDatabase, getSettings, setSetting } from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';
import UserManagement from './UserManagement';

// Keys that should render as a <select> instead of a text input
const SELECT_OPTIONS: Record<string, { label: string; value: string }[]> = {
  hpp_method: [
    { label: 'Average (AVG)', value: 'avg' },
    { label: 'First In First Out (FIFO)', value: 'fifo' },
    { label: 'Last In First Out (LIFO)', value: 'lifo' },
  ],
  hpp_method_default: [
    { label: 'Average (AVG)', value: 'avg' },
    { label: 'First In First Out (FIFO)', value: 'fifo' },
    { label: 'Last In First Out (LIFO)', value: 'lifo' },
  ],
  tax_mode: [
    { label: 'Tidak Ada Pajak', value: 'none' },
    { label: 'Include (harga sudah termasuk pajak)', value: 'include' },
    { label: 'Exclude (pajak ditambahkan di atas harga)', value: 'exclude' },
  ],
  transaction_reset: [
    { label: 'Harian (reset setiap hari)', value: 'daily' },
    { label: 'Bulanan (reset setiap bulan)', value: 'monthly' },
    { label: 'Tidak pernah reset', value: 'never' },
  ],
  sync_mode: [
    { label: 'Local Only (offline)', value: 'local' },
    { label: 'Cloud Sync (online)', value: 'cloud' },
  ],
  language: [
    { label: 'Indonesia (ID)', value: 'id' },
    { label: 'English (EN)', value: 'en' },
  ],
};

export default function Settings() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [configs, setConfigs] = useState<{key: string, value: string, description?: string}[]>([]);
  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'system' | 'users'>('system');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setConfigs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDB = async () => {
    setLoading(true);
    setSuccessMsg('');
    setShowResetModal(false);
    try {
      const msg = await optimizeDatabase();
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (e) {
      alert(`Reset failed: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (key: string, value: string) => {
    setSaving(true);
    try {
      await setSetting(key, value);
      await loadSettings();
    } catch (e) {
      alert(`Save failed: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6 flex flex-col gap-6 animate-in fade-in duration-300 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="text-brand" /> Pengaturan Sistem
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Konfigurasi preferensi aplikasi dan manajemen pengguna.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'system' 
              ? 'border-brand text-brand' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Konfigurasi Umum
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'users' 
                ? 'border-brand text-brand' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Manajemen Pengguna
          </button>
        )}
      </div>

      {activeTab === 'users' ? (
        <UserManagement />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
        {/* DB Reset Card — Admin Only */}
        {isAdmin && (
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl">
                <Database size={24} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Database Maintenance</h2>
                <p className="text-xs text-slate-500">Admin only — runs VACUUM + ANALYZE</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Resets the database engine: cleans deleted rows, reclaims fragmented disk space, and regenerates query plans.
              <span className="block mt-1 font-semibold text-rose-600 dark:text-rose-400 text-xs">⚠ This operation cannot be undone.</span>
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowResetModal(true)}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                {loading ? 'Resetting...' : 'Reset DB'}
              </button>
              {successMsg && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={14} /> {successMsg}
                </span>
              )}
            </div>
          </div>
        )}

        {/* General Config Card */}
        <div className={`bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 ${isAdmin ? '' : 'md:col-span-2'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
              <Save size={24} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">General Configurations</h2>
              <p className="text-xs text-slate-500">Global system keys</p>
            </div>
            {saving && <Loader2 size={14} className="animate-spin text-slate-400 ml-auto" />}
          </div>
          
          <div className="space-y-4">
            {configs.map((c) => (
              <SettingRow key={c.key} config={c} onSave={handleSaveConfig} />
            ))}
            {configs.length === 0 && (
              <p className="text-sm text-slate-500 italic">No configurations found.</p>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Reset DB Warning Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Reset Database?</h3>
              </div>
              <button onClick={() => setShowResetModal(false)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                This will run <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">VACUUM</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">ANALYZE</code>, and clean old sync records on the local database.
              </p>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                The application may freeze briefly while this runs. No data will be deleted.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDB}
                className="flex-[2] py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Yes, Reset Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({ config, onSave }: { config: { key: string; value: string; description?: string }, onSave: (k: string, v: string) => void }) {
  const [val, setVal] = useState(config.value);
  const options = SELECT_OPTIONS[config.key];

  useEffect(() => {
    setVal(config.value);
  }, [config.value]);

  const [applyingHpp, setApplyingHpp] = useState(false);

  const handleChange = (newVal: string) => {
    setVal(newVal);
    if (options) {
      // Select inputs save immediately on change
      onSave(config.key, newVal);
    }
  };

  const handleApplyHpp = async () => {
    if (!confirm('This will retroactively recalculate stock consumption for all items using the new HPP method. Continue?')) return;
    setApplyingHpp(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const msg = await invoke('apply_hpp_retroactive', { method: val });
      alert(msg);
    } catch (e) {
      alert(`Failed to apply HPP: ${e}`);
    } finally {
      setApplyingHpp(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
        {config.key.replace(/_/g, ' ')}
      </label>
      <div className="flex gap-2 items-center">
        {options ? (
          <select
            value={val}
            onChange={(e) => handleChange(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand cursor-pointer"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => {
              if (val !== config.value) onSave(config.key, val);
            }}
            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
          />
        )}
        
        {(config.key === 'hpp_method' || config.key === 'hpp_method_default') && (
          <button 
            onClick={handleApplyHpp}
            disabled={applyingHpp}
            className="px-4 py-2 bg-brand text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {applyingHpp ? 'Applying...' : 'Apply HPP'}
          </button>
        )}
      </div>
      {config.description && <p className="text-[10px] text-slate-500 mt-1">{config.description}</p>}
    </div>
  );
}
