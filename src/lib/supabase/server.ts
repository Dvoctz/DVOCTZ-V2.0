// Note: In a Vite SPA, everything runs in the browser.
// This file is provided to match the requested modular structure.
// If this project adopts a custom Express server later, 
// this file would use process.env instead of import.meta.env.

import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  // Try to use process.env first for Node environments, fallback to import.meta.env for Vite
  const supabaseUrl = 
    (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) || 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL)
  
  const supabaseAnonKey = 
    (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) || 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY)

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env vars missing in server execution context.')
  }

  return createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key'
  )
}
