import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseQuery<T extends { id?: any }>(
  tableName: string,
  queryFn: (query: any) => Promise<{ data: T[] | null; error: any }>,
  deps: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const channelId = useRef(`${tableName}-${Math.random().toString(36).slice(2)}`);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result, error } = await queryFn(supabase.from(tableName));
      if (error) throw error;
      setData(result || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, ...deps]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    fetchData();

    try {
      channel = supabase
        .channel(channelId.current)
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: tableName },
          () => { fetchData(); }
        )
        .subscribe();
    } catch (err) {
      console.warn(`[useSupabaseQuery] Realtime subscription failed for "${tableName}":`, err);
    }

    return () => {
      if (channel) supabase.removeChannel(channel).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  /**
   * Instantly prepend an item to the local list (before the network call).
   * Pass a temporary id (e.g. -Date.now()) so it can be identified for revert/replace.
   */
  const optimisticInsert = useCallback((item: T) => {
    setData(prev => [item, ...prev]);
  }, []);

  /**
   * Instantly mutate matching items in the local list.
   */
  const optimisticUpdate = useCallback((predicate: (item: T) => boolean, updates: Partial<T>) => {
    setData(prev => prev.map(item => predicate(item) ? { ...item, ...updates } : item));
  }, []);

  /**
   * Instantly remove matching items from the local list.
   */
  const optimisticDelete = useCallback((predicate: (item: T) => boolean) => {
    setData(prev => prev.filter(item => !predicate(item)));
  }, []);

  return { data, loading, error, refetch: fetchData, setData, optimisticInsert, optimisticUpdate, optimisticDelete };
}
