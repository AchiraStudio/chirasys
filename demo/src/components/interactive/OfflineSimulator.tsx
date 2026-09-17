import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Play, Zap } from 'lucide-react';

interface QueuedItem {
  id: number;
  amount: number;
  time: string;
}

interface LogEntry {
  time: string;
  text: string;
  type: 'ok' | 'wn' | 'ac';
}

export const OfflineSimulator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [saleCount, setSaleCount] = useState(1284);
  const [localSales, setLocalSales] = useState(14);
  const [syncedSales, setSyncedSales] = useState(14);
  const [queue, setQueue] = useState<QueuedItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: '14:20:01', text: 'SISTEM SIAP · Database SQLite lokal aktif', type: 'ac' },
    { time: '14:21:12', text: 'SYNCED #1283 · Rp 45.000 · 84ms via Supabase', type: 'ok' },
    { time: '14:22:45', text: 'SYNCED #1284 · Rp 120.000 · 92ms via Supabase', type: 'ok' },
  ]);
  const [isRunningScenario, setIsRunningScenario] = useState(false);

  const [hotPos, setHotPos] = useState(false);
  const [hotSql, setHotSql] = useState(false);
  const [hotQueue, setHotQueue] = useState(false);
  const [hotCloud, setHotCloud] = useState(false);

  const fmtRp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const nowT = () => new Date().toTimeString().slice(0, 8);

  const addLog = (text: string, type: 'ok' | 'wn' | 'ac') => {
    setLogs(prev => [{ time: nowT(), text, type }, ...prev.slice(0, 6)]);
  };

  const triggerSale = async (onlineState = isOnline) => {
    const nextId = saleCount + 1;
    setSaleCount(nextId);
    const amount = (8 + Math.floor(Math.random() * 40)) * 5000;

    setLocalSales(prev => prev + 1);
    setHotPos(true);
    setTimeout(() => setHotPos(false), 250);

    setTimeout(() => {
      setHotSql(true);
      setTimeout(() => setHotSql(false), 250);
    }, 150);

    if (onlineState) {
      setTimeout(() => {
        setHotQueue(true);
        setTimeout(() => setHotQueue(false), 200);
      }, 250);

      setTimeout(() => {
        setHotCloud(true);
        setTimeout(() => setHotCloud(false), 300);
        setSyncedSales(prev => prev + 1);
        addLog(`SYNCED  #${nextId} · ${fmtRp(amount)} · 88ms ke Supabase`, 'ok');
      }, 400);
    } else {
      setTimeout(() => {
        setHotQueue(true);
        setTimeout(() => setHotQueue(false), 300);
        setQueue(prev => [...prev, { id: nextId, amount, time: nowT() }]);
        addLog(`QUEUED   #${nextId} · ${fmtRp(amount)} · Tersimpan di SQLite Lokal`, 'wn');
      }, 250);
    }
  };

  const toggleConnection = async (targetState: boolean) => {
    setIsOnline(targetState);
    if (!targetState) {
      addLog('JARINGAN · Internet terputus — Kasir tetap melayani 100% normal', 'wn');
    } else {
      addLog('JARINGAN · Internet pulih — Mengunggah antrean transaksi lokal…', 'ac');
    }
  };

  // Process queue drain when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      const timer = setTimeout(() => {
        const itemToSync = queue[0];
        setHotQueue(true);
        setTimeout(() => setHotQueue(false), 200);

        setTimeout(() => {
          setHotCloud(true);
          setTimeout(() => setHotCloud(false), 300);
          setQueue(prev => prev.slice(1));
          setSyncedSales(prev => prev + 1);
          addLog(`SYNCED  #${itemToSync.id} · ${fmtRp(itemToSync.amount)} · Dari Antrean SQLite`, 'ok');
        }, 300);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isOnline, queue]);

  const runFullScenario = async () => {
    if (isRunningScenario) return;
    setIsRunningScenario(true);

    // 1. Cut internet
    await toggleConnection(false);
    await new Promise(r => setTimeout(r, 600));

    // 2. Make 3 offline sales
    for (let i = 0; i < 3; i++) {
      await triggerSale(false);
      await new Promise(r => setTimeout(r, 800));
    }

    // 3. Restore internet
    await new Promise(r => setTimeout(r, 1000));
    await toggleConnection(true);
    setIsRunningScenario(false);
  };

  return (
    <section className="section" id="offline">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow">
            <span className="eb-dot" />
            <span>Simulator Offline-First Interaktif</span>
          </div>
          <h2 className="h2">Uji Langsung: Putuskan Koneksi, Kasir Tetap Menjual</h2>
          <p className="lead">
            Simulasikan kondisi internet toko Anda saat terputus. Kivo tetap memproses transaksi,
            mencetak struk, memotong stok di SQLite lokal, dan melakukan auto-drain ke Supabase saat koneksi kembali.
          </p>
        </div>

        <div className="off-box">
          {/* Header Controls */}
          <div className="off-head">
            <div className="off-state">
              <span className={`dot ${isOnline ? 'g' : 'w'}`} />
              <span style={{ fontWeight: 800, color: 'var(--heading)', fontSize: 13 }}>
                {isOnline ? 'ONLINE · TERHUBUNG KE SUPABASE CLOUD' : 'OFFLINE · BERJALAN 100% PADA SQLITE LOKAL'}
              </span>
            </div>

            <div className="off-actions">
              <div className="seg">
                <button
                  type="button"
                  className={isOnline ? 'on' : ''}
                  onClick={() => toggleConnection(true)}
                  disabled={isRunningScenario}
                >
                  <Wifi size={13} />
                  <span>Online</span>
                </button>
                <button
                  type="button"
                  className={!isOnline ? 'on' : ''}
                  onClick={() => toggleConnection(false)}
                  disabled={isRunningScenario}
                >
                  <WifiOff size={13} />
                  <span>Offline</span>
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => triggerSale()}
                disabled={isRunningScenario}
              >
                <Zap size={14} />
                <span>+ Transaksi Kasir</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={runFullScenario}
                disabled={isRunningScenario}
              >
                <Play size={13} />
                <span>{isRunningScenario ? 'Menjalankan Simulasi…' : 'Simulasi Putus ➔ Pulih'}</span>
              </button>
            </div>
          </div>

          {/* Visual Data Flow Nodes */}
          <div className="off-flow">
            <div className={`fnode ${hotPos ? 'hot' : ''}`}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--dim)' }}>1. TERMINAL POS</div>
              <p style={{ fontWeight: 800, color: 'var(--heading)', margin: '4px 0 2px' }}>Kasir Toko</p>
              <span style={{ fontSize: 11, color: 'var(--body)' }}>Cetak Struk &amp; Laci Kas</span>
            </div>

            <span className="farrow">➔</span>

            <div className={`fnode ${hotSql ? 'hot' : ''}`}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>2. SQLITE LOKAL</div>
              <p style={{ fontWeight: 800, color: 'var(--heading)', margin: '4px 0 2px' }}>WAL Mode 0ms</p>
              <span style={{ fontSize: 11, color: 'var(--body)' }}>Data Permanen di Komputer</span>
            </div>

            <span className="farrow">➔</span>

            <div className={`fnode ${hotQueue ? 'hot' : ''}`}>
              <div style={{ fontSize: 11, fontWeight: 800, color: queue.length > 0 ? 'var(--warning)' : 'var(--dim)' }}>
                3. ANTREAN SYNC
              </div>
              <p style={{ fontWeight: 800, color: 'var(--heading)', margin: '4px 0 2px' }}>
                {queue.length} Pending
              </p>
              <span style={{ fontSize: 11, color: 'var(--body)' }}>Tersimpan Otomatis</span>
            </div>

            <span className="farrow">➔</span>

            <div className={`fnode ${hotCloud ? 'hot' : ''} ${!isOnline ? 'down' : ''}`}>
              <div style={{ fontSize: 11, fontWeight: 800, color: isOnline ? 'var(--primary)' : 'var(--danger)' }}>
                4. KIVO CLOUD
              </div>
              <p style={{ fontWeight: 800, color: 'var(--heading)', margin: '4px 0 2px' }}>
                {isOnline ? 'Supabase Cloud' : 'Koneksi Terputus'}
              </p>
              <span style={{ fontSize: 11, color: 'var(--body)' }}>
                {isOnline ? 'Sinkron Seluruh Cabang' : 'Menunggu Pulih…'}
              </span>
            </div>
          </div>

          {/* Real-time Status and Activity Log */}
          <div className="off-dash">
            {/* Left: Metrics & Queue chips */}
            <div>
              <div className="off-stats">
                <div className="stat-card">
                  <div className="v">{localSales}</div>
                  <div className="l">Transaksi Lokal (SQLite)</div>
                </div>
                <div className="stat-card">
                  <div className="v" style={{ color: queue.length > 0 ? 'var(--warning)' : 'var(--heading)' }}>
                    {queue.length}
                  </div>
                  <div className="l">Antrean Tertahan (Offline)</div>
                </div>
                <div className="stat-card">
                  <div className="v" style={{ color: 'var(--success)' }}>{syncedSales}</div>
                  <div className="l">Tersinkron ke Cloud</div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                  <span>Antrean Menunggu Sinkronisasi:</span>
                  <span className="mono" style={{ color: queue.length > 0 ? 'var(--warning)' : 'var(--dim)' }}>
                    {queue.length} transaksi
                  </span>
                </div>
                <div className="queue-box" id="queueList">
                  {queue.length === 0 ? (
                    <div className="qempty">
                      Antrean kosong — seluruh transaksi lokal telah tersinkronisasi 100% ke Cloud.
                    </div>
                  ) : (
                    queue.map(item => (
                      <div key={item.id} className="qchip">
                        <span>SALE #{item.id}</span>
                        <small>{fmtRp(item.amount)}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Live Log */}
            <div className="off-log" id="offLog">
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Terminal Activity Log (Real-time)
              </div>
              {logs.map((log, idx) => (
                <div key={idx} className={`log-line ${log.type}`}>
                  <span className="mono">{log.time}</span>
                  <span>{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OfflineSimulator;

