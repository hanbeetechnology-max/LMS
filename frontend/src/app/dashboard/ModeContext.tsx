"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type PlatformMode = "tournament" | "learning";

interface ModeContextType {
  mode: PlatformMode;
  setMode: (mode: PlatformMode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PlatformMode>("tournament");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem("hanbee-platform-mode") as PlatformMode;
    if (savedMode && (savedMode === "tournament" || savedMode === "learning")) {
      setMode(savedMode);
    }
  }, []);

  const handleSetMode = (newMode: PlatformMode) => {
    setMode(newMode);
    localStorage.setItem("hanbee-platform-mode", newMode);
  };

  return (
    <ModeContext.Provider value={{ mode: mounted ? mode : "tournament", setMode: handleSetMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}
