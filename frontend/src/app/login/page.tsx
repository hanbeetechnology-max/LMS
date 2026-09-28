"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import styles from "./login.module.css";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      setIsLogin(false);
    }
  }, [searchParams]);
  const [activeRole, setActiveRole] = useState("Student");

  const getPrimaryPlaceholder = () => {
    if (activeRole === "Staff") return "Email / Staff ID";
    if (activeRole === "Manager") return "Email / Manager ID";
    return "Email / Student ID";
  };

  const getSecondaryPlaceholder = () => {
    if (activeRole === "Staff") return "Department Code";
    if (activeRole === "Manager") return "Region / Branch Code";
    return "Team / Section Code";
  };

  return (
    <>
      <motion.div 
        className={styles.glassCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.65, 0.3, 0.9] }}
      >
        <h1 className={styles.welcomeTitle}>
          {isLogin ? "Welcome back." : "Create an account."}
        </h1>
        <p className={styles.welcomeSub}>
          {isLogin ? "Access your race and learning workspace." : "Join the next generation of autonomous racing."}
        </p>

        <div className={styles.tabContainer}>
          <button 
            className={`${styles.tabBtn} ${isLogin ? styles.tabBtnActive : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Sign In
          </button>
          <button 
            className={`${styles.tabBtn} ${!isLogin ? styles.tabBtnActive : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Create Account
          </button>
        </div>

        <span className={styles.sectionLabel}>SELECT ROLE</span>
        <div className={styles.roleSegment}>
          {["Student", "Staff", "Manager"].map(role => (
            <button 
              key={role}
              className={`${styles.roleBtn} ${activeRole === role ? styles.roleBtnActive : ''}`}
              onClick={() => setActiveRole(role)}
            >
              {role}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); window.location.href = "/dashboard"; }}>
          
          {!isLogin && (
            <div className={styles.formGroup}>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="Full Name" 
                required
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <input 
              type="text" 
              className={styles.input} 
              placeholder={getPrimaryPlaceholder()} 
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <input 
              type={showPassword ? "text" : "password"}
              className={styles.input} 
              placeholder="Password" 
              required
            />
            <div className={styles.inputIcon} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <input 
              type="text" 
              className={styles.input} 
              placeholder={getSecondaryPlaceholder()} 
            />
          </div>

          {isLogin && (
            <div className={styles.formOptions}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" defaultChecked />
                Remember this device
              </label>
              <Link href="#" className={styles.forgotLink}>Forgot Password?</Link>
            </div>
          )}

          <button type="submit" className={styles.submitBtn}>
            {isLogin ? "Launch Workspace →" : "Create Account →"}
          </button>
        </form>

        <div className={styles.divider}>or continue with</div>

        <div className={styles.socialGroup}>
          <button type="button" className={styles.socialBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
            </svg>
            Google
          </button>
          <button type="button" className={styles.socialBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.24c3-.3 6-1.5 6-6.76a5.2 5.2 0 0 0-1.5-3.8 5.2 5.2 0 0 0-.15-3.8s-1.2-.38-3.9 1.45a13.3 13.3 0 0 0-7 0c-2.7-1.83-3.9-1.45-3.9-1.45a5.2 5.2 0 0 0-.15 3.8 5.2 5.2 0 0 0-1.5 3.8c0 5.26 3 6.46 6 6.76a4.8 4.8 0 0 0-1 3.24v4"/><path d="M9 18c-3.8 1-5-2-5-2"/></svg>
            GitHub
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none" }}>
            ← Back to Home
          </Link>
        </p>

      </motion.div>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div>Loading...</div>}>
        <LoginContent />
      </Suspense>
    </main>
  );
}
