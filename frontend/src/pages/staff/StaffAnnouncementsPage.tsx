import { Seo } from "../../lib/Seo";
import { AnnouncementsFeed } from "../../components/app/AnnouncementsFeed";

export function StaffAnnouncementsPage() {
  return (
    <>
      <Seo title="Announcements" description="Post and manage course announcements." path="/staff/announcements" />
      <AnnouncementsFeed canCompose />
    </>
  );
}
