"use client";

import React from "react";
import { useMode } from "../ModeContext";
import styles from "../layout.module.css";
import { Trophy, BookOpen } from "lucide-react";

export default function ModeSwitcher() {
  const { mode, setMode } = useMode();

  return (
    <div className={styles.modeSwitcherContainer}>
      <div 
        className={styles.modeSwitcherGlider} 
        style={{ transform: mode === "tournament" ? "translateX(0)" : "translateX(100%)" }}
      />
      <div 
        className={`${styles.modeOption} ${mode === "tournament" ? styles.modeOptionActive : ""}`}
        onClick={() => setMode("tournament")}
      >
        <Trophy size={14} style={{ display: 'inline-block', marginRight: '6px', verticalAlign: '-2px' }}/>
        Tournament
      </div>
      <div 
        className={`${styles.modeOption} ${mode === "learning" ? styles.modeOptionActive : ""}`}
        onClick={() => setMode("learning")}
      >
        <BookOpen size={14} style={{ display: 'inline-block', marginRight: '6px', verticalAlign: '-2px' }}/>
        Learning
      </div>
    </div>
  );
}
