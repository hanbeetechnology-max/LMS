"use client";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import styles from "./layout.module.css";
import "./theme.css";
import { useTheme } from "./ThemeProvider";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { activeTheme } = useTheme();

  return (
    <div 
      className={styles.dashboardContainer} 
      data-theme={activeTheme}
    >
      {/* Sidebar navigation */}
      <Sidebar />
      <div className={styles.mainArea}>
        <Header />
        <main className={styles.contentScroll}>
          {children}
        </main>
      </div>
    </div>
  );
}
