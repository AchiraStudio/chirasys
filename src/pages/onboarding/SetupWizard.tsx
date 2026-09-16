import { useState } from 'react';
import { 
  Building2, Cloud, ShieldCheck, CheckCircle2, 
  ArrowRight, ArrowLeft, Store, Users, FileSpreadsheet,
  Lock, Eye, EyeOff, Sparkles, Server, Check,
  AlertCircle, Loader2, Upload, DollarSign, MapPin, Phone,
  Sun, Moon, Pill, ShoppingCart, Coffee, Wrench, Briefcase,
  KeyRound, Download, ExternalLink, Copy, CheckCheck, Zap
} from 'lucide-react';
import { 
  setSetting, 
  createWorkspace, 
  joinWorkspace, 
  createUser, 
  getUsers, 
  loginUser,
  importItemsExcel,
  triggerSyncPull,
  WorkspaceInfo,
  setCloudConfig,
  testCloudConnection,
  getBootstrapSql,
  openBrowserUrl
} from '../../lib/api';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useAuthStore } from '../../store/AuthStore';
import { supabase, updateSupabaseCredentials, getSavedSupabaseCredentials } from '../../lib/supabase';
import KivoLogo from '../../components/common/KivoLogo';
import TitleBar from '../../components/TitleBar';
import { useTheme } from '../../components/ThemeProvider';

import Select from '../../components/ui/Select';
type SetupMode = 'new' | 'join' | 'restore';

interface SetupWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

const BUSINESS_TYPES = [
  { id: 'pharmacy', label: 'Apotek & Farmasi', icon: Pill, desc: 'Batch, kadaluarsa & resep' },
  { id: 'retail', label: 'Retail & Minimarket', icon: ShoppingCart, desc: 'Scan barcode & grosir' },
  { id: 'fnb', label: 'F&B, Kafe & Resto', icon: Coffee, desc: 'Kasir cepat & pesanan meja' },
  { id: 'hardware', label: 'Toko Bangunan & Teknik', icon: Wrench, desc: 'Multi-satuan & faktur hutang' },
  { id: 'general', label: 'Usaha Dagang & Jasa', icon: Briefcase, desc: 'Katalog fleksibel serbaguna' },
];

