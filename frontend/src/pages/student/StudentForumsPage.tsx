import { Seo } from "../../lib/Seo";
import { DiscussionForums } from "../../components/app/DiscussionForums";

export function StudentForumsPage() {
  return (
    <>
      <Seo title="Discussions" description="Course discussions and Q&A." path="/student/forums" />
      <DiscussionForums />
    </>
  );
}
