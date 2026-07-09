// Force HMR reload
import { useState, useEffect } from 'react';
import { Loader2, Plus, Link2, Copy, ShieldCheck, ArrowLeft, Building2, KeyRound, X } from 'lucide-react';
import { sysadminGetWorkspaces, sysadminCreateWorkspace, sysadminCreateWorkspaceInvite, sysadminUpdateWorkspacePassword, WorkspaceListInfo } from '../../lib/api';

export default function SysadminDashboard({ onLogout }: { onLogout: () => void }) {
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
  const [editingPasswordWs, setEditingPasswordWs] = useState<WorkspaceListInfo | null>(null);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await sysadminGetWorkspaces();
      setWorkspaces(data);
    } catch (e: any) {
      const msg = e.message || String(e);
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('network') || lowerMsg.includes('request') || lowerMsg.includes('url') || lowerMsg.includes('connect')) {
        setError('Tidak dapat terhubung ke server cloud. Periksa koneksi internet Anda dan coba lagi.');
      } else {
        setError(msg);
      }
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
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0B0F19] p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <ShieldCheck className="text-indigo-500" size={28} />
              System Admin Portal
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage workspaces across all clients.</p>
          </div>
          <button 
            onClick={onLogout}
            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-rose-500 transition-colors"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400 flex items-center justify-between gap-4">
            <span className="text-sm">{error}</span>
            <button
              onClick={loadWorkspaces}
              className="shrink-0 px-3 py-1.5 bg-rose-100 dark:bg-rose-800/30 hover:bg-rose-200 dark:hover:bg-rose-700/30 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Dashboard Content */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl shadow-brand/5 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Building2 size={20} className="text-slate-400" />
              Active Workspaces
            </h2>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
            >
              <Plus size={16} /> New Workspace
            </button>
          </div>

          {/* Create Form */}
          {showCreate && (
            <form onSubmit={handleCreate} className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4">Create New Workspace</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Workspace Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Apotek Maju Pusat"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
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
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 uppercase font-mono"
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

          {/* List */}
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>
          ) : workspaces.length === 0 ? (
            <div className="text-center p-12 text-slate-500">No workspaces found. Create one to get started.</div>
          ) : (
            <div className="space-y-4">
              {workspaces.map(ws => (
                <div key={ws.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between group hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{ws.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{ws.code}</code>
                      <span className="text-xs text-slate-400">Created: {new Date(ws.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingPasswordWs(ws)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                      title="Set/Edit Password"
                    >
                      <KeyRound size={15} />
                    </button>
                    {inviteWsId === ws.id ? (
                      <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                        <select 
                          value={inviteRole}
                          onChange={e => setInviteRole(e.target.value as any)}
                          className="text-xs px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                        >
                          <option value="admin">Admin</option>
                          <option value="worker">Worker</option>
                        </select>
                        <button 
                          onClick={() => handleGenerateInvite(ws.id)}
                          disabled={inviteLoading}
                          className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-md flex items-center gap-1 transition-colors"
                        >
                          {inviteLoading ? <Loader2 size={12} className="animate-spin" /> : 'Generate'}
                        </button>
                        <button onClick={() => {setInviteWsId(null); setInviteToken(null);}} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"><ArrowLeft size={14} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setInviteWsId(ws.id); setInviteToken(null); }}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                      >
                        <Link2 size={14} /> Add User
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invite Token Modal/Popup */}
          {inviteToken && (
            <div className="fixed bottom-8 right-8 max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Link2 className="text-indigo-500" size={18} /> Invite Generated!
              </h3>
              <p className="text-xs text-slate-500 mb-4">Share this token. It acts as a one-time password to join the workspace.</p>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 flex-1 break-all select-all">{inviteToken}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(inviteToken)}
                  className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 hover:bg-indigo-200 rounded-md transition-colors"
                >
                  <Copy size={14} />
                </button>
              </div>
              <button onClick={() => setInviteToken(null)} className="w-full mt-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Close</button>
            </div>
          )}
        </div>
      </div>
      {editingPasswordWs && (
        <EditWorkspacePasswordModal ws={editingPasswordWs} onClose={() => setEditingPasswordWs(null)} />
      )}
    </div>
  );
}

function EditWorkspacePasswordModal({ ws, onClose }: { ws: WorkspaceListInfo; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await sysadminUpdateWorkspacePassword(ws.id, password);
      setSuccess(true);
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0B0F19] rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Workspace Password</h2>
            <p className="text-sm text-slate-500 mt-0.5">Workspace: <strong>{ws.name}</strong></p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs px-4 py-3 rounded-xl">
              Password berhasil disimpan!
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Password Baru</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Kosongkan untuk menghapus password"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <p className="text-[10px] text-slate-400 mt-1.5">
              Kosongkan dan simpan jika ingin workspace ini dapat diakses tanpa password.
            </p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Batal
            </button>
            <button type="submit" disabled={loading || success} className="flex-[2] py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Menyimpan...' : 'Simpan Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