export default function SetupWizard({ onComplete, onCancel }: SetupWizardProps) {
  const [step, setStep] = useState<number>(0);
  const [mode, setMode] = useState<SetupMode>('new');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setAuth } = useAuthStore();
  const { theme, setTheme } = useTheme();

  // ─── Mode NEW: Store Identity ───
  const [companyName, setCompanyName] = useState('Kivo Store');
  const [branchName, setBranchName] = useState('Cabang Utama');
  const [businessType, setBusinessType] = useState('retail');
  const [currency, setCurrency] = useState('IDR');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // ─── Mode NEW: Cloud & Workspace ───
  const [enableCloud, setEnableCloud] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('Kivo Store');
  const [workspaceCode, setWorkspaceCode] = useState('');
  const [createdWorkspace, setCreatedWorkspace] = useState<WorkspaceInfo | null>(null);

  // ─── Mode NEW: BYOK Cloud (Supabase) ───
  const [supabaseUrl, setSupabaseUrl] = useState(() => getSavedSupabaseCredentials().url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => getSavedSupabaseCredentials().anonKey);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    latency?: number;
    error?: string;
  }>({ status: 'idle' });
  const [copiedSchema, setCopiedSchema] = useState(false);

  // ─── Mode NEW: Kivo AI (OpenAI) ───
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('kivo_openai_api_key') || localStorage.getItem('chirasys_openai_api_key') || '');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  // ─── Mode NEW: Owner Account ───
  const [ownerName, setOwnerName] = useState('Pemilik Usaha');
  const [ownerUsername, setOwnerUsername] = useState('owner');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ─── Mode NEW: Seed Config ───
  const [hppMethod, setHppMethod] = useState<'avg' | 'fifo' | 'lifo'>('avg');
  const [taxRate, setTaxRate] = useState('0');
  const [memberDiscount, setMemberDiscount] = useState('5');
  const [vipDiscount, setVipDiscount] = useState('10');
  const [importedRowCount, setImportedRowCount] = useState<number | null>(null);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  // ─── Mode JOIN State ───
  const [joinCodeOrToken, setJoinCodeOrToken] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinTab, setJoinTab] = useState<'existing' | 'new_cashier'>('existing');
  const [joinCashierName, setJoinCashierName] = useState('Kasir 1');
  const [joinUsername, setJoinUsername] = useState('');
  const [joinUserPassword, setJoinUserPassword] = useState('');
  const [joinConfirmPassword, setJoinConfirmPassword] = useState('');

  // ─── Mode RESTORE State ───
  const [restoreCode, setRestoreCode] = useState('');
  const [restoreWsPassword, setRestoreWsPassword] = useState('');
  const [restoreUsername, setRestoreUsername] = useState('');
  const [restorePassword, setRestorePassword] = useState('');

  // Auto-generate workspace code proposal when companyName changes
  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val);
    setWorkspaceName(val);
    const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    if (!workspaceCode || workspaceCode.startsWith('KV-')) {
      setWorkspaceCode(`KV-${clean || 'STORE'}-${randomSuffix}`);
    }
  };

  const handleTestCloudConnection = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setSupabaseTestStatus({ status: 'error', error: 'Masukkan Supabase Project URL dan Anon Key terlebih dahulu.' });
      return;
    }
    setTestingSupabase(true);
    setSupabaseTestStatus({ status: 'testing' });
    try {
      const res = await testCloudConnection(supabaseUrl.trim(), supabaseAnonKey.trim());
      if (res.success) {
        setSupabaseTestStatus({ status: 'success', latency: res.latency_ms });
      } else {
        setSupabaseTestStatus({ status: 'error', error: res.error || 'Gagal terhubung ke Supabase.' });
      }
    } catch (e: any) {
      setSupabaseTestStatus({ status: 'error', error: e.message || String(e) });
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleCopySchemaNotice = async () => {
    try {
      const sql = await getBootstrapSql();
      await navigator.clipboard.writeText(sql);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 3500);
    } catch (e: any) {
      console.error('Gagal mengambil skema SQL:', e);
      setError('Gagal menyalin skema SQL: ' + (e.message || String(e)));
    }
  };

  // ─── MODE NEW: Step 2 Cloud Next ───
  const handleNewStep2Next = async () => {
    setError('');
    if (enableCloud) {
      if (!supabaseUrl.trim()) {
        setError('Supabase Project URL wajib diisi jika Kivo Cloud aktif.');
        return;
      }
      if (!supabaseAnonKey.trim()) {
        setError('Supabase Anon Public Key wajib diisi jika Kivo Cloud aktif.');
        return;
      }
      if (!workspaceCode.trim()) {
        setError('Kode workspace tidak boleh kosong jika Kivo Cloud aktif.');
        return;
      }
      setLoading(true);
      try {
        // Persist cloud credentials to SQLite and dynamic client
        await setCloudConfig(supabaseUrl.trim(), supabaseAnonKey.trim());
        updateSupabaseCredentials(supabaseUrl.trim(), supabaseAnonKey.trim());

        const ws = await createWorkspace(workspaceName.trim() || companyName, workspaceCode.trim().toUpperCase());
        setCreatedWorkspace(ws);
        setStep(3);
      } catch (err: any) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep(3);
  };

  // ─── MODE NEW: Step 3 Owner Next ───
  const handleNewStep3Next = () => {
    setError('');
    if (!ownerName.trim()) {
      setError('Nama pemilik wajib diisi.');
      return;
    }
    if (!ownerUsername.trim()) {
      setError('Username pemilik wajib diisi.');
      return;
    }
    if (!ownerPassword || ownerPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (ownerPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    setStep(4);
  };

  // ─── Excel File Import ───
  const handlePickExcel = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx', 'xls'] }],
      });
      if (!selected || typeof selected !== 'string') return;

      setLoading(true);
      setError('');
      const res = await importItemsExcel(selected);
      if (res.success) {
        setImportedRowCount(res.rows_imported);
        setImportedFileName(selected.split(/[\\/]/).pop() || 'File Excel');
      } else {
        setError(`Gagal import: ${res.errors.join(', ')}`);
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── MODE NEW: Final Finish ───
  const handleNewFinish = async () => {
    setLoading(true);
    setError('');
    try {
      const wsId = createdWorkspace?.id || null;

      // 1. Create or Update Owner Account
      const users = await getUsers().catch(() => []);
      const existingUser = users.find(u => u.username.toLowerCase() === ownerUsername.trim().toLowerCase());

      if (existingUser) {
        await invoke('update_user', {
          id: existingUser.id,
          name: ownerName.trim(),
          username: ownerUsername.trim().toLowerCase(),
          role: 'owner',
          workspaceId: wsId,
        });
        await invoke('reset_user_password', {
          id: existingUser.id,
          newPassword: ownerPassword,
        });
      } else {
        await createUser(
          ownerName.trim(),
          ownerUsername.trim().toLowerCase(),
          ownerPassword,
          'owner',
          wsId
        );
      }

      // 2. Persist Global Settings
      const settingsToSave: [string, string][] = [
        ['has_completed_setup', 'true'],
        ['company_name', companyName.trim() || 'Kivo Store'],
        ['branch_name', branchName.trim() || 'Cabang Utama'],
        ['business_type', businessType],
        ['currency', currency],
        ['company_address', companyAddress.trim()],
        ['company_phone', companyPhone.trim()],
        ['hpp_method_default', hppMethod],
        ['tax_rate', taxRate || '0'],
        ['tier_member_discount', memberDiscount || '5'],
        ['tier_vip_discount', vipDiscount || '10'],
        ['receipt_header', (companyName.trim() || 'KIVO STORE').toUpperCase()],
        ['receipt_footer', 'Terima kasih atas kunjungan Anda!'],
        ['auto_sync', enableCloud ? 'true' : 'false'],
        ['lan_auto_connect', 'false'],
      ];

      for (const [key, value] of settingsToSave) {
        await setSetting(key, value);
      }

      if (openaiApiKey.trim()) {
        await setSetting('openai_api_key', openaiApiKey.trim());
        localStorage.setItem('kivo_openai_api_key', openaiApiKey.trim());
      }
      if (enableCloud && supabaseUrl.trim() && supabaseAnonKey.trim()) {
        await setCloudConfig(supabaseUrl.trim(), supabaseAnonKey.trim());
        updateSupabaseCredentials(supabaseUrl.trim(), supabaseAnonKey.trim());
      }

      // 3. Log in automatically
      const loginRes = await loginUser(ownerUsername.trim().toLowerCase(), ownerPassword);
      if (loginRes.supabase_token) {
        await supabase.auth.setSession({ access_token: loginRes.supabase_token, refresh_token: '' });
      }
      setAuth(loginRes.token, loginRes.user);

      onComplete();
    } catch (err: any) {
      console.error('Setup failed:', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── MODE JOIN: Step 1 Next ───
  const handleJoinStep1Next = async () => {
    setError('');
    if (!joinCodeOrToken.trim()) {
      setError('Silakan masukkan Kode Workspace atau Token Undangan.');
      return;
    }
    setLoading(true);
    try {
      if (supabaseUrl.trim() && supabaseAnonKey.trim()) {
        await setCloudConfig(supabaseUrl.trim(), supabaseAnonKey.trim());
        updateSupabaseCredentials(supabaseUrl.trim(), supabaseAnonKey.trim());
      }
      const ws = await joinWorkspace(joinCodeOrToken.trim(), joinPassword || undefined);
      setCreatedWorkspace(ws);
      setStep(2);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── MODE JOIN: Step 2 Next ───
  const handleJoinStep2Next = async () => {
    setError('');
    setLoading(true);
    try {
      const wsId = createdWorkspace?.id || null;
      if (joinTab === 'existing') {
        if (!joinUsername.trim() || !joinUserPassword) {
          setError('Username dan password wajib diisi.');
          setLoading(false);
          return;
        }
        // Pull latest users from cloud first
        await triggerSyncPull(true).catch(() => {});
        const loginRes = await loginUser(joinUsername.trim().toLowerCase(), joinUserPassword);
        if (loginRes.supabase_token) {
          await supabase.auth.setSession({ access_token: loginRes.supabase_token, refresh_token: '' });
        }
        setAuth(loginRes.token, loginRes.user);
      } else {
        if (!joinCashierName.trim() || !joinUsername.trim() || !joinUserPassword) {
          setError('Semua data kasir baru wajib diisi.');
          setLoading(false);
          return;
        }
        if (joinUserPassword !== joinConfirmPassword) {
          setError('Konfirmasi password tidak cocok.');
          setLoading(false);
          return;
        }
        await createUser(
          joinCashierName.trim(),
          joinUsername.trim().toLowerCase(),
          joinUserPassword,
          'staff',
          wsId
        );
        const loginRes = await loginUser(joinUsername.trim().toLowerCase(), joinUserPassword);
        if (loginRes.supabase_token) {
          await supabase.auth.setSession({ access_token: loginRes.supabase_token, refresh_token: '' });
        }
        setAuth(loginRes.token, loginRes.user);
      }
      setStep(3);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── MODE JOIN: Finish ───
  const handleJoinFinish = async () => {
    setLoading(true);
    try {
      await setSetting('has_completed_setup', 'true');
      if (createdWorkspace?.name) {
        await setSetting('company_name', createdWorkspace.name);
      }
      await setSetting('branch_name', 'Titik Kasir');
      await setSetting('auto_sync', 'false');
      await setSetting('lan_auto_connect', 'false');
      await triggerSyncPull(true).catch(() => {});
      onComplete();
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── MODE RESTORE: Step 1 Next ───
  const handleRestoreStep1Next = async () => {
    setError('');
    if (!restoreCode.trim()) {
      setError('Kode Toko / Workspace cloud wajib diisi.');
      return;
    }
    if (!restoreUsername.trim() || !restorePassword) {
      setError('Username dan password pemilik wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      if (supabaseUrl.trim() && supabaseAnonKey.trim()) {
        await setCloudConfig(supabaseUrl.trim(), supabaseAnonKey.trim());
        updateSupabaseCredentials(supabaseUrl.trim(), supabaseAnonKey.trim());
      }
      const ws = await joinWorkspace(restoreCode.trim(), restoreWsPassword || undefined);
      setCreatedWorkspace(ws);
      setStep(2);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── MODE RESTORE: Step 2 Download & Restore ───
  const handleRestoreDownload = async () => {
    setError('');
    setLoading(true);
    try {
      // 1. Pull entire database from Supabase into local SQLite
      await triggerSyncPull(true);

      // 2. Authenticate locally with restored owner credentials
      const loginRes = await loginUser(restoreUsername.trim().toLowerCase(), restorePassword);
      if (loginRes.supabase_token) {
        await supabase.auth.setSession({ access_token: loginRes.supabase_token, refresh_token: '' });
      }
      setAuth(loginRes.token, loginRes.user);

      // 3. Mark setup complete
      await setSetting('has_completed_setup', 'true');
      if (createdWorkspace?.name) {
        await setSetting('company_name', createdWorkspace.name);
      }
      await setSetting('auto_sync', 'false');
      await setSetting('lan_auto_connect', 'false');

      setStep(3);
    } catch (err: any) {
      setError(`Gagal memulihkan database: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-background text-heading dark:text-heading flex flex-col justify-between relative overflow-hidden select-none">

      {/* Top Custom Headbar - Unified TitleBar matching the app theme */}
      <TitleBar
        theme="auto"
        leftContent={
          <div className="flex items-center gap-2">
            <KivoLogo size={20} showText={true} textClassName="text-xs font-bold text-heading dark:text-white tracking-tight" />
          </div>
        }
        centerContent={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">
              Kivo Setup
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-primary-soft text-primary dark:bg-primary-soft dark:text-brand-light border border-primary/20 dark:border-primary/30">
              v1.3
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-muted text-dim border border-line">
              {mode === 'new' ? 'Buat Toko Baru' : mode === 'join' ? 'Gabung Workspace' : 'Pulihkan Cloud'}
            </span>
          </div>
        }
        rightExtra={
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-full px-2.5 flex items-center justify-center text-dim hover:text-warning dark:text-body dark:hover:text-warning transition-colors"
            title="Ganti Tema (Terang / Gelap)"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        }
      />

      {/* Main Wizard Content Area - strictly fits within viewport */}
      <main className="relative z-10 flex-1 min-h-0 max-w-4xl w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col justify-center overflow-hidden">

        {/* Global Error Banner */}
        {error && (
          <div className="mb-3 p-3 rounded-xl bg-danger-soft dark:bg-danger/30 border border-danger dark:border-danger/60 text-danger dark:text-danger text-xs flex items-center gap-2.5 animate-fade-in shrink-0">
            <AlertCircle size={15} className="text-danger dark:text-danger shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* Step Cards Container - Fits 100vh with inner scrolling if window is tiny */}
        <div className="bg-card border border-line rounded-xl p-5 sm:p-6 shadow-sm overflow-y-auto max-h-full custom-scrollbar flex flex-col justify-between">

          {/* ══════════════════════════════════════════════════════════════
              SCREEN 0: Welcome & Mode Selection
             ══════════════════════════════════════════════════════════════ */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center max-w-lg mx-auto space-y-1">
                <div className="inline-flex p-2.5 bg-primary-soft border border-primary/20 rounded-xl mb-1">
                  <Sparkles size={22} className="text-primary dark:text-brand-light" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-heading">
                  Selamat Datang di Kivo
                </h2>
                <p className="text-dim text-xs leading-relaxed">
                  Platform manajemen bisnis, kasir pintar (POS), dan multi-cabang Anda. Pilih bagaimana Anda ingin memulai:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Option 1: Fresh Store */}
                <div
                  onClick={() => setMode('new')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    mode === 'new'
                      ? 'border-primary bg-primary-soft ring-1 ring-primary shadow-sm'
                      : 'border-line bg-muted/70 dark:bg-muted/40 hover:border-line-strong dark:hover:border-line-strong hover:bg-muted/70 dark:hover:bg-muted/70'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary dark:text-brand-light flex items-center justify-center">
                      <Store size={20} />
                    </div>
                    <h3 className="font-bold text-heading text-sm">Buat Toko Baru</h3>
                    <p className="text-[11px] text-dim leading-relaxed">
                      Instalasi baru untuk toko atau cabang ini. Data tersimpan lokal di komputer Anda dan siap offline.
                    </p>
                  </div>
                  <div className="pt-3 flex items-center gap-1 text-[11px] font-semibold text-primary dark:text-brand-light">
                    <span>Disarankan</span>
                    <ArrowRight size={13} />
                  </div>
                </div>

                {/* Option 2: Join Cloud */}
                <div
                  onClick={() => setMode('join')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    mode === 'join'
                      ? 'border-primary bg-primary-soft ring-1 ring-primary shadow-sm'
                      : 'border-line bg-muted/70 dark:bg-muted/40 hover:border-line-strong dark:hover:border-line-strong hover:bg-muted/70 dark:hover:bg-muted/70'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary  flex items-center justify-center">
                      <Cloud size={20} />
                    </div>
                    <h3 className="font-bold text-heading text-sm">Gabung Workspace</h3>
                    <p className="text-[11px] text-dim leading-relaxed">
                      Hubungkan perangkat kasir ini ke toko yang sudah berjalan menggunakan Kode Workspace.
                    </p>
                  </div>
                  <div className="pt-3 flex items-center gap-1 text-[11px] font-semibold text-primary ">
                    <span>Multi-Perangkat</span>
                    <ArrowRight size={13} />
                  </div>
                </div>

                {/* Option 3: Restore Cloud */}
                <div
                  onClick={() => setMode('restore')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    mode === 'restore'
                      ? 'border-primary bg-primary-soft ring-1 ring-primary shadow-sm'
                      : 'border-line bg-muted/70 dark:bg-muted/40 hover:border-line-strong dark:hover:border-line-strong hover:bg-muted/70 dark:hover:bg-muted/70'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-accent/20 text-accent dark:text-accent flex items-center justify-center">
                      <Server size={20} />
                    </div>
                    <h3 className="font-bold text-heading text-sm">Pulihkan Cloud</h3>
                    <p className="text-[11px] text-dim leading-relaxed">
                      Masuk dengan akun Pemilik yang telah ada di Cloud untuk unduh otomatis seluruh data toko.
                    </p>
                  </div>
                  <div className="pt-3 flex items-center gap-1 text-[11px] font-semibold text-accent dark:text-accent">
                    <span>Sinkronisasi</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                {onCancel ? (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-line hover:bg-muted text-heading font-semibold rounded-xl flex items-center gap-1.5 text-xs sm:text-sm transition-colors"
                  >
                    <ArrowLeft size={14} />
                    <span>Kembali ke Login</span>
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={() => { setError(''); setStep(1); }}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm shadow-primary/25 flex items-center gap-2 text-xs sm:text-sm transition-colors"
                >
                  <span>Lanjutkan</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              BRANCH 1: BUAT TOKO BARU (mode === 'new')
             ══════════════════════════════════════════════════════════════ */}

          {/* Step 1: Identitas Bisnis */}
          {mode === 'new' && step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-heading">Identitas Bisnis & Toko</h2>
                <p className="text-dim text-xs mt-0.5">
                  Informasi ini tercantum pada struk kasir, faktur penjualan, dan laporan operasional.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Store Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                    Nama Toko / Perusahaan <span className="text-danger">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Building2 size={16} className="absolute left-3 text-dim" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => handleCompanyNameChange(e.target.value)}
                      placeholder="Contoh: Kivo Mart, Apotek Sehat"
                      className="w-full pl-9 pr-3 py-2 bg-muted border border-line rounded-xl text-heading placeholder:text-dim text-xs sm:text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Branch Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                    Nama Cabang / Titik Kasir
                  </label>
                  <div className="relative flex items-center">
                    <Store size={16} className="absolute left-3 text-dim" />
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="Contoh: Cabang Utama, Kasir 1"
                      className="w-full pl-9 pr-3 py-2 bg-muted border border-line rounded-xl text-heading placeholder:text-dim text-xs sm:text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Currency */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                    Mata Uang Utama
                  </label>
                  <div className="relative flex items-center">
                    <DollarSign size={16} className="absolute left-3 text-dim" />
                    <Select
                      value={currency}
                      onChange={(v) => setCurrency(v)}
                      className="w-full pl-9 pr-3 py-2 bg-muted border border-line rounded-xl text-heading text-xs sm:text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="IDR">Rupiah Indonesia (Rp / IDR)</option>
                      <option value="USD">US Dollar ($ / USD)</option>
                      <option value="SGD">Singapore Dollar (S$ / SGD)</option>
                      <option value="MYR">Malaysian Ringgit (RM / MYR)</option>
                    </Select>
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                    Nomor Kontak / WhatsApp
                  </label>
                  <div className="relative flex items-center">
                    <Phone size={16} className="absolute left-3 text-dim" />
                    <input
                      type="text"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full pl-9 pr-3 py-2 bg-muted border border-line rounded-xl text-heading placeholder:text-dim text-xs sm:text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                  Alamat Lengkap Toko
                </label>
                <div className="relative flex items-start">
                  <MapPin size={16} className="absolute left-3 top-2.5 text-dim" />
                  <textarea
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    rows={2}
                    placeholder="Contoh: Jl. Ahmad Yani No. 45, Jakarta Pusat"
                    className="w-full pl-9 pr-3 py-2 bg-muted border border-line rounded-xl text-heading placeholder:text-dim text-xs sm:text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Business Type Selector - with React Lucide Icons */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                  Kategori / Jenis Usaha
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {BUSINESS_TYPES.map((b) => {
                    const IconComp = b.icon;
                    const isSelected = businessType === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => setBusinessType(b.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center gap-1.5 ${
                          isSelected
                            ? 'border-primary bg-primary-soft ring-1 ring-primary'
                            : 'border-line/80 bg-muted/70 dark:bg-card/60 hover:border-line-strong dark:hover:border-line-strong'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-primary-soft text-primary' : 'bg-line/60 dark:bg-muted text-body'}`}>
                          <IconComp size={18} />
                        </div>
                        <p className="font-bold text-xs text-heading truncate w-full">{b.label}</p>
                        <p className="text-[10px] text-dim line-clamp-1">{b.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(0)}
                  className="px-4 py-2 border border-line hover:bg-muted text-heading font-semibold rounded-xl flex items-center gap-1.5 text-xs sm:text-sm transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali</span>
                </button>
                <button
                  onClick={() => {
                    if (!companyName.trim()) {
                      setError('Nama toko wajib diisi.');
                      return;
                    }
                    setError('');
                    setStep(2);
                  }}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm shadow-primary/25 flex items-center gap-1.5 text-xs sm:text-sm transition-all"
                >
                  <span>Lanjutkan</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Kivo Cloud & Workspace (BYOK) */}
          {mode === 'new' && step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-heading">Konektivitas Cloud &amp; AI (Opsional)</h2>
                <p className="text-dim text-xs mt-0.5">
                  Kivo mengadopsi prinsip <strong>Bring Your Own Keys (BYOK)</strong>. Database dan data Anda 100% milik toko Anda sendiri secara aman.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* ── Toggle Kivo Cloud ── */}
                <div 
                  onClick={() => setEnableCloud(!enableCloud)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                    enableCloud 
                      ? 'border-primary bg-primary-soft ring-1 ring-primary' 
                      : 'border-line bg-muted/70 dark:bg-card/50 hover:border-line-strong'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                    enableCloud ? 'bg-primary text-white' : 'border border-line-strong'
                  }`}>
                    {enableCloud && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-heading text-sm">Aktifkan Kivo Cloud (Multi-Cabang &amp; Sync)</h4>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-primary text-white">
                        BYOK Cloud
                      </span>
                    </div>
                    <p className="text-[11px] text-dim leading-relaxed">
                      Hubungkan ke database Supabase pribadi Anda untuk sinkronisasi antar perangkat kasir, cabang, dan cadangan real-time.
                    </p>
                  </div>
                </div>

                {/* ── When Cloud Enabled: Supabase BYOK Config + Workspace Details ── */}
                {enableCloud && (
                  <div className="space-y-3.5 animate-fade-in">
                    {/* Card 1: Supabase BYOK Credentials */}
                    <div className="p-4 rounded-xl bg-card border border-line space-y-3 shadow-xs">
                      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                            <Cloud size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-heading text-xs sm:text-sm">Kredensial Supabase Project</h5>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-success-soft text-success border border-success/30">
                                100% Milik Anda
                              </span>
                            </div>
                            <p className="text-[11px] text-dim mt-0.5">
                              Data disimpan di project Supabase Anda sendiri tanpa perantara.
                            </p>
                          </div>
                        </div>

                        {/* Quick helper links */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openBrowserUrl(supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}` : 'https://supabase.com/dashboard/new')}
                            className="px-2.5 py-1.5 rounded-lg border border-line bg-muted/60 hover:bg-muted text-[11px] font-semibold text-heading flex items-center gap-1 transition-all cursor-pointer"
                            title="Buka Supabase Dashboard di Browser"
                          >
                            <span>Dashboard</span>
                            <ExternalLink size={11} className="text-dim" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCopySchemaNotice}
                            className="px-2.5 py-1.5 rounded-lg border border-line bg-muted/60 hover:bg-muted text-[11px] font-semibold text-heading flex items-center gap-1 transition-all"
                            title="Salin instruksi skema SQL Supabase"
                          >
                            {copiedSchema ? (
                              <>
                                <CheckCheck size={11} className="text-success" />
                                <span className="text-success">Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} className="text-dim" />
                                <span>Salin Skema SQL</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Notice banner for SQL script */}
                      <div className="p-2.5 rounded-lg bg-primary-soft/60 border border-primary/20 text-[11px] text-dim flex items-start gap-2">
                        <Server size={14} className="text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 leading-relaxed">
                          Jalankan file <code className="px-1 py-0.5 rounded bg-card border border-line text-heading font-mono text-[10px]">supabase_full_bootstrap.sql</code> di <strong>Supabase SQL Editor</strong> Anda untuk menyiapkan seluruh 34 tabel multi-cabang.
                        </div>
                      </div>

                      {/* Input: Project URL */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-heading uppercase tracking-wider flex items-center justify-between">
                          <span>Project URL Supabase <span className="text-danger">*</span></span>
                          <span className="text-[10px] text-dim font-normal">Contoh: https://xyzcompany.supabase.co</span>
                        </label>
                        <input
                          type="url"
                          value={supabaseUrl}
                          onChange={(e) => setSupabaseUrl(e.target.value.trim())}
                          placeholder="https://xyzcompany.supabase.co"
                          className="w-full px-3.5 py-2 bg-muted/50 border border-line rounded-xl text-heading font-mono text-xs focus:outline-none focus:border-primary focus:bg-card transition-all"
                        />
                      </div>

                      {/* Input: Anon Key */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-heading uppercase tracking-wider flex items-center justify-between">
                          <span>Anon / Public API Key <span className="text-danger">*</span></span>
                          <span className="text-[10px] text-dim font-normal">Project Settings &gt; API</span>
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type={showAnonKey ? 'text' : 'password'}
                            value={supabaseAnonKey}
                            onChange={(e) => setSupabaseAnonKey(e.target.value.trim())}
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            className="w-full pl-3.5 pr-10 py-2 bg-muted/50 border border-line rounded-xl text-heading font-mono text-xs focus:outline-none focus:border-primary focus:bg-card transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAnonKey(!showAnonKey)}
                            className="absolute right-2.5 p-1 text-dim hover:text-heading transition-colors"
                          >
                            {showAnonKey ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Test Connection Button & Status */}
                      <div className="pt-1 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={handleTestCloudConnection}
                          disabled={testingSupabase || !supabaseUrl || !supabaseAnonKey}
                          className="px-3.5 py-1.5 rounded-lg border border-line bg-muted hover:bg-line text-heading font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          {testingSupabase ? (
                            <>
                              <Loader2 size={13} className="animate-spin text-primary" />
                              <span>Menguji Koneksi...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={13} className="text-primary" />
                              <span>Tes Koneksi Cloud</span>
                            </>
                          )}
                        </button>

                        {supabaseTestStatus.status === 'success' && (
                          <div className="flex items-center gap-1.5 text-xs text-success font-semibold">
                            <CheckCircle2 size={14} />
                            <span>Koneksi Berhasil ({supabaseTestStatus.latency}ms)</span>
                          </div>
                        )}

                        {supabaseTestStatus.status === 'error' && (
                          <div className="flex items-center gap-1.5 text-xs text-danger font-medium truncate max-w-[280px]">
                            <AlertCircle size={14} className="shrink-0" />
                            <span className="truncate">{supabaseTestStatus.error}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Workspace Identifiers */}
                    <div className="p-4 rounded-xl bg-card border border-line space-y-3 shadow-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                          Nama Cloud Workspace
                        </label>
                        <input
                          type="text"
                          value={workspaceName}
                          onChange={(e) => setWorkspaceName(e.target.value)}
                          placeholder="Nama Workspace Toko"
                          className="w-full px-3.5 py-2 bg-muted/50 border border-line rounded-xl text-heading text-xs sm:text-sm focus:outline-none focus:border-primary focus:bg-card transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                            Kode Workspace Unik (Shareable)
                          </label>
                          <span className="text-[10px] text-dim">Huruf besar &amp; angka</span>
                        </div>
                        <input
                          type="text"
                          value={workspaceCode}
                          onChange={(e) => setWorkspaceCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                          placeholder="Contoh: KV-TOKO-01"
                          className="w-full px-3.5 py-2 bg-muted/50 border border-line rounded-xl text-heading font-mono text-xs sm:text-sm tracking-wider focus:outline-none focus:border-primary focus:bg-card transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── When Cloud Disabled: Local Mode Banner ── */}
                {!enableCloud && (
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-line text-xs text-body flex items-start gap-3">
                    <ShieldCheck size={18} className="text-success shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-heading text-xs">Mode Lokal (Offline-First Aktif)</p>
                      <p className="text-[11px] text-dim mt-0.5">
                        Seluruh data penjualan, inventaris, dan akuntansi tersimpan 100% di komputer ini menggunakan SQLite lokal berkecepatan tinggi tanpa ketergantungan internet.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Card 2: Kivo AI Assistant (OpenAI BYOK) ── */}
                <div className="p-4 rounded-xl bg-card border border-line space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-heading text-xs sm:text-sm">Kivo AI Assistant (OpenAI)</h5>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-dim border border-line">
                            Opsional
                          </span>
                        </div>
                        <p className="text-[11px] text-dim mt-0.5">
                          Analisis penjualan otomatis, audit stok cerdas, dan prediksi pesanan barang.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openBrowserUrl('https://platform.openai.com/api-keys')}
                      className="px-2.5 py-1.5 rounded-lg border border-line bg-muted/60 hover:bg-muted text-[11px] font-semibold text-heading flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                      title="Buka OpenAI Platform di Browser"
                    >
                      <span>Dapatkan Key</span>
                      <ExternalLink size={11} className="text-dim" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-heading uppercase tracking-wider flex items-center justify-between">
                      <span>OpenAI API Key</span>
                      <span className="text-[10px] text-dim font-normal">Bisa diisi nanti di Pengaturan</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showOpenaiKey ? 'text' : 'password'}
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value.trim())}
                        placeholder="sk-proj-..."
                        className="w-full pl-3.5 pr-10 py-2 bg-muted/50 border border-line rounded-xl text-heading font-mono text-xs focus:outline-none focus:border-primary focus:bg-card transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                        className="absolute right-2.5 p-1 text-dim hover:text-heading transition-colors"
                      >
                        {showOpenaiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-line hover:bg-muted text-heading font-semibold rounded-xl flex items-center gap-1.5 text-xs sm:text-sm transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali</span>
                </button>
                <button
                  onClick={handleNewStep2Next}
                  disabled={loading}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm shadow-primary/25 flex items-center gap-1.5 text-xs sm:text-sm transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyiapkan Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>{enableCloud ? 'Verifikasi & Lanjut' : 'Lanjut Mode Lokal'}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Akun Pemilik */}
          {mode === 'new' && step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-heading">Buat Akun Pemilik (Owner)</h2>
                <p className="text-dim text-xs mt-0.5">
                  Akun ini memegang hak akses utama (Owner) yang tidak dapat dihapus dan memiliki wewenang penuh atas sistem.
                </p>
              </div>

              <div className="space-y-3">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                    Nama Lengkap Pemilik <span className="text-danger">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Users size={16} className="absolute left-3 text-dim" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full pl-9 pr-3 py-2 bg-muted border border-line rounded-xl text-heading placeholder:text-dim text-xs sm:text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                    Username Login <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={ownerUsername}
                    onChange={(e) => setOwnerUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="Contoh: owner, budi"
                    className="w-full px-3.5 py-2 bg-muted border border-line rounded-xl text-heading font-mono text-xs sm:text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                      Password <span className="text-danger">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Lock size={16} className="absolute left-3 text-dim" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="Min. 6 karakter"
                        className="w-full pl-9 pr-9 py-2 bg-muted border border-line rounded-xl text-heading placeholder:text-dim text-xs sm:text-sm focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-dim hover:text-body dark:hover:text-heading"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                      Ulangi Password <span className="text-danger">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Lock size={16} className="absolute left-3 text-dim" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ketik ulang password"
                        className="w-full pl-9 pr-3 py-2 bg-muted border border-line rounded-xl text-heading placeholder:text-dim text-xs sm:text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-primary-soft border border-primary/20  text-[11px] flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary  shrink-0" />
                  <span>Password dienkripsi menggunakan hashing Bcrypt standard.</span>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-line hover:bg-muted text-heading font-semibold rounded-xl flex items-center gap-1.5 text-xs sm:text-sm transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali</span>
                </button>
                <button
                  onClick={handleNewStep3Next}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm shadow-primary/25 flex items-center gap-1.5 text-xs sm:text-sm transition-all"
                >
                  <span>Lanjutkan</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Konfigurasi Bisnis Awal */}
          {mode === 'new' && step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-heading">Konfigurasi Operasional & Data</h2>
                <p className="text-dim text-xs mt-0.5">
                  Tentukan metode perhitungan modal/HPP, tarif pajak, dan opsi import katalog produk awal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* HPP Method */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                    Metode Perhitungan HPP (COGS)
                  </label>
                  <div className="space-y-1.5">
                    {[
                      { id: 'avg', title: 'Moving Average (Disarankan)', desc: 'Rata-rata tertimbang harga beli barang' },
                      { id: 'fifo', title: 'FIFO (First In, First Out)', desc: 'Barang pertama masuk dijual lebih dulu' },
                      { id: 'lifo', title: 'LIFO (Last In, First Out)', desc: 'Barang terakhir masuk dijual lebih dulu' },
                    ].map((m) => (
                      <label
                        key={m.id}
                        onClick={() => setHppMethod(m.id as any)}
                        className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                          hppMethod === m.id
                            ? 'border-primary bg-primary-soft ring-1 ring-primary'
                            : 'border-line bg-muted/70 dark:bg-card/50 hover:border-line-strong dark:hover:border-line-strong'
                        }`}
                      >
                        <input
                          type="radio"
                          name="hpp"
                          checked={hppMethod === m.id}
                          onChange={() => {}}
                          className="mt-0.5 accent-primary"
                        />
                        <div>
                          <p className="font-bold text-xs text-heading">{m.title}</p>
                          <p className="text-[10px] text-dim">{m.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tax & Tier Discounts */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                      Tarif PPN / Pajak (%)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['0', '11', '12'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTaxRate(val)}
                          className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                            taxRate === val
                              ? 'border-primary bg-primary text-white shadow-xs'
                              : 'border-line bg-muted text-heading hover:border-line-strong dark:hover:border-line-strong'
                          }`}
                        >
                          {val === '0' ? 'Bebas (0%)' : `${val}% PPN`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                        Diskon Member (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={memberDiscount}
                        onChange={(e) => setMemberDiscount(e.target.value)}
                        className="w-full px-3 py-1.5 bg-muted border border-line rounded-xl text-heading text-xs font-mono focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                        Diskon VIP Tier (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={vipDiscount}
                        onChange={(e) => setVipDiscount(e.target.value)}
                        className="w-full px-3 py-1.5 bg-muted border border-line rounded-xl text-heading text-xs font-mono focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Initial Product Catalog Seed / Import */}
              <div className="pt-2 border-t border-line/80">
                <div className="p-3 rounded-xl bg-muted/60 border border-line flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-success/20 text-success dark:text-success flex items-center justify-center shrink-0">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-heading truncate">
                        {importedRowCount !== null
                          ? `Berhasil Memuat ${importedRowCount} Produk dari Excel!`
                          : 'Import Produk dari File Excel (.xlsx)'}
                      </p>
                      <p className="text-[10px] text-dim truncate">
                        {importedFileName ? `File: ${importedFileName}` : 'Opsional. Anda dapat memasukkan produk satu per satu nanti.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePickExcel}
                    disabled={loading}
                    className="px-3 py-1.5 bg-card hover:bg-muted dark:hover:bg-line-strong text-body dark:text-heading font-semibold rounded-xl text-[11px] flex items-center gap-1.5 border border-line-strong dark:border-line-strong transition-colors shrink-0"
                  >
                    <Upload size={13} />
                    <span>{importedRowCount !== null ? 'Ganti File' : 'Pilih File'}</span>
                  </button>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 border border-line hover:bg-muted text-heading font-semibold rounded-xl flex items-center gap-1.5 text-xs sm:text-sm transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali</span>
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm shadow-primary/25 flex items-center gap-1.5 text-xs sm:text-sm transition-all"
                >
                  <span>Lanjutkan</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Review & Selesai */}
          {mode === 'new' && step === 5 && (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-success text-white flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={28} />
              </div>

              <div className="space-y-0.5">
                <h2 className="text-xl font-black text-heading">Semua Siap! Mulai Gunakan Kivo</h2>
                <p className="text-dim text-xs max-w-sm mx-auto">
                  Konfigurasi dasar siap. Klik tombol di bawah untuk menyimpan dan membuka Dashboard Kivo.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left py-1">
                <div className="p-2.5 rounded-xl bg-muted border border-line/80">
                  <span className="text-[9px] uppercase font-bold text-dim">Bisnis</span>
                  <p className="font-bold text-xs text-heading truncate mt-0.5">{companyName}</p>
                  <p className="text-[10px] text-dim truncate">{branchName}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted border border-line/80">
                  <span className="text-[9px] uppercase font-bold text-dim">Owner</span>
                  <p className="font-bold text-xs text-heading truncate mt-0.5">{ownerName}</p>
                  <p className="text-[10px] text-dim font-mono">@{ownerUsername}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted border border-line/80">
                  <span className="text-[9px] uppercase font-bold text-dim">Cloud / Sync</span>
                  <p className="font-bold text-xs text-success dark:text-success truncate mt-0.5">
                    {createdWorkspace ? createdWorkspace.code : enableCloud ? workspaceCode : 'Lokal (Offline)'}
                  </p>
                  <p className="text-[10px] text-dim">SQLite Ready</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted border border-line/80">
                  <span className="text-[9px] uppercase font-bold text-dim">Katalog</span>
                  <p className="font-bold text-xs text-heading truncate mt-0.5">
                    {importedRowCount !== null ? `${importedRowCount} Produk` : 'Katalog Baru'}
                  </p>
                  <p className="text-[10px] text-dim">PPN: {taxRate}%</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  onClick={() => setStep(4)}
                  disabled={loading}
                  className="px-4 py-2 border border-line hover:bg-muted text-heading font-semibold rounded-xl text-xs transition-colors"
                >
                  Ubah
                </button>
                <button
                  onClick={handleNewFinish}
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm shadow-primary/25 flex items-center justify-center gap-2 text-xs sm:text-sm transition-colors active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Menyiapkan Dashboard Kivo...</span>
                    </>
                  ) : (
                    <>
                      <span>Buka Dashboard Kivo</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              BRANCH 2: GABUNG WORKSPACE (mode === 'join')
             ══════════════════════════════════════════════════════════════ */}

          {/* Step 1: Hubungkan ke Workspace */}
          {mode === 'join' && step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-heading">Gabung ke Workspace Toko</h2>
                <p className="text-dim text-xs mt-0.5">
                  Hubungkan komputer kasir ini ke sistem toko yang sudah berjalan menggunakan Kode Workspace atau Token Undangan.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/80 border border-line/80 space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                    Kode Workspace / Token Undangan <span className="text-danger">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <KeyRound size={16} className="absolute left-3 text-dim" />
                    <input
                      type="text"
                      value={joinCodeOrToken}
                      onChange={(e) => setJoinCodeOrToken(e.target.value.trim())}
                      placeholder="Contoh: KV-TOKO-01 atau token invite"
                      className="w-full pl-9 pr-3 py-2.5 bg-card dark:bg-input border border-line rounded-xl text-heading font-mono text-xs sm:text-sm tracking-wider focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                    Password Workspace (Opsional)
                  </label>
                  <div className="relative flex items-center">
                    <Lock size={16} className="absolute left-3 text-dim" />
                    <input
                      type="password"
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      placeholder="Kosongi jika toko tidak diproteksi password"
                      className="w-full pl-9 pr-3 py-2 bg-card dark:bg-input border border-line rounded-xl text-heading text-xs sm:text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-primary-soft border border-primary/20  text-[11px] flex items-center gap-2">
                  <Cloud size={16} className="text-primary  shrink-0" />
                  <span>Katalog produk, harga, dan pengaturan cabang akan otomatis diunduh dari cloud.</span>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(0)}
                  className="px-4 py-2 border border-line hover:bg-muted text-heading font-semibold rounded-xl flex items-center gap-1.5 text-xs sm:text-sm transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali</span>
                </button>
                <button
                  onClick={handleJoinStep1Next}
                  disabled={loading}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm shadow-primary/25 flex items-center gap-1.5 text-xs sm:text-sm transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menghubungkan ke Toko...</span>
                    </>
                  ) : (
                    <>
                      <span>Verifikasi & Lanjut</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Akun Kasir di Komputer Ini */}
          {mode === 'join' && step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-soft dark:bg-success/10 text-success dark:text-success text-[11px] font-semibold mb-1">
                  <Check size={12} strokeWidth={3} />
                  <span>Terhubung ke: {createdWorkspace?.name} ({createdWorkspace?.code})</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-heading">Akun Pengguna di Komputer Ini</h2>
                <p className="text-dim text-xs mt-0.5">
                  Tentukan profil pengguna yang akan digunakan untuk mengoperasikan kasir pada komputer ini.
                </p>
              </div>

              {/* Tab Selector */}
              <div className="flex rounded-xl bg-muted dark:bg-input p-1 border border-line">
                <button
                  type="button"
                  onClick={() => setJoinTab('existing')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    joinTab === 'existing'
                      ? 'bg-card dark:bg-muted text-heading shadow-xs'
                      : 'text-dim hover:text-heading dark:hover:text-white'
                  }`}
                >
                  Login Akun yang Ada
                </button>
                <button
                  type="button"
                  onClick={() => setJoinTab('new_cashier')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    joinTab === 'new_cashier'
                      ? 'bg-card dark:bg-muted text-heading shadow-xs'
                      : 'text-dim hover:text-heading dark:hover:text-white'
                  }`}
                >
                  Daftar Akun Kasir Baru
                </button>
              </div>

              {/* Tab: Existing User */}
              {joinTab === 'existing' && (
                <div className="space-y-3 p-4 rounded-xl bg-muted/80 border border-line/80 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                      Username <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={joinUsername}
                      onChange={(e) => setJoinUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="Username staf / kasir yang terdaftar"
                      className="w-full px-3.5 py-2 bg-card dark:bg-input border border-line rounded-xl text-heading text-xs sm:text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                      Password <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      value={joinUserPassword}
                      onChange={(e) => setJoinUserPassword(e.target.value)}
                      placeholder="Masukkan password akun Anda"
                      className="w-full px-3.5 py-2 bg-card dark:bg-input border border-line rounded-xl text-heading text-xs sm:text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}

              {/* Tab: New Cashier */}
              {joinTab === 'new_cashier' && (
                <div className="space-y-3 p-4 rounded-xl bg-muted/80 border border-line/80 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                      Nama Kasir / Perangkat <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={joinCashierName}
                      onChange={(e) => setJoinCashierName(e.target.value)}
                      placeholder="Contoh: Kasir Depan, Kasir 2"
                      className="w-full px-3.5 py-2 bg-card dark:bg-input border border-line rounded-xl text-heading text-xs sm:text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                        Username Login <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        value={joinUsername}
                        onChange={(e) => setJoinUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        placeholder="Contoh: kasir1"
                        className="w-full px-3.5 py-2 bg-card dark:bg-input border border-line rounded-xl text-heading font-mono text-xs sm:text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                        Password <span className="text-danger">*</span>
                      </label>
                      <input
                        type="password"
                        value={joinUserPassword}
                        onChange={(e) => setJoinUserPassword(e.target.value)}
                        placeholder="Min. 6 karakter"
                        className="w-full px-3.5 py-2 bg-card dark:bg-input border border-line rounded-xl text-heading text-xs sm:text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                      Konfirmasi Password <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      value={joinConfirmPassword}
                      onChange={(e) => setJoinConfirmPassword(e.target.value)}
                      placeholder="Ulangi password"
                      className="w-full px-3.5 py-2 bg-card dark:bg-input border border-line rounded-xl text-heading text-xs sm:text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-line hover:bg-muted text-heading font-semibold rounded-xl flex items-center gap-1.5 text-xs sm:text-sm transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali</span>
                </button>
                <button
                  onClick={handleJoinStep2Next}
                  disabled={loading}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm shadow-primary/25 flex items-center gap-1.5 text-xs sm:text-sm transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyimpan Profil...</span>
                    </>
                  ) : (
                    <>
                      <span>Lanjutkan</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Selesai Gabung Workspace */}
          {mode === 'join' && step === 3 && (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-success text-white flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={28} />
              </div>

              <div className="space-y-0.5">
                <h2 className="text-xl font-black text-heading">Kasir Berhasil Terhubung!</h2>
                <p className="text-dim text-xs max-w-sm mx-auto">
                  Komputer ini sekarang siap digunakan sebagai titik penjualan kasir toko Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left py-1">
                <div className="p-3 rounded-xl bg-muted border border-line/80">
                  <span className="text-[9px] uppercase font-bold text-dim">Workspace Toko</span>
                  <p className="font-bold text-xs text-heading truncate mt-0.5">{createdWorkspace?.name}</p>
                  <p className="text-[10px] text-dim font-mono">{createdWorkspace?.code}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted border border-line/80">
                  <span className="text-[9px] uppercase font-bold text-dim">Akun Pengguna</span>
                  <p className="font-bold text-xs text-heading truncate mt-0.5">@{joinUsername}</p>
                  <p className="text-[10px] text-dim">{joinTab === 'new_cashier' ? joinCashierName : 'Staf Aktif'}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted border border-line/80">
                  <span className="text-[9px] uppercase font-bold text-dim">Mode Sinkronisasi</span>
                  <p className="font-bold text-xs text-success dark:text-success truncate mt-0.5">Real-Time Cloud</p>
                  <p className="text-[10px] text-dim">LAN Mesh Aktif</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  onClick={handleJoinFinish}
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm shadow-primary/25 flex items-center justify-center gap-2 text-xs sm:text-sm transition-colors active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Menyiapkan Kasir Kivo...</span>
                    </>
                  ) : (
                    <>
                      <span>Mulai Gunakan Kasir Kivo</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              BRANCH 3: PULIHKAN CLOUD (mode === 'restore')
             ══════════════════════════════════════════════════════════════ */}

          {/* Step 1: Kredensial Pemilik Cloud */}
          {mode === 'restore' && step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-heading">Pulihkan Toko dari Kivo Cloud</h2>
                <p className="text-dim text-xs mt-0.5">
                  Masukkan Kode Toko dan kredensial Akun Pemilik Anda untuk memverifikasi dan menarik seluruh data toko ke komputer ini.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/80 border border-line/80 space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                    Kode Toko / Workspace Cloud <span className="text-danger">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <KeyRound size={16} className="absolute left-3 text-dim" />
                    <input
                      type="text"
                      value={restoreCode}
                      onChange={(e) => setRestoreCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                      placeholder="Contoh: KV-TOKO-01"
                      className="w-full pl-9 pr-3 py-2.5 bg-card dark:bg-input border border-line rounded-xl text-heading font-mono text-xs sm:text-sm tracking-wider focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                      Username Pemilik <span className="text-danger">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Users size={16} className="absolute left-3 text-dim" />
                      <input
                        type="text"
                        value={restoreUsername}
                        onChange={(e) => setRestoreUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        placeholder="Contoh: owner, budi"
                        className="w-full pl-9 pr-3 py-2 bg-card dark:bg-input border border-line rounded-xl text-heading text-xs sm:text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                      Password Pemilik <span className="text-danger">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Lock size={16} className="absolute left-3 text-dim" />
                      <input
                        type="password"
                        value={restorePassword}
                        onChange={(e) => setRestorePassword(e.target.value)}
                        placeholder="Password akun Anda"
                        className="w-full pl-9 pr-3 py-2 bg-card dark:bg-input border border-line rounded-xl text-heading text-xs sm:text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-heading uppercase tracking-wider">
                    Password Workspace (Opsional)
                  </label>
                  <input
                    type="password"
                    value={restoreWsPassword}
                    onChange={(e) => setRestoreWsPassword(e.target.value)}
                    placeholder="Kosongi jika toko tidak diproteksi password"
                    className="w-full px-3.5 py-2 bg-card dark:bg-input border border-line rounded-xl text-heading text-xs sm:text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(0)}
                  className="px-4 py-2 border border-line hover:bg-muted text-heading font-semibold rounded-xl flex items-center gap-1.5 text-xs sm:text-sm transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali</span>
                </button>
                <button
                  onClick={handleRestoreStep1Next}
                  disabled={loading}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm shadow-primary/25 flex items-center gap-1.5 text-xs sm:text-sm transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Memverifikasi Toko di Cloud...</span>
                    </>
                  ) : (
                    <>
                      <span>Cari Toko di Cloud</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Konfirmasi Pemulihan & Unduh Data */}
          {mode === 'restore' && step === 2 && (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent dark:text-accent flex items-center justify-center mx-auto">
                <Server size={26} />
              </div>

              <div className="space-y-0.5">
                <h2 className="text-xl font-black text-heading">Toko Ditemukan di Cloud</h2>
                <p className="text-dim text-xs max-w-sm mx-auto">
                  Database toko siap diunduh dan disinkronkan ke komputer lokal ini.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted border border-line/80 text-left space-y-2.5 max-w-md mx-auto">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-dim">Nama Toko</span>
                  <span className="font-bold text-heading">{createdWorkspace?.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-dim">Kode Workspace</span>
                  <span className="font-mono font-bold text-primary dark:text-brand-light">{createdWorkspace?.code}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-dim">Akun Pemilik</span>
                  <span className="font-bold text-heading">@{restoreUsername}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-dim">Data Yang Dipulihkan</span>
                  <span className="text-success dark:text-success font-semibold">Produk, Harga, Pelanggan & Laporan</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="px-4 py-2 border border-line hover:bg-muted text-heading font-semibold rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleRestoreDownload}
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm shadow-primary/25 flex items-center justify-center gap-2 text-xs sm:text-sm transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Mengunduh Database Toko...</span>
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      <span>Unduh & Pulihkan Seluruh Data</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Pemulihan Selesai */}
          {mode === 'restore' && step === 3 && (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-success text-white flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={28} />
              </div>

              <div className="space-y-0.5">
                <h2 className="text-xl font-black text-heading">Pemulihan Data Selesai!</h2>
                <p className="text-dim text-xs max-w-sm mx-auto">
                  Seluruh data toko dari Kivo Cloud telah berhasil diunduh dan tersimpan di database lokal komputer ini.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted border border-line/80 text-left max-w-sm mx-auto text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-success dark:text-success font-semibold">
                  <Check size={15} strokeWidth={3} />
                  <span>Katalog Produk & Satuan Harga Pulih</span>
                </div>
                <div className="flex items-center gap-2 text-success dark:text-success font-semibold">
                  <Check size={15} strokeWidth={3} />
                  <span>Daftar Pelanggan, Pemasok & Promosi Pulih</span>
                </div>
                <div className="flex items-center gap-2 text-success dark:text-success font-semibold">
                  <Check size={15} strokeWidth={3} />
                  <span>Hak Akses Pengguna & Cloud Sync Aktif</span>
                </div>
              </div>

              <div className="flex items-center justify-center pt-2">
                <button
                  onClick={onComplete}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm shadow-primary/25 flex items-center justify-center gap-2 text-xs sm:text-sm transition-colors active:scale-[0.98]"
                >
                  <span>Buka Dashboard Kivo</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer Branding - Compact */}
      <footer className="relative z-10 py-1.5 text-center text-[10px] text-dim border-t border-line/60 shrink-0">
        <span>Kivo Platform &copy; {new Date().getFullYear()} — Solusi Cerdas Manajemen Bisnis &amp; Kasir Multi-Perangkat</span>
      </footer>
    </div>
  );
}
