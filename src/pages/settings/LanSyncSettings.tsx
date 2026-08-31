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
  Network
} from 'lucide-react';
import {
  getLanStatus,
  getLanPeers,
  setLanRole,
  setLanDeviceName,
  setLanAutoConnect,
  cloneFromParent,
  LanStatus,
  LanPeer
} from '../../lib/api';
import { listen } from '@tauri-apps/api/event';
import Modal from '../../components/ui/Modal';

export default function LanSyncSettings() {
  const [status, setStatus] = useState<LanStatus | null>(null);
  const [peers, setPeers] = useState<LanPeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceName, setDeviceName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Clone Confirmation Modal State
  const [targetParentToClone, setTargetParentToClone] = useState<LanPeer | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [s, p] = await Promise.all([getLanStatus(), getLanPeers()]);
      setStatus(s);
      setPeers(p);
      setDeviceName(s.device_name);
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

    // Refresh every 5s
    const timer = setInterval(() => {
      getLanPeers().then(setPeers).catch(() => {});
    }, 5000);

    return () => {
      clearInterval(timer);
      if (unlistenPeers) unlistenPeers();
    };
  }, []);

  const handleRoleChange = async (newRole: 'parent' | 'child') => {
    if (!status) return;
    try {
      await setLanRole(newRole);
      setStatus({ ...status, role: newRole });
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

  const handleExecuteClone = async () => {
    if (!targetParentToClone) return;
    setIsCloning(true);
    setCloneError(null);
    setCloneResult(null);
    try {
      const count = await cloneFromParent(targetParentToClone.ip_address, targetParentToClone.http_port);
      setCloneResult(`Berhasil menyalin ${count.toLocaleString('id-ID')} data master dari ${targetParentToClone.device_name}.`);
      loadData();
    } catch (err: any) {
      setCloneError(typeof err === 'string' ? err : 'Gagal menyalin database dari induk.');
    } finally {
      setIsCloning(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="animate-spin text-brand mb-3" size={32} />
        <p className="text-xs font-semibold">Memindai jaringan lokal (LAN)...</p>
      </div>
    );
  }

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
              <span className="text-xs text-white/80 font-medium">Bekerja 100% tanpa internet</span>
            </div>
            <h2 className="text-xl font-black tracking-tight">Sinkronisasi Jaringan Lokal (LAN)</h2>
            <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed">
              Secara otomatis mendeteksi komputer lain di toko melalui Wi-Fi atau kabel LAN. Data transaksi, stok, dan harga tersinkronisasi secara real-time tanpa kuota internet.
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

      {/* Grid: Node Configuration & Role Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Device Info & Name */}
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Laptop size={16} className="text-brand" /> Identitas Perangkat
            </h3>
            <p className="text-xs text-slate-500 mb-4">Nama yang akan terlihat oleh komputer lain di jaringan.</p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Nama Perangkat</label>
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
                Menjadi <strong>Pusat Database Utama</strong> toko. Melayani permintaan sinkronisasi dari kasir-kasir lain dan menjadi gateway sinkronisasi ke Cloud Supabase.
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
                Bekerja mandiri untuk transaksi kasir super cepat. Secara otomatis mengirim penjualan & mengambil data baru dari Perangkat Induk.
              </p>
            </button>
          </div>

          {/* Auto-Connect Switch */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={14} className="text-slate-400" />
              <div>
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Otomatis Terhubung ke Perangkat Induk</p>
                <p className="text-[10px] text-slate-400">Sinkronisasi transaksi otomatis saat mendeteksi Induk di Wi-Fi yang sama.</p>
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
        </div>
      </div>

      {/* Discovered LAN Peers Radar Table */}
      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Radio size={16} className="text-emerald-500 animate-pulse" /> Radar Perangkat Terdeteksi di Jaringan Lokal ({peers.length})
            </h3>
            <p className="text-xs text-slate-500">Mendeteksi instans aplikasi ChiraSys yang aktif di subnet Wi-Fi/Ethernet Anda saat ini.</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <RefreshCw size={12} /> Pindai Ulang
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {peers.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Wifi size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-bold">Belum ada perangkat lain yang terdeteksi.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Pastikan komputer lain membuka aplikasi ChiraSys dan terhubung ke Wi-Fi yang sama.</p>
            </div>
          ) : (
            peers.map((peer) => {
              const isParent = peer.role === 'parent';
              return (
                <div
                  key={peer.device_id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isParent
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    }`}>
                      {isParent ? <Server size={18} /> : <Laptop size={18} />}
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
                          isParent
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                        }`}>
                          {isParent ? 'Induk (Server)' : 'Kasir Klien'}
                        </span>
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
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* If this discovered peer is a Parent and we are a Child, offer Database Clone */}
                    {isParent && !peer.is_self && status?.role === 'child' && (
                      <button
                        onClick={() => {
                          setCloneResult(null);
                          setCloneError(null);
                          setTargetParentToClone(peer);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <DownloadCloud size={13} /> Salin Database dari Induk
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CLONE DATABASE WARNING & CONFIRMATION MODAL */}
      {targetParentToClone && (
        <Modal
          isOpen={true}
          onClose={() => setTargetParentToClone(null)}
          size="lg"
          title="Peringatan: Salin Database dari Induk"
          subtitle="Tindakan ini akan menimpa seluruh database lokal komputer ini."
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
                {cloneResult ? 'Tutup' : 'Batal'}
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
                      Mulai Unduh & Timpa Database
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
                <li>Komputer ini akan mengunduh seluruh data katalog barang, harga, kategori, pelanggan, dan data master dari <strong>{targetParentToClone.device_name} ({targetParentToClone.ip_address})</strong>.</li>
                <li>Seluruh data master lokal di komputer ini akan <strong>digantikan</strong> dengan data dari Induk.</li>
                <li>Sangat cocok untuk komputer kasir baru atau kasir yang ingin melakukan sinkronisasi ulang total.</li>
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
