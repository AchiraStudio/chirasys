import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Smartphone, Copy, Check, Radio, Laptop, RefreshCw, Key 
} from 'lucide-react';
import { getLanStatus, LanStatus, getLanPeers, LanPeer } from '../../lib/api';
import Modal from '../ui/Modal';
import { useAuthStore, encodeSessionPayload } from '../../store/AuthStore';

interface HostQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HostQrModal({ isOpen, onClose }: HostQrModalProps) {
  const { token, user } = useAuthStore();
  const [status, setStatus] = useState<LanStatus | null>(null);
  const [peers, setPeers] = useState<LanPeer[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchHostInfo = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        getLanStatus(),
        getLanPeers().catch(() => [])
      ]);
      setStatus(s);
      setPeers(p);
    } catch (err) {
      console.warn('Failed to load host LAN status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHostInfo();
    }
  }, [isOpen]);

  // Determine web URL for other devices
  const localIp = status?.local_ip || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1');
  
  // In development, the Vite dev server with --host runs on port 1420.
  // In production, the Axum HTTP server serves the app or RPC on port 3699.
  const isDev = typeof window !== 'undefined' && window.location.port === '1420';
  const webPort = isDev ? '1420' : (status?.http_port || 3699);
  
  // Embed host active session data so the phone/tablet logs in automatically with zero credentials needed!
  const sessionPayload = (token && user) ? encodeSessionPayload(token, user) : '';
  const autoLoginParam = sessionPayload
    ? `?session=${encodeURIComponent(sessionPayload)}&auth_token=${encodeURIComponent(token || '')}`
    : (token ? `?auth_token=${encodeURIComponent(token)}` : '');
  const hostWebUrl = `http://${localIp}:${webPort}${autoLoginParam}`;
  const displayUrl = `http://${localIp}:${webPort}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(hostWebUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Akses Kasir Mobile & Tablet (Host Server)"
      size="md"
    >
      <div className="space-y-5">
        {/* Host Status Badge */}
        <div className="flex items-center justify-between p-3.5 bg-muted/60 border border-line rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-soft text-success flex items-center justify-center font-bold">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-heading">Kivo Host Aktif</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-success-soft text-success border border-success/30">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-dim mt-0.5">
                {status?.device_name || 'Komputer Kasir Utama'} ΓÇó Port {webPort}
              </p>
            </div>
          </div>
          <button
            onClick={fetchHostInfo}
            disabled={loading}
            className="p-2 text-dim hover:text-heading hover:bg-card border border-transparent hover:border-line rounded-lg transition-all cursor-pointer"
            title="Muat Ulang Status"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : ''} />
          </button>
        </div>

        {/* Auto-Login Notification Banner */}
        {user ? (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-success-soft/80 border border-success/30 text-success text-xs font-semibold">
            <Key size={16} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-bold">Auto-Login Aktif:</span> Perangkat yang terhubung akan otomatis masuk sebagai <strong>"{user.name}"</strong> tanpa perlu input password!
            </div>
          </div>
        ) : null}

        {/* QR Code Presentation Box */}
        <div className="flex flex-col items-center justify-center p-6 bg-card border border-line rounded-2xl shadow-sm relative overflow-hidden">
          <div className="p-3 bg-white rounded-2xl shadow-md border border-neutral-200">
            <QRCodeSVG
              value={hostWebUrl}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs font-semibold text-dim">
              Scan QR Code menggunakan kamera HP / Tablet
            </p>
            <div className="mt-2 flex items-center gap-2 bg-muted/80 px-3 py-1.5 rounded-xl border border-line">
              <span className="font-mono text-xs font-bold text-primary select-all">
                {displayUrl}
              </span>
              <button
                onClick={handleCopy}
                className="p-1 text-dim hover:text-heading transition-colors cursor-pointer"
                title="Salin Link Akses Otomatis"
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* 3-Step Simple Guide */}
        <div className="bg-muted/40 border border-line rounded-xl p-4 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-dim flex items-center gap-1.5">
            <Smartphone size={13} className="text-primary" /> Panduan Singkat Menghubungkan:
          </div>
          <ol className="text-xs text-body space-y-2 pl-4 list-decimal marker:text-primary marker:font-bold">
            <li>
              Pastikan HP / Tablet terhubung ke <strong>Wi-Fi yang sama</strong> dengan komputer ini.
            </li>
            <li>
              Scan QR code menggunakan kamera bawaan HP, atau ketik alamat URL di browser <strong>Chrome / Safari</strong>.
            </li>
            <li>
              Aplikasi kasir langsung terbuka otomatis tanpa perlu login! Seluruh transaksi dan stok tersinkronisasi instan.
            </li>
          </ol>
        </div>

        {/* Active Connected Peers */}
        {peers.length > 0 && (
          <div className="border border-line rounded-xl p-3 bg-card">
            <div className="text-[11px] font-bold text-dim uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Perangkat Terhubung ({peers.length}):</span>
              <span className="text-[10px] text-success font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Sinkronisasi Aktif
              </span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {peers.map((peer, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/50 border border-line">
                  <div className="flex items-center gap-2 min-w-0">
                    <Laptop size={14} className="text-dim shrink-0" />
                    <span className="font-bold text-heading truncate">{peer.device_name}</span>
                    <span className="text-[10px] font-mono text-dim">({peer.ip_address})</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary-soft text-primary">
                    {peer.role === 'parent' ? 'Host' : 'Terminal'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}
