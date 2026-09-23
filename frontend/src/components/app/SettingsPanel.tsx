import { type FormEvent, useState } from "react";
import { Reveal } from "../ui/Reveal";
import { TextField } from "../ui/TextField";

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-(--color-ink)">{label}</p>
        <p className="text-xs text-(--color-mist)">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-(--color-violet)" : "bg-(--color-line)"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-(--color-paper) shadow transition-transform duration-200 ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

interface SettingsPanelProps {
  fullName: string;
  email: string;
  role: "staff" | "student" | "manager";
}

// Mirrors the notification categories actually seeded in mockNotifications.ts
// for each role, so these toggles describe real notification types rather
// than a generic, disconnected trio.
const NOTIFICATION_TOGGLES: Record<"staff" | "student" | "manager", { key: string; label: string; description: string; defaultOn: boolean }[]> = {
  staff: [
    { key: "applicants", label: "New applicants", description: "Notify me when someone applies to a course", defaultOn: true },
    { key: "attendance", label: "Attendance activity", description: "Notify me when a student submits attendance", defaultOn: true },
    { key: "discussions", label: "Discussion replies", description: "Notify me about new replies in course discussions", defaultOn: false },
    { key: "enrollment", label: "Enrollment updates", description: "Notify me when a student accepts an invite", defaultOn: true },
  ],
  manager: [
    { key: "verifications", label: "Verification requests", description: "Notify me when a new applicant needs verification", defaultOn: true },
    { key: "staffActivity", label: "Staff clock-in activity", description: "Notify me when staff clock in or out", defaultOn: false },
    { key: "holidays", label: "Holiday changes", description: "Notify me when a holiday is added or removed", defaultOn: true },
  ],
  student: [
    { key: "announcements", label: "Announcements", description: "Notify me when a new announcement is posted", defaultOn: true },
    { key: "calendar", label: "Calendar & office hours", description: "Notify me about new or changed sessions", defaultOn: true },
    { key: "messages", label: "Messages", description: "Notify me when I receive a new message", defaultOn: true },
    { key: "lessons", label: "Lesson reminders", description: "Remind me about upcoming lesson due dates", defaultOn: false },
  ],
};

export function SettingsPanel({ fullName, email, role }: SettingsPanelProps) {
  const [name, setName] = useState(fullName);
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const toggleDefs = NOTIFICATION_TOGGLES[role];
  const [notifyState, setNotifyState] = useState<Record<string, boolean>>(
    Object.fromEntries(toggleDefs.map((t) => [t.key, t.defaultOn])),
  );

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    // Phase 1: supabase.from("profiles").update({ full_name: name, phone, bio }).eq("id", user.id)
    setProfileMessage("Profile settings aren't connected yet — this page is UI-only until Phase 1 lands.");
  }

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    if (!currentPassword || !newPassword) {
      setPasswordError("Fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }
    // Phase 1: supabase.auth.updateUser({ password: newPassword })
    setPasswordMessage("Password changes aren't connected yet — this page is UI-only until Phase 1 lands.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <>
      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Settings</h2>
        <p className="mt-1 text-[15px] text-(--color-slate)">Manage your profile, password, and notifications.</p>
      </Reveal>

      <Reveal delay={0.1} className="mt-8 rounded-2xl border border-(--color-line) p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-(--color-ink) font-mono text-lg font-semibold text-(--color-paper)">
            {name.charAt(0).toUpperCase() || "?"}
          </span>
          <div>
            <p className="text-sm font-medium text-(--color-ink)">{name || "Your name"}</p>
            <p className="text-xs text-(--color-mist)">{email}</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="Email" value={email} disabled readOnly className="opacity-60" />
          </div>
          <TextField label="Phone" type="tel" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio" className="text-sm font-medium text-(--color-ink-soft)">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="A short bio…"
              className="resize-none rounded-xl border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-[15px] text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
            />
          </div>

          {profileMessage && (
            <p role="status" className="rounded-xl bg-(--color-violet-soft) px-4 py-3 text-sm text-(--color-violet-deep)">
              {profileMessage}
            </p>
          )}

          <button
            type="submit"
            className="self-start rounded-full bg-(--color-ink) px-6 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
          >
            Save profile
          </button>
        </form>
      </Reveal>

      <Reveal delay={0.15} className="mt-6 rounded-2xl border border-(--color-line) p-6">
        <h3 className="font-display text-lg font-semibold text-(--color-ink)">Password</h3>
        <form onSubmit={handlePasswordSubmit} className="mt-4 flex flex-col gap-4">
          <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="New password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <TextField
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {passwordError && (
            <p role="alert" className="rounded-xl bg-(--color-error-soft) px-4 py-3 text-sm text-(--color-error)">
              {passwordError}
            </p>
          )}
          {passwordMessage && (
            <p role="status" className="rounded-xl bg-(--color-violet-soft) px-4 py-3 text-sm text-(--color-violet-deep)">
              {passwordMessage}
            </p>
          )}

          <button
            type="submit"
            className="self-start rounded-full bg-(--color-ink) px-6 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
          >
            Update password
          </button>
        </form>
      </Reveal>

      <Reveal delay={0.2} className="mt-6 rounded-2xl border border-(--color-line) p-6">
        <h3 className="font-display text-lg font-semibold text-(--color-ink)">Notifications</h3>
        <p className="mt-1 text-xs text-(--color-mist)">Controls what shows up in your notification bell.</p>
        <div className="mt-2 flex flex-col divide-y divide-(--color-line)">
          {toggleDefs.map((t) => (
            <Toggle
              key={t.key}
              checked={notifyState[t.key]}
              onChange={(v) => setNotifyState((prev) => ({ ...prev, [t.key]: v }))}
              label={t.label}
              description={t.description}
            />
          ))}
        </div>
      </Reveal>
    </>
  );
}
