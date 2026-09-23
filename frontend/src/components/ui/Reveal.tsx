import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Direction = "up" | "left" | "right" | "scale";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  direction?: Direction;
  className?: string;
}

const EASE_OUT_STRONG = [0.16, 1, 0.3, 1] as const;

/**
 * Only the bottom edge gets a negative margin — the standard scroll-reveal
 * pattern (a negative top margin too would shrink both edges and risks
 * the intersection window never opening for tall/instantly-resized pages).
 */
const VIEWPORT_MARGIN = "0px 0px -12% 0px";

/**
 * Backstop so content can never get stuck at opacity:0. IntersectionObserver
 * is async — a tool that resizes the viewport and captures in the same tick
 * (full-page screenshot exports, some crawlers/PDF renderers, fast headless
 * snapshots) can paint before the "visible" callback lands. If real
 * intersection hasn't fired within this window, we reveal anyway.
 */
const FALLBACK_MS = 1200;

function offsetFor(direction: Direction, y: number) {
  switch (direction) {
    case "left":
      return { x: -y, y: 0 };
    case "right":
      return { x: y, y: 0 };
    case "scale":
      return { x: 0, y: 0, scale: 0.94 };
    default:
      return { x: 0, y };
  }
}

function useRevealState() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: VIEWPORT_MARGIN, amount: 0 });
  const [forced, setForced] = useState(false);

  useEffect(() => {
    if (inView) return;
    const timer = setTimeout(() => setForced(true), FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [inView]);

  return { ref, visible: inView || forced };
}

export function Reveal({ children, delay = 0, y = 28, direction = "up", className }: RevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const { ref, visible } = useRevealState();
  const offset = offsetFor(direction, y);

  const variants: Variants = {
    hidden: { opacity: 0, ...(shouldReduceMotion ? {} : offset) },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, delay, ease: EASE_OUT_STRONG },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={visible ? "visible" : "hidden"}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

interface StaggerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerGroup({ children, className, staggerDelay = 0.08 }: StaggerProps) {
  const { ref, visible } = useRevealState();

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: staggerDelay },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={visible ? "visible" : "hidden"}
      variants={container}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 20,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  direction?: Direction;
}) {
  const shouldReduceMotion = useReducedMotion();
  const offset = offsetFor(direction, y);

  const item: Variants = {
    hidden: { opacity: 0, ...(shouldReduceMotion ? {} : offset) },
    visible: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT_STRONG } },
  };

  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
