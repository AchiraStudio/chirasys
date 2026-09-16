import { useState } from 'react';
import { Loader2, Lock, User, ShieldCheck, ArrowLeft, LogIn, Eye, EyeOff, Store, Sun, Moon } from 'lucide-react';
import { loginUser, sysadminLogin } from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';
import SysadminDashboard from './SysadminDashboard';
import { supabase } from '../../lib/supabase';
import KivoLogo from '../../components/common/KivoLogo';
import { useTheme } from '../../components/ThemeProvider';

type Screen = 'login' | 'sysadmin_login' | 'sysadmin_dashboard';

interface LoginPageProps {
  onOpenSetupWizard?: () => void;
}

const INPUT_CLASS =
  'w-full pl-10 pr-10 py-2.5 bg-input border border-line rounded-xl text-heading text-xs sm:text-sm placeholder:text-dim focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all';

const LABEL_CLASS = 'text-[11px] font-bold text-heading uppercase tracking-wider block mb-1.5';

export default function LoginPage({ onOpenSetupWizard }: LoginPageProps) {
  const [screen, setScreen] = useState<Screen>('login');

  // Step 1 - credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const { theme, setTheme } = useTheme();

  // Sysadmin auth state
  const [sysadminUser, setSysadminUser] = useState('admin');
  const [sysadminPass, setSysadminPass] = useState('');
  const [showSysadminPass, setShowSysadminPass] = useState(false);

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

  // ─── Sysadmin Screens ──────────────────────────────────────────────────────
  if (screen === 'sysadmin_dashboard') {
    return <SysadminDashboard onLogout={() => { setSysadminPass(''); setScreen('login'); }} />;
  }

  // ─── Sysadmin Login Screen ────────────────────────────────────────────────
  if (screen === 'sysadmin_login') {
    return (
      <div className="min-h-full w-full bg-background flex flex-col items-center justify-center p-4 py-8 relative overflow-x-hidden overflow-y-auto select-none">
        {/* Ambient Background Glow */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 rounded-full blur-[110px] -z-0" />

        <div className="w-full max-w-[420px] relative z-10 space-y-3 my-auto animate-slide-in-up">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => { setError(''); setScreen('login'); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-dim hover:text-heading transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Login</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 text-dim hover:text-heading hover:bg-card border border-transparent hover:border-line transition-all rounded-lg"
              title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>

          <div className="bg-card rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/40 border border-line overflow-hidden">
            <div className="p-7 pb-5 border-b border-line bg-muted/40">
              <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary mb-3">
                <ShieldCheck size={20} />
              </div>
              <h2 className="text-lg font-black text-heading tracking-tight">System Admin</h2>
              <p className="text-xs text-dim mt-0.5">Kelola seluruh workspace cloud dan konfigurasi pusat.</p>
            </div>

            <form onSubmit={handleSysadminLogin} className="p-7 flex flex-col gap-4">
              {error && (
                <div className="p-3 rounded-xl bg-danger-soft border border-danger/30 text-danger text-xs font-medium flex items-center gap-2 animate-fade-in">
                  <span className="shrink-0">•</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className={LABEL_CLASS}>Username</label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3.5 text-dim pointer-events-none" />
                  <input
                    type="text"
                    value={sysadminUser}
                    onChange={e => setSysadminUser(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className={LABEL_CLASS}>Password</label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3.5 text-dim pointer-events-none" />
                  <input
                    type={showSysadminPass ? 'text' : 'password'}
                    autoFocus
                    value={sysadminPass}
                    onChange={e => setSysadminPass(e.target.value)}
                    className={INPUT_CLASS}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSysadminPass(!showSysadminPass)}
                    className="absolute right-3 text-dim hover:text-heading p-1 rounded-md transition-colors"
                    title={showSysadminPass ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showSysadminPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !sysadminUser || !sysadminPass}
                className="w-full mt-1.5 bg-primary hover:bg-primary-hover text-white font-bold h-11 rounded-xl shadow-md shadow-primary/25 transition-all active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
                <span>Admin Login</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Login Screen (Step 1) ───────────────────────────────────────────
  return (
    <div className="min-h-full w-full bg-background flex flex-col items-center justify-center p-4 py-8 relative overflow-x-hidden overflow-y-auto select-none">
      {/* Ambient Background Glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-primary/10 rounded-full blur-[110px] -z-0" />
      <div className="pointer-events-none absolute -top-24 right-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] -z-0" />

      <div className="w-full max-w-[420px] bg-card rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/40 border border-line overflow-hidden relative z-10 my-auto animate-slide-in-up">
        {/* Header */}
        <div className="p-7 pb-5 flex flex-col items-center justify-center border-b border-line bg-muted/40 relative">
          {/* Quick controls in top right */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-dim hover:text-heading hover:bg-card border border-transparent hover:border-line transition-all rounded-lg"
              title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              onClick={() => { setError(''); setScreen('sysadmin_login'); }}
              className="p-2 text-dim hover:text-primary hover:bg-card border border-transparent hover:border-line transition-all rounded-lg"
              title="Masuk sebagai System Admin"
            >
              <ShieldCheck size={16} />
            </button>
          </div>

          <div className="mb-4 flex items-center justify-center">
            <div className="p-2 rounded-2xl bg-card border border-line shadow-xs">
              <KivoLogo size={46} />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-black text-heading text-center tracking-tight">Masuk ke Kivo</h1>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-primary-soft text-primary border border-primary/20">
              v1.3
            </span>
          </div>
          <p className="text-xs text-dim mt-1 text-center font-medium">
            Platform Manajemen Bisnis &amp; Kasir POS
          </p>
        </div>

        {/* Login Form */}
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
                className="absolute right-3 text-dim hover:text-heading p-1 rounded-md transition-colors"
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full mt-1.5 bg-primary hover:bg-primary-hover text-white font-bold h-11 rounded-xl shadow-md shadow-primary/25 transition-all active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={16} />}
            <span>Masuk ke Akun</span>
          </button>

          {/* Divider "atau" & Create Store Button */}
          {onOpenSetupWizard && (
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
      </div>

      {/* Footer Branding */}
      <footer className="relative z-10 mt-6 text-center text-[10px] text-dim">
        <span>Kivo Platform v1.3 &copy; {new Date().getFullYear()} — Multi-Branch Business &amp; POS Solution</span>
      </footer>
    </div>
  );
}
