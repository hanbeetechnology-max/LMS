export type HanbeeRole = "student" | "school_staff" | "staff" | "manager";

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  token_type: string;
  user: { id: string; email?: string };
}

export interface SignedInAccount {
  session: SupabaseSession;
  role: HanbeeRole;
  approved: boolean;
  accountStatus: string;
}

export const AUTH_SESSION_KEY = "hanbee-auth-session";

interface SupabaseErrorBody {
  message?: string;
  msg?: string;
  error_description?: string;
  error?: string;
}

interface AuthSessionResponse extends SupabaseSession {
  expires_in?: number;
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Sign-in is not configured yet. Add the Supabase URL and public anon key to the frontend environment.");
  }
  return { url, anonKey };
}

async function readError(response: Response, fallback: string) {
  let body: SupabaseErrorBody = {};
  try {
    body = (await response.json()) as SupabaseErrorBody;
  } catch {
    // Supabase can return an empty body for upstream errors.
  }
  return body.message || body.msg || body.error_description || body.error || fallback;
}

async function supabaseFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, anonKey } = getSupabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", anonKey);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Supabase couldn't complete the request."));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function signInWithPassword(email: string, password: string): Promise<SignedInAccount> {
  const auth = await supabaseFetch<AuthSessionResponse>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });

  const account = await loadAccount(auth);

  const session: SupabaseSession = {
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    token_type: auth.token_type,
    user: auth.user,
    ...(auth.expires_in ? { expires_at: Math.floor(Date.now() / 1000) + auth.expires_in } : {}),
  };

  return { session, ...account };
}

async function loadAccount(session: Pick<SupabaseSession, "access_token" | "user">) {
  const { url, anonKey } = getSupabaseConfig();
  const profileUrl = new URL(`${url}/rest/v1/profiles`);
  profileUrl.searchParams.set("select", "role,approved,account_status");
  profileUrl.searchParams.set("id", `eq.${session.user.id}`);
  const profileResponse = await fetch(profileUrl, {
    headers: { apikey: anonKey, Authorization: `Bearer ${session.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error(await readError(profileResponse, "We couldn't load your account. Please try again."));
  }

  const profiles = (await profileResponse.json()) as Array<{
    role: HanbeeRole;
    approved: boolean;
    account_status: string;
  }>;
  const profile = profiles[0];
  if (!profile || !["student", "school_staff", "staff", "manager"].includes(profile.role)) {
    throw new Error("Your account profile is missing or has an unsupported role. Contact Hanbee support.");
  }
  if (profile.account_status !== "active") {
    throw new Error("This account is suspended or inactive. Contact your school or Hanbee support.");
  }
  return { role: profile.role, approved: profile.approved, accountStatus: profile.account_status };
}

export function readStoredSession(): SupabaseSession | null {
  try {
    const value = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as SupabaseSession;
    return session.access_token && session.refresh_token && session.user?.id ? session : null;
  } catch {
    return null;
  }
}

export async function refreshSession(session: SupabaseSession): Promise<SupabaseSession> {
  const refreshed = await supabaseFetch<AuthSessionResponse>("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  return {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    token_type: refreshed.token_type,
    user: refreshed.user,
    ...(refreshed.expires_in ? { expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in } : {}),
  };
}

export async function getCurrentAccount(session: SupabaseSession): Promise<SignedInAccount> {
  const refreshed = session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 60
    ? await refreshSession(session)
    : session;
  const user = await supabaseFetch<{ id: string; email?: string }>("/auth/v1/user", {
    headers: { Authorization: `Bearer ${refreshed.access_token}` },
  });
  const verifiedSession = { ...refreshed, user };
  const account = await loadAccount(verifiedSession);
  return { session: verifiedSession, ...account };
}

export async function signOut(session: SupabaseSession | null) {
  try {
    if (session?.access_token) {
      await supabaseFetch<unknown>("/auth/v1/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    }
  } finally {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
  }
}

export async function authenticatedSupabaseFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");
  if (session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 60) {
    session = await refreshSession(session);
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  return supabaseFetch<T>(path, {
    ...init,
    headers,
  });
}

export async function signUpWithPassword(input: {
  fullName: string;
  email: string;
  password: string;
  role: "student" | "staff" | "school_staff";
  inviteToken?: string;
  joinToken?: string;
  schoolName?: string;
  registrationNo?: string;
  officialEmail?: string;
  guardianConsent?: boolean;
}) {
  const data: Record<string, string> = {
    full_name: input.fullName.trim(),
    role: input.role,
  };
  if (input.inviteToken) data.invite_token = input.inviteToken.trim();
  if (input.joinToken) data.join_token = input.joinToken.trim();
  if (input.role === "school_staff") {
    data.school_name = input.schoolName?.trim() ?? "";
    data.registration_no = input.registrationNo?.trim() ?? "";
    data.official_email = input.officialEmail?.trim() ?? "";
    data.guardian_consent = input.guardianConsent ? "true" : "false";
  }

  const confirmationRedirect = typeof window === "undefined" ? undefined : `${window.location.origin}/login?signup=confirmed`;
  const signupPath = confirmationRedirect
    ? `/auth/v1/signup?redirect_to=${encodeURIComponent(confirmationRedirect)}`
    : "/auth/v1/signup";
  return supabaseFetch<{ user?: { id: string; email?: string }; access_token?: string }>(signupPath, {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
      data,
    }),
  });
}

export async function requestPasswordReset(email: string) {
  getSupabaseConfig();
  const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/reset-password`;
  const recoveryPath = redirectTo
    ? `/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`
    : "/auth/v1/recover";
  return supabaseFetch<{ message?: string }>(recoveryPath, {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function updatePassword(accessToken: string, password: string) {
  return supabaseFetch<{ id: string; email?: string }>("/auth/v1/user", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ password }),
  });
}

export interface AccountProfile {
  id: string;
  email: string;
  full_name: string;
  role: HanbeeRole;
  avatar_url: string | null;
}

export async function getAccountProfile() {
  const session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");
  const profiles = await authenticatedSupabaseFetch<AccountProfile[]>(
    `/rest/v1/profiles?select=id,email,full_name,role,avatar_url&id=eq.${encodeURIComponent(session.user.id)}`,
  );
  const profile = profiles[0];
  if (!profile) throw new Error("We couldn't find your Hanbee profile.");
  return profile;
}

export async function updateAccountProfile(input: Pick<AccountProfile, "id"> & { full_name: string }) {
  return authenticatedSupabaseFetch<undefined>(`/rest/v1/profiles?id=eq.${encodeURIComponent(input.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ full_name: input.full_name.trim() }),
  });
}
