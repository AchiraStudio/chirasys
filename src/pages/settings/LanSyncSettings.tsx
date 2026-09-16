import { useState, useEffect } from 'react';
import {
  Wifi,
  Server,
  Laptop,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Loader2,
  Network,
  Unplug,
  Activity,
  Terminal,
  Copy,
  Check,
  Zap,
  X
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

  // Connection Feedback Banner State
  const [connectFeedback, setConnectFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

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
    setConnectFeedback(null);
    try {
      const res = await connectLanParent(peer.ip_address, peer.http_port, peer.device_name);
      if (res.success) {
        await loadData();
        setConnectFeedback({
          type: 'success',
          message: `Berhasil terhubung ke Server Induk "${peer.device_name}". Mode Client-Server aktif.`
        });
      }
    } catch (err: any) {
      setConnectFeedback({
        type: 'danger',
        message: `Gagal menghubungkan ke "${peer.device_name}": ${typeof err === 'string' ? err : 'Periksa koneksi jaringan dan pastikan kedua perangkat terhubung di Wi-Fi yang sama.'}`
      });
    } finally {
      setConnectingPeer(null);
    }
  };

  const handleParentRequestConnectChild = async (peer: LanPeer) => {
    setParentConnectingChild(peer.device_id);
    setConnectFeedback(null);
    try {
      const msg = await parentRequestConnectChild(peer.ip_address, peer.http_port);
      setConnectFeedback({
        type: 'success',
        message: msg || 'Instruksi koneksi berhasil dikirim ke kasir klien.'
      });
      await loadData();
    } catch (err: any) {
      setConnectFeedback({
        type: 'danger',
        message: `Gagal menghubungkan kasir: ${typeof err === 'string' ? err : 'Error koneksi'}`
      });
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
      setConnectFeedback({
        type: 'success',
        message: 'Koneksi ke Perangkat Induk berhasil diputuskan.'
      });
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
    setConnectFeedback(null);
    try {
      const port = parseInt(manualPort) || 3699;
      const res = await connectLanParent(manualIp.trim(), port);
      if (res.success) {
        await loadData();
        setConnectFeedback({
          type: 'success',
          message: `Berhasil terhubung ke Server Induk (${res.device_name || manualIp.trim()}). Mode Client-Server aktif.`
        });
      }
    } catch (err: any) {
      setConnectFeedback({
        type: 'danger',
        message: `Gagal menghubungkan: ${typeof err === 'string' ? err : 'Koneksi gagal'}`
      });
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
      <div className="py-20 flex flex-col items-center justify-center text-dim">
        <Loader2 className="animate-spin text-primary mb-3" size={32} />
        <p className="text-xs font-semibold">Memindai jaringan lokal (LAN)...</p>
      </div>
    );
  }

  const isChild = status?.role === 'child';
  const isParent = status?.role === 'parent';
  const isConnected = isChild && !!status?.paired_parent_ip;

  return (
    <div className="space-y-6">
      {/* Feedback Toast Banner */}
      {connectFeedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
          connectFeedback.type === 'success'
            ? 'bg-success-soft text-success border-success/30'
            : 'bg-danger-soft text-danger border-danger/30'
        }`}>
          <div className="flex items-center gap-2.5">
            {connectFeedback.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
            <span>{connectFeedback.message}</span>
          </div>
          <button
            onClick={() => setConnectFeedback(null)}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Network Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-line shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center font-bold shrink-0">
            <Network size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-heading">Jaringan Lokal (LAN)</span>
              <span className="px-2 py-0.5 rounded-full bg-success-soft text-success text-[10px] font-bold flex items-center gap-1">
                <Radio size={10} className="animate-pulse" /> Offline Mode
              </span>
            </div>
            <p className="text-[11px] text-dim">Sinkronisasi data POS langsung antar perangkat dalam satu jaringan Wi-Fi/LAN.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono font-bold bg-muted px-3 py-1.5 rounded-lg border border-line text-body">
          <span className="text-dim text-[10px] uppercase font-sans font-medium">IP Anda:</span>
          {status?.local_ip}:{status?.http_port}
        </div>
      </div>

      {/* LAN Auto-Connect / Auto-Push Toggle */}
      <div className="p-4 bg-card rounded-xl border border-line flex items-center justify-between gap-4 shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-heading">Sinkronisasi Otomatis LAN</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              status?.auto_connect
                ? 'bg-success-soft text-success border border-success/30'
                : 'bg-muted text-dim border border-line'
            }`}>
              {status?.auto_connect ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          <p className="text-[11px] text-dim leading-tight">
            Jika dinonaktifkan, Kivo tidak akan pernah mengirim antrean data atau menghubungkan ke Server Induk di latar belakang tanpa perintah manual.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleAutoConnect}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            status?.auto_connect ? 'bg-primary' : 'bg-line-strong dark:bg-line-strong'
          }`}
          role="switch"
          aria-checked={status?.auto_connect}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${
              status?.auto_connect ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* LIVE ACTIVE CONNECTION STATUS CARD */}
      {isChild ? (
        <div className={`rounded-xl border p-5 transition-all shadow-xs ${
          isConnected
            ? 'bg-success-soft border-success/20'
            : 'bg-warning/5 border-warning/30 dark:border-warning/20'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isConnected
                  ? 'bg-success text-white shadow-success/20'
                  : 'bg-warning text-white shadow-warning/20'
              }`}>
                {isConnected ? <Activity size={24} className="animate-pulse" /> : <Unplug size={24} />}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isConnected
                      ? 'bg-success-soft text-success dark:bg-success/60 dark:text-success'
                      : 'bg-warning-soft text-warning dark:bg-amber-950/60 dark:text-warning'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-ping' : 'bg-warning'}`} />
                    {isConnected ? 'Terhubung ke Server Induk' : 'Belum Terhubung ke Induk'}
                  </span>

                  {isConnected && (
                    <span className="px-2 py-0.5 rounded-md bg-muted text-body text-[11px] font-mono font-bold">
                      {status?.paired_parent_ip}:{status?.paired_parent_port}
                    </span>
                  )}
                </div>

                {isConnected ? (
                  <p className="text-xs text-body">
                    Terhubung aktif dengan <strong>{status?.paired_parent_name || 'Server Induk'}</strong>. Transaksi kasir otomatis disinkronkan secara live.
                  </p>
                ) : (
                  <p className="text-xs text-dim">
                    Kasir ini beroperasi mandiri. Hubungkan ke Perangkat Induk di bawah untuk menyinkronkan transaksi kasir secara live.
                  </p>
                )}

                {isConnected && status?.last_sync_time && (
                  <p className="text-[11px] text-dim mt-1 flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-success" />
                    Sinkronisasi Terakhir: <span className="font-medium text-body">{new Date(status.last_sync_time).toLocaleTimeString('id-ID')}</span>
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
                  <RefreshCw size={13} className={isSyncingNow ? 'animate-spin text-primary' : ''} />
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
                  onClick={handleDisconnect}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-danger dark:text-danger bg-danger-soft dark:bg-danger/30 border border-danger/30 dark:border-danger hover:bg-danger-soft transition-colors flex items-center gap-1.5"
                >
                  <Unplug size={13} />
                  Putuskan
                </button>
              </div>
            ) : null}
          </div>



          {/* Sync Result Toast Banner */}
          {syncResult && (
            <div className="mt-3 p-3 rounded-xl bg-success-soft dark:bg-success/40 border border-success/30 dark:border-success text-xs text-success dark:text-success/30 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 size={14} className="text-success" /> {syncResult.message}
              </span>
              <span className="text-[10px] font-mono text-success dark:text-success">Latensi: {syncResult.latency_ms} ms</span>
            </div>
          )}

          {syncError && (
            <div className="mt-3 p-3 rounded-xl bg-danger-soft dark:bg-danger/40 border border-danger/30 dark:border-danger text-xs text-danger dark:text-danger flex items-center gap-1.5 font-bold">
              <AlertTriangle size={14} className="text-danger shrink-0" /> {syncError}
            </div>
          )}
        </div>
      ) : (
        /* Status Card for Parent Device */
        <div className="bg-primary-soft/70 dark:bg-primary-soft border border-primary/30 dark:border-primary/60 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Server size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-primary-soft text-primary dark:bg-primary dark:text-primary text-[11px] font-black uppercase">
                  Server Induk Aktif
                </span>
                <span className="text-xs text-dim font-mono">Port :{status?.http_port}</span>
              </div>
              <p className="text-xs text-heading">
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
        <div className="bg-card rounded-xl border border-line p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-heading mb-1 flex items-center gap-2">
              <Laptop size={16} className="text-primary" /> Identitas Perangkat
            </h3>
            <p className="text-xs text-dim mb-4">Nama yang terlihat oleh komputer lain di jaringan.</p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-dim uppercase tracking-wider block mb-1">Nama Komputer Ini</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="Contoh: Kasir 1 Depan"
                    className="flex-1 bg-muted border border-line rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
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

              <div className="pt-2 border-t border-line text-xs">
                <span className="text-dim">Device ID: </span>
                <span className="font-mono font-bold text-heading">{status?.device_id}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
            <span className="text-xs font-bold text-heading">Status Server Lokal</span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-success dark:text-success bg-success-soft dark:bg-success/30 px-2 py-0.5 rounded-full border border-success/30 dark:border-success/50">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Aktif (:3699)
            </span>
          </div>
        </div>

        {/* Role Selector: Parent vs Child */}
        <div className="md:col-span-2 bg-card rounded-xl border border-line p-5 shadow-xs">
          <h3 className="text-sm font-extrabold text-heading mb-1 flex items-center gap-2">
            <Server size={16} className="text-primary" /> Peran Komputer Ini (Role Architecture)
          </h3>
          <p className="text-xs text-dim mb-4">Pilih apakah komputer ini bertindak sebagai Server Induk atau Kasir Klien.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PARENT OPTION */}
            <button
              onClick={() => handleRoleChange('parent')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                status?.role === 'parent'
                  ? 'border-primary bg-primary-soft/50 dark:bg-primary/30 ring-2 ring-primary/30 shadow-xs'
                  : 'border-line hover:border-line-strong dark:hover:border-line-strong bg-muted/50 dark:bg-card/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status?.role === 'parent' ? 'bg-primary text-white' : 'bg-line dark:bg-muted text-body'}`}>
                    <Server size={16} />
                  </div>
                  <span className="font-black text-xs text-heading">Perangkat Induk (Parent)</span>
                </div>
                {status?.role === 'parent' && <CheckCircle2 size={16} className="text-primary" />}
              </div>
              <p className="text-[11px] text-dim leading-relaxed">
                Menjadi <strong>Pusat Database Utama</strong> toko. Melayani permintaan sinkronisasi dari kasir-kasir lain dan memegang database master.
              </p>
            </button>

            {/* CHILD OPTION */}
            <button
              onClick={() => handleRoleChange('child')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                status?.role === 'child'
                  ? 'border-accent bg-accent-soft/50 dark:bg-blue-950/30 ring-2 ring-accent/30 shadow-xs'
                  : 'border-line hover:border-line-strong dark:hover:border-line-strong bg-muted/50 dark:bg-card/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status?.role === 'child' ? 'bg-accent text-white' : 'bg-line dark:bg-muted text-body'}`}>
                    <Laptop size={16} />
                  </div>
                  <span className="font-black text-xs text-heading">Perangkat Kasir (Child)</span>
                </div>
                {status?.role === 'child' && <CheckCircle2 size={16} className="text-accent" />}
              </div>
              <p className="text-[11px] text-dim leading-relaxed">
                Bekerja mandiri untuk transaksi kasir super cepat. Terhubung ke Perangkat Induk untuk mengirim penjualan & mengambil data barang/harga.
              </p>
            </button>
          </div>

          {/* Auto-Connect Switch */}
          {isChild && (
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="text-dim" />
                <div>
                  <p className="text-xs font-extrabold text-heading">Otomatis Terhubung Saat Induk Ditemukan</p>
                  <p className="text-[10px] text-dim">Jika aktif, kasir akan langsung menyambungkan diri ke server induk yang terdeteksi di Wi-Fi yang sama.</p>
                </div>
              </div>
              <button
                onClick={handleToggleAutoConnect}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  status?.auto_connect ? 'bg-primary' : 'bg-line-strong dark:bg-line-strong'
                }`}
              >
                <div className={`bg-card w-4 h-4 rounded-full shadow-md transform transition-transform ${status?.auto_connect ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Discovered LAN Peers Radar Table */}
      <div className="bg-card rounded-xl border border-line shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 sm:px-6 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/50 dark:bg-card/30">
          <div>
            <h3 className="text-sm font-extrabold text-heading flex items-center gap-2">
              <Radio size={16} className="text-success animate-pulse" /> Radar Perangkat Terdeteksi di Jaringan ({peers.length})
            </h3>
            <p className="text-xs text-dim">Mendeteksi komputer lain yang membuka aplikasi Kivo di jaringan Wi-Fi/LAN ini.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleScanSubnet}
              disabled={isScanningSubnet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-extrabold hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Pindai subnet IP lokal secara aktif (memotong blokade UDP/Wi-Fi router)"
            >
              {isScanningSubnet ? <Loader2 size={12} className="animate-spin" /> : <Radio size={12} />}
              <span>{isScanningSubnet ? 'Memindai IP...' : 'Pindai Subnet IP'}</span>
            </button>
            <button
              onClick={loadData}
              disabled={isScanningSubnet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line text-xs font-bold text-heading hover:bg-muted transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw size={12} /> Pindai Ulang
            </button>
          </div>
        </div>

        <div className="divide-y divide-line dark:divide-line">
          {peers.length === 0 ? (
            <div className="py-12 text-center text-dim p-6">
              <Wifi size={32} className="mx-auto mb-2 opacity-40 text-primary" />
              <p className="text-sm font-bold text-heading">Belum ada perangkat lain yang terdeteksi di radar.</p>
              <p className="text-xs text-dim mt-1 max-w-md mx-auto leading-relaxed">
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
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/60 dark:hover:bg-card/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isParentPeer
                        ? 'bg-primary-soft text-primary-hover dark:bg-primary dark:text-primary border border-primary/30 dark:border-primary'
                        : 'bg-accent-soft text-accent dark:bg-blue-950 dark:text-accent border border-accent/30 dark:border-accent'
                    }`}>
                      {isParentPeer ? <Server size={18} /> : <Laptop size={18} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-heading">{peer.device_name}</span>
                        {peer.is_self && (
                          <span className="px-2 py-0.5 rounded-md bg-muted text-body text-[10px] font-black uppercase">
                            Perangkat Ini
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          isParentPeer
                            ? 'bg-primary-soft text-primary-hover border-primary/30 dark:bg-primary/40 dark:text-primary dark:border-primary'
                            : 'bg-accent-soft text-accent border-accent/30 dark:bg-blue-950/40 dark:text-accent dark:border-accent'
                        }`}>
                          {isParentPeer ? 'Induk (Server)' : 'Kasir Klien'}
                        </span>
                        {isPairedWithThis && (
                          <span className="px-2 py-0.5 rounded-full bg-success-soft text-success dark:bg-success/60 dark:text-success border border-success dark:border-success text-[10px] font-black uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Terhubung
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-dim font-mono">
                        <span>IP: {peer.ip_address}:{peer.http_port}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-success dark:text-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-success" /> Online
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this peer */}
                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                    {/* Ping Test Button */}
                    <button
                      onClick={() => handleOpenDiagnostics(peer.ip_address, peer.http_port, peer.device_name)}
                      className="px-2.5 py-1.5 rounded-xl border border-line hover:bg-muted text-xs font-bold text-body flex items-center gap-1 transition-colors cursor-pointer"
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
                            className="px-3 py-1.5 rounded-xl border border-danger/30 dark:border-danger bg-danger-soft dark:bg-danger/30 text-danger dark:text-danger text-xs font-bold flex items-center gap-1 hover:bg-danger-soft transition-colors cursor-pointer"
                          >
                            <Unplug size={12} /> Putuskan
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnectPeer(peer)}
                            disabled={connectingPeer === peer.device_id}
                            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {connectingPeer === peer.device_id ? (
                              <><Loader2 size={14} className="animate-spin" /> Menghubungkan...</>
                            ) : (
                              <><Zap size={14} className="text-yellow-300 fill-yellow-300" /> Hubungkan ke Induk Ini</>
                            )}
                          </button>
                        )}
                      </>
                    )}

                    {/* If we are Parent and peer is not self (Child terminal) */}
                    {isParent && !peer.is_self && (
                      <button
                        onClick={() => handleParentRequestConnectChild(peer)}
                        disabled={parentConnectingChild === peer.device_id}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
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
        <div className="bg-card rounded-xl border border-line p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Network size={16} className="text-primary" />
            <h3 className="text-sm font-extrabold text-heading">Hubungkan Manual via Alamat IP</h3>
          </div>
          <p className="text-xs text-dim mb-4">
            Gunakan jika router Wi-Fi Anda memblokir pencarian otomatis (AP/Client Isolation). Masukkan IP Perangkat Induk secara langsung.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <label className="text-[11px] font-bold text-dim uppercase tracking-wider block mb-1">Alamat IP Server Induk</label>
              <input
                type="text"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="Contoh: 192.168.1.100"
                className="w-full bg-muted border border-line rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-dim uppercase tracking-wider block mb-1">Port</label>
              <input
                type="text"
                value={manualPort}
                onChange={(e) => setManualPort(e.target.value)}
                placeholder="3699"
                className="w-full bg-muted border border-line rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20"
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
                ? 'bg-success-soft dark:bg-success/40 border-success/30 dark:border-success text-success dark:text-success/30'
                : 'bg-danger-soft dark:bg-danger/40 border-danger/30 dark:border-danger text-danger dark:text-danger/30'
            }`}>
              <div className="flex items-center gap-2">
                {manualTestResult.success ? <CheckCircle2 size={16} className="text-success" /> : <AlertTriangle size={16} className="text-danger" />}
                <div>
                  <p className="font-bold">
                    {manualTestResult.success
                      ? `Terhubung ke ${manualTestResult.device_name} (${manualTestResult.role})`
                      : 'Gagal terhubung ke alamat IP'}
                  </p>
                  {manualTestResult.error && (
                    <p className="text-[11px] text-danger dark:text-danger mt-0.5">{manualTestResult.error}</p>
                  )}
                </div>
              </div>
              {manualTestResult.success && (
                <span className="font-mono text-[11px] font-bold text-success dark:text-success">
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
          iconBg="bg-primary-soft text-primary dark:text-primary"
          footer={
            <div className="flex justify-between items-center w-full">
              <button
                type="button"
                onClick={copyDiagnosticLogs}
                disabled={!diagnosticResult}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-body hover:bg-muted border border-line flex items-center gap-1.5"
              >
                {copiedLogs ? <Check size={14} className="text-success" /> : <Copy size={14} />}
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
              <div className="py-12 flex flex-col items-center justify-center text-dim">
                <Loader2 className="animate-spin text-primary mb-2" size={28} />
                <p className="text-xs font-bold">Mengirim paket ping & melakukan handshake TCP/HTTP...</p>
              </div>
            ) : diagnosticResult ? (
              <div className="space-y-3">
                {/* Status Header Banner */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  diagnosticResult.success
                    ? 'bg-success-soft dark:bg-success/40 border-success/30 dark:border-success text-success dark:text-success-soft'
                    : 'bg-danger-soft dark:bg-danger/40 border-danger/30 dark:border-danger text-danger dark:text-danger-soft'
                }`}>
                  <div className="flex items-center gap-3">
                    {diagnosticResult.success ? (
                      <CheckCircle2 size={24} className="text-success" />
                    ) : (
                      <AlertTriangle size={24} className="text-danger" />
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
                    <span className="px-3 py-1 rounded-full bg-success text-white text-xs font-mono font-black shadow-xs">
                      {diagnosticResult.latency_ms} ms
                    </span>
                  )}
                </div>

                {/* 4-Point Diagnostic Checklist */}
                <div className="bg-muted/50 rounded-xl border border-line p-3.5 space-y-2.5 text-xs">
                  <p className="font-extrabold text-heading text-[11px] uppercase tracking-wider">
                    Hasil Analisis Koneksi:
                  </p>

                  <div className="flex items-center justify-between py-1 border-b border-line/60 dark:border-line">
                    <span className="text-body">1. HTTP Handshake & Latensi Ping</span>
                    <span className={`font-bold font-mono ${diagnosticResult.success ? 'text-success dark:text-success' : 'text-danger'}`}>
                      {diagnosticResult.success ? `PASS (${diagnosticResult.latency_ms} ms)` : 'FAIL'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-line/60 dark:border-line">
                    <span className="text-body">2. Identitas & Role Perangkat</span>
                    <span className="font-bold text-heading">
                      {diagnosticResult.success ? `${diagnosticResult.device_name} (${diagnosticResult.role})` : '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-line/60 dark:border-line">
                    <span className="text-body">3. Total Item di Database Server</span>
                    <span className="font-bold text-heading">
                      {diagnosticResult.success ? `${diagnosticResult.items_count.toLocaleString('id-ID')} Produk` : '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-body">4. Workspace ID Server</span>
                    <span className="font-mono text-body">
                      {diagnosticResult.workspace_id || 'Lokal (Tanpa Workspace)'}
                    </span>
                  </div>
                </div>

                {/* Raw Debug JSON Console */}
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-dim block mb-1">Raw Debug Payload</label>
                  <pre className="p-3 rounded-xl bg-card text-success font-mono text-[11px] overflow-x-auto max-h-36 border border-line leading-relaxed">
                    {JSON.stringify(diagnosticResult, null, 2)}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}
    </div>
  );
}
