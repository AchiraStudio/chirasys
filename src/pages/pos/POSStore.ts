import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PosLine {
  item_id: string;
  item_name: string;
  unit_id: string;
  unit_name: string;
  qty: number;
  price_type: 'retail' | 'wholesale';
  price: number;
  discount_amount: number;
  hpp_value: number;
  is_bogo_free?: boolean;
}

export interface PosHold {
  id: string;
  timestamp: string;
  customer_id?: string;
  customer_name?: string;
  lines: PosLine[];
  price_type: 'retail' | 'wholesale';
  total: number;
}

interface PosState {
  holds: PosHold[];
  addHold: (hold: PosHold) => void;
  removeHold: (id: string) => void;
}

export const usePosStore = create<PosState>()(
  persist(
    (set) => ({
      holds: [],
      addHold: (hold) => set((state) => {
        // limit to 5 holds
        if (state.holds.length >= 5) {
            return { holds: [hold, ...state.holds.slice(0, 4)] };
        }
        return { holds: [hold, ...state.holds] };
      }),
      removeHold: (id) => set((state) => ({
        holds: state.holds.filter(h => h.id !== id)
      }))
    }),
    {
      name: 'pos-storage',
    }
  )
);
