import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | undefined;
export function browserDB() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Database setup pending. Follow README before using accounts or bookings.');
  return client ??= createClient(url,key);
}
export async function api(action: string, data: unknown) {
  const db = browserDB();
  const {data:{session}} = await db.auth.getSession();
  if (!session) throw new Error('Please sign in first.');
  const response = await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(data)});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed. Please try again.');
  return result;
}
