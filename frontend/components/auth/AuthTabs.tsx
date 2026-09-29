import Link from "next/link";
import styles from "./authTabs.module.css";

export default function AuthTabs({ active }: { active: "login" | "signup" }) {
  return <nav className={styles.tabs} aria-label="Account access">
    <Link href="/login" className={active === "login" ? styles.active : ""} aria-current={active === "login" ? "page" : undefined}>Sign In</Link>
    <Link href="/signup" className={active === "signup" ? styles.active : ""} aria-current={active === "signup" ? "page" : undefined}>Create Account</Link>
  </nav>;
}
