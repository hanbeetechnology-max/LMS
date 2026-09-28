"use client";

import { useState } from "react";
import { ChevronLeft, Play, CheckCircle, FileText, Download } from "lucide-react";
import Link from "next/link";
import styles from "./lesson.module.css";

export default function LessonViewer({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("content");
  const [quizCompleted, setQuizCompleted] = useState(false);

  return (
    <div className={styles.lessonContainer}>
      <Link href="/dashboard/courses" className={styles.backButton}>
        <ChevronLeft size={16} /> Back to Courses
      </Link>

      <div className={styles.lessonHeader}>
        <div>
          <h1 className={styles.lessonTitle}>Module 4: Reading Gyroscope Data</h1>
          <p className={styles.lessonSubtitle}>Intro to RC Telemetry & Sensors</p>
        </div>
        <div className={styles.progressPill}>
          <span>72% Completed</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: '72%' }} />
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.mainContent}>
          
          <div className={styles.videoPlayerContainer}>
            {/* Mock Video Player */}
            <div className={styles.videoPlaceholder}>
              <button className={styles.playButton}>
                <Play size={32} fill="currentColor" />
              </button>
            </div>
          </div>

          <div className={styles.tabsContainer}>
            <button 
              className={`${styles.tabButton} ${activeTab === 'content' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('content')}
            >
              <FileText size={16} /> Lesson Content
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'quiz' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('quiz')}
            >
              <CheckCircle size={16} /> Knowledge Check
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'resources' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('resources')}
            >
              <Download size={16} /> Resources
            </button>
          </div>

          <div className={styles.tabPanel}>
            {activeTab === 'content' && (
              <div className={styles.markdownContent}>
                <h2>Understanding the MPU6050</h2>
                <p>The MPU6050 is a Micro Electro-Mechanical Systems (MEMS) device that contains both a 3-axis accelerometer and a 3-axis gyroscope. It is incredibly useful for maintaining the orientation of your autonomous RC car.</p>
                
                <h3>I2C Communication</h3>
                <p>To read data from the MPU6050, we use the I2C protocol. Ensure that the SDA and SCL pins are properly connected to your microcontroller.</p>
                
                <pre><code>
{`#include <Wire.h>
const int MPU_ADDR = 0x68;

void setup() {
  Wire.begin();
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0);    // Wake up
  Wire.endTransmission(true);
}`}
                </code></pre>
              </div>
            )}

            {activeTab === 'quiz' && (
              <div className={styles.quizContent}>
                <h3>Quick Knowledge Check</h3>
                <p>Which communication protocol is used to interface with the MPU6050?</p>
                <div className={styles.quizOptions}>
                  <label className={styles.quizOption}>
                    <input type="radio" name="q1" /> SPI
                  </label>
                  <label className={styles.quizOption}>
                    <input type="radio" name="q1" onChange={() => setQuizCompleted(true)} /> I2C
                  </label>
                  <label className={styles.quizOption}>
                    <input type="radio" name="q1" /> UART
                  </label>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <button 
                    className={`${styles.actionButton} ${!quizCompleted ? styles.disabled : ''}`}
                    disabled={!quizCompleted}
                  >
                    Submit & Continue to Next Lesson
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className={styles.resourcesContent}>
                <a href="#" className={styles.resourceCard}>
                  <Download size={20} />
                  <div>
                    <strong>MPU6050 Datasheet</strong>
                    <span>PDF · 1.2 MB</span>
                  </div>
                </a>
                <a href="#" className={styles.resourceCard}>
                  <Download size={20} />
                  <div>
                    <strong>Sample Python Script</strong>
                    <span>.py · 4 KB</span>
                  </div>
                </a>
              </div>
            )}
          </div>

        </div>

        <div className={styles.sidebarMenu}>
          <h3 className={styles.sidebarTitle}>Course Syllabus</h3>
          <ul className={styles.syllabusList}>
            <li className={styles.syllabusItemCompleted}>
              <CheckCircle size={16} /> 1. Introduction to Sensors
            </li>
            <li className={styles.syllabusItemCompleted}>
              <CheckCircle size={16} /> 2. Power Requirements
            </li>
            <li className={styles.syllabusItemCompleted}>
              <CheckCircle size={16} /> 3. Wiring the Circuit
            </li>
            <li className={styles.syllabusItemActive}>
              <Play size={16} fill="currentColor" /> 4. Reading Gyroscope Data
            </li>
            <li className={styles.syllabusItemLocked}>
              5. Filtering Noise (Kalman)
            </li>
            <li className={styles.syllabusItemLocked}>
              6. Actuator Mapping
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
