import type { Role } from "../lib/AuthProvider";

/** Where each role lands after signing in. Used by the login page, the join
 *  page, and any redirect that needs "the person's home". */
export const ROLE_HOME: Record<Role, string> = {
  student: "/student/rc",
  school_staff: "/school/overview",
  staff: "/staff/my-space",
  manager: "/manager/monitor",
};
