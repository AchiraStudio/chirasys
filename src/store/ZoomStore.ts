import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ZoomState {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  setZoom: (zoom: number) => void;
}

export const useZoomStore = create<ZoomState>()(
  persist(
    (set) => ({
      zoom: 100,
      zoomIn: () => set((state) => ({ zoom: Math.min(150, state.zoom + 10) })),
      zoomOut: () => set((state) => ({ zoom: Math.max(70, state.zoom - 10) })),
      reset: () => set({ zoom: 100 }),
      setZoom: (zoom) => set({ zoom: Math.min(150, Math.max(70, zoom)) }),
    }),
    {
      name: 'chirasys-zoom',
    }
  )
);
