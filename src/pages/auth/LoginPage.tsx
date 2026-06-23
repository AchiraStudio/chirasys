import { useState, useEffect } from 'react';
import { Loader2, Lock, User, Globe, Link2, ArrowLeft, CheckCircle2, Wifi, WifiOff, ShieldCheck } from 'lucide-react';
import { loginUser, joinWorkspace, sysadminLogin, WorkspaceInfo, getSyncStatus } from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';
import { invoke } from '@tauri-apps/api/core';
import SysadminDashboard from './SysadminDashboard';


type Screen = 'login' | 'workspace_choice' | 'join_workspace' | 'sysadmin_login' | 'sysadmin_dashboard';

export default function LoginPage() {
  const [screen, setScreen] = useState<Screen>('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();

  // Sysadmin auth state
  const [sysadminUser, setSysadminUser] = useState('admin');
  const [sysadminPass, setSysadminPass] = useState('');

  // Workspace state
  const [workspaceInput, setWorkspaceInput] = useState('');
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceInfo | null>(null);
  const [wsLoading, setWsLoading] = useState(false);
  const [wsError, setWsError] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  // On mount: check if we already have a workspace configured
  useEffect(() => {
    checkExistingWorkspace();
  }, []);

  const checkExistingWorkspace = async () => {
    try {
      const status = await getSyncStatus();
      if (status.workspace_id && status.workspace_id.length > 0) {
        setCurrentWorkspace({
          id: status.workspace_id,
          name: status.workspace_name,
          code: status.workspace_code,
        });
        setIsOnline(true);
      }
    } catch {
      // No workspace / offline
    }
  };

  // ─── Login ───────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await loginUser(username, password);
      setAuth(res.token, res.user);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── Join Workspace ───────────────────────────────────────────────────────
  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceInput.trim()) return;
    setWsLoading(true);
    setWsError('');
    try {
      const ws = await joinWorkspace(workspaceInput.trim());
      setCurrentWorkspace(ws);
      setScreen('login');
    } catch (err: any) {
      setWsError(err.message || String(err));
    } finally {
      setWsLoading(false);
    }
  };

  // ─── Sysadmin Login ───────────────────────────────────────────────────────
  const handleSysadminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Hash password using Web Crypto API to avoid sending plaintext to Rust
      const encoder = new TextEncoder();
      const data = encoder.encode(sysadminPass);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      const ok = await sysadminLogin(sysadminUser, hashHex);
      if (ok) {
        setScreen('sysadmin_dashboard');
      } else {
        setError('Invalid System Admin credentials.');
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!confirm('Are you sure you want to leave this workspace? You will be in offline/local mode.')) return;
    try {
      await invoke('leave_workspace');
      setCurrentWorkspace(null);
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Background blobs ─────────────────────────────────────────────────────
  const Blobs = () => (
    <>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[20%] h-[20%] bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
    </>
  );

  // ─── Workspace Choice Screen ──────────────────────────────────────────────
  if (screen === 'workspace_choice') {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
        <Blobs />
        <div className="w-full max-w-md relative z-10 space-y-4">
          <button onClick={() => setScreen('login')} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand transition-colors">
            <ArrowLeft size={16} /> Back to Login
          </button>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-brand/10 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden p-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Connect to Cloud Workspace</h2>
            <p className="text-sm text-slate-500 mb-8">Sync data across all your installations in one workspace.</p>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setScreen('join_workspace')}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-brand dark:hover:border-brand hover:bg-brand/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                  <Link2 size={22} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">Join Workspace</p>
                  <p className="text-xs text-slate-500 mt-1">Enter a code or invite link from your Admin</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Join Workspace Screen ─────────────────────────────────────────────────
  if (screen === 'join_workspace') {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
        <Blobs />
        <div className="w-full max-w-md relative z-10 space-y-4">
          <button onClick={() => setScreen('workspace_choice')} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-brand/10 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 bg-brand/5">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand mb-4">
                <Link2 size={22} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Join a Workspace</h2>
              <p className="text-sm text-slate-500 mt-1">Enter your workspace code (e.g. <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-brand">APOTEK-01</code>) or paste an invite link token.</p>
            </div>
            <form onSubmit={handleJoinWorkspace} className="p-8 flex flex-col gap-4">
              {wsError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400">
                  {wsError}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 block mb-1.5">Workspace Code or Invite Token</label>
                <input
                  type="text"
                  autoFocus
                  value={workspaceInput}
                  onChange={e => setWorkspaceInput(e.target.value)}
                  placeholder="e.g. APOTEK-MAJU-01 or invite token..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={wsLoading || !workspaceInput.trim()}
                className="w-full bg-brand hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand/30 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {wsLoading ? <Loader2 size={20} className="animate-spin" /> : <Link2 size={18} />}
                Join Workspace
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── Sysadmin Screens ───────────────────────────────────────────────────────
  if (screen === 'sysadmin_dashboard') {
    return <SysadminDashboard onLogout={() => { setSysadminPass(''); setScreen('login'); }} />;
  }

  if (screen === 'sysadmin_login') {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
        <Blobs />
        <div className="w-full max-w-md relative z-10 space-y-4">
          <button onClick={() => setScreen('login')} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand transition-colors">
            <ArrowLeft size={16} /> Back to POS Login
          </button>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-indigo-500/10 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 bg-indigo-500/5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-4">
                <ShieldCheck size={22} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Admin</h2>
              <p className="text-sm text-slate-500 mt-1">Manage all cloud workspaces.</p>
            </div>
            <form onSubmit={handleSysadminLogin} className="p-8 flex flex-col gap-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400">
                  {error}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 block mb-1.5">Username</label>
                <input
                  type="text"
                  value={sysadminUser}
                  onChange={e => setSysadminUser(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 block mb-1.5">Password</label>
                <input
                  type="password"
                  autoFocus
                  value={sysadminPass}
                  onChange={e => setSysadminPass(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !sysadminUser || !sysadminPass}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Lock size={18} />}
                Admin Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Login Screen ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      <Blobs />

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-brand/10 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative z-10">
        
        {/* Header */}
        <div className="p-8 pb-6 flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 relative">
          <button
            onClick={() => setScreen('sysadmin_login')}
            className="absolute top-6 right-6 p-2 text-slate-300 hover:text-indigo-500 transition-colors"
            title="System Admin"
          >
            <ShieldCheck size={18} />
          </button>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-indigo-600 p-0.5 shadow-lg shadow-brand/30 mb-6">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center">
              <img src="/cs.ico" alt="ChiraSys" className="w-10 h-10 object-contain" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center">Masuk ke ChiraSys</h1>
          <p className="text-sm text-slate-500 mt-2 text-center">Modern Inventory & Cashier System</p>
        </div>

        {/* Workspace Status Banner */}
        <div className="px-8 pt-5">
          {currentWorkspace ? (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
              <div className="flex-shrink-0">
                <CheckCircle2 size={20} className="text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Workspace Terhubung</p>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300 truncate">{currentWorkspace.name}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 font-mono">{currentWorkspace.code}</p>
              </div>
              <button
                onClick={handleLeaveWorkspace}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors whitespace-nowrap"
              >
                Leave
              </button>
            </div>
          ) : (
            <button
              onClick={() => setScreen('workspace_choice')}
              className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 hover:border-brand dark:hover:border-brand hover:bg-brand/5 rounded-xl transition-all group"
            >
              <div className="flex-shrink-0 p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm group-hover:bg-brand/10 transition-colors">
                {isOnline ? <Globe size={18} className="text-slate-400 group-hover:text-brand transition-colors" /> : <WifiOff size={18} className="text-slate-400" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-brand transition-colors">
                  Connect to Cloud Workspace
                </p>
                <p className="text-xs text-slate-400">Sync data across all your devices</p>
              </div>
              <Wifi size={14} className="text-slate-300 group-hover:text-brand transition-colors" />
            </button>
          )}
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-8 flex flex-col gap-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm text-center font-medium dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Username</label>
            <div className="relative flex items-center">
              <User size={18} className="absolute left-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full mt-2 bg-brand hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Masuk'}
          </button>

          <p className="text-xs text-center text-slate-500 mt-1">
            Lupa password? Silakan hubungi admin sistem Anda.
          </p>
        </form>
      </div>
    </div>
  );
}
