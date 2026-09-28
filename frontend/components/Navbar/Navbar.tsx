"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import styles from "./Navbar.module.css";

const navLinks = [
  { label: "Home", href: "#" },
  { label: "Courses", href: "#courses" },
  { label: "For Educators", href: "#educators" },
  { label: "Community", href: "#community" },
  { label: "About", href: "#about" },
];

export default function Navbar() {
  const [activeLink, setActiveLink] = useState("Home");

  return (
    <motion.nav
      className={styles.navbar}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className={styles.navContent}>
        {/* Logo */}
        <motion.a
          href="#"
          className={styles.logo}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          HANBEE
        </motion.a>

        {/* Center Links */}
        <ul className={styles.navLinks}>
          {navLinks.map((link, index) => {
            const isActive = activeLink === link.label;
            return (
              <motion.li
                key={link.label}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 * (index + 1), duration: 0.5 }}
              >
                <motion.a
                  href={link.href}
                  onClick={() => setActiveLink(link.label)}
                  className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                  whileHover={{ scale: 1.03, opacity: 0.8 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      className={styles.underline}
                      layoutId="navUnderline"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.a>
              </motion.li>
            );
          })}
        </ul>

        {/* Right Section */}
        <div className={styles.navRight}>
          {/* Search Icon */}
          <motion.button
            className={styles.searchBtn}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Search"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </motion.button>

          {/* Sign In */}
          <motion.a
            href="/login"
            className={styles.signIn}
            whileHover={{ scale: 1.05, opacity: 0.8 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Sign In
          </motion.a>

          {/* Get Started Button */}
          <motion.a
            href="/login?mode=signup"
            className={styles.getStartedBtn}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Get Started
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </motion.a>
        </div>
      </div>
    </motion.nav>
  );
}
