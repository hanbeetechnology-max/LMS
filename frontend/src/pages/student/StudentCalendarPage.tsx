import { Seo } from "../../lib/Seo";
import { CalendarAgenda } from "../../components/app/CalendarAgenda";

export function StudentCalendarPage() {
  return (
    <>
      <Seo title="Calendar" description="Your class schedule on HanbeeLms." path="/student/calendar" />
      <CalendarAgenda />
    </>
  );
}
