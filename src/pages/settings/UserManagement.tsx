// Force HMR reload
import { useState, useEffect } from 'react';
import { Loader2, User, Plus, Eye, EyeOff, Power, Save, Pencil, Shield, Sliders, Cloud, Search, Building2, X, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/AuthStore';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Modal from '../../components/ui/Modal';
import { sysadminGetWorkspaces, getAvailableWorkspaces, WorkspaceListInfo, assignUserWorkspace, UserRowFull, invoke } from '../../lib/api';
import UserPermissionsModal from './UserPermissionsModal';
import RoleDefaultsModal from './RoleDefaultsModal';

import Select from '../../components/ui/Select';
const ROLES = [
  { value: 'staff',  label: 'Staff',           desc: 'Akses POS, inventaris, gudang, dan pelanggan' },
  { value: 'admin',  label: 'Admin',           desc: 'Akses penuh kecuali pengaturan sistem' },
  { value: 'owner',  label: 'Owner / Pemilik', desc: 'Akses penuh termasuk pengaturan' },
];

function getRoleColor(role: string) {
  switch (role) {
    case 'owner': return 'bg-primary-soft text-purple-700 dark:bg-primary-soft dark:text-purple-400';
    case 'admin': return 'bg-primary-soft text-primary';
    case 'staff': return 'bg-success-soft text-success dark:bg-success/10 dark:text-success';
    // legacy roles
    case 'kasir': return 'bg-success-soft text-success dark:bg-success/10 dark:text-success';
    case 'gudang': return 'bg-warning-soft text-warning dark:bg-warning/10 dark:text-warning';
    default: return 'bg-muted text-body dark:bg-muted dark:text-body';
  }
}

export default function UserManagement() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserRowFull[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceListInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editUserModal, setEditUserModal] = useState<UserRowFull | null>(null);
  const [permModalUserId, setPermModalUserId] = useState<string | null>(null);
  const [showRoleDefaultsModal, setShowRoleDefaultsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWsFilter, setSelectedWsFilter] = useState('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'primary' | 'logout';
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [data, wsList] = await Promise.all([
        invoke<UserRowFull[]>('get_users'),
        getAvailableWorkspaces().catch(() => sysadminGetWorkspaces().catch(() => [] as WorkspaceListInfo[])),
      ]);

      const validWsList: WorkspaceListInfo[] = [...(wsList || [])];
      const validWsIds = new Set(validWsList.map(w => w.id));

      // Sanitize users: users referencing a deleted workspace become unassigned
      const sanitizedUsers = (data || []).map(u => {
        if (u.workspace_id && !validWsIds.has(u.workspace_id)) {
          return { ...u, workspace_id: undefined };
        }
        return u;
      });

      setUsers(sanitizedUsers);
      setWorkspaces(validWsList);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchUsers = fetchData;

  const handleToggleActive = async (u: UserRowFull) => {
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

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery.trim() ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedWsFilter === 'all') return true;
    if (selectedWsFilter === 'unassigned') return !u.workspace_id;
    return u.workspace_id === selectedWsFilter;
  });

  return (
    <div className="flex flex-col flex-1 h-full gap-6 animate-fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-heading">Daftar Pengguna</h2>
            <span className="px-2 py-0.5 rounded-full bg-success-soft text-success border border-success/30 text-[10px] font-bold flex items-center gap-1">
              <Cloud size={11} /> Cloud Auth
            </span>
          </div>
          <p className="text-xs text-dim">
            Kelola akses, peran, dan penugasan workspace untuk seluruh staf.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRoleDefaultsModal(true)}
            className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <Sliders size={14} className="text-primary" /> Atur Default Peran
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <Plus size={15} /> Tambah Staff
          </button>
        </div>
      </div>

      {/* Search & Workspace Filter Bar */}
      <div className="bg-card p-4 rounded-xl border border-line shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
          <input
            type="text"
            placeholder="Cari staff berdasarkan nama atau username..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-muted border border-line rounded-xl outline-none focus:ring-2 focus:ring-primary text-heading"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-heading transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Workspace Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          <button
            onClick={() => setSelectedWsFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedWsFilter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-muted border border-line text-body hover:bg-muted'
            }`}
          >
            <span>Semua Staff</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedWsFilter === 'all' ? 'bg-card/20 text-white' : 'bg-line text-body'}`}>
              {users.length}
            </span>
          </button>

          {workspaces.map(ws => {
            const count = users.filter(u => u.workspace_id === ws.id).length;
            const isSelected = selectedWsFilter === ws.id;
            return (
              <button
                key={ws.id}
                onClick={() => setSelectedWsFilter(ws.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-muted border border-line text-body hover:bg-muted'
                }`}
              >
                <Building2 size={12} className="shrink-0" />
                <span>{ws.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isSelected ? 'bg-card/20 text-white' : 'bg-line text-body'}`}>
                  {count}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setSelectedWsFilter('unassigned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedWsFilter === 'unassigned'
                ? 'bg-warning text-white shadow-sm'
                : 'bg-muted border border-line text-body hover:bg-muted'
            }`}
          >
            <span>Belum Ditugaskan</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedWsFilter === 'unassigned' ? 'bg-card/20 text-white' : 'bg-line text-body'}`}>
              {users.filter(u => !u.workspace_id).length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-card rounded-xl border border-line shadow-sm flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center text-dim">
            <Loader2 className="animate-spin text-primary mb-4" size={32} />
            <p>Memuat data pengguna...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-background border-b border-line text-xs uppercase text-dim font-semibold">
                <tr>
                  <th className="py-4 px-6">Nama & Username</th>
                  <th className="py-4 px-6">Peran (Role)</th>
                  <th className="py-4 px-6">Hak Akses</th>
                  <th className="py-4 px-6">Workspace</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Dibuat Pada</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-line">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-dim">
                      {searchQuery || selectedWsFilter !== 'all'
                        ? 'Tidak ada pengguna yang cocok dengan filter / pencarian.'
                        : 'Tidak ada pengguna ditemukan.'}
                    </td>
                  </tr>
                ) : filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors group fast-render-row">
                    
                    {/* User Info */}
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-heading">{u.name}</p>
                          <p className="text-xs text-dim">@{u.username}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3 px-6">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getRoleColor(u.role)}`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Permissions Status */}
                    <td className="py-3 px-6">
                      {u.role.toLowerCase() === 'owner' ? (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-primary-soft text-purple-700 dark:bg-primary-soft dark:text-purple-400">
                          Akses Penuh
                        </span>
                      ) : u.is_custom_perms ? (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-warning-soft text-warning dark:bg-warning/10 dark:text-warning flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-warning"></span> Kustom
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-muted text-body dark:bg-muted dark:text-body w-fit block">
                          Default Role
                        </span>
                      )}
                    </td>

                    {/* Workspace Selector */}
                    <td className="py-3 px-4">
                      <div className="relative flex items-center">
                        <Select
                          disabled={updatingUserId === u.id}
                          value={u.workspace_id || ''}
                          className="text-xs px-2.5 py-1.5 border border-line rounded-lg bg-card text-heading outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                          onChange={async v => {
                            const wsId = v || null;
                            setUpdatingUserId(u.id);
                            try {
                              await assignUserWorkspace(u.id, wsId);
                              setUsers(prev => prev.map(item => item.id === u.id ? { ...item, workspace_id: wsId || undefined } : item));
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setUpdatingUserId(null);
                            }
                          }}
                        >
                          <option value="">— Tidak ada —</option>
                          {workspaces.map(ws => (
                            <option key={ws.id} value={ws.id}>{ws.name} ({ws.code})</option>
                          ))}
                        </Select>
                        {updatingUserId === u.id && (
                          <Loader2 size={12} className="animate-spin text-primary ml-2 shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Active Status */}
                    <td className="py-3 px-6">
                      {u.is_active ? (
                        <span className="text-success dark:text-success font-semibold text-xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span> Aktif
                        </span>
                      ) : (
                        <span className="text-dim font-semibold text-xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-dim"></span> Nonaktif
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-6 text-dim font-mono text-xs">
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-6 text-right">
                      <div className="flex justify-end gap-1">
                        
                        {/* Hak Akses Button */}
                        <button
                          onClick={() => setPermModalUserId(u.id)}
                          title="Atur Hak Akses Pengguna"
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-primary-soft hover:bg-primary/15 text-primary dark:bg-primary-soft dark:hover:bg-primary-soft transition-colors flex items-center gap-1.5"
                        >
                          <Shield size={13} />
                          <span>Hak Akses</span>
                        </button>

                        {/* Edit User Button */}
                        <button
                          onClick={() => setEditUserModal(u)}
                          title="Edit User"
                          className="p-2 rounded-lg text-dim hover:text-primary hover:bg-primary-soft transition-colors"
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Toggle Active Button */}
                        <button
                          onClick={() => handleToggleActive(u)}
                          title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          className={`p-2 rounded-lg transition-colors ${u.is_active ? 'text-dim hover:text-danger hover:bg-danger-soft dark:hover:bg-danger/20' : 'text-dim hover:text-success hover:bg-success-soft dark:hover:bg-success/20'}`}
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

      {/* Add Staff Modal */}
      {showModal && <AddStaffModal workspaces={workspaces} currentWorkspaceId={currentUser?.workspace_id} onClose={() => setShowModal(false)} onSuccess={fetchUsers} />}
      
      {/* Edit User Modal */}
      {editUserModal && <EditUserModal user={editUserModal} workspaces={workspaces} onClose={() => setEditUserModal(null)} onSuccess={fetchUsers} />}
      
      {/* User Specific Permissions Modal */}
      {permModalUserId && (
        <UserPermissionsModal 
          userId={permModalUserId} 
          onClose={() => setPermModalUserId(null)} 
          onSuccess={fetchUsers} 
        />
      )}

      {/* Role Baseline Permissions Modal */}
      {showRoleDefaultsModal && (
        <RoleDefaultsModal 
          onClose={() => setShowRoleDefaultsModal(false)} 
          onSuccess={fetchUsers} 
        />
      )}

      {/* Confirm Action Modal */}
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

function WorkspaceSelect({ value, onChange, workspaces }: { value: string; onChange: (val: string) => void; workspaces: WorkspaceListInfo[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-bold text-body uppercase tracking-wide">Workspace</label>
        {workspaces.length > 0 && (
          <span className="text-[10px] font-semibold text-primary dark:text-brand-light flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
            {workspaces.length} Workspace Tersedia
          </span>
        )}
      </div>
      <Select
        value={value}
        onChange={v => onChange(v)}
        className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary cursor-pointer"
      >
        <option value="">— Tidak di-assign ke workspace —</option>
        {workspaces.map(ws => (
          <option key={ws.id} value={ws.id}>
            {ws.name} ({ws.code})
          </option>
        ))}
      </Select>
      <p className="text-[11px] text-dim mt-1">
        Pilih workspace agar user otomatis terhubung ke database dan sinkron saat login.
      </p>
    </div>
  );
}

function AddStaffModal({ workspaces, currentWorkspaceId, onClose, onSuccess }: { workspaces: WorkspaceListInfo[]; currentWorkspaceId?: string | null; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  
  // Auto-select active workspace if available
  const initialWsId = currentWorkspaceId && workspaces.some(w => w.id === currentWorkspaceId)
    ? currentWorkspaceId
    : (workspaces[0]?.id || '');
  const [workspaceId, setWorkspaceId] = useState<string>(initialWsId);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) { setError('Semua field wajib diisi.'); return; }
    if (password.length < 6) { setError('Password minimal 6 karakter.'); return; }
    setLoading(true); setError('');
    try {
      await invoke('create_user', { name: name.trim(), username: username.trim(), password, role, workspaceId: workspaceId || null });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="md"
      title="Tambah Staff Baru"
      subtitle="Buat akun login untuk anggota tim"
      icon={User}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-danger-soft dark:bg-danger/20 border border-danger/30 dark:border-danger text-danger dark:text-danger text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">Nama Lengkap</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)} required
            placeholder="contoh: Budi Santoso"
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">Username Login</label>
          <input
            type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} required
            placeholder="contoh: budi_kasir"
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Min. 6 karakter"
              className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 pr-10 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-body">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-2">Peran / Role</label>
          <div className="space-y-2">
            {ROLES.map(r => (
              <label key={r.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${role === r.value ? 'border-primary bg-primary-soft dark:bg-primary-soft' : 'border-line hover:border-line-strong'}`}>
                <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="mt-0.5 accent-primary" />
                <div>
                  <p className="font-bold text-sm text-heading">{r.label}</p>
                  <p className="text-xs text-dim mt-0.5">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <WorkspaceSelect
          value={workspaceId}
          onChange={setWorkspaceId}
          workspaces={workspaces}
        />

        <div className="flex gap-3 pt-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-line rounded-xl text-sm font-bold text-heading hover:bg-muted transition-colors">
            Batal
          </button>
          <button type="submit" disabled={loading} className="flex-[2] py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><User size={16} /> Buat Akun</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, workspaces, onClose, onSuccess }: { user: UserRowFull; workspaces: WorkspaceListInfo[]; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [role, setRole] = useState(user.role);
  const [workspaceId, setWorkspaceId] = useState(user.workspace_id || '');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) { setError('Nama dan Username wajib diisi.'); return; }
    if (newPassword && newPassword.length < 6) { setError('Password minimal 6 karakter.'); return; }
    
    setLoading(true); setError('');
    try {
      await invoke('update_user', { 
        id: user.id, 
        name: name.trim(), 
        username: username.trim().toLowerCase(), 
        role, 
        workspaceId: workspaceId || null 
      });
      
      if (newPassword) {
        await invoke('reset_user_password', { id: user.id, newPassword });
      }
      
      onSuccess();
      onClose();
    } catch (e: any) { setError(e.toString()); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user ${user.name}?`)) return;
    setLoading(true); setError('');
    try {
      await invoke('delete_user', { id: user.id });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.toString());
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="md"
      title="Edit Pengguna"
      subtitle="Perbarui profil dan akses user"
      icon={Pencil}
    >
      <form onSubmit={handleUpdate} className="space-y-5">
        {error && (
          <div className="bg-danger-soft dark:bg-danger/20 border border-danger/30 dark:border-danger text-danger dark:text-danger text-sm px-4 py-3 rounded-xl flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">Nama Lengkap</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">Username</label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} required
              className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">Peran (Role)</label>
          <Select
            value={role} onChange={v => setRole(v)}
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
          >
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
        </div>

        <WorkspaceSelect
          value={workspaceId}
          onChange={setWorkspaceId}
          workspaces={workspaces}
        />

        <div className="pt-2 border-t border-line">
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">Reset Password (Opsional)</label>
          <input
            type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            placeholder="Kosongkan jika tidak ingin mengubah password"
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button 
            type="button" 
            onClick={handleDelete} 
            disabled={loading}
            className="px-4 py-2.5 bg-danger-soft hover:bg-danger-soft text-danger dark:bg-danger/20 dark:hover:bg-danger/40 rounded-xl text-sm font-bold transition-colors"
          >
            Hapus User
          </button>
          <div className="flex-1"></div>
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-line rounded-xl text-sm font-bold text-heading hover:bg-muted transition-colors">
            Batal
          </button>
          <button type="submit" disabled={loading} className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan
          </button>
        </div>
      </form>
    </Modal>
  );
}
