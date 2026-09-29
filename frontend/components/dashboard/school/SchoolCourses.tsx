"use client";

import { useEffect, useState } from "react";
import styles from "../../../app/dashboard/dashboard.module.css";
import { fetchMyOrganizationId } from "../../../lib/teamFormationApi";
import { fetchSchoolCourseParticipation, type SchoolCourseRow } from "../../../lib/schoolAdminApi";
export default function SchoolCourses() {
  const [courses,setCourses]=useState<SchoolCourseRow[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  useEffect(()=>{let active=true;fetchMyOrganizationId().then((id)=>{if(!id)throw new Error("Your account is not linked to an active school.");return fetchSchoolCourseParticipation(id);}).then(rows=>{if(active)setCourses(rows);}).catch((reason:unknown)=>{if(active)setError(reason instanceof Error?reason.message:"We couldn't load course participation.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  return <div><div className={styles.pageHeader}><h1 className={styles.pageTitle}>School Courses</h1><p className={styles.pageSubtitle}>Read-only course enrollment and progress for your students</p></div>{error&&<p role="alert">{error}</p>}{loading?<p role="status">Loading course progress…</p>:<div className={styles.sectionCard}><div className={styles.tableContainer}><table className={styles.dataTable}><thead><tr><th>Course</th><th>Students</th><th>Average progress</th></tr></thead><tbody>{courses.map(course=><tr key={course.course_id}><td className={styles.cellHighlight}>{course.title}</td><td>{course.students}</td><td>{course.avg_completion_pct}%</td></tr>)}{courses.length===0&&<tr><td colSpan={3}>No student course participation yet.</td></tr>}</tbody></table></div></div>}</div>;
}