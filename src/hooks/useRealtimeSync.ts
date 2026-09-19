import { useEffect } from 'react';
import { listen } from '../lib/events';
import { isTauri, getHostUrl } from '../lib/runtime';

/**
 * Enterprise Real-Time Synchronization Engine for Kivo
 * 
 * Works seamlessly across:
 * 1. Tauri Native Desktop (using native Tauri event emitter)
 * 2. Remote Web Terminals (Android, iOS, iPad, Web Browsers via ultra-low-latency LAN long-polling)
 * 
 * Broadcasts standard `chirasys:sync` DOM CustomEvent on window so all components
 * (POS, Inventory, Dashboard, Reports) react and update in real-time.
 */
export function useRealtimeSync() {
  useEffect(() => {
    console.log('⚡ useRealtimeSync: active across native & web network');

    const unlistens: (() => void)[] = [];

    // 1. Native Tauri Event Listeners (Only active in desktop shell)
    if (isTauri()) {
      listen<string>('sync-received', (event) => {
        const table = event.payload;
        console.log(`🔄 Cloud sync received for table: ${table}`);
        window.dispatchEvent(new CustomEvent('chirasys:sync', { detail: { table, source: 'cloud' } }));
      }).then(unsub => unlistens.push(unsub));

      listen('chirasys:sync', (event) => {
        console.log('🔄 LAN sync updated database:', event.payload);
        window.dispatchEvent(new CustomEvent('chirasys:sync', { detail: { source: 'lan', ...(event.payload as object || {}) } }));
      }).then(unsub => unlistens.push(unsub));

      listen('chirasys:lan_status_updated', () => {
        console.log('🔄 LAN status updated — refreshing data');
        window.dispatchEvent(new CustomEvent('chirasys:sync', { detail: { source: 'lan_status' } }));
      }).then(unsub => unlistens.push(unsub));
    }

    // 2. Inter-tab Sync (Syncs across multiple browser tabs on same device)
    const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('chirasys_sync_channel') : null;
    if (bc) {
      bc.onmessage = (event) => {
        if (event.data) {
          window.dispatchEvent(new CustomEvent('chirasys:sync', { detail: event.data }));
        }
      };
    }

    // 3. Ultra-Low-Latency Long-Poll Loop (Active for all clients, especially mobile/tablet web browsers)
    let isRunning = true;
    let currentVersion = 0;
    let abortController: AbortController | null = null;

    const pollServer = async () => {
      while (isRunning) {
        try {
          abortController = new AbortController();
          const hostUrl = getHostUrl();
          const pollUrl = `${hostUrl}/api/lan/poll?version=${currentVersion}&timeout=20`;

          const res = await fetch(pollUrl, {
            signal: abortController.signal,
            headers: { 'Accept': 'application/json' },
          });

          if (!res.ok) {
            // Wait 2s on server error before retrying
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          const data = await res.json();
          if (data && typeof data.version === 'number') {
            const prevVersion = currentVersion;
            currentVersion = data.version;

            if (data.changed || (prevVersion === 0 && data.version > 0)) {
              console.log(`⚡ [Realtime LAN] Server change received: table='${data.table}', version=${data.version}`);
              window.dispatchEvent(new CustomEvent('chirasys:sync', {
                detail: { table: data.table, version: data.version, source: 'lan_poll' }
              }));
              bc?.postMessage({ table: data.table, version: data.version, source: 'lan_poll' });
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError' || !isRunning) break;
          // Transient network disconnect or phone in background, retry after delay
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    };

    // 4. Instant wake-up trigger on screen unlock / tab focus (crucial for smartphone & iPad terminals)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const hostUrl = getHostUrl();
        fetch(`${hostUrl}/api/lan/version`)
          .then(r => r.json())
          .then(data => {
            if (data && typeof data.version === 'number' && data.version > currentVersion) {
              const oldV = currentVersion;
              currentVersion = data.version;
              if (oldV > 0) {
                console.log(`⚡ [Realtime LAN] Re-synchronized after wake: version=${data.version}`);
                window.dispatchEvent(new CustomEvent('chirasys:sync', {
                  detail: { table: data.table, version: data.version, source: 'wake_poll' }
                }));
                bc?.postMessage({ table: data.table, version: data.version, source: 'wake_poll' });
              }
            }
          })
          .catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Start poll loop only for web clients (mobile/tablet browsers); native Tauri already gets native events
    if (!isTauri()) {
      pollServer();
    }

    return () => {
      isRunning = false;
      if (abortController) {
        abortController.abort();
      }
      unlistens.forEach(unsub => unsub());
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (bc) bc.close();
    };
  }, []);
}
