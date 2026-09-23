import { Seo } from "../../lib/Seo";
import { DiscussionForums } from "../../components/app/DiscussionForums";

export function StaffForumsPage() {
  return (
    <>
      <Seo title="Discussions" description="Moderate course discussions." path="/staff/forums" />
      <DiscussionForums canModerate />
    </>
  );
}
