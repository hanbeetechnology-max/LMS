import { Seo } from "../../lib/Seo";
import { MessagesInbox } from "../../components/app/MessagesInbox";
import { STUDENT_CONVERSATIONS } from "../../lib/mockMessages";

export function StudentMessagesPage() {
  return (
    <>
      <Seo title="Messages" description="Message your instructors on HanbeeLms." path="/student/messages" />
      <MessagesInbox initialConversations={STUDENT_CONVERSATIONS} />
    </>
  );
}
