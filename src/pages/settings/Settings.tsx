import { useState, useEffect } from 'react';
import { Database, CheckCircle2, Loader2, Save, AlertTriangle, Settings as SettingsIcon, Globe, RefreshCw, Wifi, LogOut, Building2, MapPin, Lock, Printer, Sliders, UserCheck, Download, Trash2, UploadCloud, DownloadCloud, ChevronDown, Network, Link2, Zap } from 'lucide-react';
import { optimizeDatabase, exportDatabase, getSettings, setSetting, getSyncStatus, SyncStatus, leaveWorkspace, joinWorkspace, sysadminGetWorkspaces, sysadminCreateWorkspace, WorkspaceListInfo, UserRowFull, getUsers, assignUserWorkspace, triggerSyncPush, triggerSyncPull, resetDbSpecific, nukeCloudWorkspaceData } from '../../lib/api';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { useAuthStore } from '../../store/AuthStore';
import UserManagement from './UserManagement';
import HardwareSettings from './HardwareSettings';
import LanSyncSettings from './LanSyncSettings';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Modal from '../../components/ui/Modal';

import { usePermissions } from '../../lib/permissions';

// Keys that should render as a custom styled <select> instead of a text input
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
    { label: 'Tidak Ada Pajak (0%)', value: 'none' },
    { label: 'Include (Harga Sudah Termasuk Pajak)', value: 'include' },
    { label: 'Exclude (Pajak Ditambahkan di Akhir)', value: 'exclude' },
  ],
  tax_rate: [
    { label: '0% (Tanpa Pajak)', value: '0' },
    { label: '11% (PPN Indonesia)', value: '11' },
    { label: '12% (PPN 2025)', value: '12' },
    { label: '10%', value: '10' },
    { label: '5%', value: '5' },
  ],
  transaction_reset: [
    { label: 'Harian (Reset Setiap Hari)', value: 'daily' },
    { label: 'Bulanan (Reset Setiap Bulan)', value: 'monthly' },
    { label: 'Tidak Pernah Reset', value: 'never' },
  ],
  sync_mode: [
    { label: 'Local Only (Offline)', value: 'local' },
    { label: 'Cloud Sync (Online)', value: 'cloud' },
  ],
  auto_sync: [
    { label: 'Aktif (Otomatis Sync Background)', value: 'true' },
    { label: 'Nonaktif (Manual Sync Saja)', value: 'false' },
  ],
  language: [
    { label: 'Bahasa Indonesia (ID)', value: 'id' },
    { label: 'English (EN)', value: 'en' },
  ],
  print_receipt_auto: [
    { label: 'Ya (Cetak Struk Otomatis)', value: 'true' },
    { label: 'Tidak (Cetak Manual)', value: 'false' },
  ],
  cash_drawer_auto_open: [
    { label: 'Ya (Buka Laci Otomatis Saat Bayar)', value: 'true' },
    { label: 'Tidak (Buka Manual)', value: 'false' },
  ],
  auto_backup: [
    { label: 'Harian (Setiap Hari)', value: 'daily' },
    { label: 'Mingguan (Setiap Minggu)', value: 'weekly' },
    { label: 'Nonaktif', value: 'disabled' },
  ],
  tier_member_duration_months: [
    { label: '3 Bulan', value: '3' },
    { label: '6 Bulan', value: '6' },
    { label: '12 Bulan (1 Tahun)', value: '12' },
    { label: '24 Bulan (2 Tahun)', value: '24' },
    { label: 'Tidak Terbatas (Selamanya)', value: '0' },
  ],
  tier_vip_duration_months: [
    { label: '6 Bulan', value: '6' },
    { label: '12 Bulan (1 Tahun)', value: '12' },
    { label: '24 Bulan (2 Tahun)', value: '24' },
    { label: '36 Bulan (3 Tahun)', value: '36' },
    { label: 'Tidak Terbatas (Selamanya)', value: '0' },
  ],
  tier_member_discount: [
    { label: '0% (Tanpa Diskon)', value: '0' },
    { label: '2%', value: '2' },
    { label: '5%', value: '5' },
    { label: '10%', value: '10' },
    { label: '15%', value: '15' },
  ],
  tier_vip_discount: [
    { label: '5%', value: '5' },
    { label: '10%', value: '10' },
    { label: '15%', value: '15' },
    { label: '20%', value: '20' },
    { label: '25%', value: '25' },
  ],
  openai_model: [
    { label: 'GPT-4o Mini (Direkomendasikan - Cepat & Hemat)', value: 'gpt-4o-mini' },
    { label: 'GPT-4o (Paling Cerdas & Akurat)', value: 'gpt-4o' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  ],
};

