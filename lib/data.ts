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

export async function getFlashcardAttemptsBySetId(setId: number) {
  const pageSize = 1000;
  let from = 0;
  let allAttempts: any[] = [];

  // Supabase enforces a 1k row limit per request; paginate to fetch everything.
  while (true) {
    const { data, error } = await supabase
      .from("flashcard_attempts")
      .select("id, flashcard_uid, attempted_at, result, response_ms")
      .eq("set_id", setId)
      .order("attempted_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      return { data: allAttempts, error };
    }

    const pageData = data ?? [];
    allAttempts.push(...pageData);

    if (pageData.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return { data: allAttempts, error: null };
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
  rigorousness: "relaxed" | "balanced" | "intense" | null;
  chunk_size: number | null;
  updated_at: string;
};

export async function getUserSetPreferences(setId: number) {
  const { data, error } = await supabase
    .from("user_set_preferences")
    .select("user_id, set_id, quiz_mode, answer_type, rigorousness, chunk_size, updated_at")
    .eq("set_id", setId)
    .maybeSingle();

  return { data: data as UserSetPreference | null, error };
}

export async function upsertUserSetPreferences({
  setId,
  quizMode,
  answerType,
  rigorousness,
  chunkSize,
  userId,
}: {
  setId: number;
  quizMode: UserSetPreference["quiz_mode"];
  answerType: UserSetPreference["answer_type"];
  rigorousness?: UserSetPreference["rigorousness"];
  chunkSize?: UserSetPreference["chunk_size"];
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
        rigorousness: rigorousness ?? null,
        chunk_size: chunkSize ?? null,
      },
      { onConflict: "user_id,set_id" },
    )
    .select("user_id, set_id, quiz_mode, answer_type, rigorousness, chunk_size, updated_at")
    .single();

  return { data: data as UserSetPreference, error };
}
