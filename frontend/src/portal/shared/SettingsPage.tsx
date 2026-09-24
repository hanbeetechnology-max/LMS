import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabaseClient";
import { useTheme, type ThemePreference } from "../../lib/ThemeProvider";
import { useToast } from "../../lib/ToastProvider";
import { Badge, Card, PageHeader, StatusBadge } from "../kit";

const inputClass =
  "min-h-11 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm text-(--color-ink) outline-none focus:border-(--color-violet) focus-visible:ring-2 focus-visible:ring-(--color-violet)/30 read-only:bg-(--color-cloud) read-only:text-(--color-slate)";
const primaryBtn =
  "min-h-11 rounded-full bg-(--color-ink) px-5 text-sm font-semibold text-(--color-paper) transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-violet)";
const ghostBtn =
  "min-h-11 rounded-full border border-(--color-line) px-4 text-sm font-medium text-(--color-ink-soft) transition-colors hover:border-(--color-ink) hover:text-(--color-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-violet)";

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  school_staff: "School staff",
  staff: "Hanbee staff",
  manager: "Manager",
};

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Match my device" },
];

export function SettingsPage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState(profile?.fullName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  if (!profile) return null;

  async function saveName() {
    const next = name.trim();
    if (!next) return setNameError("Enter your name.");
    if (!supabase || !profile) return;
    setNameError(null);
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ full_name: next }).eq("id", profile.id);
    setSavingName(false);
    if (error) return setNameError(`Could not save your name: ${error.message}`);
    await refreshProfile();
    showToast("Name updated.");
  }

  async function changePassword() {
    if (password.length < 8) return setPwError("Use at least 8 characters.");
    if (password !== confirm) return setPwError("The two passwords do not match.");
    if (!supabase) return;
    setPwError(null);
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPw(false);
    if (error) return setPwError(error.message);
    setPassword("");
    setConfirm("");
    showToast("Password changed.");
  }

  function handleSignOut() {
    signOut();
    navigate("/login");
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Your account." />
      <div className="grid max-w-2xl gap-6">
        <Card>
          <h2 className="font-display text-lg font-semibold text-(--color-ink)">Profile</h2>
          <form
            className="mt-4 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void saveName();
            }}
          >
            <div>
              <label htmlFor="set-name" className="mb-1 block text-sm font-medium text-(--color-ink)">
                Name
              </label>
              <input id="set-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div>
              <label htmlFor="set-email" className="mb-1 block text-sm font-medium text-(--color-ink)">
                Email
              </label>
              <input id="set-email" className={inputClass} value={profile.email} readOnly />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-(--color-ink-soft)">
              <span>Role</span>
              <Badge tone="info">{ROLE_LABEL[profile.role] ?? profile.role}</Badge>
              {profile.isSolo && <Badge tone="neutral">Solo learner</Badge>}
            </div>
            {profile.school && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-(--color-ink-soft)">
                <span>School</span>
                <span className="font-medium text-(--color-ink)">{profile.school.name}</span>
                <StatusBadge status={profile.school.status} />
              </div>
            )}
            {nameError && (
              <p role="alert" className="text-sm text-(--color-error)">
                {nameError}
              </p>
            )}
            <div>
              <button type="submit" className={primaryBtn} disabled={savingName || name.trim() === profile.fullName}>
                {savingName ? "Saving..." : "Save name"}
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-(--color-ink)">Change password</h2>
          <form
            className="mt-4 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void changePassword();
            }}
          >
            <div>
              <label htmlFor="set-pw" className="mb-1 block text-sm font-medium text-(--color-ink)">
                New password
              </label>
              <input id="set-pw" type="password" autoComplete="new-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label htmlFor="set-pw2" className="mb-1 block text-sm font-medium text-(--color-ink)">
                Confirm new password
              </label>
              <input id="set-pw2" type="password" autoComplete="new-password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {pwError && (
              <p role="alert" className="text-sm text-(--color-error)">
                {pwError}
              </p>
            )}
            <div>
              <button type="submit" className={primaryBtn} disabled={savingPw}>
                {savingPw ? "Saving..." : "Change password"}
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-(--color-ink)">Appearance</h2>
          <div role="radiogroup" aria-label="Theme" className="mt-4 flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={preference === t.id}
                onClick={() => setPreference(t.id)}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-violet) ${
                  preference === t.id ? "border-(--color-ink) bg-(--color-ink) text-(--color-paper)" : "border-(--color-line) text-(--color-ink-soft) hover:border-(--color-ink)"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-(--color-ink)">Session</h2>
          <div className="mt-4">
            <button type="button" className={ghostBtn} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
