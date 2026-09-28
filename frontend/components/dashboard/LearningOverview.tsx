"use client";

import { PlayCircle, BookOpen, Clock, Award } from "lucide-react";
import styles from "../dashboard.module.css";
import Link from "next/link";

export default function LearningOverview() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Learning Overview</h1>
        <p className={styles.pageSubtitle}>Track your course progress and upcoming lessons</p>
      </div>

      {/* Continue Learning Hero Card */}
      <div className={styles.sectionCard} style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className={styles.metricLabel}>CONTINUE LEARNING</span>
          <h2 style={{ fontSize: '24px', fontWeight: '500', marginTop: '8px', marginBottom: '8px' }}>Intro to RC Telemetry & Sensors</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>Module 4: Reading Gyroscope Data</p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '6px', background: 'var(--bg-card-hover)', borderRadius: '4px', overflow: 'hidden', width: '200px' }}>
              <div style={{ height: '100%', width: '72%', background: 'var(--text-main)' }}></div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>72%</span>
          </div>
        </div>
        
        <Link href="/dashboard/courses/intro-telemetry" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '12px 24px', borderRadius: '12px', boxShadow: 'var(--clay-shadow-button)', color: 'var(--text-main)', fontWeight: '500', textDecoration: 'none' }}>
          <PlayCircle size={18} /> Resume Lesson
        </Link>
      </div>

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Courses in Progress</span>
            <BookOpen size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>3</div>
          <div className={styles.metricSubtext}>Currently active</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Hours Learned</span>
            <Clock size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>24.5h</div>
          <div className={styles.metricSubtext}>This month</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Completed</span>
            <Award size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>2</div>
          <div className={styles.metricSubtext}>Certificates earned</div>
        </div>
      </div>
    </div>
  );
}
