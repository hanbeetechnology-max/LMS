import { Seo } from "../../lib/Seo";
import { AnnouncementsFeed } from "../../components/app/AnnouncementsFeed";

export function StudentAnnouncementsPage() {
  return (
    <>
      <Seo title="Announcements" description="Announcements from your instructors." path="/student/announcements" />
      <AnnouncementsFeed />
    </>
  );
}
