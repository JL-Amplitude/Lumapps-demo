import { useEffect, useRef } from "react";
import { track } from "./analytics";

/** Track an event once per mount (guards against React StrictMode double effects). */
export function useTrackOnce(event: string, props: Record<string, unknown> = {}, deps: unknown[] = []) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    const key = JSON.stringify(deps);
    if (last.current === key) return;
    last.current = key;
    track(event, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
