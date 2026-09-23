import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface CountUpProps {
  value: string;
  delay?: number;
}

export function CountUp({ value, delay = 0 }: CountUpProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const shouldReduceMotion = useReducedMotion();
  const prefix = value.match(/^[^0-9]*/)?.[0] ?? "";
  const suffix = value.match(/[^0-9]*$/)?.[0] ?? "";
  const digits = value.slice(prefix.length, value.length - suffix.length || undefined);
  const numeric = parseFloat(digits);
  // Only animate a value whose "middle" is purely digits (e.g. "100%") — a
  // value with an embedded non-digit like "24/7" would have that character
  // silently dropped by the tick-based reconstruction below, which only
  // ever concatenates prefix + a plain number + suffix.
  const canAnimate = /^\d+$/.test(digits) && numeric > 0 && numeric < 1000;
  const [display, setDisplay] = useState(canAnimate ? `${prefix}0${suffix}` : value);

  useEffect(() => {
    if (!inView) return;
    if (!canAnimate || shouldReduceMotion) {
      setDisplay(value);
      return;
    }

    const duration = 900;
    const start = performance.now() + delay * 1000;

    let frame: number;
    function tick(now: number) {
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - t, 4);
      const current = Math.round(numeric * eased);
      setDisplay(`${prefix}${current}${suffix}`);
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, canAnimate, shouldReduceMotion, numeric, prefix, suffix, value, delay]);

  return <span ref={ref}>{display}</span>;
}
