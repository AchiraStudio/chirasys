import { useState } from 'react';
import { Loader2, Lock, User } from 'lucide-react';
import { loginUser } from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();

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
      // Shake animation effect could be added here
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-brand/10 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative z-10">
        
        <div className="p-8 pb-6 flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-indigo-600 p-0.5 shadow-lg shadow-brand/30 mb-6">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center">
              <img src="/cs.ico" alt="ChiraSys" className="w-10 h-10 object-contain" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center">Masuk ke ChiraSys</h1>
          <p className="text-sm text-slate-500 mt-2 text-center">Modern Inventory & Cashier System</p>
        </div>

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

          <p className="text-xs text-center text-slate-500 mt-4">
            Lupa password? Silakan hubungi admin sistem Anda.
          </p>
        </form>
      </div>
    </div>
  );
}
