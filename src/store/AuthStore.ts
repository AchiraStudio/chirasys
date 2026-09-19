import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserInfo {
  id: string;
  name: string;
  username: string;
  role: string;
  permissions: string;
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

export const encodeSessionPayload = (token: string, user: UserInfo): string => {
  try {
    const jsonStr = JSON.stringify({ token, user });
    return btoa(
      encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
  } catch (e) {
    console.error('Failed to encode session:', e);
    return '';
  }
};

export const decodeSessionPayload = (encoded: string): { token: string; user: UserInfo } | null => {
  try {
    const decodedStr = decodeURIComponent(
      Array.prototype.map.call(atob(encoded), (c: string) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    const parsed = JSON.parse(decodedStr);
    if (parsed && parsed.token && parsed.user) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to decode session:', e);
  }
  return null;
};

// Auto-extract embedded session or token from URL parameter before store creation
if (typeof window !== 'undefined') {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    const tokenParam = urlParams.get('auth_token') || urlParams.get('token');

    if (sessionParam) {
      const decoded = decodeSessionPayload(sessionParam);
      if (decoded) {
        localStorage.setItem(
          'chirasys-auth',
          JSON.stringify({
            state: { token: decoded.token, user: decoded.user },
            version: 0,
          })
        );
      }
    } else if (tokenParam && tokenParam.trim() !== '') {
      // Direct token passed in URL (e.g. from copy link or QR code)
      const existing = localStorage.getItem('chirasys-auth');
      let existingUser = null;
      try {
        existingUser = JSON.parse(existing || '{}')?.state?.user;
      } catch {}

      const user = existingUser || {
        id: 'user_001',
        name: 'Kasir Host',
        username: 'host',
        role: 'owner',
        permissions: ['all'],
        is_custom_perms: false,
        branch_id: 'branch_001',
        avatar_color: '#3B82F6',
      };

      localStorage.setItem(
        'chirasys-auth',
        JSON.stringify({
          state: { token: tokenParam.trim(), user },
          version: 0,
        })
      );
    }
  } catch (e) {
    console.warn('Could not bootstrap session from URL:', e);
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: 'chirasys-auth', // localStorage key
    }
  )
);
