import { create } from 'zustand';

interface SyncState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastSyncTime: Date | null;
  setStatus: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  setLastSyncTime: (date: Date) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'disconnected',
  lastSyncTime: null,
  setStatus: (status) => set({ status }),
  setLastSyncTime: (date) => set({ lastSyncTime: date }),
}));
