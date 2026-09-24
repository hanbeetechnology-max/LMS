import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/** Runs an async loader on mount and whenever `deps` change. A stale response
 *  from an earlier call never overwrites a newer one. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const call = ++latest.current;
    setLoading(true);
    setError(false);
    load()
      .then((result) => {
        if (call === latest.current) setData(result);
      })
      .catch(() => {
        if (call === latest.current) setError(true);
      })
      .finally(() => {
        if (call === latest.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
