"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Monitor, Palette } from "lucide-react";
import styles from "./settings.module.css";
import { useTheme } from "../ThemeProvider";

export default function SettingsPage() {
  const [toggles, setToggles] = useState({
    twoFactor: false,
    tournaments: true,
    announcements: true,
    courses: false,
  });

  const { theme, setTheme, accentHue, setAccentHue, accentLightness, setAccentLightness } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Settings successfully saved!");
    }, 800);
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Settings</h1>
        <p className={styles.pageSubtitle}>Manage your account and preferences</p>
      </div>

      <div className={styles.settingsLayout}>
        {/* Profile Settings */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Profile Settings</h2>
          
          <div className={styles.profileTop}>
            <div className={styles.avatarLg}>A</div>
            <div className={styles.avatarInfo}>
              <h3>Alex Rivera</h3>
              <p>JPG, PNG or GIF - Max 2MB</p>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input type="text" className={styles.input} defaultValue="Alex Rivera" />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Student ID</label>
              <input type="text" className={styles.input} defaultValue="HB-2026-1542" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Preferred RC Team</label>
              <input type="text" className={styles.input} defaultValue="Team Apex" />
            </div>
          </div>

          <button className={styles.saveBtn} onClick={handleSave}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </section>

        {/* Account & Security */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Account & Security</h2>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Current Password</label>
              <input type="password" className={styles.input} defaultValue="********" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>New Password</label>
              <input type="password" className={styles.input} defaultValue="********" />
            </div>
          </div>

          <div className={styles.settingRow} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
            <div className={styles.settingRowInfo}>
              <h4>Two-Factor Authentication</h4>
              <p>Add an extra layer of security to authenticate logs</p>
            </div>
            <div 
              className={`${styles.toggleSwitch} ${!toggles.twoFactor ? styles.toggleSwitchOff : ''}`} 
              onClick={() => handleToggle('twoFactor')}
            />
          </div>
        </section>

        {/* Notification Preferences */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Notification Preferences</h2>
          
          <div className={styles.settingRow} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
            <div className={styles.settingRowInfo}>
              <h4>Tournament Updates</h4>
              <p>Race schedules, registration, results</p>
            </div>
            <div 
              className={`${styles.toggleSwitch} ${!toggles.tournaments ? styles.toggleSwitchOff : ''}`} 
              onClick={() => handleToggle('tournaments')}
            />
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingRowInfo}>
              <h4>New Announcements</h4>
              <p>Staff and manager broadcasts</p>
            </div>
            <div 
              className={`${styles.toggleSwitch} ${!toggles.announcements ? styles.toggleSwitchOff : ''}`} 
              onClick={() => handleToggle('announcements')}
            />
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingRowInfo}>
              <h4>Course Reminders</h4>
              <p>Lesson deadlines and new modules</p>
            </div>
            <div 
              className={`${styles.toggleSwitch} ${!toggles.courses ? styles.toggleSwitchOff : ''}`} 
              onClick={() => handleToggle('courses')}
            />
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
