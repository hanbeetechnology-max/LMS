import { Seo } from "../../lib/Seo";
import { CalendarAgenda } from "../../components/app/CalendarAgenda";

export function StaffCalendarPage() {
  return (
    <>
      <Seo title="Calendar" description="Your class schedule on HanbeeLms." path="/staff/calendar" />
      <CalendarAgenda canCreateEvents />
    </>
  );
}
