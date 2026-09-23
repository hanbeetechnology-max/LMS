import { Seo } from "../lib/Seo";
import { StaticContentPage } from "../components/StaticContentPage";

export function AboutPage() {
  return (
    <>
      <Seo title="About" description="HanbeeLms is one LMS for staff and students — courses, rosters, attendance, and messaging in a single async platform." path="/about" />
      <StaticContentPage title="About HanbeeLms">
        <p>
          HanbeeLms is a learning management system built for the everyday work of running a class: publishing
          course content, keeping a roster up to date, tracking attendance, and staying in touch with students —
          without the overhead of live video or graded assignments getting in the way.
        </p>
        <p>
          It's built for two kinds of people: staff who create and run courses, and students who move through them
          at their own pace. Everything in between — enrollment, scheduling, announcements, discussions, and
          messaging — is designed to stay out of the way so teaching and learning can happen async, on your own
          time.
        </p>
      </StaticContentPage>
    </>
  );
}
