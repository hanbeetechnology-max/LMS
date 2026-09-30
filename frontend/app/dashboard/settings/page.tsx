"use client";

import { FormEvent, useState, useEffect } from "react";
import { Moon, Sun, Monitor, Palette } from "lucide-react";
import Link from "next/link";
import styles from "./settings.module.css";
import { useTheme } from "../ThemeProvider";
import { useSessionProfile, useUpdateProfile } from "../../../lib/hooks/useSessionProfile";

export default function SettingsPage() {
  const [toggles, setToggles] = useState({
    tournaments: true,
    announcements: true,
    courses: false,
  });

  const { theme, setTheme, accentHue, setAccentHue, accentLightness, setAccentLightness } = useTheme();
  const { data: profile, isLoading: profileLoading, error: profileError } = useSessionProfile();
  const updateProfile = useUpdateProfile();
  const [fullName, setFullName] = useState("");
  const [feedback, setFeedback] = useState("");

  // Keep the editable field in sync with the loaded/cached profile, without
  // clobbering what the person is actively typing on a background refetch.
  useEffect(() => {
    if (profile) setFullName(profile.full_name);
  }, [profile?.full_name]);

  useEffect(() => {
    if (!profile) return;
    try {
      const saved = localStorage.getItem(`hanbee-dashboard-toggles:${profile.id}`);
      if (saved) setToggles((current) => ({ ...current, ...JSON.parse(saved) }));
    } catch {
      localStorage.removeItem(`hanbee-dashboard-toggles:${profile.id}`);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profileError) setFeedback(profileError instanceof Error ? profileError.message : "We couldn't load your profile.");
  }, [profileError]);

  const handleToggle = (key: keyof typeof toggles) => {
    const next = { ...toggles, [key]: !toggles[key] };
    setToggles(next);
    if (profile) localStorage.setItem(`hanbee-dashboard-toggles:${profile.id}`, JSON.stringify(next));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || fullName.trim().length < 2) {
      setFeedback("Enter a name with at least 2 characters.");
      return;
    }
    setFeedback("");
    try {
      await updateProfile.mutateAsync({ id: profile.id, full_name: fullName });
      setFeedback("Profile saved.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "We couldn't save your changes.");
    }
  };
  const isSaving = updateProfile.isPending;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Settings</h1>
        <p className={styles.pageSubtitle}>Manage your account and preferences</p>
      </div>

      <div className={styles.settingsLayout}>
        {/* Profile Settings */}
        <form className={styles.sectionCard} onSubmit={handleSave}>
          <h2 className={styles.sectionTitle}>Profile Settings</h2>
          
          <div className={styles.profileTop}>
            <div className={styles.avatarLg}>{(fullName.trim()[0] ?? "H").toUpperCase()}</div>
            <div className={styles.avatarInfo}>
              <h3>{profileLoading ? "Loading profile…" : profile?.full_name ?? "Hanbee account"}</h3>
              <p>{profile?.email ?? "Profile details"}</p>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="profile-full-name">Full Name</label>
            <input id="profile-full-name" type="text" className={styles.input} value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} maxLength={120} disabled={profileLoading || isSaving} />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Account email</label>
              <input type="email" className={styles.input} value={profile?.email ?? ""} readOnly />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Account role</label>
              <input type="text" className={styles.input} value={profile?.role ?? ""} readOnly />
            </div>
          </div>

          {feedback && <p role="status" aria-live="polite">{feedback}</p>}
          <button className={styles.saveBtn} type="submit" disabled={profileLoading || isSaving || !profile}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        {/* Account & Security */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Account & Security</h2>
          
          <p>To change your password, request a secure reset email for your account.</p>
          <Link href="/reset-password" className={styles.saveBtn}>Reset password</Link>

        </section>

        {/* Notification Preferences */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Notification Preferences</h2>
          <p>These preferences are saved on this device.</p>
          
          <div className={styles.settingRow} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
            <div className={styles.settingRowInfo}>
              <h4>Tournament Updates</h4>
              <p>Race schedules, registration, results</p>
            </div>
            <button type="button" role="switch" aria-checked={toggles.tournaments} aria-label="Tournament updates" className={`${styles.toggleSwitch} ${!toggles.tournaments ? styles.toggleSwitchOff : ''}`} onClick={() => handleToggle('tournaments')} />
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingRowInfo}>
              <h4>New Announcements</h4>
              <p>Staff and manager broadcasts</p>
            </div>
            <button type="button" role="switch" aria-checked={toggles.announcements} aria-label="New announcements" className={`${styles.toggleSwitch} ${!toggles.announcements ? styles.toggleSwitchOff : ''}`} onClick={() => handleToggle('announcements')} />
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingRowInfo}>
              <h4>Course Reminders</h4>
              <p>Lesson deadlines and new modules</p>
            </div>
            <button type="button" role="switch" aria-checked={toggles.courses} aria-label="Course reminders" className={`${styles.toggleSwitch} ${!toggles.courses ? styles.toggleSwitchOff : ''}`} onClick={() => handleToggle('courses')} />
          </div>
        </section>

        {/* Appearance */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Appearance</h2>
          
          <div className={styles.appearanceOptions}>
            <button 
              className={`${styles.themeBtn} ${theme === 'Dark' ? styles.themeBtnActive : ''}`}
              onClick={() => setTheme('Dark')}
            >
              <Moon size={16} /> Dark
            </button>
            <button 
              className={`${styles.themeBtn} ${theme === 'Light' ? styles.themeBtnActive : ''}`}
              onClick={() => setTheme('Light')}
            >
              <Sun size={16} /> Light
            </button>
            <button 
              className={`${styles.themeBtn} ${theme === 'System' ? styles.themeBtnActive : ''}`}
              onClick={() => setTheme('System')}
            >
              <Monitor size={16} /> System
            </button>
            <button 
              className={`${styles.themeBtn} ${theme === 'Personalized' ? styles.themeBtnActive : ''}`}
              onClick={() => setTheme('Personalized')}
            >
              <Palette size={16} /> Personalized
            </button>
          </div>

          {theme === 'Personalized' && (
            <div style={{ marginTop: "32px", animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <Palette size={18} style={{ color: "var(--accent)" }} />
                <h4 style={{ fontSize: "15px", fontWeight: "500" }}>Choose Your Vibe</h4>
              </div>
              
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
                  <span>Color Hue</span>
                </div>
                <div className={styles.colorSliderWrapper}>
                   <input 
                     type="range" 
                     min="0" 
                     max="360" 
                     value={accentHue} 
                     onChange={(e) => setAccentHue(Number(e.target.value))}
                     className={styles.colorSlider}
                   />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
                  <span>Intensity (Light / Dark)</span>
                </div>
                <div className={styles.colorSliderWrapper}>
                   <input 
                     type="range" 
                     min="15" 
                     max="85" 
                     value={accentLightness} 
                     onChange={(e) => setAccentLightness(Number(e.target.value))}
                     className={styles.lightnessSlider}
                   />
                </div>
              </div>
              
              <p style={{ marginTop: "16px", fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                Drag the sliders to completely alter the color grading of your dashboard in real-time. Text and shadows automatically adapt!
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
