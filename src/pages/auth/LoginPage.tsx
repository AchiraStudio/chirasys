import { useState } from 'react';
import { Loader2, Lock, User, ShieldCheck, ArrowLeft } from 'lucide-react';
import { loginUser, sysadminLogin } from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';
import SysadminDashboard from './SysadminDashboard';
import { supabase } from '../../lib/supabase';

type Screen = 'login' | 'sysadmin_login' | 'sysadmin_dashboard';

export default function LoginPage() {
  const [screen, setScreen] = useState<Screen>('login');

  // Step 1 - credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();



  // Sysadmin auth state
  const [sysadminUser, setSysadminUser] = useState('admin');
  const [sysadminPass, setSysadminPass] = useState('');

  // ─── Step 1: Credential Login ─────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await loginUser(username, password);
      if (res.supabase_token) {
        await supabase.auth.setSession({ access_token: res.supabase_token, refresh_token: '' });
      }
      setAuth(res.token, res.user);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── Sysadmin Login ───────────────────────────────────────────────────────
  const handleSysadminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(sysadminPass);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const res = await sysadminLogin(sysadminUser, hashHex);
      if (res.success) {
        if (res.supabase_token) {
          await supabase.auth.setSession({ access_token: res.supabase_token, refresh_token: '' });
        }
        setScreen('sysadmin_dashboard');
      } else {
        setError('Kredensial System Admin tidak valid.');
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
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

  // ─── Sysadmin Screens ──────────────────────────────────────────────────────
  if (screen === 'sysadmin_dashboard') {
    return <SysadminDashboard onLogout={() => { setSysadminPass(''); setScreen('login'); }} />;
  }

  // ─── Sysadmin Login Screen ────────────────────────────────────────────────
  if (screen === 'sysadmin_login') {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
        <Blobs />
        <div className="w-full max-w-md relative z-10 space-y-4">
          <button onClick={() => { setError(''); setScreen('login'); }} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand transition-colors">
            <ArrowLeft size={16} /> Kembali ke Login
          </button>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-indigo-500/10 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 bg-indigo-500/5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-4">
                <ShieldCheck size={22} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Admin</h2>
              <p className="text-sm text-slate-500 mt-1">Kelola semua cloud workspace.</p>
            </div>
            <form onSubmit={handleSysadminLogin} className="p-8 flex flex-col gap-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400">
                  {error}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 block mb-1.5">Username</label>
                <div className="relative flex items-center">
                  <User size={18} className="absolute left-4 text-slate-400" />
                  <input
                    type="text"
                    value={sysadminUser}
                    onChange={e => setSysadminUser(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 block mb-1.5">Password</label>
                <div className="relative flex items-center">
                  <Lock size={18} className="absolute left-4 text-slate-400" />
                  <input
                    type="password"
                    autoFocus
                    value={sysadminPass}
                    onChange={e => setSysadminPass(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
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

  // ─── Main Login Screen (Step 1) ───────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      <Blobs />

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-brand/10 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="p-8 pb-6 flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-800/50 bg-gradient-to-br from-slate-50/50 to-brand/5 dark:from-slate-900/50 dark:to-brand/5 relative">
          <button
            onClick={() => { setError(''); setScreen('sysadmin_login'); }}
            className="absolute top-6 right-6 p-2 text-slate-300 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
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

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-8 flex flex-col gap-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm text-center font-medium dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400 animate-in fade-in duration-200">
              {error}
            </div>
          )}

          {/* Username */}
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

          {/* Password */}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full mt-1 bg-brand hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Masuk →'}
          </button>

          <p className="text-xs text-center text-slate-500 -mt-1">
            Lupa password? Silakan hubungi admin sistem Anda.
          </p>
        </form>
      </div>
    </div>
  );
}
