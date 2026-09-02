import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

/**
 * Listens for `sync-received` native events emitted by the Rust Pull Worker
 * whenever it successfully pulls cloud changes into the local SQLite database.
 *
 * When an event fires it dispatches a standard browser CustomEvent
 * (`chirasys:sync`) on `window` so any component can react without
 * needing a shared state manager.
 */
export function useRealtimeSync() {
  useEffect(() => {
    console.log('🔌 useRealtimeSync: listening for sync & lan events…');

    const unlistens: (() => void)[] = [];

    listen<string>('sync-received', (event) => {
      const table = event.payload;
      console.log(`🔄 Cloud sync received for table: ${table}`);
      window.dispatchEvent(new CustomEvent('chirasys:sync', { detail: { table, source: 'cloud' } }));
    }).then(unsub => unlistens.push(unsub));

    listen('chirasys:sync', () => {
      console.log('🔄 LAN sync updated database');
      window.dispatchEvent(new CustomEvent('chirasys:sync', { detail: { source: 'lan' } }));
    }).then(unsub => unlistens.push(unsub));

    return () => {
      unlistens.forEach(unsub => unsub());
    };
  }, []);
}
