import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Module-level stale-while-revalidate cache ─────────────────────────────
// Shared across all hook instances — survives component unmounts/remounts.
const queryCache = new Map<string, { data: any[]; ts: number }>();
const CACHE_TTL = 60_000; // 60 seconds

function buildKey(tableName: string, deps: any[]) {
  return `${tableName}:${JSON.stringify(deps)}`;
}

/** Bust every cache entry whose key starts with `tableName:` */
function invalidateTable(tableName: string) {
  for (const k of queryCache.keys()) {
    if (k.startsWith(`${tableName}:`)) queryCache.delete(k);
  }
}

export function useSupabaseQuery<T extends { id?: any }>(
  tableName: string,
  queryFn: (query: any) => Promise<{ data: T[] | null; error: any }>,
  deps: any[] = []
) {
  const key = buildKey(tableName, deps);

  // Read cache synchronously so the initial render already has data
  const cached = queryCache.get(key);
  const hasFreshCache = !!cached && Date.now() - cached.ts < CACHE_TTL;

  const [data, setData] = useState<T[]>(hasFreshCache ? (cached!.data as T[]) : []);
  const [loading, setLoading] = useState(!hasFreshCache);
  const [error, setError] = useState<any>(null);
  const channelId = useRef(`${tableName}-${Math.random().toString(36).slice(2)}`);

  /**
   * isBackground = true  → silently revalidate, no loading spinner
   * isBackground = false → show loading spinner (first load / realtime refresh)
   */
  const fetchData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const { data: result, error } = await queryFn(supabase.from(tableName));
      if (error) throw error;
      const fresh = result || [];
      queryCache.set(key, { data: fresh, ts: Date.now() });
      setData(fresh);
    } catch (err) {
      setError(err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, key, ...deps]);

  useEffect(() => {
    // Fresh cache → silent background revalidation (no spinner, instant render)
    // No cache     → show spinner while fetching
    fetchData(hasFreshCache);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(channelId.current)
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: tableName },
          () => {
            invalidateTable(tableName);
            fetchData(false);
          }
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

  /** Instantly prepend an item and update the cache so re-navigation shows it */
  const optimisticInsert = useCallback((item: T) => {
    setData(prev => {
      const next = [item, ...prev];
      queryCache.set(key, { data: next, ts: Date.now() });
      return next;
    });
  }, [key]);

  /** Instantly mutate matching items and update the cache */
  const optimisticUpdate = useCallback((predicate: (item: T) => boolean, updates: Partial<T>) => {
    setData(prev => {
      const next = prev.map(item => predicate(item) ? { ...item, ...updates } : item);
      queryCache.set(key, { data: next, ts: Date.now() });
      return next;
    });
  }, [key]);

  /** Instantly remove matching items and update the cache */
  const optimisticDelete = useCallback((predicate: (item: T) => boolean) => {
    setData(prev => {
      const next = prev.filter(item => !predicate(item));
      queryCache.set(key, { data: next, ts: Date.now() });
      return next;
    });
  }, [key]);

  return { data, loading, error, refetch: fetchData, setData, optimisticInsert, optimisticUpdate, optimisticDelete };
}
