const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

export class ApiAuthError extends Error {}
export class ApiNetworkError extends Error {}

export interface ApiProfile {
  id: string;
  email: string;
  role: "staff" | "student" | "manager";
  fullName: string;
}

export interface ApiTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  profile: ApiProfile;
}

export interface ApiAnnouncement {
  id: string;
  authorName: string;
  title: string;
  body: string;
  audience: "all" | "staff" | "student";
  createdAt: number;
}

export interface ApiCertificate {
  id: string;
  userName: string;
  courseTitle: string;
  issuedAt: number;
  serial: string;
}

export interface ApiSession {
  id: string;
  userId: string;
  userName: string;
  userRole: "staff" | "student" | "manager";
  loginAt: number;
  endedAt: number | null;
  status: "active" | "present" | "left_early";
  durationSeconds: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    // Backend isn't running/reachable — distinct from a real auth/validation
    // failure, so callers can fall back to offline mock behavior only here.
    throw new ApiNetworkError(`Could not reach the API at ${API_BASE}`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new ApiAuthError(await res.text().catch(() => "Not authorized"));
  }
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function apiLogin(email: string, password: string) {
  return request<ApiTokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function apiLogout(token: string) {
  return request<{ ok: boolean }>("/auth/logout", { method: "POST", headers: authHeaders(token) });
}

export function apiMe(token: string) {
  return request<ApiProfile>("/auth/me", { headers: authHeaders(token) });
}

export function apiHeartbeat(token: string) {
  return request<{ status: string; elapsedSeconds: number; expiresAt: number }>("/attendance/heartbeat", {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function apiGetAnnouncements(token: string) {
  return request<ApiAnnouncement[]>("/announcements", { headers: authHeaders(token) });
}

export function apiCreateAnnouncement(token: string, body: { title: string; body: string; audience: "all" | "staff" | "student" }) {
  return request<ApiAnnouncement>("/announcements", { method: "POST", headers: authHeaders(token), body: JSON.stringify(body) });
}

export function apiGetMySessions(token: string) {
  return request<ApiSession[]>("/attendance/sessions/me", { headers: authHeaders(token) });
}

export function apiGetAllSessions(token: string) {
  return request<ApiSession[]>("/attendance/sessions", { headers: authHeaders(token) });
}

export function apiIssueCertificate(token: string, courseTitle: string) {
  return request<ApiCertificate>("/certificates", { method: "POST", headers: authHeaders(token), body: JSON.stringify({ courseTitle }) });
}

export function apiVerifyCertificate(certificateId: string) {
  return request<ApiCertificate>(`/certificates/verify/${encodeURIComponent(certificateId)}`);
}
