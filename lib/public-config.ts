// Both values are public by design (browser-safe URL and publishable key); env vars override them.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ojyyjvrxcjikawfnswhx.supabase.co';
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yQvyAl9D2P_rBVWpzy69BA_fs1OVagL';
