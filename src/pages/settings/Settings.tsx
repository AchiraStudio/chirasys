import { useState, useEffect } from 'react';
import { Database, CheckCircle2, Loader2, Save, AlertTriangle, Globe, RefreshCw, LogOut, Building2, MapPin, Lock, Printer, Sliders, UserCheck, Download, Trash2, UploadCloud, DownloadCloud, ChevronDown, Network, Link2, Zap, Flame, Activity, Plus } from 'lucide-react';
import { optimizeDatabase, exportDatabase, getSettings, setSetting, getSyncStatus, SyncStatus, leaveWorkspace, joinWorkspace, createWorkspace, getAvailableWorkspaces, sysadminGetWorkspaces, sysadminCreateWorkspace, sysadminDeleteWorkspace, WorkspaceListInfo, UserRowFull, getUsers, assignUserWorkspace, triggerSyncPush, triggerSyncPull, resetDbSpecific, nukeCloudWorkspaceData } from '../../lib/api';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { useAuthStore } from '../../store/AuthStore';
import { supabase } from '../../lib/supabase';
import UserManagement from './UserManagement';
import HardwareSettings from './HardwareSettings';
import LanSyncSettings from './LanSyncSettings';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Modal from '../../components/ui/Modal';
import TabBar, { TabItem } from '../../components/ui/TabBar';
import { toast } from '../../components/ui/Toast';

import { usePermissions } from '../../lib/permissions';

import Select from '../../components/ui/Select';
// Keys that should render as a custom styled <Select> instead of a text input
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

// Internal/diagnostic keys owned by other screens (LAN tab, Cloud tab, SetupWizard) — never editable here
const INTERNAL_KEYS = new Set([
  'has_completed_setup', 'workspace_id', 'workspace_name', 'workspace_code', 'last_pull_at', 'auto_sync',
  'lan_role', 'lan_udp_port', 'lan_http_port', 'lan_device_name', 'lan_auto_connect',
  'lan_last_pull_at', 'lan_last_sync_error', 'lan_last_sync_status', 'lan_last_sync_time',
]);

// Curated, ordered system fields with proper labels (raw DB key names never shown)
const SYSTEM_SETTING_FIELDS: { key: string; label: string }[] = [
  { key: 'company_address', label: 'Alamat Toko' },
  { key: 'company_phone', label: 'Nomor Telepon' },
  { key: 'receipt_header', label: 'Header Struk' },
  { key: 'receipt_footer', label: 'Footer Struk' },
  { key: 'tax_rate', label: 'Tarif Pajak (PPN)' },
  { key: 'hpp_method_default', label: 'Metode HPP Default' },
  { key: 'fiscal_year_start', label: 'Awal Tahun Fiskal' },
  { key: 'language', label: 'Bahasa Aplikasi' },
  { key: 'openai_api_key', label: 'OpenAI API Key' },
  { key: 'openai_model', label: 'Model OpenAI' },
];

