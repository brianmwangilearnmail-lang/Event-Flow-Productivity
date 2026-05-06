import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseQuery<T>(
  tableName: string,
  queryFn: (query: any) => Promise<{ data: T[] | null; error: any }>,
  deps: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // Use a stable unique ID per hook instance to avoid channel name collisions
  // when React 19 StrictMode mounts/unmounts/remounts components in development.
  const channelId = useRef(`${tableName}-${Math.random().toString(36).slice(2)}`);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await queryFn(supabase.from(tableName));
      if (error) throw error;
      setData(data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    fetchData();

    try {
      channel = supabase
        .channel(channelId.current)
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: tableName },
          () => {
            fetchData();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn(`[useSupabaseQuery] Realtime subscription failed for "${tableName}":`, err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: fetchData };
}
