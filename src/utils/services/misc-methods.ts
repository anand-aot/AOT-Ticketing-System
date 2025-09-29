import { supabase, supabaseAdmin } from '@/lib/supabase';
import { StorageService } from '../storage';

export async function initializeData(this: StorageService): Promise<void> {
  if (!supabase || !supabaseAdmin) {
    throw new Error('Supabase not configured');
  }
}