import { useNavigate } from "react-router-dom";
import { Seo } from "../../lib/Seo";
import { Reveal, StaggerGroup, StaggerItem } from "../../components/ui/Reveal";
import { useToast } from "../../lib/ToastProvider";

type Status = "new" | "contacted" | "invited" | "declined";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  course: string;
  submittedDate: string;
  message?: string;
  status: Status;
}

const STATUS_STYLES: Record<Status, string> = {
  new: "bg-(--color-violet-soft) text-(--color-violet)",
  contacted: "bg-(--color-amber-soft) text-(--color-amber-deep)",
  invited: "bg-(--color-teal-soft) text-(--color-teal-deep)",
  declined: "bg-(--color-cloud) text-(--color-slate)",
};

const INITIAL_INQUIRIES: Inquiry[] = [
  {
    id: "1",
    name: "Grace Okafor",
    email: "grace.okafor@example.com",
    course: "Intro to Design",
    submittedDate: "3 hours ago",
    message: "I'm switching careers into UX and want to start with the fundamentals.",
    status: "new",
  },
  {
    id: "2",
    name: "Diego Alvarez",
    email: "diego.alvarez@example.com",
    course: "Data Structures",
    submittedDate: "Yesterday",
    status: "contacted",
  },
  {
    id: "3",
    name: "Mei Tanaka",
    email: "mei.tanaka@example.com",
    course: "Intro to Design",
    submittedDate: "3 days ago",
    message: "Is there a part-time schedule option?",
    status: "invited",
  },
];

export function StaffInquiriesPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const inquiries = INITIAL_INQUIRIES;

  function markContacted(id: string) {
    const inquiry = inquiries.find((i) => i.id === id);
    if (inquiry) showToast(`Marked ${inquiry.name} as contacted.`);
  }

  function decline(id: string) {
    const inquiry = inquiries.find((i) => i.id === id);
    if (inquiry) showToast(`Declined ${inquiry.name}'s application.`);
  }

  function invite(inquiry: Inquiry) {
    navigate("/staff/invitations", { state: { prefillEmail: inquiry.email } });
  }

  return (
    <>
      <Seo title="Course inquiries" description="Review applications from prospective students." path="/staff/inquiries" />

      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Course inquiries</h2>
        <p className="mt-1 text-[15px] text-(--color-slate)">
          Applications submitted from the public "Apply to a course" page.
        </p>
      </Reveal>

      <div className="mt-8">
        <StaggerGroup className="flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
          {inquiries.map((inq) => (
            <StaggerItem key={inq.id} y={12} className="flex flex-wrap items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-(--color-ink)">{inq.name}</p>
                <p className="truncate text-xs text-(--color-mist)">
                  {inq.email} · {inq.course} · {inq.submittedDate}
                </p>
                {inq.message && <p className="mt-1.5 text-sm text-(--color-ink-soft)">{inq.message}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inq.status]}`}>
                {inq.status}
              </span>
              <div className="flex shrink-0 gap-3 text-xs font-medium">
                {inq.status === "new" && (
                  <button type="button" onClick={() => markContacted(inq.id)} className="text-(--color-ink-soft) hover:text-(--color-ink)">
                    Mark contacted
                  </button>
                )}
                {(inq.status === "new" || inq.status === "contacted") && (
                  <>
                    <button type="button" onClick={() => invite(inq)} className="text-(--color-violet) hover:text-(--color-violet)/80">
                      Invite
                    </button>
                    <button type="button" onClick={() => decline(inq.id)} className="text-(--color-error) hover:text-(--color-error)/80">
                      Decline
                    </button>
                  </>
                )}
              </div>
            </StaggerItem>
          ))}
          {inquiries.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-(--color-slate)">No inquiries yet.</p>
          )}
        </StaggerGroup>
      </div>
    </>
  );
}
