import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Service-role client for server-only routes. Created lazily so a missing key
// fails the request, not the build.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must be set')
  }
  return createClient<Database>(url, key)
}
