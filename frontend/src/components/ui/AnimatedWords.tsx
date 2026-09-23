import { motion, useReducedMotion, type Variants } from "framer-motion";

interface AnimatedWordsProps {
  text: string;
  className?: string;
  delay?: number;
  as?: "p" | "span";
}

export function AnimatedWords({ text, className, delay = 0, as = "p" }: AnimatedWordsProps) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.022, delayChildren: delay },
    },
  };

  const word: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10, filter: shouldReduceMotion ? "none" : "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const Tag = motion[as];

  return (
    <Tag className={className} initial="hidden" animate="visible" variants={container}>
      {words.map((w, i) => (
        <motion.span key={w + i} variants={word} className="inline-block will-change-transform">
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </Tag>
  );
}
