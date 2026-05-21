import { createClient } from '@supabase/supabase-js'

export function createBrowserClient() {
  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL
  const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env vars missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }

  // Fallback to empty strings to avoid crashing if env is not set yet, 
  // but the client will fail to connect if they are missing.
  return createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key'
  )
}

export const supabase = createBrowserClient()