const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  SYSTEM_SETTING_FIELDS.map(f => [f.key, f.label])
);


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
  const [syncSubTab, setSyncSubTab] = useState<'connection' | 'manage'>('connection');

  // Supabase Cloud interactive states
  const [connectMode, setConnectMode] = useState<'join' | 'create'>('join');
  const [createWsName, setCreateWsName] = useState('');
  const [createWsCode, setCreateWsCode] = useState('');
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [supabasePing, setSupabasePing] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; latency?: number; error?: string }>({ status: 'idle' });
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceListInfo[]>([]);

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

  const handleTestSupabase = async () => {
    setSupabasePing({ status: 'testing' });
    const start = performance.now();
    try {
      const { error } = await supabase.from('workspaces').select('id', { count: 'exact', head: true });
      const latency = Math.round(performance.now() - start);
      if (error) throw error;
      setSupabasePing({ status: 'success', latency });
      setTimeout(() => setSupabasePing({ status: 'idle' }), 7000);
    } catch (e: any) {
      setSupabasePing({ status: 'error', error: e.message || String(e) });
    }
  };

  const handleFetchAvailableWorkspaces = async () => {
    try {
      const list = await getAvailableWorkspaces();
      setAvailableWorkspaces(list);
    } catch (e) {
      console.warn('Could not fetch available workspaces:', e);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = createWsName.trim() || companyName || 'Toko Kivo';
    const trimmedCode = (createWsCode.trim() || trimmedName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)).toUpperCase();
    if (!trimmedName) {
      setJoinError('Silakan masukkan nama workspace.');
      return;
    }
    setIsCreatingWs(true);
    setJoinError(null);
    try {
      const ws = await createWorkspace(trimmedName, trimmedCode);
      setSuccessMsg(`Berhasil membuat & terhubung ke Workspace: ${ws.name} (${ws.code})`);
      setCreateWsName('');
      setCreateWsCode('');
      await loadSyncStatus();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setJoinError(err.message || String(err));
    } finally {
      setIsCreatingWs(false);
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
    handleFetchAvailableWorkspaces();
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
      toast.error('Akses Ditolak', 'Hanya Admin / Owner yang dapat menghapus / mereset database.');
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

  // Curated fields in registry order; anything non-internal and not whitelisted goes to the collapsed advanced block
  const byKey = new Map(configs.map(c => [c.key, c]));
  const knownKeys = new Set(SYSTEM_SETTING_FIELDS.map(f => f.key));
  const generalConfigs = SYSTEM_SETTING_FIELDS
    .map(f => byKey.get(f.key))
    .filter((c): c is { key: string; value: string; description?: string } => Boolean(c));
  const advancedConfigs = configs.filter(
    c => !INTERNAL_KEYS.has(c.key) && !PROFILE_KEYS.includes(c.key) && !MEMBER_KEYS.includes(c.key) && !knownKeys.has(c.key)
  );
  const memberConfigs = configs.filter(c => MEMBER_KEYS.includes(c.key));

  type TabType = 'system' | 'hardware' | 'sync' | 'lan' | 'users';

  const settingTabs: TabItem<TabType>[] = [
    ...(can('settings.general') ? [{ id: 'system' as TabType, label: 'Konfigurasi Umum', icon: Sliders }] : []),
    ...(can('settings.hardware') ? [{ id: 'hardware' as TabType, label: 'Printer & Hardware POS', icon: Printer }] : []),
    ...(can('settings.database') ? [{ id: 'sync' as TabType, label: 'Cloud & Workspace', icon: Globe, badge: syncStatus?.pending_count ? syncStatus.pending_count : undefined }] : []),
    { id: 'lan' as TabType, label: 'Jaringan Lokal (LAN)', icon: Network },
    ...((can('settings.users') || isAdmin) ? [{ id: 'users' as TabType, label: 'Manajemen Pengguna', icon: UserCheck }] : []),
  ];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 flex flex-col gap-5 animate-fade-in w-full">
      {/* Top Navigation Bar with Unified TabBar */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <TabBar
          tabs={settingTabs}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab === 'sync') loadSyncStatus();
          }}
        />
      </div>

      {/* Main Content Areas */}
      {activeTab === 'hardware' ? (
        <HardwareSettings />
      ) : activeTab === 'users' ? (
        <UserManagement />
      ) : activeTab === 'lan' ? (
        <LanSyncSettings />
      ) : activeTab === 'sync' ? (
        <div className="flex flex-col gap-4 w-full">
          {/* Sub Tab Switcher: Only show if user is admin / sysadmin */}
          {(user?.username === 'admin' || isAdmin) && (
            <div className="bg-card p-1 rounded-xl border border-line flex items-center gap-1 overflow-x-auto custom-scrollbar shrink-0 w-fit">
              <button
                type="button"
                onClick={() => setSyncSubTab('connection')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  syncSubTab === 'connection'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-body hover:text-heading hover:bg-muted'
                }`}
              >
                Koneksi & Sinkronisasi
              </button>
              <button
                type="button"
                onClick={() => setSyncSubTab('manage')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  syncSubTab === 'manage'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-body hover:text-heading hover:bg-muted'
                }`}
              >
                Kelola Semua Workspace
              </button>
            </div>
          )}

          {/* Sub-Tab 2: Sysadmin Global Workspace Management */}
          {syncSubTab === 'manage' && (user?.username === 'admin' || isAdmin) ? (
            <SysadminWorkspaceManagement />
          ) : (
            /* Sub-Tab 1: Workspace Connection & Sync Status */
            <div className="flex flex-col gap-4 w-full">

              {/* ── Status Card ── */}
              <div className="bg-card rounded-xl border border-line shadow-xs p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${syncStatus?.workspace_id ? 'bg-success-soft text-success' : 'bg-primary-soft text-primary'}`}>
                      <Globe size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-heading">Cloud &amp; Workspace</h2>
                        {syncStatus?.workspace_id ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-soft text-success border border-success/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                            Terhubung
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-dim border border-line">
                            Belum Terhubung
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-dim mt-0.5">
                        {syncStatus?.workspace_id
                          ? `${syncStatus.workspace_name} · ${syncStatus.workspace_code}`
                          : 'Sinkronisasi multi-cabang via Supabase Cloud'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleTestSupabase}
                      disabled={supabasePing.status === 'testing'}
                      className="px-3 py-1.5 rounded-lg border border-line bg-muted/60 hover:bg-muted text-body hover:text-heading text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      title="Uji koneksi ke Supabase Cloud"
                    >
                      {supabasePing.status === 'testing' ? (
                        <Loader2 size={12} className="animate-spin text-primary" />
                      ) : (
                        <Activity size={12} className="text-primary" />
                      )}
                      <span>
                        {supabasePing.status === 'testing'
                          ? 'Menguji...'
                          : supabasePing.status === 'success'
                          ? `${supabasePing.latency}ms`
                          : supabasePing.status === 'error'
                          ? 'Gagal'
                          : 'Ping'}
                      </span>
                    </button>
                    <button
                      onClick={loadSyncStatus}
                      className="p-1.5 text-dim hover:text-heading rounded-lg hover:bg-muted border border-line transition-all cursor-pointer"
                      title="Segarkan Status"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>

                {/* Metrics row when connected */}
                {syncStatus?.workspace_id && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/40 border border-line flex flex-col gap-0.5">
                      <p className="text-[10px] font-semibold text-dim uppercase tracking-wide">Pending</p>
                      <p className={`text-lg font-bold font-mono ${syncStatus.pending_count > 0 ? 'text-warning' : 'text-heading'}`}>
                        {syncStatus.pending_count}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-line flex flex-col gap-0.5">
                      <p className="text-[10px] font-semibold text-dim uppercase tracking-wide">Gagal</p>
                      <p className={`text-lg font-bold font-mono ${syncStatus.failed_count > 0 ? 'text-danger' : 'text-heading'}`}>
                        {syncStatus.failed_count}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-line flex flex-col gap-0.5">
                      <p className="text-[10px] font-semibold text-dim uppercase tracking-wide">Auto Sync</p>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-bold ${syncStatus.auto_sync ? 'text-success' : 'text-dim'}`}>
                          {syncStatus.auto_sync ? 'Aktif' : 'Nonaktif'}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleToggleAutoSync(!syncStatus.auto_sync)}
                          className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${syncStatus.auto_sync ? 'bg-primary' : 'bg-line'}`}
                          role="switch"
                          aria-checked={syncStatus.auto_sync}
                        >
                          <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-card shadow ring-0 transition duration-200 ${syncStatus.auto_sync ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-line flex flex-col gap-0.5">
                      <p className="text-[10px] font-semibold text-dim uppercase tracking-wide">Terakhir Sync</p>
                      <p className="text-xs font-medium text-heading truncate">
                        {syncStatus.last_synced ? new Date(syncStatus.last_synced).toLocaleTimeString('id-ID') : '—'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Pending Queue Banner ── */}
              {syncStatus && syncStatus.pending_count > 0 && (
                <div className="p-4 rounded-xl bg-warning-soft/70 border border-warning/30 flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <UploadCloud size={16} className="text-warning shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-heading">
                        {syncStatus.pending_count} perubahan menunggu diunggah ke Cloud
                      </p>
                      <p className="text-[11px] text-dim mt-0.5 truncate">
                        {!syncStatus.workspace_id
                          ? 'Hubungkan ke workspace untuk mengunggah otomatis.'
                          : 'Klik Push untuk mengunggah sekarang.'}
                      </p>
                    </div>
                  </div>
                  {syncStatus.workspace_id && (
                    <button
                      onClick={handleManualPush}
                      disabled={isPushing || isPulling}
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isPushing ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                      Push ({syncStatus.pending_count})
                    </button>
                  )}
                </div>
              )}

              {/* ── Actions Card (when connected) ── */}
              {syncStatus?.workspace_id ? (
                <div className="bg-card rounded-xl border border-line shadow-xs p-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleManualPush}
                    disabled={isPushing || isPulling}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {isPushing ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                    Push ke Cloud
                  </button>
                  <button
                    onClick={() => handleManualPull(true)}
                    disabled={isPushing || isPulling}
                    className="px-4 py-2 bg-muted hover:bg-line text-heading font-semibold text-xs rounded-lg border border-line flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {isPulling ? <Loader2 size={13} className="animate-spin" /> : <DownloadCloud size={13} />}
                    Pull dari Cloud
                  </button>

                  <div className="flex-1" />

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setShowSwitchWorkspace(!showSwitchWorkspace)}
                        className="px-3 py-2 rounded-lg border border-line text-body hover:text-heading hover:bg-muted text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Link2 size={13} /> Ganti Workspace
                      </button>
                      <button
                        onClick={handleLeaveWorkspace}
                        className="px-3 py-2 rounded-lg border border-danger/30 text-danger hover:bg-danger-soft text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <LogOut size={13} /> Putuskan
                      </button>
                    </>
                  )}
                </div>
              ) : (
                /* ── Connect / Create Workspace Card ── */
                <div className="bg-card rounded-xl border border-line shadow-xs p-5 space-y-4">
                  {/* Mode Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-line w-fit">
                    <button
                      type="button"
                      onClick={() => setConnectMode('join')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${connectMode === 'join' ? 'bg-card text-heading shadow-xs' : 'text-dim hover:text-heading'}`}
                    >
                      <Link2 size={12} /> Hubungkan Workspace
                    </button>
                    <button
                      type="button"
                      onClick={() => { setConnectMode('create'); if (!createWsName && companyName) setCreateWsName(companyName); }}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${connectMode === 'create' ? 'bg-card text-heading shadow-xs' : 'text-dim hover:text-heading'}`}
                    >
                      <Plus size={12} /> Buat Workspace Baru
                    </button>
                  </div>

                  {joinError && (
                    <div className="p-3 bg-danger-soft border border-danger/30 rounded-lg flex items-center gap-2 text-danger text-xs font-medium">
                      <AlertTriangle size={13} className="shrink-0" />
                      <span>{joinError}</span>
                    </div>
                  )}

                  {connectMode === 'join' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-heading uppercase tracking-wider mb-1">
                            Kode Workspace / Token <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            placeholder="Contoh: WS-ABC123"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-muted/50 text-heading text-xs font-mono font-bold focus:border-primary focus:bg-card outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-heading uppercase tracking-wider mb-1">
                            Password (Opsional)
                          </label>
                          <input
                            type="password"
                            value={joinPassword}
                            onChange={(e) => setJoinPassword(e.target.value)}
                            placeholder="Kosongkan jika tidak ada"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-muted/50 text-heading text-xs focus:border-primary focus:bg-card outline-none transition-all"
                          />
                        </div>
                      </div>

                      {availableWorkspaces.length > 0 && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-line flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-dim">Terdeteksi:</span>
                          {availableWorkspaces.map(ws => (
                            <button
                              key={ws.id}
                              type="button"
                              onClick={() => setJoinCode(ws.code)}
                              className="px-2.5 py-1 rounded-lg bg-card border border-line hover:border-primary text-xs font-mono font-bold transition-all cursor-pointer hover:text-primary"
                            >
                              {ws.name} <span className="text-primary opacity-70">({ws.code})</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-end pt-1">
                        <button
                          onClick={handleJoinWorkspace}
                          disabled={isJoining || !joinCode.trim()}
                          className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {isJoining ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                          {isJoining ? 'Menghubungkan...' : 'Hubungkan Sekarang'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateWorkspace} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-heading uppercase tracking-wider mb-1">
                            Nama Workspace <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            value={createWsName}
                            onChange={(e) => {
                              setCreateWsName(e.target.value);
                              if (!createWsCode) setCreateWsCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase());
                            }}
                            placeholder="Contoh: Kivo Store Pusat"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-muted/50 text-heading text-xs focus:border-primary focus:bg-card outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-heading uppercase tracking-wider mb-1">
                            Kode Workspace
                          </label>
                          <input
                            type="text"
                            value={createWsCode}
                            onChange={(e) => setCreateWsCode(e.target.value.toUpperCase())}
                            placeholder="KIVOPST"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-muted/50 text-heading text-xs font-mono font-bold focus:border-primary focus:bg-card outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={isCreatingWs || !createWsName.trim()}
                          className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {isCreatingWs ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                          {isCreatingWs ? 'Membuat...' : 'Buat & Hubungkan'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Switch Workspace Panel */}
              {showSwitchWorkspace && syncStatus?.workspace_id && (
                <div className="bg-muted/50 rounded-xl border border-line p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Link2 size={14} className="text-primary" />
                    <h4 className="text-xs font-bold text-heading">Pindah ke Workspace Lain</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Kode Workspace / Token Baru"
                      className="w-full px-3 py-2 rounded-lg border border-line bg-card text-heading text-xs font-mono font-bold focus:border-primary outline-none"
                    />
                    <input
                      type="password"
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      placeholder="Password (opsional)"
                      className="w-full px-3 py-2 rounded-lg border border-line bg-card text-heading text-xs focus:border-primary outline-none"
                    />
                  </div>
                  {joinError && (
                    <div className="p-2.5 bg-danger-soft border border-danger/30 rounded-lg flex items-center gap-2 text-danger text-xs">
                      <AlertTriangle size={13} className="shrink-0" />
                      <span>{joinError}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setShowSwitchWorkspace(false)} className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-dim hover:bg-line cursor-pointer">
                      Batal
                    </button>
                    <button
                      onClick={handleJoinWorkspace}
                      disabled={isJoining || !joinCode.trim()}
                      className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isJoining ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                      {isJoining ? 'Menghubungkan...' : 'Hubungkan'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      ) : (
        /* TAB 1: KONFIGURASI UMUM (FULL WIDTH 12-COLUMN GRID) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">

          {/* ── Profil Perusahaan & Cabang (8 Cols) ── */}
          <div className="lg:col-span-8 bg-card rounded-xl border border-line shadow-sm p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-soft text-primary rounded-xl">
                  <Building2 size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-heading">Profil Perusahaan & Cabang</h2>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-primary-soft text-primary border border-primary/20">
                      Kivo v1.3
                    </span>
                  </div>
                  <p className="text-xs text-dim">Identitas utama bisnis yang ditampilkan pada sidebar & nota transaksi</p>
                </div>
              </div>
              {profileSuccess && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-success bg-success-soft dark:bg-success/30 px-3 py-1 rounded-full border border-success/30 animate-fade-in">
                  <CheckCircle2 size={14} /> {profileSuccess}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Company Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-heading uppercase tracking-wide">
                  <Building2 size={13} className="text-primary" /> Nama Perusahaan / Toko
                  {!isOwner && <Lock size={11} className="text-dim ml-1" />}
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  disabled={!isOwner}
                  placeholder="Contoh: Apotek Terang"
                  className={`w-full bg-muted border rounded-xl px-4 py-3 text-sm text-heading font-bold outline-none transition-all ${
                    isOwner
                      ? 'border-line focus:ring-2 focus:ring-primary'
                      : 'border-line dark:border-line opacity-60 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* Branch Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-heading uppercase tracking-wide">
                  <MapPin size={13} className="text-primary" /> Nama Cabang POS
                  {!isAdmin && <Lock size={11} className="text-dim ml-1" />}
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Contoh: Cabang Utama"
                  className={`w-full bg-muted border rounded-xl px-4 py-3 text-sm text-heading font-bold outline-none transition-all ${
                    isAdmin
                      ? 'border-line focus:ring-2 focus:ring-primary'
                      : 'border-line dark:border-line opacity-60 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="py-3 px-6 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl shadow-md shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Simpan Profil Bisnis
                </button>
              </div>
            )}
          </div>

          {/* ── Quick Database Health & Maintenance (4 Cols) ── */}
          {isAdmin && (
            <div className="lg:col-span-4 bg-card rounded-xl border border-line shadow-sm p-6 sm:p-7 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 border-b border-line pb-4">
                  <div className="p-3 bg-success/10 text-success rounded-xl">
                    <Database size={22} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-heading">Kesehatan Database</h2>
                    <p className="text-xs text-dim">SQLite Engine Optimizations</p>
                  </div>
                </div>

                <p className="text-xs text-body leading-relaxed">
                  Jalankan pembersihan rutin VACUUM untuk mengompresi ukuran file database dan mempercepat kueri transaksi kasir.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleExportDB}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-success hover:bg-success text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-success/20"
                >
                  <Download size={15} /> Export Database Backup (.db)
                </button>

                <button
                  onClick={() => setResetTarget('maintenance')}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-muted hover:bg-line dark:hover:bg-line-strong text-heading font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Database size={15} /> Optimize DB (VACUUM)
                </button>

                {successMsg && (
                  <p className="text-xs text-center font-bold text-success animate-fade-in flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={13} /> {successMsg}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── System Preferences & Accounting Config (7 Cols) ── */}
          <div className="lg:col-span-7 bg-card rounded-xl border border-line shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <div className="p-3 bg-primary-soft text-primary rounded-xl">
                <Sliders size={22} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-heading">Konfigurasi Sistem & Keuangan</h2>
                <p className="text-xs text-dim">Metode HPP, mode pajak, dan reset siklus nomor nota</p>
              </div>
              {saving && <Loader2 size={16} className="animate-spin text-primary ml-auto" />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              {generalConfigs.map((c) => (
                <SettingRow key={c.key} config={c} onSave={handleSaveConfig} disabled={!isAdmin} />
              ))}
              {generalConfigs.length === 0 && (
                <p className="text-xs text-dim italic py-4 text-center">Tidak ada variabel sistem tambahan.</p>
              )}
            </div>

            {advancedConfigs.length > 0 && (
              <details className="group border-t border-line pt-3">
                <summary className="text-[11px] font-bold text-dim uppercase tracking-wider cursor-pointer hover:text-heading select-none">
                  Pengaturan Lanjutan ({advancedConfigs.length})
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 pt-3">
                  {advancedConfigs.map((c) => (
                    <SettingRow key={c.key} config={c} onSave={handleSaveConfig} disabled={!isAdmin} />
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* ── Danger Zone / Reset Options (5 Cols) ── */}
          {isAdmin && (
            <div className="lg:col-span-5 bg-card rounded-xl border border-danger/30/80 dark:border-danger/60 shadow-sm p-6 sm:p-7 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-danger-soft dark:border-danger/50 pb-4">
                  <div className="p-3 bg-danger-soft dark:bg-danger/30 text-danger rounded-xl">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-danger dark:text-danger">Danger Zone (Reset Data)</h2>
                    <p className="text-xs text-dim">Hanya untuk Admin — Pembersihan Data</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <button
                      onClick={() => setResetTarget('sales')}
                      disabled={loading}
                      className="w-full py-3 bg-danger-soft dark:bg-danger/30 hover:bg-danger-soft dark:hover:bg-danger/40 text-danger dark:text-danger border border-danger/30 dark:border-danger/60 rounded-xl font-bold text-xs transition-all cursor-pointer"
                    >
                      Reset Data Penjualan (Sales)
                    </button>
                    <p className="text-[10px] text-dim text-center">Menghapus riwayat transaksi POS & jurnal kasir.</p>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => setResetTarget('inventory')}
                      disabled={loading}
                      className="w-full py-3 bg-danger-soft dark:bg-danger/30 hover:bg-danger-soft dark:hover:bg-danger/40 text-danger dark:text-danger border border-danger/30 dark:border-danger/60 rounded-xl font-bold text-xs transition-all cursor-pointer"
                    >
                      Reset Data Stok & Pembelian
                    </button>
                    <p className="text-[10px] text-dim text-center">Menghapus mutasi stok dan kartu stok.</p>
                  </div>

                  <div className="space-y-1 pt-1">
                    <button
                      onClick={() => setResetTarget('all')}
                      disabled={loading}
                      className="w-full py-3.5 bg-danger hover:bg-danger text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-danger/20 cursor-pointer"
                    >
                      Reset Semua Data Local (Factory Reset)
                    </button>
                    <p className="text-[10px] text-dim text-center">Menghapus seluruh Master Data & Transaksi Lokal.</p>
                  </div>

                  {(user?.role === 'owner' || user?.role === 'sysadmin') && (
                    <div className="space-y-1 pt-3 border-t border-danger/30/60 dark:border-danger/60">
                      <button
                        onClick={() => setNukeStep(1)}
                        disabled={loading}
                        className="w-full py-3.5 bg-danger hover:opacity-90 text-white font-black text-xs rounded-lg transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} /> Nuke Supabase Cloud Data (Owner Only)
                      </button>
                      <p className="text-[10px] text-danger font-bold text-center">PERINGATAN: Menghapus SELURUH database di Supabase Cloud!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Membership Configurations Card */}
          {memberConfigs.length > 0 && (
            <div className="lg:col-span-12 bg-card rounded-xl border border-line shadow-sm p-6 sm:p-7">
              <div className="flex items-center gap-3 border-b border-line pb-4 mb-5">
                <div className="p-3 bg-accent/10 text-accent rounded-xl">
                  <UserCheck size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-heading">Membership Settings</h2>
                  <p className="text-xs text-dim">Konfigurasi durasi dan diskon untuk tier Member dan VIP</p>
                </div>
                {saving && <Loader2 size={14} className="animate-spin text-dim ml-auto" />}
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
          iconBg="bg-danger-soft dark:bg-danger/30 text-danger"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="flex-1 py-3 border border-line rounded-xl text-xs font-bold text-body hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetDB}
                disabled={resetTarget !== 'maintenance' && confirmText !== 'DELETE'}
                className="flex-[1.5] py-3 bg-danger hover:bg-danger text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-danger/20"
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
                <p className="text-xs text-body leading-relaxed">
                  Menjalankan <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">VACUUM</code> dan <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">ANALYZE</code> untuk mengompresi database SQLite.
                </p>
                <p className="text-xs font-bold text-success dark:text-success">
                  Aplikasi mungkin jeda sejenak. Tidak ada data yang dihapus.
                </p>
              </>
            ) : (
              <>
                <div className="p-4 bg-danger-soft dark:bg-danger/20 border border-danger/30 dark:border-danger/50 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-danger uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={13} /> Tindakan Permanen
                  </p>
                  <p className="text-xs text-danger dark:text-danger leading-relaxed">
                    {resetTarget === 'sales' && 'Seluruh transaksi kasir, pembayaran, dan laporan penjualan akan dihapus permanen.'}
                    {resetTarget === 'inventory' && 'Seluruh kartu stok, mutasi barang, dan PO pembelian akan dihapus.'}
                    {resetTarget === 'all' && 'SELURUH DATA (Master Data, Stok, Sales) akan dihapus total dan aplikasi kembali ke kondisi awal.'}
                  </p>
                </div>
                <p className="text-xs text-dim">
                  Ketik <strong>DELETE</strong> untuk mengonfirmasi:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-muted border border-danger/30 dark:border-danger/80 rounded-xl px-4 py-3 text-sm font-bold text-danger outline-none uppercase font-mono"
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
          iconBg="bg-danger/10 text-danger"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setNukeStep(0)}
                className="flex-1 py-3 border border-line rounded-xl text-xs font-bold text-body hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => setNukeStep(2)}
                className="flex-[1.5] py-3 bg-danger hover:bg-danger text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-danger/20"
              >
                Lanjut ke Konfirmasi Akhir →
              </button>
            </div>
          }
        >
          <div className="text-center space-y-4 py-2">
            <h3 className="text-lg font-black text-heading">Hapus Seluruh Data Supabase Cloud?</h3>
            <p className="text-xs text-dim leading-relaxed">
              Tindakan ini akan mengosongkan <strong>SELURUH master data, produk, dan transaksi</strong> pada database Cloud Supabase untuk workspace ini.<br/><br/>
              <strong className="text-danger">TINDAKAN INI TIDAK DAPAT DIBATALKAN ATAU DIKEMBALIKAN!</strong>
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
          iconBg="bg-danger/15 text-danger"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => { setNukeStep(0); setNukeConfirmText(''); }}
                className="flex-1 py-3 border border-line rounded-xl text-xs font-bold text-body hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleNukeCloudData}
                disabled={nukeConfirmText !== 'NUKE CLOUD DATA' || loading}
                className="flex-[1.5] py-3 bg-danger hover:bg-danger text-white rounded-xl text-xs font-black transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-danger/30"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Memproses Nuke...' : (
                  <span className="flex items-center gap-1.5">
                    <Flame size={14} /> EKSEKUSI HAPUS CLOUD
                  </span>
                )}
              </button>
            </div>
          }
        >
          <div className="text-center space-y-4 py-2">
            <h3 className="text-lg font-black text-heading">Ketik untuk Mengonfirmasi Nuke</h3>
            <p className="text-xs text-dim leading-relaxed">
              Ketik frasa <code className="bg-danger-soft dark:bg-danger text-danger font-mono px-1.5 py-0.5 rounded font-bold">NUKE CLOUD DATA</code> di bawah ini untuk membuka tombol eksekusi:
            </p>
            <input
              type="text"
              placeholder="NUKE CLOUD DATA"
              value={nukeConfirmText}
              onChange={e => setNukeConfirmText(e.target.value)}
              className="w-full bg-muted border-2 border-danger/50 rounded-xl px-4 py-3 text-sm font-black text-danger outline-none uppercase font-mono text-center tracking-wider focus:ring-2 focus:ring-danger"
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
        className={`w-full flex items-center justify-between bg-card border border-line rounded-xl px-4 py-2.5 text-xs font-extrabold text-heading outline-none transition-all shadow-xs ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-primary dark:hover:border-primary focus:ring-2 focus:ring-primary/30 cursor-pointer'
        }`}
      >
        <span className="truncate">{selectedOpt?.label || value}</span>
        <ChevronDown
          size={15}
          className={`text-dim transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 left-0 top-full mt-1.5 z-50 bg-card dark:bg-[#0F172A] border border-line rounded-xl shadow-2xl py-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-fade-in duration-150">
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
                      ? 'bg-primary-soft text-primary dark:bg-primary-soft dark:text-accent font-extrabold'
                      : 'text-heading hover:bg-muted/80'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <CheckCircle2 size={14} className="text-primary shrink-0 ml-2" />}
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
      const msg = await invoke<string>('apply_hpp_retroactive', { method: val });
      toast.success('HPP diterapkan', msg);
    } catch (e) {
      toast.error('Gagal menerapkan HPP', String(e));
    } finally {
      setApplyingHpp(false);
    }
  };

  return (
    <div className="space-y-1.5 min-w-0">
      <label className="block text-xs font-bold text-heading">
        {FIELD_LABELS[config.key] || config.key.replace(/_/g, ' ')}
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
            className="flex-1 bg-input border border-line rounded-lg px-3 py-2 text-xs font-semibold text-heading outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        )}

        {(config.key === 'hpp_method' || config.key === 'hpp_method_default') && (
          <button
            onClick={handleApplyHpp}
            disabled={applyingHpp || disabled}
            className="px-3.5 py-2 bg-primary text-white font-bold text-xs rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {applyingHpp ? 'Applying...' : 'Apply HPP'}
          </button>
        )}
      </div>
      {config.description && <p className="text-[11px] text-dim">{config.description}</p>}
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
  const [assignPick, setAssignPick] = useState('');
  const [assigningUser, setAssigningUser] = useState<string | null>(null); // user_id being assigned
  const [wsToDelete, setWsToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingWsId, setDeletingWsId] = useState<string | null>(null);

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

  const handleDeleteWorkspace = async () => {
    if (!wsToDelete) return;
    setDeletingWsId(wsToDelete.id);
    try {
      await sysadminDeleteWorkspace(wsToDelete.id);
      toast.success('Workspace Dihapus', `Workspace "${wsToDelete.name}" berhasil dihapus.`);
      setWsToDelete(null);
      await loadData();
    } catch (e: any) {
      toast.error('Gagal Menghapus Workspace', e.message || String(e));
    } finally {
      setDeletingWsId(null);
    }
  };

  const handleAssignWorkspace = async (userId: string, workspaceId: string | null) => {
    setAssigningUser(userId);
    try {
      await assignUserWorkspace(userId, workspaceId);
      await loadData();
    } catch (e: any) {
      toast.error('Gagal Mengassign Workspace', e.message || String(e));
    } finally {
      setAssigningUser(null);
    }
  };

  const getUsersInWorkspace = (wsId: string) => allUsers.filter(u => u.workspace_id === wsId);
  const getUnassignedUsers = () => allUsers.filter(u => !u.workspace_id);

  return (
    <div className="bg-card rounded-xl border border-line shadow-xs p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-soft text-primary rounded-xl shrink-0">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-heading">System Admin Workspaces</h2>
            <p className="text-xs text-dim">Kelola seluruh workspace cloud dan assign anggota tim</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          + Workspace Baru
        </button>
      </div>

      {error && (
        <div className="p-3 bg-danger-soft border border-danger/30 text-danger rounded-lg text-xs font-medium">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 bg-muted/50 rounded-xl border border-line space-y-3 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-dim uppercase tracking-wider block mb-1">Nama Workspace</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Apotek Terang Pusat"
                className="w-full px-3 py-2 bg-card border border-line rounded-lg focus:outline-none focus:border-primary text-xs font-semibold text-heading"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-dim uppercase tracking-wider block mb-1">Kode Unik</label>
              <input
                type="text"
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                placeholder="e.g. TERANG-01"
                className="w-full px-3 py-2 bg-card border border-line rounded-lg focus:outline-none focus:border-primary uppercase font-mono text-xs font-bold text-heading"
                maxLength={32}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowCreate(false)} className="px-3.5 py-1.5 text-xs font-medium text-dim hover:bg-line rounded-lg">Batal</button>
            <button type="submit" disabled={creating} className="px-4 py-1.5 text-xs font-semibold bg-primary text-white hover:bg-primary-hover rounded-lg flex items-center gap-1.5 shadow-xs">
              {creating && <Loader2 size={13} className="animate-spin" />}
              Buat Workspace
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : workspaces.length === 0 ? (
        <div className="text-center p-8 text-dim text-xs">Tidak ada workspace cloud.</div>
      ) : (
        <div className="space-y-2.5">
          {workspaces.map(ws => {
            const wsUsers = getUsersInWorkspace(ws.id);
            const isExpanded = expandedWs === ws.id;
            return (
              <div key={ws.id} className="border border-line rounded-xl overflow-hidden bg-card">
                {/* Workspace header */}
                <div
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => setExpandedWs(isExpanded ? null : ws.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                      <Globe size={16} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs text-heading truncate">{ws.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-[10px] font-mono text-primary bg-primary-soft px-1.5 py-0.2 rounded font-semibold">{ws.code}</code>
                        <span className="text-[10px] text-dim">{wsUsers.length} anggota</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Delete Workspace Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWsToDelete({ id: ws.id, name: ws.name });
                      }}
                      disabled={deletingWsId === ws.id}
                      className="p-1.5 text-dim hover:text-danger hover:bg-danger-soft rounded-lg transition-colors cursor-pointer"
                      title="Hapus Workspace Ini"
                    >
                      <Trash2 size={14} />
                    </button>
                    <span className="text-dim text-xs p-1">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded: member list + assign new member */}
                {isExpanded && (
                  <div className="border-t border-line bg-muted/40 p-3 space-y-2">
                    {wsUsers.length === 0 ? (
                      <p className="text-xs text-dim italic py-1">Belum ada anggota di workspace ini.</p>
                    ) : wsUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between py-1.5 px-2.5 bg-card rounded-lg border border-line">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-heading truncate">{u.name}</p>
                            <p className="text-[10px] text-dim truncate">@{u.username} · {u.role}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssignWorkspace(u.id, null)}
                          disabled={assigningUser === u.id}
                          className="text-[10px] px-2 py-1 text-danger hover:bg-danger-soft border border-danger/30 rounded-md font-semibold transition-colors disabled:opacity-50"
                          title="Lepas dari workspace ini"
                        >
                          {assigningUser === u.id ? '...' : 'Lepas'}
                        </button>
                      </div>
                    ))}

                    {/* Add user to workspace */}
                    {getUnassignedUsers().length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <Select
                          className="flex-1"
                          value={assignPick}
                          onChange={v => {
                            if (v) {
                              handleAssignWorkspace(v, ws.id);
                              setAssignPick('');
                            }
                          }}
                        >
                          <option value="" disabled>+ Assign user ke workspace ini...</option>
                          {getUnassignedUsers().map(u => (
                            <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                          ))}
                        </Select>
                      </div>
                    )}
                    {getUnassignedUsers().length === 0 && wsUsers.length > 0 && (
                      <p className="text-[10px] text-dim italic pt-1">Semua user sudah di-assign ke workspace.</p>
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
        <div className="mt-2 p-3.5 bg-warning-soft border border-warning/30 rounded-xl">
          <p className="text-xs font-bold text-warning uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <AlertTriangle size={13} /> User Tanpa Workspace ({getUnassignedUsers().length})
          </p>
          <div className="space-y-1.5">
            {getUnassignedUsers().map(u => (
              <div key={u.id} className="flex items-center justify-between">
                <span className="text-xs text-heading">{u.name} <span className="text-dim">(@{u.username})</span></span>
                <Select
                  className="text-[10px]"
                  value={assignPick}
                  onChange={v => {
                    if (v) {
                      handleAssignWorkspace(u.id, v);
                      setAssignPick('');
                    }
                  }}
                >
                  <option value="" disabled>Assign ke workspace...</option>
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Workspace Confirmation Modal */}
      {wsToDelete && (
        <ConfirmModal
          title="Hapus Workspace Cloud?"
          message={`Anda yakin ingin menghapus workspace "${wsToDelete.name}"? Tindakan ini akan menghapus workspace dari database Supabase Cloud secara permanen.`}
          confirmLabel={deletingWsId ? 'Menghapus...' : 'Ya, Hapus Workspace'}
          cancelLabel="Batal"
          variant="danger"
          onConfirm={handleDeleteWorkspace}
          onCancel={() => setWsToDelete(null)}
        />
      )}
    </div>
  );
}
