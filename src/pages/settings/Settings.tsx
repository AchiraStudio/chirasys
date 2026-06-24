import { useState, useEffect } from 'react';
import { Database, CheckCircle2, Loader2, Save, AlertTriangle, X, Settings as SettingsIcon, Globe, Link2, Copy, RefreshCw, Wifi, WifiOff, LogOut } from 'lucide-react';
import { optimizeDatabase, getSettings, setSetting, getSyncStatus, SyncStatus, createWorkspaceInvite, leaveWorkspace, sysadminGetWorkspaces, sysadminCreateWorkspace, sysadminCreateWorkspaceInvite, WorkspaceListInfo } from '../../lib/api';
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
  const [resetTarget, setResetTarget] = useState<'sales' | 'inventory' | 'all' | 'maintenance' | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'sync'>('system');

  // Sync / workspace state
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [inviteRole, setInviteRole] = useState<'admin' | 'worker'>('worker');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const s = await getSyncStatus();
      setSyncStatus(s);
    } catch { /* offline */ }
  };

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setConfigs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDB = async () => {
    if (!resetTarget) return;
    if (resetTarget !== 'maintenance' && confirmText !== 'DELETE') return;

    setLoading(true);
    setSuccessMsg('');
    try {
      if (resetTarget === 'maintenance') {
        const msg = await optimizeDatabase();
        setSuccessMsg(msg);
      } else {
        const { resetDbSpecific } = await import('../../lib/api');
        const msg = await resetDbSpecific(resetTarget);
        setSuccessMsg(msg);
      }
      setTimeout(() => setSuccessMsg(''), 6000);
      setResetTarget(null);
      setConfirmText('');
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

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    setInviteToken(null);
    try {
      const token = await createWorkspaceInvite(inviteRole);
      setInviteToken(token);
    } catch (e: any) {
      alert(`Failed to generate invite: ${e.message || e}`);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!confirm('Leave workspace? All local data stays, but cloud sync will stop.')) return;
    try {
      await leaveWorkspace();
      setSyncStatus(null);
      await loadSyncStatus();
    } catch (e) { console.error(e); }
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
        <button
          onClick={() => { setActiveTab('sync'); loadSyncStatus(); }}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'sync' 
              ? 'border-brand text-brand' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Globe size={14} /> Cloud & Sync
          {syncStatus?.pending_count ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{syncStatus.pending_count}</span>
          ) : null}
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
      ) : activeTab === 'sync' ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Workspace Status */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand/10 text-brand rounded-xl"><Globe size={20} /></div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">Workspace</h2>
                  <p className="text-xs text-slate-500">Cloud sync status</p>
                </div>
              </div>
              <button onClick={loadSyncStatus} className="p-2 text-slate-400 hover:text-brand rounded-lg hover:bg-brand/10 transition-colors">
                <RefreshCw size={16} />
              </button>
            </div>

            {syncStatus?.workspace_id ? (
              <>
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{syncStatus.workspace_name}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 font-mono">{syncStatus.workspace_code}</p>
                  </div>
                  <Wifi size={16} className="text-emerald-500" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
                    <p className={`text-2xl font-black mt-1 ${syncStatus.pending_count > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>{syncStatus.pending_count}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Failed</p>
                    <p className={`text-2xl font-black mt-1 ${syncStatus.failed_count > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{syncStatus.failed_count}</p>
                  </div>
                </div>
                {syncStatus.last_synced && (
                  <p className="text-xs text-slate-400">Last synced: {new Date(syncStatus.last_synced).toLocaleString()}</p>
                )}
                <button
                  onClick={handleLeaveWorkspace}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-rose-200 dark:border-rose-800/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm font-semibold transition-colors"
                >
                  <LogOut size={16} /> Leave Workspace
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <WifiOff size={32} className="text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-500">Not connected to a workspace.</p>
                <p className="text-xs text-slate-400">Log out and use the workspace button on the login screen to connect.</p>
              </div>
            )}
          </div>

          {/* Invite Generator (admin only) */}
          {isAdmin && syncStatus?.workspace_id && (
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-xl"><Link2 size={20} /></div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">Generate Invite</h2>
                  <p className="text-xs text-slate-500">Share a code so others can join your workspace</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Role for new member</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['admin', 'worker'] as const).map(r => (
                    <label key={r} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      inviteRole === r ? 'bg-brand/5 border-brand' : 'border-slate-200 dark:border-slate-700 hover:border-brand/50'
                    }`}>
                      <input type="radio" name="role" value={r} checked={inviteRole === r} onChange={() => setInviteRole(r)} className="text-brand" />
                      <span className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateInvite}
                disabled={inviteLoading}
                className="flex items-center justify-center gap-2 w-full bg-brand hover:bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-md shadow-brand/20 disabled:opacity-50"
              >
                {inviteLoading ? <Loader2 size={18} className="animate-spin" /> : <Link2 size={18} />}
                Generate Invite Token
              </button>

              {inviteToken && (
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Invite Token (valid 7 days)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-brand break-all">{inviteToken}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(inviteToken); }}
                      className="flex-shrink-0 p-2 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                      title="Copy"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sysadmin Only: Global Workspace Management */}
          {user?.username === 'admin' && (
            <div className="md:col-span-2">
              <SysadminWorkspaceManagement />
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
        {/* DB Reset Card — Admin Only */}
        {isAdmin && (
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-rose-200 dark:border-rose-900 shadow-sm p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl">
                <Database size={24} />
              </div>
              <div>
                <h2 className="font-bold text-rose-600 dark:text-rose-500">Danger Zone</h2>
                <p className="text-xs text-slate-500">Admin only — Data Wipe & Maintenance</p>
              </div>
            </div>
            
            <div className="space-y-4 mt-2 flex-1">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setResetTarget('sales')}
                  disabled={loading}
                  className="w-full py-2.5 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-sm transition-all"
                >
                  Reset Data Penjualan (Sales)
                </button>
                <p className="text-[10px] text-slate-500 text-center">Menghapus transaksi POS, pembayaran, dan jurnal.</p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setResetTarget('inventory')}
                  disabled={loading}
                  className="w-full py-2.5 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-sm transition-all"
                >
                  Reset Data Inventory (Stok)
                </button>
                <p className="text-[10px] text-slate-500 text-center">Menghapus mutasi stok dan data pembelian.</p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setResetTarget('all')}
                  disabled={loading}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-rose-600/20"
                >
                  Reset Semua Data (Factory Reset)
                </button>
                <p className="text-[10px] text-slate-500 text-center">Menghapus Master Data, Inventory, Sales, dan Antrian Sinkronisasi lokal.</p>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
              
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setResetTarget('maintenance')}
                  disabled={loading}
                  className="text-xs font-bold text-slate-500 hover:text-brand flex items-center gap-1"
                >
                  <Database size={12} /> Optimize DB (VACUUM)
                </button>
                {successMsg && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <CheckCircle2 size={12} /> {successMsg}
                  </span>
                )}
              </div>
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
      {resetTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  {resetTarget === 'maintenance' ? 'Optimize Database?' : 'Wipe Database?'}
                </h3>
              </div>
              <button onClick={() => setResetTarget(null)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              {resetTarget === 'maintenance' ? (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    This will run <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">VACUUM</code> and <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">ANALYZE</code> on the local database.
                  </p>
                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                    The application may freeze briefly. No data will be deleted.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 font-semibold text-rose-600 dark:text-rose-400">
                    ⚠ PERINGATAN: Operasi ini bersifat PERMANEN dan tidak dapat dibatalkan.
                    {resetTarget === 'sales' && ' Data Transaksi Penjualan dan Jurnal akan dihapus sepenuhnya.'}
                    {resetTarget === 'inventory' && ' Data Pembelian, Mutasi Stok, dan Ledger akan dihapus sepenuhnya.'}
                    {resetTarget === 'all' && ' SEMUA DATA (Master Data, Stok, Penjualan) akan dihapus sepenuhnya dan sistem kembali ke pengaturan awal (kosong).'}
                  </p>
                  <p className="text-xs text-slate-500 mb-2">
                    Ketik <strong>DELETE</strong> di bawah ini untuk mengonfirmasi.
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-2.5 text-sm font-bold text-rose-600 focus:ring-2 focus:ring-rose-500 outline-none uppercase"
                  />
                </>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setResetTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleResetDB}
                disabled={resetTarget !== 'maintenance' && confirmText !== 'DELETE'}
                className="flex-[2] py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Memproses...' : 'Ya, Eksekusi'}
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

function SysadminWorkspaceManagement() {
  const [workspaces, setWorkspaces] = useState<WorkspaceListInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [creating, setCreating] = useState(false);

  const [inviteWsId, setInviteWsId] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<'admin' | 'worker'>('admin');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const data = await sysadminGetWorkspaces();
      setWorkspaces(data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await sysadminCreateWorkspace(newName, newCode);
      setShowCreate(false);
      setNewName('');
      setNewCode('');
      await loadWorkspaces();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateInvite = async (wsId: string) => {
    setInviteLoading(true);
    setInviteToken(null);
    try {
      const token = await sysadminCreateWorkspaceInvite(wsId, inviteRole);
      setInviteToken(token);
    } catch (e: any) {
      alert(`Failed to generate invite: ${e.message || e}`);
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-indigo-200 dark:border-indigo-900 shadow-sm p-6 flex flex-col gap-5 mt-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-xl">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">System Admin Workspaces</h2>
            <p className="text-xs text-slate-500">Manage all client workspaces</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold transition-all"
        >
          New Workspace
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Workspace Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Apotek Maju Pusat"
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-sm text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Unique Code</label>
              <input
                type="text"
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                placeholder="e.g. MAJU-01"
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 uppercase font-mono text-sm text-slate-900 dark:text-white"
                maxLength={32}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
            <button type="submit" disabled={creating} className="px-4 py-2 text-sm font-semibold bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg flex items-center gap-2">
              {creating && <Loader2 size={14} className="animate-spin" />}
              Create
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
      ) : workspaces.length === 0 ? (
        <div className="text-center p-8 text-slate-500 text-sm">No workspaces found.</div>
      ) : (
        <div className="space-y-3">
          {workspaces.map(ws => (
            <div key={ws.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between group hover:border-indigo-300 transition-colors">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{ws.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <code className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">{ws.code}</code>
                </div>
              </div>
              
              {inviteWsId === ws.id ? (
                <div className="flex items-center gap-2">
                  <select 
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as any)}
                    className="text-xs px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="worker">Worker</option>
                  </select>
                  <button 
                    onClick={() => handleGenerateInvite(ws.id)}
                    disabled={inviteLoading}
                    className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-md flex items-center gap-1"
                  >
                    {inviteLoading ? <Loader2 size={12} className="animate-spin" /> : 'Generate Invite'}
                  </button>
                  <button onClick={() => {setInviteWsId(null); setInviteToken(null);}} className="p-1.5 text-slate-400 hover:text-rose-500"><X size={14} /></button>
                </div>
              ) : (
                <button
                  onClick={() => { setInviteWsId(ws.id); setInviteToken(null); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                >
                  <Link2 size={14} /> Add User
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {inviteToken && (
        <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invite Token Generated</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-brand break-all p-2 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-700 select-all">{inviteToken}</code>
            <button
              onClick={() => navigator.clipboard.writeText(inviteToken)}
              className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 hover:bg-indigo-200 rounded-lg"
              title="Copy"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

