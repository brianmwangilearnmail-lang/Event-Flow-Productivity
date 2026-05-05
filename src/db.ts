import { supabase } from './lib/supabase';

// Helper to log activity
export async function logActivity(clientId: number | undefined, actionType: string, description: string, linkedId?: number, linkedType?: any, revertData?: any) {
  // Log to Supabase
  const { error } = await supabase.from('activity_logs').insert({
    clientId,
    timestamp: Date.now(),
    user: 'System Admin',
    actionType,
    description,
    linkedId,
    linkedType,
    revertData,
    isReverted: false
  });

  if (error) console.error('Error logging activity to Supabase:', error);
}
