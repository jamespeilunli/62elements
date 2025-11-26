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
      user_flashcards!left(
        last_attempt,
        total_attempts,
        missed_attempts,
        unsure_attempts
      )
    `,
    )
    .eq("set", setId)
    .order("uid", { ascending: true });

  return { data, error };
}

export async function getVisibleSets() {
  const { data, error } = await supabase.from("sets").select("*").eq("visible", true);

  return { data, error };
}
