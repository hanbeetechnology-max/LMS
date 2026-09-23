import { Seo } from "../../lib/Seo";
import { MessagesInbox } from "../../components/app/MessagesInbox";
import { STAFF_CONVERSATIONS } from "../../lib/mockMessages";

export function StaffMessagesPage() {
  return (
    <>
      <Seo title="Messages" description="Message your students on HanbeeLms." path="/staff/messages" />
      <MessagesInbox initialConversations={STAFF_CONVERSATIONS} />
    </>
  );
}
