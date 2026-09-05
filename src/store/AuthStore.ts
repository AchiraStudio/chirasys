import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserInfo {
  id: string;
  name: string;
  username: string;
  role: string;
  permissions: string[] | string;
  is_custom_perms?: boolean;
  branch_id?: string;
  avatar_color?: string;
  workspace_id?: string;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  setAuth: (token: string, user: UserInfo) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => {
        localStorage.removeItem('chirasys_lan_parent_url');
        set({ token: null, user: null });
      },
    }),
    {
      name: 'chirasys-auth', // localStorage key
    }
  )
);
