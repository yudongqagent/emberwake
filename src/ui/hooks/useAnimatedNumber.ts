import { useEffect, useRef, useState } from "preact/hooks";

/** Ease-out cubic — fast start, gentle settle. Matches the .bar-fill transition curve
 * closely enough that a paired bar+number read as one animated unit. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Counts a displayed number up/down toward `target` instead of snapping — see
 * docs/visual-standards.md §2. Duration scales gently with the size of the jump so a
 * huge reward doesn't crawl and a tiny tick doesn't blur past. */
export function useAnimatedNumber(target: number, baseDurationMs: number = 320): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const prevTargetRef = useRef(target);

  useEffect(() => {
    if (prevTargetRef.current === target) return;
    fromRef.current = display;
    prevTargetRef.current = target;
    startRef.current = performance.now();
    const delta = Math.abs(target - fromRef.current);
    const duration = Math.min(1200, baseDurationMs + Math.min(600, delta * 0.4));

    cancelAnimationFrame(rafRef.current);
    function tick(now: number) {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = easeOutCubic(t);
      setDisplay(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplay(target);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

/** Rounded convenience wrapper for counters that should never show a decimal mid-flight. */
export function useAnimatedInt(target: number, baseDurationMs: number = 320): number {
  return Math.round(useAnimatedNumber(target, baseDurationMs));
}
