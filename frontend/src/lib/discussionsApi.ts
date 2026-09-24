import { supabase } from "./supabaseClient";

// Discussions data access (0001_init.sql, 0002_rls.sql, guards in 0018).
// pinned/locked are staff/manager-only at the DB level. Not yet wired into any page.

export interface Thread {
  id: string;
  courseId: string;
  authorId: string;
  authorName: string;
  title: string;
  pinned: boolean;
  locked: boolean;
  createdAt: string;
}

export interface Post {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface ThreadRow {
  id: string;
  course_id: string;
  author_id: string;
  title: string;
  pinned: boolean;
  locked: boolean;
  created_at: string;
  profiles: { full_name: string } | null;
}
interface PostRow {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: { full_name: string } | null;
}

export async function fetchThreads(courseId: string): Promise<Thread[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("discussion_threads")
    .select("id, course_id, author_id, title, pinned, locked, created_at, profiles(full_name)")
    .eq("course_id", courseId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as ThreadRow[]).map((r) => ({
    id: r.id,
    courseId: r.course_id,
    authorId: r.author_id,
    authorName: r.profiles?.full_name ?? "",
    title: r.title,
    pinned: r.pinned,
    locked: r.locked,
    createdAt: r.created_at,
  }));
}

export async function createThread(courseId: string, title: string): Promise<boolean> {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { error } = await supabase
    .from("discussion_threads")
    .insert({ course_id: courseId, author_id: auth.user.id, title });
  return !error;
}

export async function fetchPosts(threadId: string): Promise<Post[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("discussion_posts")
    .select("id, thread_id, author_id, body, created_at, profiles(full_name)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as PostRow[]).map((r) => ({
    id: r.id,
    threadId: r.thread_id,
    authorId: r.author_id,
    authorName: r.profiles?.full_name ?? "",
    body: r.body,
    createdAt: r.created_at,
  }));
}

/** False if the thread is locked (non-staff) or the insert is otherwise refused. */
export async function createPost(threadId: string, body: string): Promise<boolean> {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { error } = await supabase
    .from("discussion_posts")
    .insert({ thread_id: threadId, author_id: auth.user.id, body });
  return !error;
}

export async function setThreadPinned(id: string, pinned: boolean): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("discussion_threads").update({ pinned }).eq("id", id);
  return !error;
}

export async function setThreadLocked(id: string, locked: boolean): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("discussion_threads").update({ locked }).eq("id", id);
  return !error;
}

export async function deletePost(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("discussion_posts").delete().eq("id", id);
  return !error;
}

export async function deleteThread(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("discussion_threads").delete().eq("id", id);
  return !error;
}
