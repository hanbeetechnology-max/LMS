"use client";

import { motion } from "framer-motion";
import styles from "./Hero.module.css";

export default function Hero() {
  const containerVariant = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05, // Slower, more deliberate typing
        delayChildren: 0.4,
      },
    },
  };

  const charVariant: any = {
    hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)",
      transition: { 
        duration: 1.2, // Ultra-long, silky smooth duration
        ease: [0.2, 0.65, 0.3, 0.9] // Buttery smooth cubic bezier (Apple style)
      }
    },
  };

  const line1 = "Learn beyond the obvious.";
  const line2 = "Build beyond the expected.";

  return (
    <section className={styles.hero}>
      {/* Background Image */}
      <div className={styles.bgImage} />

      {/* Gradient Overlay for text readability */}
      <div className={styles.overlay} />

      {/* Hero Content */}
      <div className={styles.content}>
        {/* Tagline */}
        <motion.p
          className={styles.tagline}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
        >
          LEARN · GROW · BELONG
        </motion.p>

        {/* Main Heading */}
        <motion.h1
          className={styles.heading}
          variants={containerVariant}
          initial="hidden"
          animate="visible"
        >
          <span className={styles.headingLine}>
            {line1.split("").map((char, index) => (
              <motion.span key={`l1-${index}`} variants={charVariant} style={{ display: "inline-block" }}>
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </span>
          <span className={styles.headingLine}>
            {line2.split("").map((char, index) => (
              <motion.span key={`l2-${index}`} variants={charVariant} style={{ display: "inline-block" }}>
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7, ease: "easeOut" }}
        >
          A learning space for curious minds — built to help you gain real skills, achieve your goals, and create a life you&apos;re proud of.
        </motion.p>

        {/* CTA Button */}
        <motion.a
          href="/login?mode=signup"
          className={styles.ctaButton}
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            transition: { delay: 0.9, duration: 0.6, ease: "easeOut" }
          }}
          whileHover={{
            scale: 1.04,
            transition: { type: "spring", stiffness: 400, damping: 17 },
          }}
          whileTap={{ scale: 0.97 }}
        >
          Start Learning
          <motion.svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.ctaArrow}
          >
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </motion.svg>
        </motion.a>
      </div>

    </section>
  );
}
