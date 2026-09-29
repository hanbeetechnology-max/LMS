"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import styles from "./layout.module.css";
import "./theme.css";
import { useTheme } from "./ThemeProvider";
import AuthGate from "../../components/AuthGate";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { activeTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // A navigation should always close the drawer behind it, on every device.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <AuthGate>
      <div className={styles.dashboardContainer} data-theme={activeTheme}>
        <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className={styles.mobileBackdrop}
            onClick={() => setMobileNavOpen(false)}
          />
        )}
        <div className={styles.mainArea}>
          <Header onMenuClick={() => setMobileNavOpen((value) => !value)} menuOpen={mobileNavOpen} />
          <main className={styles.contentScroll}>{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
