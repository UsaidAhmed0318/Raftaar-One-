import {useEffect,useRef} from 'react';
// Runs fn now and then every `ms` while enabled. Errors are swallowed so one bad poll never stops the loop.
export function usePolling(fn: () => Promise<void> | void, ms: number, enabled: boolean) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try { await ref.current(); } catch { /* keep polling */ }
      if (!stopped) timer = setTimeout(tick, ms);
    };
    void tick();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [ms, enabled]);
}
