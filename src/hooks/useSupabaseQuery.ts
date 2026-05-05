import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useSupabaseQuery<T>(
  tableName: string,
  queryFn: (query: any) => Promise<{ data: T[] | null; error: any }>,
  deps: any[] = []
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await queryFn(supabase.from(tableName));
      if (error) throw error;
      setData(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`public:${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          console.log('Real-time update:', payload);
          // Simple approach: just re-fetch everything for consistency
          // A more optimized approach would be to update the state manually
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, deps);

  return { data, loading, error, refetch: fetchData };
}
