import { useState, useEffect } from 'react';
import {
  Wifi,
  Server,
  Laptop,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Radio,
  DownloadCloud,
  ShieldAlert,
  Loader2,
  Network,
  Unplug,
  Activity,
  Terminal,
  Copy,
  Check,
  Zap
} from 'lucide-react';
import {
  getLanStatus,
  getLanPeers,
  scanLanSubnet,
  setLanRole,
  setLanDeviceName,
  setLanAutoConnect,
  connectLanParent,
  disconnectLanParent,
  parentRequestConnectChild,
  testLanConnection,
  triggerLanSyncNow,
  cloneFromParent,
  LanStatus,
  LanPeer,
  LanConnectionTestResult,
  LanSyncResult
} from '../../lib/api';
import { listen } from '@tauri-apps/api/event';
import Modal from '../../components/ui/Modal';

export default function LanSyncSettings() {
  const [status, setStatus] = useState<LanStatus | null>(null);
  const [peers, setPeers] = useState<LanPeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanningSubnet, setIsScanningSubnet] = useState(false);
  const [parentConnectingChild, setParentConnectingChild] = useState<string | null>(null);
  const [connectingPeer, setConnectingPeer] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Manual IP Connect state
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('3699');
  const [isTestingManual, setIsTestingManual] = useState(false);
  const [isConnectingManual, setIsConnectingManual] = useState(false);
  const [manualTestResult, setManualTestResult] = useState<LanConnectionTestResult | null>(null);

  // Instant Sync state
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncResult, setSyncResult] = useState<LanSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Diagnostics Modal State
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticTarget, setDiagnosticTarget] = useState<{ ip: string; port: number; name: string } | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<LanConnectionTestResult | null>(null);
  const [isTestingDiagnostics, setIsTestingDiagnostics] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Clone Confirmation Modal State
  const [targetParentToClone, setTargetParentToClone] = useState<{ ip: string; port: number; name: string } | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const handleScanSubnet = async () => {
    setIsScanningSubnet(true);
    try {
      const p = await scanLanSubnet();
      setPeers(p);
    } catch (err) {
      console.error('Failed to scan subnet:', err);
    } finally {
      setIsScanningSubnet(false);
    }
  };

  const loadData = async () => {
    try {
      const [s, p] = await Promise.all([getLanStatus(), getLanPeers()]);
      setStatus(s);
      setPeers(p);
      setDeviceName(s.device_name);
      if (s.paired_parent_ip && !manualIp) {
        setManualIp(s.paired_parent_ip);
      }
    } catch (err) {
      console.error('Failed to fetch LAN status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for live peer updates from UDP discovery
    let unlistenPeers: (() => void) | undefined;
    listen<LanPeer[]>('chirasys:lan_peers_updated', (event) => {
      setPeers(event.payload);
    }).then(unsub => {
      unlistenPeers = unsub;
    });

    // Listen for status updates
    let unlistenStatus: (() => void) | undefined;
    listen('chirasys:lan_status_updated', () => {
      loadData();
    }).then(unsub => {
      unlistenStatus = unsub;
    });

    const timer = setInterval(() => {
      getLanPeers().then(setPeers).catch(() => {});
    }, 4000);

    return () => {
      clearInterval(timer);
      if (unlistenPeers) unlistenPeers();
      if (unlistenStatus) unlistenStatus();
    };
  }, []);

  const handleRoleChange = async (newRole: 'parent' | 'child') => {
    if (!status) return;
    try {
      await setLanRole(newRole);
      setStatus({ ...status, role: newRole });
      loadData();
    } catch (err) {
      console.error('Failed to set LAN role:', err);
    }
  };

  const handleSaveDeviceName = async () => {
    if (!deviceName.trim() || !status) return;
    setIsSavingName(true);
    try {
      await setLanDeviceName(deviceName.trim());
      setStatus({ ...status, device_name: deviceName.trim() });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
    } catch (err) {
      console.error('Failed to set device name:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleToggleAutoConnect = async () => {
    if (!status) return;
    const nextVal = !status.auto_connect;
    try {
      await setLanAutoConnect(nextVal);
      setStatus({ ...status, auto_connect: nextVal });
    } catch (err) {
      console.error('Failed to toggle auto connect:', err);
    }
  };

  const handleConnectPeer = async (peer: LanPeer) => {
    setConnectingPeer(peer.device_id);
    try {
      const res = await connectLanParent(peer.ip_address, peer.http_port, peer.device_name);
      if (res.success) {
        await loadData();
        alert(`✅ Berhasil terhubung ke Server Induk "${peer.device_name}"!\n\nMode Client-Server Aktif: Seluruh data produk, stok, dan kasir langsung tersambung secara live tanpa perlu menyalin database.`);
      }
    } catch (err: any) {
      alert(`❌ Gagal menghubungkan ke "${peer.device_name}":\n${typeof err === 'string' ? err : 'Periksa koneksi jaringan dan pastikan kedua perangkat terhubung di Wi-Fi yang sama.'}`);
    } finally {
      setConnectingPeer(null);
    }
  };

  const handleParentRequestConnectChild = async (peer: LanPeer) => {
    setParentConnectingChild(peer.device_id);
    try {
      const msg = await parentRequestConnectChild(peer.ip_address, peer.http_port);
      alert(msg);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghubungkan kasir: ${typeof err === 'string' ? err : 'Error koneksi'}`);
    } finally {
      setParentConnectingChild(null);
    }
  };

  const handleDisconnect = async () => {
    let proceed = true;
    try {
      proceed = window.confirm('Putuskan koneksi dari Perangkat Induk?');
    } catch {
      proceed = true;
    }
    if (!proceed) return;

    try {
      await disconnectLanParent();
      setSyncResult(null);
      setSyncError(null);
      await loadData();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleTestManualIp = async () => {
    if (!manualIp.trim()) return;
    setIsTestingManual(true);
    setManualTestResult(null);
    try {
      const port = parseInt(manualPort) || 3699;
      const res = await testLanConnection(manualIp.trim(), port);
      setManualTestResult(res);
    } catch (err: any) {
      setManualTestResult({
        success: false,
        latency_ms: 0,
        ip_address: manualIp.trim(),
        http_port: parseInt(manualPort) || 3699,
        device_id: '',
        device_name: '',
        role: '',
        workspace_id: '',
        items_count: 0,
        version: '',
        server_time: '',
        error: typeof err === 'string' ? err : 'Gagal menghubungi alamat IP'
      });
    } finally {
      setIsTestingManual(false);
    }
  };

  const handleConnectManual = async () => {
    if (!manualIp.trim()) return;
    setIsConnectingManual(true);
    try {
      const port = parseInt(manualPort) || 3699;
      const res = await connectLanParent(manualIp.trim(), port);
      if (res.success) {
        await loadData();
        alert(`✅ Berhasil terhubung ke Server Induk (${res.device_name || manualIp})!\n\nMode Client-Server Aktif: Seluruh data produk, stok, dan kasir langsung tersambung secara live tanpa perlu menyalin database.`);
      }
    } catch (err: any) {
      alert(`Gagal menghubungkan: ${typeof err === 'string' ? err : 'Koneksi gagal'}`);
    } finally {
      setIsConnectingManual(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncingNow(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await triggerLanSyncNow();
      setSyncResult(res);
      await loadData();
    } catch (err: any) {
      setSyncError(typeof err === 'string' ? err : 'Gagal sinkronisasi data.');
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleOpenDiagnostics = async (ip?: string, port?: number, name?: string) => {
    const targetIp = ip || status?.paired_parent_ip || status?.local_ip || '127.0.0.1';
    const targetPort = port || status?.paired_parent_port || status?.http_port || 3699;
    const targetName = name || status?.paired_parent_name || 'Server Induk';

    setDiagnosticTarget({ ip: targetIp, port: targetPort, name: targetName });
    setShowDiagnostics(true);
    setIsTestingDiagnostics(true);
    setDiagnosticResult(null);

    try {
      const res = await testLanConnection(targetIp, targetPort);
      setDiagnosticResult(res);
    } catch (err: any) {
      setDiagnosticResult({
        success: false,
        latency_ms: 0,
        ip_address: targetIp,
        http_port: targetPort,
        device_id: '',
        device_name: '',
        role: '',
        workspace_id: '',
        items_count: 0,
        version: '',
        server_time: '',
        error: typeof err === 'string' ? err : 'Koneksi gagal'
      });
    } finally {
      setIsTestingDiagnostics(false);
    }
  };

  const handleExecuteClone = async () => {
    if (!targetParentToClone) return;
    setIsCloning(true);
    setCloneError(null);
    setCloneResult(null);
    try {
      const count = await cloneFromParent(targetParentToClone.ip, targetParentToClone.port);
      setCloneResult(`Berhasil menyalin seluruh database lokal (${count.toLocaleString('id-ID')} data) dari ${targetParentToClone.name}.`);
      await loadData();
    } catch (err: any) {
      setCloneError(typeof err === 'string' ? err : 'Gagal menyalin database dari induk.');
    } finally {
      setIsCloning(false);
    }
  };

  const copyDiagnosticLogs = () => {
    if (!diagnosticResult) return;
    const logs = JSON.stringify({
      tested_at: new Date().toISOString(),
      target: diagnosticTarget,
      result: diagnosticResult,
      client_status: status
    }, null, 2);
    navigator.clipboard.writeText(logs);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="animate-spin text-brand mb-3" size={32} />
        <p className="text-xs font-semibold">Memindai jaringan lokal (LAN)...</p>
      </div>
    );
  }

  const isChild = status?.role === 'child';
  const isParent = status?.role === 'parent';
  const isConnected = isChild && !!status?.paired_parent_ip;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Radio size={12} className="animate-pulse text-emerald-300" /> Offline LAN Mesh
              </span>
              <span className="text-xs text-white/80 font-medium">Bekerja 100% lokal tanpa internet</span>
            </div>
            <h2 className="text-xl font-black tracking-tight">Sinkronisasi Jaringan Lokal (LAN)</h2>
            <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed">
              Hubungkan komputer kasir anak (Child) ke komputer induk (Parent). Seluruh data barang, harga, pembayaran, dan transaksi tersinkronisasi langsung lewat Wi-Fi / kabel LAN.
            </p>
          </div>
          <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl p-3.5 shrink-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-indigo-700 flex items-center justify-center font-bold shadow-sm">
              <Network size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-white/70">Alamat IP Anda</p>
              <p className="text-sm font-black font-mono">{status?.local_ip}:{status?.http_port}</p>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE ACTIVE CONNECTION STATUS CARD */}
      {isChild ? (
        <div className={`rounded-2xl border p-5 transition-all shadow-xs ${
          isConnected
            ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 dark:border-emerald-500/20'
            : 'bg-amber-500/5 border-amber-500/30 dark:border-amber-500/20'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                isConnected
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                  : 'bg-amber-500 text-white shadow-amber-500/20'
              }`}>
                {isConnected ? <Activity size={24} className="animate-pulse" /> : <Unplug size={24} />}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isConnected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                    {isConnected ? 'Terhubung ke Server Induk' : 'Belum Terhubung ke Induk'}
                  </span>

                  {isConnected && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-mono font-bold">
                      {status?.paired_parent_ip}:{status?.paired_parent_port}
                    </span>
                  )}
                </div>

                {isConnected ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Terhubung aktif dengan <strong>{status?.paired_parent_name || 'Server Induk'}</strong>. Transaksi kasir otomatis disinkronkan.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Kasir ini beroperasi mandiri. Hubungkan ke Perangkat Induk di bawah untuk menyalin database dan menyinkronkan transaksi.
                  </p>
                )}

                {isConnected && status?.last_sync_time && (
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    Sinkronisasi Terakhir: <span className="font-medium text-slate-600 dark:text-slate-300">{new Date(status.last_sync_time).toLocaleTimeString('id-ID')}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions for Connected Child */}
            {isConnected ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleTriggerSync}
                  disabled={isSyncingNow}
                  className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={isSyncingNow ? 'animate-spin text-brand' : ''} />
                  {isSyncingNow ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
                </button>

                <button
                  onClick={() => handleOpenDiagnostics(status.paired_parent_ip, status.paired_parent_port, status.paired_parent_name)}
                  className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
                >
                  <Terminal size={13} />
                  Diagnostik & Debug
                </button>

                <button
                  onClick={() => setTargetParentToClone({
                    ip: status.paired_parent_ip!,
                    port: status.paired_parent_port || 3699,
                    name: status.paired_parent_name || 'Server Induk'
                  })}
                  className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:border-amber-400"
                >
                  <DownloadCloud size={13} />
                  Salin Database Penuh
                </button>

                <button
                  onClick={handleDisconnect}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                >
                  <Unplug size={13} />
                  Putuskan
                </button>
              </div>
            ) : null}
          </div>

          {/* Sync Result Toast Banner */}
          {syncResult && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 size={14} className="text-emerald-500" /> {syncResult.message}
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Latensi: {syncResult.latency_ms} ms</span>
            </div>
          )}

          {syncError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5 font-bold">
              <AlertTriangle size={14} className="text-rose-500 shrink-0" /> {syncError}
            </div>
          )}
        </div>
      ) : (
        /* Status Card for Parent Device */
        <div className="bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Server size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[11px] font-black uppercase">
                  Server Induk Aktif
                </span>
                <span className="text-xs text-slate-500 font-mono">Port :{status?.http_port}</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Komputer ini bertindak sebagai <strong>Pusat Database Utama</strong>. Seluruh kasir (Child) di jaringan dapat terhubung ke sini.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenDiagnostics(status?.local_ip, status?.http_port, 'Server Induk Ini')}
              className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
            >
              <Terminal size={13} />
              Uji Status Server
            </button>
          </div>
        </div>
      )}

      {/* Grid: Node Configuration & Role Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Device Info & Name */}
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Laptop size={16} className="text-brand" /> Identitas Perangkat
            </h3>
            <p className="text-xs text-slate-500 mb-4">Nama yang terlihat oleh komputer lain di jaringan.</p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Nama Komputer Ini</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="Contoh: Kasir 1 Depan"
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-brand/20"
                  />
                  <button
                    onClick={handleSaveDeviceName}
                    disabled={isSavingName}
                    className="btn-primary text-xs px-3 py-2"
                  >
                    {isSavingName ? <Loader2 size={14} className="animate-spin" /> : nameSaved ? <CheckCircle2 size={14} /> : 'Simpan'}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400">Device ID: </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{status?.device_id}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Status Server Lokal</span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Aktif (:3699)
            </span>
          </div>
        </div>

        {/* Role Selector: Parent vs Child */}
        <div className="md:col-span-2 bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Server size={16} className="text-brand" /> Peran Komputer Ini (Role Architecture)
          </h3>
          <p className="text-xs text-slate-500 mb-4">Pilih apakah komputer ini bertindak sebagai Server Induk atau Kasir Klien.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PARENT OPTION */}
            <button
              onClick={() => handleRoleChange('parent')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                status?.role === 'parent'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-600/30 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status?.role === 'parent' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                    <Server size={16} />
                  </div>
                  <span className="font-black text-xs text-slate-900 dark:text-white">Perangkat Induk (Parent)</span>
                </div>
                {status?.role === 'parent' && <CheckCircle2 size={16} className="text-indigo-600" />}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Menjadi <strong>Pusat Database Utama</strong> toko. Melayani permintaan sinkronisasi dari kasir-kasir lain dan memegang database master.
              </p>
            </button>

            {/* CHILD OPTION */}
            <button
              onClick={() => handleRoleChange('child')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                status?.role === 'child'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-600/30 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status?.role === 'child' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                    <Laptop size={16} />
                  </div>
                  <span className="font-black text-xs text-slate-900 dark:text-white">Perangkat Kasir (Child)</span>
                </div>
                {status?.role === 'child' && <CheckCircle2 size={16} className="text-blue-600" />}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Bekerja mandiri untuk transaksi kasir super cepat. Terhubung ke Perangkat Induk untuk mengirim penjualan & mengambil data barang/harga.
              </p>
            </button>
          </div>

          {/* Auto-Connect Switch */}
          {isChild && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="text-slate-400" />
                <div>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Otomatis Terhubung Saat Induk Ditemukan</p>
                  <p className="text-[10px] text-slate-400">Jika aktif, kasir akan langsung menyambungkan diri ke server induk yang terdeteksi di Wi-Fi yang sama.</p>
                </div>
              </div>
              <button
                onClick={handleToggleAutoConnect}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  status?.auto_connect ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${status?.auto_connect ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Discovered LAN Peers Radar Table */}
      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Radio size={16} className="text-emerald-500 animate-pulse" /> Radar Perangkat Terdeteksi di Jaringan ({peers.length})
            </h3>
            <p className="text-xs text-slate-500">Mendeteksi komputer lain yang membuka aplikasi Kivo di jaringan Wi-Fi/LAN ini.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleScanSubnet}
              disabled={isScanningSubnet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-extrabold hover:bg-brand/90 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Pindai subnet IP lokal secara aktif (memotong blokade UDP/Wi-Fi router)"
            >
              {isScanningSubnet ? <Loader2 size={12} className="animate-spin" /> : <Radio size={12} />}
              <span>{isScanningSubnet ? 'Memindai IP...' : 'Pindai Subnet IP'}</span>
            </button>
            <button
              onClick={loadData}
              disabled={isScanningSubnet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw size={12} /> Pindai Ulang
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {peers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 p-6">
              <Wifi size={32} className="mx-auto mb-2 opacity-40 text-brand" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum ada perangkat lain yang terdeteksi di radar.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                Pastikan komputer induk membuka aplikasi Kivo. Klik tombol <strong>Pindai Subnet IP</strong> untuk memindai seluruh IP lokal, atau masukkan IP manual di bawah.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={handleScanSubnet}
                  disabled={isScanningSubnet}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-2"
                >
                  {isScanningSubnet ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
                  {isScanningSubnet ? 'Sedang Memindai Subnet Jaringan...' : 'Pindai Subnet Jaringan Sekarang'}
                </button>
              </div>
            </div>
          ) : (
            peers.map((peer) => {
              const isParentPeer = peer.role === 'parent';
              const isPairedWithThis = isChild && status?.paired_parent_ip === peer.ip_address;

              return (
                <div
                  key={peer.device_id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isParentPeer
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    }`}>
                      {isParentPeer ? <Server size={18} /> : <Laptop size={18} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">{peer.device_name}</span>
                        {peer.is_self && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase">
                            Perangkat Ini
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          isParentPeer
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                        }`}>
                          {isParentPeer ? 'Induk (Server)' : 'Kasir Klien'}
                        </span>
                        {isPairedWithThis && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-black uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Terhubung
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                        <span>IP: {peer.ip_address}:{peer.http_port}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this peer */}
                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                    {/* Ping Test Button */}
                    <button
                      onClick={() => handleOpenDiagnostics(peer.ip_address, peer.http_port, peer.device_name)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Uji koneksi ping & diagnostik"
                    >
                      <Terminal size={12} /> Uji Ping
                    </button>

                    {/* If we are Child and peer is not self */}
                    {isChild && !peer.is_self && (
                      <>
                        {isPairedWithThis ? (
                          <button
                            onClick={handleDisconnect}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <Unplug size={12} /> Putuskan
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnectPeer(peer)}
                            disabled={connectingPeer === peer.device_id}
                            className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-brand/20 hover:bg-brand/90 transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {connectingPeer === peer.device_id ? (
                              <><Loader2 size={14} className="animate-spin" /> Menghubungkan &amp; Menyalin Data...</>
                            ) : (
                              <><Zap size={14} className="text-yellow-300 fill-yellow-300" /> Hubungkan ke Induk Ini</>
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => setTargetParentToClone({
                            ip: peer.ip_address,
                            port: peer.http_port,
                            name: peer.device_name
                          })}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <DownloadCloud size={13} /> Salin Database
                        </button>
                      </>
                    )}

                    {/* If we are Parent and peer is not self (Child terminal) */}
                    {isParent && !peer.is_self && (
                      <button
                        onClick={() => handleParentRequestConnectChild(peer)}
                        disabled={parentConnectingChild === peer.device_id}
                        className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-brand/20 hover:bg-brand/90 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Kirim instruksi ke komputer kasir klien agar otomatis terhubung ke Server Induk ini"
                      >
                        <Zap size={14} className="text-yellow-300 fill-yellow-300" />
                        {parentConnectingChild === peer.device_id ? 'Menghubungkan...' : 'Hubungkan Kasir Klien Ini'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MANUAL IP CONNECTION FORM (FOR ISOLATED WI-FI NETWORKS) */}
      {isChild && (
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Network size={16} className="text-brand" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Hubungkan Manual via Alamat IP</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Gunakan jika router Wi-Fi Anda memblokir pencarian otomatis (AP/Client Isolation). Masukkan IP Perangkat Induk secara langsung.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Alamat IP Server Induk</label>
              <input
                type="text"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="Contoh: 192.168.1.100"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Port</label>
              <input
                type="text"
                value={manualPort}
                onChange={(e) => setManualPort(e.target.value)}
                placeholder="3699"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="sm:col-span-4 flex gap-2">
              <button
                onClick={handleTestManualIp}
                disabled={isTestingManual || !manualIp.trim()}
                className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
              >
                {isTestingManual ? <Loader2 size={13} className="animate-spin" /> : <Terminal size={13} />}
                Uji Ping
              </button>

              <button
                onClick={handleConnectManual}
                disabled={isConnectingManual || !manualIp.trim()}
                className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
              >
                {isConnectingManual ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                Hubungkan
              </button>
            </div>
          </div>

          {/* Manual Ping Result Banner */}
          {manualTestResult && (
            <div className={`mt-3 p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              manualTestResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {manualTestResult.success ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-rose-500" />}
                <div>
                  <p className="font-bold">
                    {manualTestResult.success
                      ? `Terhubung ke ${manualTestResult.device_name} (${manualTestResult.role})`
                      : 'Gagal terhubung ke alamat IP'}
                  </p>
                  {manualTestResult.error && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">{manualTestResult.error}</p>
                  )}
                </div>
              </div>
              {manualTestResult.success && (
                <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {manualTestResult.latency_ms} ms
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* DIAGNOSTICS & DEBUG CONSOLE MODAL */}
      {showDiagnostics && (
        <Modal
          isOpen={true}
          onClose={() => setShowDiagnostics(false)}
          size="lg"
          title="Pusat Diagnostik & Debug Koneksi LAN"
          subtitle={`Memverifikasi integritas jaringan lokal ke ${diagnosticTarget?.ip}:${diagnosticTarget?.port}`}
          icon={Terminal}
          iconBg="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
          footer={
            <div className="flex justify-between items-center w-full">
              <button
                type="button"
                onClick={copyDiagnosticLogs}
                disabled={!diagnosticResult}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
              >
                {copiedLogs ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copiedLogs ? 'Tersalin ke Clipboard!' : 'Salin Log Diagnostik'}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenDiagnostics(diagnosticTarget?.ip, diagnosticTarget?.port, diagnosticTarget?.name)}
                  disabled={isTestingDiagnostics}
                  className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={isTestingDiagnostics ? 'animate-spin' : ''} />
                  Uji Ulang
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(false)}
                  className="btn-primary text-xs px-5 py-2"
                >
                  Tutup
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {isTestingDiagnostics ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="animate-spin text-brand mb-2" size={28} />
                <p className="text-xs font-bold">Mengirim paket ping & melakukan handshake TCP/HTTP...</p>
              </div>
            ) : diagnosticResult ? (
              <div className="space-y-3">
                {/* Status Header Banner */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  diagnosticResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                }`}>
                  <div className="flex items-center gap-3">
                    {diagnosticResult.success ? (
                      <CheckCircle2 size={24} className="text-emerald-500" />
                    ) : (
                      <AlertTriangle size={24} className="text-rose-500" />
                    )}
                    <div>
                      <h4 className="font-extrabold text-sm">
                        {diagnosticResult.success ? 'Koneksi Berhasil & Responsif (200 OK)' : 'Koneksi Gagal / Timeout'}
                      </h4>
                      <p className="text-xs opacity-80">
                        {diagnosticResult.success
                          ? `Terhubung ke node ${diagnosticResult.device_name} dalam ${diagnosticResult.latency_ms} ms.`
                          : diagnosticResult.error || 'Perangkat tidak merespons pada port target.'}
                      </p>
                    </div>
                  </div>

                  {diagnosticResult.success && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-mono font-black shadow-xs">
                      {diagnosticResult.latency_ms} ms
                    </span>
                  )}
                </div>

                {/* 4-Point Diagnostic Checklist */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5 text-xs">
                  <p className="font-extrabold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    Hasil Analisis Koneksi:
                  </p>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">1. HTTP Handshake & Latensi Ping</span>
                    <span className={`font-bold font-mono ${diagnosticResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {diagnosticResult.success ? `PASS (${diagnosticResult.latency_ms} ms)` : 'FAIL'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">2. Identitas & Role Perangkat</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {diagnosticResult.success ? `${diagnosticResult.device_name} (${diagnosticResult.role})` : '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">3. Total Item di Database Server</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {diagnosticResult.success ? `${diagnosticResult.items_count.toLocaleString('id-ID')} Produk` : '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600 dark:text-slate-400">4. Workspace ID Server</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {diagnosticResult.workspace_id || 'Lokal (Tanpa Workspace)'}
                    </span>
                  </div>
                </div>

                {/* Raw Debug JSON Console */}
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Raw Debug Payload</label>
                  <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-36 border border-slate-800 leading-relaxed">
                    {JSON.stringify(diagnosticResult, null, 2)}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* CLONE DATABASE WARNING & CONFIRMATION MODAL */}
      {targetParentToClone && (
        <Modal
          isOpen={true}
          onClose={() => setTargetParentToClone(null)}
          size="lg"
          title="Salin Seluruh Database dari Perangkat Induk"
          subtitle="Menyalin data barang, harga, pembayaran, pelanggan, dan transaksi secara offline."
          icon={ShieldAlert}
          iconBg="bg-amber-500/20 text-amber-600 dark:text-amber-400"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button
                type="button"
                disabled={isCloning}
                onClick={() => setTargetParentToClone(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                {cloneResult ? 'Selesai' : 'Batal'}
              </button>

              {!cloneResult && (
                <button
                  type="button"
                  disabled={isCloning}
                  onClick={handleExecuteClone}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 active:scale-95 text-white transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isCloning ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sedang Menyalin Database...
                    </>
                  ) : (
                    <>
                      <DownloadCloud size={14} />
                      Mulai Unduh & Salin Database
                    </>
                  )}
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-2">
              <p className="font-extrabold flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" /> Harap baca sebelum melanjutkan:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                <li>Komputer kasir ini akan mengunduh seluruh data katalog barang, harga, pelanggan, riwayat transaksi, dan pembayaran dari <strong>{targetParentToClone.name} ({targetParentToClone.ip})</strong>.</li>
                <li>Database lokal di komputer ini akan <strong>digantikan</strong> secara penuh dengan data dari Induk.</li>
                <li>Sangat cocok untuk komputer kasir yang baru dipasang (database kosong) atau kasir yang ingin melakukan sinkronisasi ulang total tanpa internet!</li>
              </ul>
            </div>

            {cloneResult && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 size={16} /> {cloneResult}
              </div>
            )}

            {cloneError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
                <AlertTriangle size={16} /> {cloneError}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
