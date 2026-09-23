export interface Message {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
}

export interface Conversation {
  id: string;
  name: string;
  preview: string;
  unread: boolean;
  messages: Message[];
}

// Jamie (staff) messaging her real roster students — see StaffRosterPage.tsx's
// INITIAL_ROSTER for the canonical student pool these names are drawn from.
export const STAFF_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    name: "Priya Nair",
    preview: "See you then 👋",
    unread: true,
    messages: [
      { id: "a", from: "them", text: "Reminder: office hours moved to 3pm Thursday.", time: "Yesterday, 4:12 PM" },
      { id: "b", from: "me", text: "Got it, thank you!", time: "Yesterday, 4:15 PM" },
      { id: "c", from: "them", text: "See you then 👋", time: "Yesterday, 4:16 PM" },
    ],
  },
  {
    id: "2",
    name: "Marcus Webb",
    preview: "Sounds good, I'll review it tonight.",
    unread: false,
    messages: [
      { id: "d", from: "me", text: "Can you take a look at my project outline when you get a chance?", time: "2 days ago" },
      { id: "e", from: "them", text: "Sounds good, I'll review it tonight.", time: "2 days ago" },
    ],
  },
  {
    id: "3",
    name: "Ava Chen",
    preview: "Thanks for the feedback on the assignment.",
    unread: false,
    messages: [{ id: "f", from: "them", text: "Thanks for the feedback on the assignment.", time: "5 days ago" }],
  },
];

// A student messaging their real instructors — see StudentCoursesPage.tsx for
// the canonical instructor pool (kept disjoint from the student name pool).
export const STUDENT_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    name: "Devon Brooks",
    preview: "Sure — I'll extend the deadline to Friday for you.",
    unread: true,
    messages: [
      { id: "a", from: "me", text: "Is there any flexibility on the Week 4 assignment deadline?", time: "Yesterday, 2:03 PM" },
      { id: "b", from: "them", text: "Sure — I'll extend the deadline to Friday for you.", time: "Yesterday, 2:40 PM" },
    ],
  },
  {
    id: "2",
    name: "Sana Malik",
    preview: "Great question — I'll cover that in Thursday's session.",
    unread: false,
    messages: [
      { id: "c", from: "me", text: "Could you go over recursion again in the next class?", time: "3 days ago" },
      { id: "d", from: "them", text: "Great question — I'll cover that in Thursday's session.", time: "3 days ago" },
    ],
  },
];
