import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Retrieve credentials safely from localStorage or environment variables.
 * Absolutely NO hardcoded fallback credentials are baked into the source code!
 */
export function getSavedSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  const url =
    localStorage.getItem('kivo_supabase_url') ||
    localStorage.getItem('chirasys_supabase_url') ||
    import.meta.env.VITE_SUPABASE_URL ||
    '';

  const anonKey =
    localStorage.getItem('kivo_supabase_anon_key') ||
    localStorage.getItem('chirasys_supabase_anon_key') ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    '';

  const isConfigured = Boolean(
    url.trim() &&
    anonKey.trim() &&
    !url.includes('unconfigured.supabase.co')
  );

  return { url: url.trim(), anonKey: anonKey.trim(), isConfigured };
}

let activeClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (activeClient) return activeClient;

  const { url, anonKey, isConfigured } = getSavedSupabaseCredentials();

  // If unconfigured, initialize with safe offline placeholder so App does not crash
  const clientUrl = isConfigured ? url : 'https://unconfigured.supabase.co';
  const clientKey = isConfigured ? anonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

  activeClient = createClient(clientUrl, clientKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return activeClient;
}

export function updateSupabaseCredentials(url: string, anonKey: string): void {
  const cleanUrl = url.trim().replace(/\/$/, '');
  const cleanKey = anonKey.trim();

  if (cleanUrl) {
    localStorage.setItem('kivo_supabase_url', cleanUrl);
  } else {
    localStorage.removeItem('kivo_supabase_url');
    localStorage.removeItem('chirasys_supabase_url');
  }

  if (cleanKey) {
    localStorage.setItem('kivo_supabase_anon_key', cleanKey);
  } else {
    localStorage.removeItem('kivo_supabase_anon_key');
    localStorage.removeItem('chirasys_supabase_anon_key');
  }

  // Invalidate cached client to recreate with new credentials
  activeClient = null;
  getSupabaseClient();
  window.dispatchEvent(
    new CustomEvent('kivo:supabase_configured', {
      detail: { url: cleanUrl, isConfigured: Boolean(cleanUrl && cleanKey) },
    })
  );
}

// Dynamic transparent proxy for direct `supabase.from(...)` and `supabase.channel(...)` calls
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});
