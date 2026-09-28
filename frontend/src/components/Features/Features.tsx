"use client";

import { motion } from "framer-motion";
import styles from "./Features.module.css";

const features = [
  {
    label: "Experts Led",
    icon: (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="8" width="48" height="36" rx="4" />
        <path d="M24 44v8" />
        <path d="M40 44v8" />
        <path d="M18 52h28" />
        <path d="M22 26l6 6 14-14" />
      </svg>
    ),
  },
  {
    label: "Track Your\nProgress",
    icon: (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 56V32" />
        <path d="M20 56V24" />
        <path d="M32 56V16" />
        <path d="M44 56V28" />
        <path d="M56 56V8" />
        <circle cx="56" cy="8" r="3" fill="currentColor" />
        <path d="M8 32l12-8 12-8 12 12 12-20" />
      </svg>
    ),
  },
  {
    label: "Supportive\nMentors",
    icon: (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="20" r="8" />
        <circle cx="44" cy="22" r="6" />
        <path d="M4 52c0-11 8-20 20-20s20 9 20 20" />
        <path d="M38 52c0-8 4-14 12-14s10 6 10 14" />
      </svg>
    ),
  },
  {
    label: "Learn\nAnywhere",
    icon: (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="16" y="4" width="32" height="56" rx="6" />
        <path d="M16 12h32" />
        <path d="M16 48h32" />
        <circle cx="32" cy="54" r="2" fill="currentColor" />
        <path d="M26 28l6 4 6-4" />
        <rect x="24" y="22" width="16" height="16" rx="2" />
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.8,
    },
  },
};

const cardVariants = {
  hidden: { y: 60, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export default function Features() {
  return (
    <motion.div
      className={styles.features}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {features.map((feature) => (
        <motion.div
          key={feature.label}
          className={styles.card}
          variants={cardVariants}
          whileHover={{
            y: -6,
            scale: 1.03,
            transition: { type: "spring", stiffness: 300, damping: 20 },
          }}
        >
          <div className={styles.iconWrapper}>{feature.icon}</div>
          <p className={styles.label}>{feature.label}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
