import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Users, Loader2, User, Plus, X, Eye, EyeOff, Power, KeyRound } from 'lucide-react';
import { useAuthStore } from '../../store/AuthStore';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLES = [
  { value: 'staff',  label: 'Staff',           desc: 'Akses POS, inventaris, gudang, dan pelanggan' },
  { value: 'admin',  label: 'Admin',           desc: 'Akses penuh kecuali pengaturan sistem' },
  { value: 'owner',  label: 'Owner / Pemilik', desc: 'Akses penuh termasuk pengaturan' },
];

function getRoleColor(role: string) {
  switch (role) {
    case 'owner': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400';
    case 'admin': return 'bg-brand/10 text-brand';
    case 'staff': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
    // legacy roles (pre-migration)
    case 'kasir': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
    case 'gudang': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400';
  }
}

export default function UserManagement() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [resetModal, setResetModal] = useState<UserRow | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'primary' | 'logout';
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data: UserRow[] = await invoke('get_users');
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleToggleActive = async (u: UserRow) => {
    if (u.id === currentUser?.id) {
      setConfirmModal({
        title: 'Tidak Dapat Menonaktifkan',
        message: 'Anda tidak bisa menonaktifkan akun yang sedang digunakan.',
        variant: 'warning',
        confirmLabel: 'OK',
        onConfirm: () => setConfirmModal(null),
      });
      return;
    }
    setConfirmModal({
      title: `${u.is_active ? 'Nonaktifkan' : 'Aktifkan'} Akun?`,
      message: `${u.is_active ? 'Nonaktifkan' : 'Aktifkan'} akun "${u.name}"? ${u.is_active ? 'Pengguna tidak akan bisa login.' : 'Pengguna akan bisa login kembali.'}`,
      variant: u.is_active ? 'danger' : 'primary',
      confirmLabel: u.is_active ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await invoke('toggle_user_active', { id: u.id });
          fetchUsers();
        } catch (e: any) {
          setConfirmModal({
            title: 'Gagal',
            message: e.toString(),
            variant: 'warning',
            confirmLabel: 'OK',
            onConfirm: () => setConfirmModal(null),
          });
        }
      },
    });
  };

  return (
    <div className="flex flex-col flex-1 h-full gap-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="text-brand" /> Manajemen Pengguna
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Kelola akses dan akun staff ChiraSys.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-brand hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-brand/20"
        >
          <Plus size={18} /> Tambah Staff
        </button>
      </div>

      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="animate-spin text-brand mb-4" size={32} />
            <p>Memuat data pengguna...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="py-4 px-6">Nama & Username</th>
                  <th className="py-4 px-6">Peran (Role)</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Dibuat Pada</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500">Tidak ada pengguna ditemukan.</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0 font-bold text-sm">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                          <p className="text-xs text-slate-500">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getRoleColor(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      {u.is_active ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Aktif
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold text-xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-slate-500 font-mono text-xs">
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setResetModal(u)}
                          title="Reset Password"
                          className="p-2 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          className={`p-2 rounded-lg transition-colors ${u.is_active ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                        >
                          <Power size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <AddStaffModal onClose={() => setShowModal(false)} onSuccess={fetchUsers} />}
      {resetModal && <ResetPasswordModal user={resetModal} onClose={() => setResetModal(null)} />}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant ?? 'danger'}
          confirmLabel={confirmModal.confirmLabel ?? 'Ya, Lanjutkan'}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

function AddStaffModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) { setError('Semua field wajib diisi.'); return; }
    if (password.length < 6) { setError('Password minimal 6 karakter.'); return; }
    setLoading(true); setError('');
    try {
      await invoke('create_user', { name: name.trim(), username: username.trim(), password, role });
      onSuccess();
      onClose();
    } catch (e: any) { setError(e.toString()); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0B0F19] rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tambah Staff Baru</h2>
            <p className="text-sm text-slate-500 mt-0.5">Buat akun login untuk anggota tim</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nama Lengkap</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="contoh: Budi Santoso"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Username Login</label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} required
              placeholder="contoh: budi_kasir"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Min. 6 karakter"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Peran / Role</label>
            <div className="space-y-2">
              {ROLES.map(r => (
                <label key={r.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${role === r.value ? 'border-brand bg-brand/5 dark:bg-brand/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                  <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="mt-0.5 accent-brand" />
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{r.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Batal
            </button>
            <button type="submit" disabled={loading} className="flex-[2] py-2.5 bg-brand hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><User size={16} /> Buat Akun</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return;
    setLoading(true);
    try {
      await invoke('reset_user_password', { id: user.id, newPassword });
      onClose();
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0B0F19] rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reset Password</h2>
            <p className="text-sm text-slate-500 mt-0.5">Untuk akun: <strong>{user.name}</strong></p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Password Baru</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoFocus
                placeholder="Min. 6 karakter"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Batal</button>
            <button type="submit" disabled={loading} className="flex-[2] py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Simpan Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
