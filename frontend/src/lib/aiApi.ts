import { supabase } from "./supabaseClient";

export interface AiChatMessage {
  role: "user" | "model";
  content: string;
}

export interface AskAssistantResult {
  reply?: string;
  error?: string;
}

export async function askAssistant(message: string, history: AiChatMessage[]): Promise<AskAssistantResult> {
  if (!supabase) return { error: "AI Assistant needs a connected backend." };
  const { data, error } = await supabase.functions.invoke("ai-assistant", { body: { message, history } });
  if (error) return { error: "Couldn't reach the AI Assistant. It may not be deployed yet." };
  if (data?.error) return { error: data.error as string };
  return data as AskAssistantResult;
}
