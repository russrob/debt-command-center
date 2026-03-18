import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// We use a placeholder URL to prevent the app from crashing on boot if env vars are missing.
// This allows the UI to render so we can show helpful setup instructions to the user.
const effectiveUrl = supabaseUrl || 'https://placeholder-project.supabase.co';
const effectiveKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(effectiveUrl, effectiveKey);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const testSupabaseConnection = async () => {
  if (!isSupabaseConfigured) return { success: false, message: 'Environment variables missing (VITE_ prefix required).' };
  try {
    const { data, error } = await supabase.from('user_data').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "user_data" does not exist')) {
        return { success: false, message: 'Table "user_data" not found. Please run the setup SQL.' };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Connected and table found!' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
};
