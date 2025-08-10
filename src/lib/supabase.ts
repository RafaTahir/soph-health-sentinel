import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Minimal, secure-free wrapper for Lovable's Supabase integration.
// We avoid env vars and rely on runtime-injected globals when available.
// The Lovable platform injects these when a project is connected to Supabase.
// window.__SUPABASE_URL__ and window.__SUPABASE_ANON_KEY__ should be present.

declare global {
  interface Window {
    __SUPABASE_URL__?: string;
    __SUPABASE_ANON_KEY__?: string;
  }
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;
  const url = typeof window !== "undefined" ? window.__SUPABASE_URL__ : undefined;
  const key = typeof window !== "undefined" ? window.__SUPABASE_ANON_KEY__ : undefined;
  if (!url || !key) return null;
  client = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } },
    auth: { persistSession: false },
  });
  return client;
}

export const supabase = getSupabaseClient();
export const isSupabaseReady = !!supabase;