// Keys managed separately in the Profil section — hide from General list
const PROFILE_KEYS = ['company_name', 'branch_name'];
const MEMBER_KEYS = ['tier_member_discount', 'tier_vip_discount', 'tier_member_duration_months', 'tier_vip_duration_months'];

export default function Settings() {
  const { user } = useAuthStore();
  const { can, isOwner, isAdmin } = usePermissions();

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [configs, setConfigs] = useState<{key: string, value: string, description?: string}[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'sync' | 'lan' | 'hardware'>(() => {
    if (can('settings.general')) return 'system';
    if (can('settings.lan')) return 'lan';
    if (can('settings.hardware')) return 'hardware';
    if (can('settings.database')) return 'sync';
    if (can('settings.users') || isAdmin) return 'users';
    return 'lan';
  });

  // Profile settings
  const [companyName, setCompanyName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Confirm modals
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'primary' | 'logout';
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  // DB Reset state
  const [resetTarget, setResetTarget] = useState<'sales' | 'inventory' | 'all' | 'maintenance' | null>(null);
  const [confirmText, setConfirmText] = useState('');

  // Nuke Supabase state
  const [nukeStep, setNukeStep] = useState<0 | 1 | 2>(0);
  const [nukeConfirmText, setNukeConfirmText] = useState('');

  // Sync / workspace state
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Manual Workspace Join state
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showSwitchWorkspace, setShowSwitchWorkspace] = useState(false);

  useEffect(() => {
    // If user lacks general settings, redirect to allowed tab
    if (activeTab === 'system' && !can('settings.general')) {
      if (can('settings.lan')) setActiveTab('lan');
      else if (can('settings.hardware')) setActiveTab('hardware');
      else if (can('settings.database')) setActiveTab('sync');
      else if (can('settings.users') || isAdmin) setActiveTab('users');
    }
  }, [can, isAdmin, activeTab]);

  const handleJoinWorkspace = async () => {
    const trimmedCode = joinCode.trim();
    if (!trimmedCode) {
      setJoinError('Silakan masukkan Kode Workspace atau Token Undangan.');
      return;
    }
    setIsJoining(true);
    setJoinError(null);
    try {
      const ws = await joinWorkspace(trimmedCode, joinPassword.trim() || undefined);
      setSuccessMsg(`Berhasil terhubung ke Workspace: ${ws.name} (${ws.code})`);
      setJoinCode('');
      setJoinPassword('');
      setShowSwitchWorkspace(false);
      await loadSyncStatus();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setJoinError(err.message || String(err));
    } finally {
      setIsJoining(false);
    }
  };

  const handleManualPush = async () => {
    setIsPushing(true);
    try {
      await triggerSyncPush();
      await loadSyncStatus();
    } catch (err: any) {
      setConfirmModal({
        title: 'Gagal Push',
        message: `Terjadi kesalahan saat upload ke Cloud: ${err.message || err}`,
        variant: 'warning',
        confirmLabel: 'OK',
        onConfirm: () => setConfirmModal(null),
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handleManualPull = async (fullPull: boolean = false) => {
    setIsPulling(true);
    try {
      await triggerSyncPull(fullPull);
      await loadSyncStatus();
    } catch (err: any) {
      setConfirmModal({
        title: 'Gagal Pull',
        message: `Terjadi kesalahan saat download dari Cloud: ${err.message || err}`,
        variant: 'warning',
        confirmLabel: 'OK',
        onConfirm: () => setConfirmModal(null),
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    try {
      await setSetting('auto_sync', enabled ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('chirasys:auto_sync_changed'));
      await loadSyncStatus();
      await loadSettings();
    } catch (e: any) {
      setConfirmModal({
        title: 'Gagal Mengubah Pengaturan',
        message: e.message || String(e),
        variant: 'warning',
        confirmLabel: 'OK',
        onConfirm: () => setConfirmModal(null),
      });
    }
  };

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
      const co = data.find(s => s.key === 'company_name');
      const br = data.find(s => s.key === 'branch_name');
      if (co) setCompanyName(co.value);
      if (br) setBranchName(br.value);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileSuccess('');
    try {
      if (isOwner) await setSetting('company_name', companyName);
      if (isAdmin) await setSetting('branch_name', branchName);
      setProfileSuccess('Tersimpan!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (e) {
      setConfirmModal({
        title: 'Gagal Menyimpan',
        message: `Terjadi kesalahan: ${e}`,
        variant: 'warning',
        confirmLabel: 'OK',
        onConfirm: () => setConfirmModal(null),
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleExportDB = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const defaultPath = `chirasys_backup_${today}.db`;
      const filePath = await save({
        defaultPath,
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }]
      });

      if (!filePath) return;

      setLoading(true);
      setSuccessMsg('');
      const msg = await exportDatabase(filePath);
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (e) {
      setConfirmModal({
        title: 'Export Gagal',
        message: `Gagal mengekspor database: ${e}`,
        variant: 'danger',
        confirmLabel: 'OK',
        onConfirm: () => setConfirmModal(null),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetDB = async () => {
    if (!resetTarget) return;
    const role = (user?.role || 'staff').toLowerCase();
    if (resetTarget !== 'maintenance' && role !== 'owner' && role !== 'admin' && role !== 'sysadmin') {
      alert('Akses Ditolak: Hanya Admin / Owner yang dapat menghapus / mereset database.');
      return;
    }
    if (resetTarget !== 'maintenance' && confirmText !== 'DELETE') return;

    setLoading(true);
    setSuccessMsg('');
    try {
      if (resetTarget === 'maintenance') {
        const msg = await optimizeDatabase();
        setSuccessMsg(msg);
      } else {
        const msg = await resetDbSpecific(resetTarget);
        setSuccessMsg(msg);
      }
      setTimeout(() => setSuccessMsg(''), 6000);
      setResetTarget(null);
      setConfirmText('');
    } catch (e) {
      setConfirmModal({
        title: 'Reset Gagal',
        message: `Reset gagal: ${e}`,
        variant: 'danger',
        confirmLabel: 'OK',
        onConfirm: () => setConfirmModal(null),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNukeCloudData = async () => {
    if (nukeConfirmText !== 'NUKE CLOUD DATA') return;
    setLoading(true);
    try {
      const msg = await nukeCloudWorkspaceData();
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 8000);
      setNukeStep(0);
      setNukeConfirmText('');
    } catch (e) {
      setConfirmModal({
        title: 'Penghapusan Cloud Gagal',
        message: `Gagal menghapus data Supabase Cloud: ${e}`,
        variant: 'danger',
        confirmLabel: 'OK',
        onConfirm: () => setConfirmModal(null),
      });
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
      setConfirmModal({
        title: 'Gagal Menyimpan',
        message: `Gagal menyimpan pengaturan: ${e}`,
        variant: 'warning',
        confirmLabel: 'OK',
        onConfirm: () => setConfirmModal(null),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveWorkspace = () => {
    setConfirmModal({
      title: 'Tinggalkan Workspace?',
      message: 'Semua data lokal akan tetap tersimpan, tetapi cloud sync akan berhenti.',
      variant: 'danger',
      confirmLabel: 'Ya, Tinggalkan',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await leaveWorkspace();
          setSyncStatus(null);
          await loadSyncStatus();
        } catch (e) { console.error(e); }
      },
    });
  };

  // General configs minus the profile keys and member keys
  const generalConfigs = configs.filter(c => !PROFILE_KEYS.includes(c.key) && !MEMBER_KEYS.includes(c.key));
  const memberConfigs = configs.filter(c => MEMBER_KEYS.includes(c.key));

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 flex flex-col gap-6 animate-in fade-in duration-300 w-full">
      
      {/* Top Header Banner (Subtle & Theme Adaptive) */}
      <div className="shrink-0 bg-white dark:bg-[#0B0F19] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand/10 text-brand border border-brand/20 flex items-center gap-1.5">
              <SettingsIcon size={13} /> Control Panel
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
              v1.2.0
            </span>
            {syncStatus?.workspace_name && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <Globe size={13} /> {syncStatus.workspace_name}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Pengaturan System & Hardware POS
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mt-0.5">
              Kelola preferensi bisnis, profil cabang, integrasi printer thermal, manajemen pengguna, dan sinkronisasi cloud secara terpusat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-extrabold text-xs">
            {user?.role?.substring(0, 2).toUpperCase() || 'US'}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{user?.name || 'Operator'}</p>
            <p className="text-[10px] font-mono text-slate-500 capitalize">{user?.role || 'Staff'}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation (Shrink-0 & Robust Styling) */}
      <div className="shrink-0 flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-3 overflow-x-auto custom-scrollbar">
        {can('settings.general') && (
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-brand text-white shadow-md shadow-brand/20'
                : 'bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Sliders size={15} /> Konfigurasi Umum
          </button>
        )}

        {can('settings.hardware') && (
          <button
            onClick={() => setActiveTab('hardware')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'hardware'
                ? 'bg-brand text-white shadow-md shadow-brand/20'
                : 'bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Printer size={15} /> Printer & Hardware POS
          </button>
        )}

        {can('settings.database') && (
          <button
            onClick={() => { setActiveTab('sync'); loadSyncStatus(); }}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'sync'
                ? 'bg-brand text-white shadow-md shadow-brand/20'
                : 'bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Globe size={15} /> Cloud & Workspace
            {syncStatus?.pending_count ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">{syncStatus.pending_count}</span>
            ) : null}
          </button>
        )}

        <button
          onClick={() => setActiveTab('lan')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'lan'
              ? 'bg-brand text-white shadow-md shadow-brand/20'
              : 'bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <Network size={15} /> Jaringan Lokal (LAN)
        </button>

        {(can('settings.users') || isAdmin) && (
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-brand text-white shadow-md shadow-brand/20'
                : 'bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <UserCheck size={15} /> Manajemen Pengguna
          </button>
        )}
      </div>

      {/* Main Content Areas */}
      {activeTab === 'hardware' ? (
        <HardwareSettings />
      ) : activeTab === 'users' ? (
        <UserManagement />
      ) : activeTab === 'lan' ? (
        <LanSyncSettings />
      ) : activeTab === 'sync' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          {/* Workspace Status (12 cols) */}
          <div className="lg:col-span-12 bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-brand/10 text-brand rounded-2xl"><Globe size={22} /></div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Koneksi Workspace Cloud</h2>
                    <p className="text-xs text-slate-500">Status sinkronisasi data antar cabang</p>
                  </div>
                </div>
                <button onClick={loadSyncStatus} className="p-2.5 text-slate-400 hover:text-brand rounded-xl hover:bg-brand/10 transition-all cursor-pointer" title="Refresh Sync Status">
                  <RefreshCw size={18} />
                </button>
              </div>

              {syncStatus?.workspace_id ? (
                <>
                  <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
                    <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-extrabold text-emerald-800 dark:text-emerald-300 truncate">{syncStatus.workspace_name}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500 font-mono mt-0.5">KODE: {syncStatus.workspace_code}</p>
                    </div>
                    <Wifi size={20} className="text-emerald-500 shrink-0 animate-pulse" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Antrian Pending</p>
                      <p className={`text-3xl font-black mt-1 font-mono ${syncStatus.pending_count > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>{syncStatus.pending_count}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Gagal Sync</p>
                      <p className={`text-3xl font-black mt-1 font-mono ${syncStatus.failed_count > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{syncStatus.failed_count}</p>
                    </div>
                  </div>

                  {/* Auto Sync Toggle Switch */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">Sinkronisasi Otomatis Supabase</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          syncStatus.auto_sync
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                        }`}>
                          {syncStatus.auto_sync ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        Otomatis mengunggah & mengunduh data dengan Supabase Cloud di latar belakang.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAutoSync(!syncStatus.auto_sync)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        syncStatus.auto_sync ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={syncStatus.auto_sync}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          syncStatus.auto_sync ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {syncStatus.last_synced && (
                    <p className="text-xs text-slate-400 font-mono">Terakhir Sinkron: {new Date(syncStatus.last_synced).toLocaleString('id-ID')}</p>
                  )}

                  {/* Manual Push / Pull Action Buttons - Available for ALL roles */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleManualPush}
                      disabled={isPushing || isPulling}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                      title="Upload semua antrian data lokal ke Supabase Cloud secara manual"
                    >
                      {isPushing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                      Push ke Cloud (Upload)
                    </button>

                    <button
                      onClick={() => handleManualPull(true)}
                      disabled={isPushing || isPulling}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-brand hover:bg-brand-dark text-white font-extrabold text-xs rounded-2xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                      title="Download data terbaru dari Supabase Cloud ke database lokal"
                    >
                      {isPulling ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />}
                      Pull dari Cloud (Download)
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-brand/10 text-brand rounded-xl">
                        <Link2 size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Hubungkan ke Workspace Cloud</h3>
                        <p className="text-xs text-slate-500">Masukkan Kode Workspace (misal: <code>WS-XXXX</code>) atau Token Undangan untuk menghubungkan toko ini ke cloud Supabase.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Kode Workspace / Token Undangan <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value)}
                          placeholder="Contoh: WS-ABC123 atau Token"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono font-bold focus:border-brand outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Password Workspace (Opsional)
                        </label>
                        <input
                          type="password"
                          value={joinPassword}
                          onChange={(e) => setJoinPassword(e.target.value)}
                          placeholder="Kosongkan jika tanpa sandi"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-brand outline-none"
                        />
                      </div>
                    </div>

                    {joinError && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
                        <AlertTriangle size={15} className="shrink-0" />
                        <span>{joinError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end">
                      <button
                        onClick={handleJoinWorkspace}
                        disabled={isJoining || !joinCode.trim()}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isJoining ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        {isJoining ? 'Menghubungkan ke Cloud...' : 'Hubungkan Sekarang'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isAdmin && syncStatus?.workspace_id && (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowSwitchWorkspace(!showSwitchWorkspace)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  <Link2 size={15} /> Ganti / Pindah Workspace
                </button>
                <button
                  onClick={handleLeaveWorkspace}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-xs font-extrabold transition-all cursor-pointer"
                >
                  <LogOut size={15} /> Putuskan Koneksi Workspace
                </button>
              </div>
            )}

            {showSwitchWorkspace && syncStatus?.workspace_id && (
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Link2 size={16} className="text-brand" />
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">Pindah ke Workspace Cloud Lain</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Kode Workspace / Token Baru
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Contoh: WS-XYZ999"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono font-bold focus:border-brand outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Password (Opsional)
                    </label>
                    <input
                      type="password"
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      placeholder="Sandi jika ada"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-brand outline-none"
                    />
                  </div>
                </div>

                {joinError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowSwitchWorkspace(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleJoinWorkspace}
                    disabled={isJoining || !joinCode.trim()}
                    className="px-5 py-2 rounded-xl bg-brand text-white text-xs font-extrabold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isJoining ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    {isJoining ? 'Menghubungkan...' : 'Hubungkan ke Workspace Baru'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sysadmin Only: Global Workspace Management */}
          {user?.username === 'admin' && (
            <div className="lg:col-span-12">
              <SysadminWorkspaceManagement />
            </div>
          )}
        </div>
      ) : (
        /* TAB 1: KONFIGURASI UMUM (FULL WIDTH 12-COLUMN GRID) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">

          {/* ── Profil Perusahaan & Cabang (8 Cols) ── */}
          <div className="lg:col-span-8 bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand/10 text-brand rounded-2xl">
                  <Building2 size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Profil Perusahaan & Cabang</h2>
                  <p className="text-xs text-slate-500">Identitas utama bisnis yang ditampilkan pada sidebar & nota transaksi</p>
                </div>
              </div>
              {profileSuccess && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-200 animate-in fade-in duration-200">
                  <CheckCircle2 size={14} /> {profileSuccess}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Company Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  <Building2 size={13} className="text-brand" /> Nama Perusahaan / Toko
                  {!isOwner && <Lock size={11} className="text-slate-400 ml-1" />}
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  disabled={!isOwner}
                  placeholder="Contoh: Apotek Terang"
                  className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white font-bold outline-none transition-all ${
                    isOwner
                      ? 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-brand'
                      : 'border-slate-100 dark:border-slate-900 opacity-60 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* Branch Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  <MapPin size={13} className="text-brand" /> Nama Cabang POS
                  {!isAdmin && <Lock size={11} className="text-slate-400 ml-1" />}
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Contoh: Cabang Utama"
                  className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white font-bold outline-none transition-all ${
                    isAdmin
                      ? 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-brand'
                      : 'border-slate-100 dark:border-slate-900 opacity-60 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="py-3 px-6 bg-brand hover:bg-blue-600 text-white font-bold text-xs rounded-2xl shadow-md shadow-brand/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Simpan Profil Bisnis
                </button>
              </div>
            )}
          </div>

          {/* ── Quick Database Health & Maintenance (4 Cols) ── */}
          {isAdmin && (
            <div className="lg:col-span-4 bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-7 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                    <Database size={22} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Kesehatan Database</h2>
                    <p className="text-xs text-slate-500">SQLite Engine Optimizations</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Jalankan pembersihan rutin VACUUM untuk mengompresi ukuran file database dan mempercepat kueri transaksi kasir.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleExportDB}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <Download size={15} /> Export Database Backup (.db)
                </button>

                <button
                  onClick={() => setResetTarget('maintenance')}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Database size={15} /> Optimize DB (VACUUM)
                </button>

                {successMsg && (
                  <p className="text-xs text-center font-bold text-emerald-600 animate-in fade-in">
                    ✓ {successMsg}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── System Preferences & Accounting Config (7 Cols) ── */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                <Sliders size={22} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Konfigurasi Sistem & Keuangan</h2>
                <p className="text-xs text-slate-500">Metode HPP, mode pajak, dan reset siklus nomor nota</p>
              </div>
              {saving && <Loader2 size={16} className="animate-spin text-brand ml-auto" />}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {generalConfigs.map((c) => (
                <SettingRow key={c.key} config={c} onSave={handleSaveConfig} disabled={!isAdmin} />
              ))}
              {generalConfigs.length === 0 && (
                <p className="text-xs text-slate-400 italic py-4 text-center">Tidak ada variabel sistem tambahan.</p>
              )}
            </div>
          </div>

          {/* ── Danger Zone / Reset Options (5 Cols) ── */}
          {isAdmin && (
            <div className="lg:col-span-5 bg-white dark:bg-[#0B0F19] rounded-3xl border border-rose-200/80 dark:border-rose-900/60 shadow-sm p-6 sm:p-7 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-rose-100 dark:border-rose-900/50 pb-4">
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-2xl">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-rose-600 dark:text-rose-400">Danger Zone (Reset Data)</h2>
                    <p className="text-xs text-slate-500">Hanya untuk Admin — Pembersihan Data</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <button
                      onClick={() => setResetTarget('sales')}
                      disabled={loading}
                      className="w-full py-3 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                    >
                      Reset Data Penjualan (Sales)
                    </button>
                    <p className="text-[10px] text-slate-400 text-center">Menghapus riwayat transaksi POS & jurnal kasir.</p>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => setResetTarget('inventory')}
                      disabled={loading}
                      className="w-full py-3 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                    >
                      Reset Data Stok & Pembelian
                    </button>
                    <p className="text-[10px] text-slate-400 text-center">Menghapus mutasi stok dan kartu stok.</p>
                  </div>

                  <div className="space-y-1 pt-1">
                    <button
                      onClick={() => setResetTarget('all')}
                      disabled={loading}
                      className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md shadow-rose-600/20 cursor-pointer"
                    >
                      Reset Semua Data Local (Factory Reset)
                    </button>
                    <p className="text-[10px] text-slate-400 text-center">Menghapus seluruh Master Data & Transaksi Lokal.</p>
                  </div>

                  {(user?.role === 'owner' || user?.role === 'sysadmin') && (
                    <div className="space-y-1 pt-3 border-t border-rose-200/60 dark:border-rose-900/60">
                      <button
                        onClick={() => setNukeStep(1)}
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-xs rounded-2xl transition-all shadow-lg shadow-red-600/30 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} /> Nuke Supabase Cloud Data (Owner Only)
                      </button>
                      <p className="text-[10px] text-rose-500 font-bold text-center">PERINGATAN: Menghapus SELURUH database di Supabase Cloud!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Membership Configurations Card */}
          {memberConfigs.length > 0 && (
            <div className="lg:col-span-12 bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-7">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                  <UserCheck size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Membership Settings</h2>
                  <p className="text-xs text-slate-500">Konfigurasi durasi dan diskon untuk tier Member dan VIP</p>
                </div>
                {saving && <Loader2 size={14} className="animate-spin text-slate-400 ml-auto" />}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {memberConfigs.map((c) => (
                  <SettingRow key={c.key} config={c} onSave={handleSaveConfig} disabled={!isAdmin} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DB Reset Warning Modal */}
      {resetTarget !== null && (
        <Modal
          isOpen={true}
          onClose={() => setResetTarget(null)}
          size="md"
          title={resetTarget === 'maintenance' ? 'Optimize Database?' : 'Konfirmasi Wipe Database'}
          icon={AlertTriangle}
          iconBg="bg-rose-100 dark:bg-rose-900/30 text-rose-600"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetDB}
                disabled={resetTarget !== 'maintenance' && confirmText !== 'DELETE'}
                className="flex-[1.5] py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/20"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Memproses...' : 'Ya, Eksekusi'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {resetTarget === 'maintenance' ? (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Menjalankan <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">VACUUM</code> dan <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">ANALYZE</code> untuk mengompresi database SQLite.
                </p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Aplikasi mungkin jeda sejenak. Tidak ada data yang dihapus.
                </p>
              </>
            ) : (
              <>
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">⚠ Tindakan Permanen</p>
                  <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                    {resetTarget === 'sales' && 'Seluruh transaksi kasir, pembayaran, dan laporan penjualan akan dihapus permanen.'}
                    {resetTarget === 'inventory' && 'Seluruh kartu stok, mutasi barang, dan PO pembelian akan dihapus.'}
                    {resetTarget === 'all' && 'SELURUH DATA (Master Data, Stok, Sales) akan dihapus total dan aplikasi kembali ke kondisi awal.'}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  Ketik <strong>DELETE</strong> untuk mengonfirmasi:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-rose-200 dark:border-rose-800/80 rounded-2xl px-4 py-3 text-sm font-bold text-rose-600 outline-none uppercase font-mono"
                />
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Nuke Supabase Modal Step 1: Warning */}
      {nukeStep === 1 && (
        <Modal
          isOpen={true}
          onClose={() => setNukeStep(0)}
          size="md"
          title="Peringatan Bahaya (Owner)"
          icon={AlertTriangle}
          iconBg="bg-rose-500/10 text-rose-500"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setNukeStep(0)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => setNukeStep(2)}
                className="flex-[1.5] py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md shadow-rose-600/20"
              >
                Lanjut ke Konfirmasi Akhir →
              </button>
            </div>
          }
        >
          <div className="text-center space-y-4 py-2">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Hapus Seluruh Data Supabase Cloud?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tindakan ini akan mengosongkan <strong>SELURUH master data, produk, dan transaksi</strong> pada database Cloud Supabase untuk workspace ini.<br/><br/>
              <strong className="text-rose-500">TINDAKAN INI TIDAK DAPAT DIBATALKAN ATAU DIKEMBALIKAN!</strong>
            </p>
          </div>
        </Modal>
      )}

      {/* Nuke Supabase Modal Step 2: Text Confirmation */}
      {nukeStep === 2 && (
        <Modal
          isOpen={true}
          onClose={() => { setNukeStep(0); setNukeConfirmText(''); }}
          size="md"
          title="Konfirmasi Akhir Nuke Cloud"
          icon={Trash2}
          iconBg="bg-red-600/15 text-red-600"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => { setNukeStep(0); setNukeConfirmText(''); }}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleNukeCloudData}
                disabled={nukeConfirmText !== 'NUKE CLOUD DATA' || loading}
                className="flex-[1.5] py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/30"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Memproses Nuke...' : '🔥 EKSEKUSI HAPUS CLOUD'}
              </button>
            </div>
          }
        >
          <div className="text-center space-y-4 py-2">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Ketik untuk Mengonfirmasi Nuke</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ketik frasa <code className="bg-rose-100 dark:bg-rose-950 text-rose-600 font-mono px-1.5 py-0.5 rounded font-bold">NUKE CLOUD DATA</code> di bawah ini untuk membuka tombol eksekusi:
            </p>
            <input
              type="text"
              placeholder="NUKE CLOUD DATA"
              value={nukeConfirmText}
              onChange={e => setNukeConfirmText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-red-500/50 rounded-2xl px-4 py-3 text-sm font-black text-red-600 outline-none uppercase font-mono text-center tracking-wider focus:ring-2 focus:ring-red-600"
            />
          </div>
        </Modal>
      )}

      {/* Global Confirm Modal */}
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

function CustomSelect({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOpt = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative flex-1 min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-extrabold text-slate-900 dark:text-white outline-none transition-all shadow-xs ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-brand dark:hover:border-brand focus:ring-2 focus:ring-brand/30 cursor-pointer'
        }`}
      >
        <span className="truncate">{selectedOpt?.label || value}</span>
        <ChevronDown
          size={15}
          className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-brand' : ''
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 left-0 top-full mt-1.5 z-50 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-150">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-brand/10 text-brand dark:bg-brand/20 dark:text-blue-400 font-extrabold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <CheckCircle2 size={14} className="text-brand shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SettingRow({ config, onSave, disabled }: { config: { key: string; value: string; description?: string }, onSave: (k: string, v: string) => void, disabled?: boolean }) {
  const [val, setVal] = useState(config.value);
  const options = SELECT_OPTIONS[config.key] || (
    config.value === '1' || config.value === '0' || config.value === 'true' || config.value === 'false'
      ? [
          { label: 'Ya / Aktif', value: config.value === 'true' || config.value === '1' ? config.value : '1' },
          { label: 'Tidak / Nonaktif', value: config.value === 'false' || config.value === '0' ? config.value : '0' },
        ]
      : null
  );

  useEffect(() => {
    setVal(config.value);
  }, [config.value]);

  const [applyingHpp, setApplyingHpp] = useState(false);

  const handleChange = (newVal: string) => {
    setVal(newVal);
    onSave(config.key, newVal);
  };

  const handleApplyHpp = async () => {
    setApplyingHpp(true);
    try {
      const msg = await invoke('apply_hpp_retroactive', { method: val });
      alert(msg);
    } catch (e) {
      alert(`Failed to apply HPP: ${e}`);
    } finally {
      setApplyingHpp(false);
    }
  };

  return (
    <div className="p-4 bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-2">
      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
        {config.key.replace(/_/g, ' ')}
      </label>
      <div className="flex gap-2 items-center">
        {options ? (
          <CustomSelect
            value={val}
            options={options}
            onChange={handleChange}
            disabled={disabled}
          />
        ) : (
          <input
            type={config.key === 'openai_api_key' ? 'password' : 'text'}
            value={val}
            placeholder={config.key === 'openai_api_key' ? 'sk-proj-...' : ''}
            onChange={(e) => setVal(e.target.value)}
            disabled={disabled}
            onBlur={() => {
              if (val !== config.value) {
                if (config.key === 'openai_api_key') {
                  localStorage.setItem('chirasys_openai_api_key', val.trim());
                }
                onSave(config.key, val);
              }
            }}
            className="flex-1 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          />
        )}
        
        {(config.key === 'hpp_method' || config.key === 'hpp_method_default') && (
          <button 
            onClick={handleApplyHpp}
            disabled={applyingHpp || disabled}
            className="px-4 py-2.5 bg-brand text-white font-bold text-xs rounded-xl hover:bg-blue-600 transition-all shadow-xs disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {applyingHpp ? 'Applying...' : 'Apply HPP'}
          </button>
        )}
      </div>
      {config.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{config.description}</p>}
    </div>
  );
}

function SysadminWorkspaceManagement() {
  const [workspaces, setWorkspaces] = useState<WorkspaceListInfo[]>([]);
  const [allUsers, setAllUsers] = useState<UserRowFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedWs, setExpandedWs] = useState<string | null>(null);
  const [assigningUser, setAssigningUser] = useState<string | null>(null); // user_id being assigned

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ws, users] = await Promise.all([
        sysadminGetWorkspaces(),
        getUsers()
      ]);
      setWorkspaces(ws);
      setAllUsers(users);
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
      await loadData();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setCreating(false);
    }
  };

  const handleAssignWorkspace = async (userId: string, workspaceId: string | null) => {
    setAssigningUser(userId);
    try {
      await assignUserWorkspace(userId, workspaceId);
      await loadData();
    } catch (e: any) {
      alert('Gagal mengassign workspace: ' + (e.message || e));
    } finally {
      setAssigningUser(null);
    }
  };

  const getUsersInWorkspace = (wsId: string) => allUsers.filter(u => u.workspace_id === wsId);
  const getUnassignedUsers = () => allUsers.filter(u => !u.workspace_id);

  return (
    <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-indigo-200/80 dark:border-indigo-900/60 shadow-sm p-6 sm:p-7 space-y-5 mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
            <Globe size={22} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">System Admin Workspaces</h2>
            <p className="text-xs text-slate-500">Kelola seluruh workspace cloud dan assign anggota tim</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          + Workspace Baru
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nama Workspace</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Apotek Terang Pusat"
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-xs font-semibold text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Kode Unik</label>
              <input
                type="text"
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                placeholder="e.g. TERANG-01"
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 uppercase font-mono text-xs font-bold text-slate-900 dark:text-white"
                maxLength={32}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl">Batal</button>
            <button type="submit" disabled={creating} className="px-4 py-2 text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 rounded-xl flex items-center gap-2">
              {creating && <Loader2 size={14} className="animate-spin" />}
              Buat Workspace
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
      ) : workspaces.length === 0 ? (
        <div className="text-center p-8 text-slate-500 text-xs">Tidak ada workspace cloud.</div>
      ) : (
        <div className="space-y-3">
          {workspaces.map(ws => {
            const wsUsers = getUsersInWorkspace(ws.id);
            const isExpanded = expandedWs === ws.id;
            return (
              <div key={ws.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {/* Workspace header */}
                <div
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                  onClick={() => setExpandedWs(isExpanded ? null : ws.id)}
                >
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{ws.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <code className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">{ws.code}</code>
                      <span className="text-[10px] text-slate-500">{wsUsers.length} anggota</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded: member list + assign new member */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-2">
                    {wsUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1">Belum ada anggota di workspace ini.</p>
                    ) : wsUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between py-1.5 px-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold shrink-0">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{u.name}</p>
                            <p className="text-[10px] text-slate-500">@{u.username} · {u.role}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssignWorkspace(u.id, null)}
                          disabled={assigningUser === u.id}
                          className="text-[10px] px-2 py-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-md font-semibold transition-colors disabled:opacity-50"
                          title="Lepas dari workspace ini"
                        >
                          {assigningUser === u.id ? '...' : 'Lepas'}
                        </button>
                      </div>
                    ))}

                    {/* Add user to workspace */}
                    {getUnassignedUsers().length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <select
                          className="flex-1 text-xs px-2 py-1.5 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none"
                          defaultValue=""
                          onChange={e => {
                            if (e.target.value) {
                              handleAssignWorkspace(e.target.value, ws.id);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="" disabled>+ Assign user ke workspace ini...</option>
                          {getUnassignedUsers().map(u => (
                            <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {getUnassignedUsers().length === 0 && wsUsers.length > 0 && (
                      <p className="text-[10px] text-slate-400 italic pt-1">Semua user sudah di-assign ke workspace.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned users section */}
      {!loading && getUnassignedUsers().length > 0 && (
        <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">⚠ User Tanpa Workspace ({getUnassignedUsers().length})</p>
          <div className="space-y-1.5">
            {getUnassignedUsers().map(u => (
              <div key={u.id} className="flex items-center justify-between">
                <span className="text-xs text-slate-700 dark:text-slate-300">{u.name} <span className="text-slate-400">(@{u.username})</span></span>
                <select
                  className="text-[10px] px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 outline-none"
                  defaultValue=""
                  onChange={e => {
                    if (e.target.value) handleAssignWorkspace(u.id, e.target.value);
                    e.currentTarget.value = '';
                  }}
                >
                  <option value="" disabled>Assign ke workspace...</option>
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
