import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, CheckCircle2, Loader2, Save } from 'lucide-react';
import { optimizeDatabase, getSettings, setSetting } from '../../lib/api';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [configs, setConfigs] = useState<{key: string, value: string, desc?: string}[]>([]);
  const [saving, setSaving] = useState(false);

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

  const handleOptimize = async () => {
    setLoading(true);
    setSuccessMsg('');
    try {
      const msg = await optimizeDatabase();
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (e) {
      alert(`Optimization failed: ${e}`);
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Configure application preferences and maintenance.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* DB Optimization Card */}
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
              <Database size={24} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Database Maintenance</h2>
              <p className="text-xs text-slate-500">Run VACUUM to reclaim disk space</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Optimizing the database cleans up deleted rows, reclaims fragmented disk space, and regenerates query plans to keep the system running fast.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleOptimize}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <SettingsIcon size={16} />}
              {loading ? 'Optimizing...' : 'Run Optimization'}
            </button>
            {successMsg && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <CheckCircle2 size={14} /> {successMsg}
              </span>
            )}
          </div>
        </div>

        {/* Cloud Config Card */}
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
              <Save size={24} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">General Configurations</h2>
              <p className="text-xs text-slate-500">Global system keys</p>
            </div>
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
    </div>
  );
}

function SettingRow({ config, onSave }: { config: any, onSave: (k: string, v: string) => void }) {
  const [val, setVal] = useState(config.value);

  useEffect(() => {
    setVal(config.value);
  }, [config.value]);

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
        {config.key.replace(/_/g, ' ')}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            if (val !== config.value) onSave(config.key, val);
          }}
          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      {config.desc && <p className="text-[10px] text-slate-500 mt-1">{config.desc}</p>}
    </div>
  );
}
