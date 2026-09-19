// src/lib/events.ts
// Cross-Platform Event Listener Wrapper
// Safely falls back to no-op when running in standalone web browsers (outside Tauri)
import { listen as tauriListen, EventCallback, EventName, UnlistenFn } from '@tauri-apps/api/event';
import { isTauri } from './runtime';

export async function safeListen<T>(
  event: EventName,
  handler: EventCallback<T>
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }
  try {
    return await tauriListen<T>(event, handler);
  } catch (err) {
    console.warn(`[Tauri Event] Failed to listen to '${event}':`, err);
    return () => {};
  }
}

export { safeListen as listen };
export type { EventCallback, EventName, UnlistenFn };
