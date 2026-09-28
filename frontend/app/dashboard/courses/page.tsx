"use client";

import { useState } from "react";
import styles from "./courses.module.css";

const courses = [
  {
    title: "Intro to RC Telemetry & Sensors",
    instructor: "Dr. Liang Wei · 14 modules",
    progress: 72,
    badge: "INTERMEDIATE",
    status: "IN_PROGRESS",
    category: "RC Engineering",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop", // Electronics board
  },
  {
    title: "RC Aerodynamics Engineering",
    instructor: "Eng. Sara Johansson · 18 modules",
    progress: 35,
    badge: "ADVANCED",
    status: "IN_PROGRESS",
    category: "RC Engineering",
    image: "https://images.unsplash.com/photo-1559024094-4a1e4495c3c1?q=80&w=800&auto=format&fit=crop", // Abstract engineering
  },
  {
    title: "Autonomous Telemetry with Python",
    instructor: "Prof. Marcus Reyes · 12 modules",
    progress: 100,
    badge: "INTERMEDIATE",
    status: "COMPLETED",
    category: "Software",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop", // Code matrix
  },
  {
    title: "Embedded Systems & Motor Control",
    instructor: "Dr. James Okafor · 9 modules",
    progress: 58,
    badge: "BEGINNER",
    status: "IN_PROGRESS",
    category: "RC Engineering",
    image: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=800&auto=format&fit=crop", // Breadboard
  },
  {
    title: "Battery Management & EV Principles",
    instructor: "Dr. Liang Wei · 7 modules",
    progress: 100,
    badge: "BEGINNER",
    status: "COMPLETED",
    category: "Hardware",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=800&auto=format&fit=crop", // Engineer hands
  },
  {
    title: "Wireless Telemetry Protocols",
    instructor: "Eng. Sara Johansson · 11 modules",
    progress: 0,
    badge: "ADVANCED",
    status: "NOT_STARTED",
    category: "Software",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop", // Globe/Space
  }
];

export default function CoursesPage() {
  const [activeTab, setActiveTab] = useState("All Courses");

  const filteredCourses = courses.filter((course) => {
    if (activeTab === "All Courses") return true;
    if (activeTab === "In Progress") return course.status === "IN_PROGRESS";
    if (activeTab === "Completed") return course.status === "COMPLETED";
    if (activeTab === "RC Engineering") return course.category === "RC Engineering";
    return true;
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Courses & Learning</h1>
        <p className={styles.pageSubtitle}>Track your engineering curriculum progress</p>
      </div>

      <div className={styles.tabs}>
        {["All Courses", "In Progress", "Completed", "RC Engineering"].map(tab => (
          <button 
            key={tab}
            className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.coursesGrid}>
        {filteredCourses.map((course, i) => (
          <div key={i} className={styles.courseCard}>
            <div 
              className={styles.courseImage}
              style={{ backgroundImage: `url(${course.image})` }}
            >
              <div className={styles.courseOverlay} />
            </div>
            
            <div className={styles.courseContent}>
              <div className={styles.badgeRow}>
                <span className={styles.badge}>{course.badge}</span>
                {course.status === 'COMPLETED' && (
                  <span className={`${styles.badge} ${styles.badgeCompleted}`}>COMPLETED</span>
                )}
              </div>
              <h3 className={styles.courseTitle}>{course.title}</h3>
              <p className={styles.courseInstructor}>{course.instructor}</p>
              
              <div className={styles.progressSection}>
                <div className={styles.progressTop}>
                  <span className={styles.progressLabel}>Progress</span>
                  <span className={styles.progressValue}>{course.progress}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${course.progress}%` }} 
                  />
                </div>
              </div>

              <button 
                className={styles.courseActionBtn}
                onClick={() => alert(`Opening module for: ${course.title}`)}
              >
                {course.status === 'COMPLETED' ? 'Review Course' : course.progress > 0 ? 'Continue Lesson →' : 'Start Course →'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {filteredCourses.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
          No courses found for this category.
        </div>
      )}
    </div>
  );
}
