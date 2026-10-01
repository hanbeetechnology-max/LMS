export const metadata = { title: "Privacy Notice — HanbeeLms" };

export default function PrivacyPage() {
  return (
    <main style={{ background: "#fff", color: "#1a1a1a", minHeight: "100vh" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px 120px" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, marginBottom: 8 }}>
          Privacy Notice
        </h1>
        <p style={{ color: "#6b6b6b", marginBottom: 40 }}>
          Last updated: this page describes how HanbeeLms handles student and staff data. It is a plain-language
          notice, not a substitute for legal advice — a school registering students should have its own data
          protection or legal contact review this before enrolling minors.
        </p>

        <Section title="What we collect">
          <p>For every account: name, email, and role (student, school staff, Hanbee staff, or manager).</p>
          <p>For students taking part in a course: lesson progress, quiz and assessment submissions, and automatic
            attendance (clock-in/out timestamps for sessions they join). We do not track general browsing activity,
            only participation in the courses and tournament events a student is actually enrolled in.</p>
          <p>For schools: registration details (school name, registration number, an official contact email) and
            which students and staff are linked to that school.</p>
          <p>Chat messages sent inside HanbeeLms, and tournament applications/results for students who take part in
            the RC F1 tournament.</p>
        </Section>

        <Section title="Who can see it">
          <p>A student's own data is visible to: that student, the school staff at their own school, the Hanbee
            staff who run the courses they're enrolled in, and the Hanbee manager. A student never sees another
            school's students or data. School staff only ever see their own school's students — never another
            school's.</p>
          <p>Privileged actions (verifying a school, suspending an account, changing a role) are recorded in an
            internal audit log visible only to Hanbee staff and the manager.</p>
        </Section>

        <Section title="Guardian consent for minors">
          <p>Many students on this platform are minors. A school registering students is responsible for obtaining
            any consent required under applicable law before those students' data is collected — this typically
            means parental or guardian consent, depending on the student's age and jurisdiction.</p>
          <p>When a school registers, the person registering it must confirm they are authorized to do so and that
            any required guardian consent has already been obtained for the students they plan to invite. HanbeeLms
            does not independently verify guardian consent — that responsibility sits with the registering school,
            consistent with how most school-managed platforms operate.</p>
          <p>A parent or guardian with questions about their child's data, or who wants data removed, should contact
            their school first; the school can request removal or correction through Hanbee staff.</p>
        </Section>

        <Section title="How long we keep it">
          <p>Account and progress data is kept for as long as the account is active. If a school closes, its
            students' course progress and tournament history are kept (attributed to that school at the time), but
            the school loses ongoing access. A revoked or suspended account loses platform access immediately, even
            though auth tokens can remain valid for up to an hour in edge cases — every access check re-verifies
            live account status, not just the token.</p>
        </Section>

        <Section title="What we don't do">
          <p>We don't sell or share student data with third parties for marketing. We don't run broad behavioral
            tracking — monitoring is limited to course participation (lessons, quizzes, attendance) for students
            actually enrolled in that course.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about this notice, or a request to access, correct, or delete data, should go through your
            school's staff (for students) or directly to Hanbee staff / the manager (for school and staff accounts).</p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, marginBottom: 10 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15, lineHeight: 1.7, color: "#333" }}>
        {children}
      </div>
    </section>
  );
}
