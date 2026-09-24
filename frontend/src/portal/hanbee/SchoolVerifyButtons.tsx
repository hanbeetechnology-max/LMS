import { useState } from "react";
import { rejectSchool, verifySchool } from "../../lib/portalApi";
import { useToast } from "../../lib/ToastProvider";
import { btn, ConfirmDialog } from "./ui";

/** Verify / Reject for a pending school. The first person to act wins. */
export function SchoolVerifyButtons({ orgId, schoolName, onDone }: { orgId: string; schoolName: string; onDone: () => void }) {
  const { showToast } = useToast();
  const [ask, setAsk] = useState<"verify" | "reject" | null>(null);

  async function run(kind: "verify" | "reject"): Promise<string | null> {
    const res = kind === "verify" ? await verifySchool(orgId) : await rejectSchool(orgId);
    if (!res) return "The server refused this. Check your access and try again.";
    if (res.result === "already_decided") {
      showToast(`Already decided by ${res.by ?? "another staff member"}.`, "error");
    } else {
      showToast(res.result === "verified" ? `${schoolName} verified.` : `${schoolName} rejected.`);
    }
    setAsk(null);
    onDone();
    return null;
  }

  return (
    <>
      <button type="button" className={btn.primary} onClick={() => setAsk("verify")} aria-label={`Verify ${schoolName}`}>
        Verify
      </button>
      <button type="button" className={btn.danger} onClick={() => setAsk("reject")} aria-label={`Reject ${schoolName}`}>
        Reject
      </button>
      {ask && (
        <ConfirmDialog
          title={ask === "verify" ? `Verify ${schoolName}?` : `Reject ${schoolName}?`}
          body={ask === "verify" ? "The school becomes active and its owner can invite students. Only the first staff member to decide counts." : "The school will be marked rejected. Only the first staff member to decide counts."}
          confirmLabel={ask === "verify" ? "Verify school" : "Reject school"}
          danger={ask === "reject"}
          onConfirm={() => run(ask)}
          onCancel={() => setAsk(null)}
        />
      )}
    </>
  );
}
