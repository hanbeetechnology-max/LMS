import React from 'react';
import styles from '../dashboard.module.css';

export default function SchoolTeams() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Team Management</h1>
      <button className={styles.primaryBtn}>Create Team</button>
      <div className={styles.card}>
        <h3>Payment QR</h3>
        <div className={styles.qrPlaceholder}>[QR Code Managed by Hanbee]</div>
      </div>
    </div>
  );
}
