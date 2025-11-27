import { supabase } from "./supabaseClient";

export async function getFlashcardsBySetId(setId: number) {
  const { data, error } = await supabase
    .from("flashcards")
    .select(
      `
      uid,
      set,
      term,
      definition
      `,
    )
    .eq("set", setId)
    .order("uid", { ascending: true });

  return { data, error };
}

export async function getSetById(setId: number) {
  const { data, error } = await supabase.from("sets").select("*").eq("id", setId).single();

  return { data, error };
}

export async function getUserFlashcards(setId: number) {
  const { data, error } = await supabase
    .from("flashcards")
    .select(
      `
      uid,
      set,
      term,
      definition,
      flashcard_attempts(
        id,
        flashcard_uid,
        attempted_at,
        result,
        response_ms
      )
    `,
    )
    .eq("set", setId)
    .order("uid", { ascending: true })
    .order("attempted_at", { foreignTable: "flashcard_attempts", ascending: true });

  return { data, error };
}

export async function getVisibleSets() {
  const { data, error } = await supabase.from("sets").select("*").eq("visible", true);

  return { data, error };
}

export type UserSetPreference = {
  user_id: string;
  set_id: number;
  quiz_mode: "term-to-definition" | "definition-to-term" | "both";
  answer_type: "multiple-choice" | "short-answer" | "both";
  updated_at: string;
};

export async function getUserSetPreferences(setId: number) {
  const { data, error } = await supabase
    .from("user_set_preferences")
    .select("user_id, set_id, quiz_mode, answer_type, updated_at")
    .eq("set_id", setId)
    .maybeSingle();

  return { data: data as UserSetPreference | null, error };
}

export async function upsertUserSetPreferences({
  setId,
  quizMode,
  answerType,
  userId,
}: {
  setId: number;
  quizMode: UserSetPreference["quiz_mode"];
  answerType: UserSetPreference["answer_type"];
  userId: string;
}) {
  const { data, error } = await supabase
    .from("user_set_preferences")
    .upsert(
      {
        user_id: userId,
        set_id: setId,
        quiz_mode: quizMode,
        answer_type: answerType,
      },
      { onConflict: "user_id,set_id" },
    )
    .select("user_id, set_id, quiz_mode, answer_type, updated_at")
    .single();

  return { data: data as UserSetPreference, error };
}
