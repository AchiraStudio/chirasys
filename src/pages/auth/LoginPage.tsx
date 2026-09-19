<<<<<<< Updated upstream
import { useState } from 'react';
import { Loader2, Lock, User, ShieldCheck, ArrowLeft } from 'lucide-react';
import { loginUser, sysadminLogin } from '../../lib/api';
=======
import { useState, useEffect } from 'react';
import { Loader2, Lock, User, LogIn, Eye, EyeOff, Store, Sun, Moon, Radio } from 'lucide-react';
import { loginUser, setSetting } from '../../lib/api';
>>>>>>> Stashed changes
import { useAuthStore } from '../../store/AuthStore';
import SysadminDashboard from './SysadminDashboard';
import { supabase } from '../../lib/supabase';
<<<<<<< Updated upstream
=======
import KivoLogo from '../../components/common/KivoLogo';
import { useTheme } from '../../components/ThemeProvider';
import { isTauri, getHostUrl } from '../../lib/runtime';
>>>>>>> Stashed changes

type Screen = 'login' | 'sysadmin_login' | 'sysadmin_dashboard';

export default function LoginPage() {
  const [screen, setScreen] = useState<Screen>('login');

  // Step 1 - credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingHost, setCheckingHost] = useState(!isTauri());
  const { setAuth } = useAuthStore();

<<<<<<< Updated upstream


  // Sysadmin auth state
  const [sysadminUser, setSysadminUser] = useState('admin');
  const [sysadminPass, setSysadminPass] = useState('');

  // ─── Step 1: Credential Login ─────────────────────────────────────────────
=======
  // If running on remote device (phone/tablet browser), try instant host auto-login
  useEffect(() => {
    if (isTauri()) return;

    let isMounted = true;
    const autoLoginFromHost = async () => {
      setCheckingHost(true);
      try {
        const hostUrl = getHostUrl();
        let res = await fetch(`${hostUrl}/api/lan/active_session`, {
          signal: AbortSignal.timeout(2500),
        }).catch(() => null);

        if (!res || !res.ok) {
          const directFallback = `http://${window.location.hostname || 'localhost'}:3699`;
          res = await fetch(`${directFallback}/api/lan/active_session`, {
            signal: AbortSignal.timeout(2500),
          }).catch(() => null);
        }

        if (res && res.ok) {
          const data = await res.json();
          if (data?.success && data?.token && data?.user && isMounted) {
            setAuth(data.token, data.user);
            return;
          }
        }
      } catch (e) {
        console.log('[LoginPage] Host active session check:', e);
      } finally {
        if (isMounted) setCheckingHost(false);
      }
    };

    autoLoginFromHost();
    return () => {
      isMounted = false;
    };
  }, [setAuth]);

  // ─── Credential Login ─────────────────────────────────────────────
>>>>>>> Stashed changes
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

      if (isTauri()) {
        setSetting('active_host_token', res.token).catch(() => {});
      }
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
      <div className="min-h-full w-full bg-slate-50 dark:bg-[#0B0F19] flex flex-col items-center justify-center p-4 py-8 relative overflow-y-auto">
        <Blobs />
        <div className="w-full max-w-md relative z-10 space-y-4 my-auto">
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
    <div className="min-h-full w-full bg-slate-50 dark:bg-[#0B0F19] flex flex-col items-center justify-center p-4 py-8 relative overflow-y-auto">
      <Blobs />

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-brand/10 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative z-10 my-auto animate-in fade-in slide-in-from-bottom-4 duration-300">

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

<<<<<<< Updated upstream
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
=======
        {checkingHost ? (
          <div className="p-10 flex flex-col items-center justify-center gap-3 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
              <Radio size={24} className="animate-pulse" />
>>>>>>> Stashed changes
            </div>
            <div className="text-sm font-bold text-heading mt-2">Menghubungkan ke Kivo Host...</div>
            <p className="text-xs text-dim max-w-xs">
              Menyinkronkan sesi aktif komputer kasir utama otomatis tanpa perlu login.
            </p>
            <Loader2 className="animate-spin text-primary mt-2" size={20} />
          </div>
<<<<<<< Updated upstream

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
=======
        ) : (
          /* Login Form */
          <form onSubmit={handleLogin} className="p-7 flex flex-col gap-4">
            {error && (
              <div className="p-3 rounded-xl bg-danger-soft border border-danger/30 text-danger text-xs font-medium flex items-center gap-2 animate-fade-in">
                <span className="shrink-0">•</span>
                <span>{error}</span>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1">
              <label className={LABEL_CLASS}>Username</label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3.5 text-dim pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda..."
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className={LABEL_CLASS}>Password</label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-dim pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-dim hover:text-heading cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm mt-2 active:scale-[0.99] cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memproses Masuk...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Masuk Sekarang</span>
                </>
              )}
            </button>

            {/* Divider "atau" & Create Store Button */}
            {onOpenSetupWizard && isTauri() && (
              <>
                <div className="relative my-1 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-line" />
                  </div>
                  <span className="relative bg-card px-3 text-[11px] font-semibold text-dim uppercase tracking-wider">
                    atau
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onOpenSetupWizard}
                  className="w-full h-11 border border-line bg-muted/40 hover:bg-muted hover:border-line-strong text-heading font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 text-xs sm:text-sm active:scale-[0.99] group cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-primary-soft text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Store size={14} />
                  </div>
                  <span>Buat Toko Baru</span>
                </button>
              </>
            )}

            <p className="text-[11px] text-center text-dim mt-1">
              Lupa password? Silakan hubungi admin sistem Anda.
            </p>
          </form>
        )}
      </div>

      {/* Footer Branding */}
      <footer className="relative z-10 mt-6 text-center text-[10px] text-dim">
        <span>Kivo Platform v1.4 &copy; {new Date().getFullYear()} — Multi-Branch Business &amp; POS Solution</span>
      </footer>
>>>>>>> Stashed changes
    </div>
  );
}
