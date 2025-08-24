import { useAuth } from "@/contexts/AuthContext";
import { getFlashcardsBySetId, getSetById } from "@/lib/data";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export type Difficulty = "New" | "Challenging" | "Familiar" | "Proficient";
export const weightToDifficulty: Difficulty[] = ["Challenging", "New", "Familiar", "Proficient"];

export type Flashcard = {
  uid: number; // uid in the flashcards table
  id: number;
  set: number;
  term: string;
  definition: string;
  weight: number;
  lastAttempt: number;
};

export const useFlashcardData = () => {
  const searchParams = useSearchParams();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [status, setStatus] = useState<string>("Loading...");
  const { user } = useAuth();

  useEffect(() => {
    let setIdStr = searchParams.get("set-id");

    if (!setIdStr) {
      if (typeof window !== "undefined" && localStorage.getItem("last-set")) {
        setIdStr = localStorage.getItem("last-set")!;
      } else {
        setStatus("No set selected!");
        return;
      }
    }

    const setId = parseInt(setIdStr);

    const fetchData = async () => {
      try {
        const { data: set, error: setError } = await getSetById(setId);

        if (!set) {
          setStatus(`Error ${setError}: Could not fetch set`);
          return;
        }

        setStatus(`Studying set ${set.title}`);

        // ensure user flashcards
        const { error } = await supabase.rpc("ensure_user_flashcards", {
          p_set: setId,
        });

        let formattedCards: Flashcard[];

        if (error) {
          // fall back to endpoint
          const { data: cardsResponse, error: cardsError } = await getFlashcardsBySetId(setId);
          if (!cardsResponse) {
            setStatus(`Error ${cardsError}: Could not fetch cards`);
            return;
          }
          if (!Array.isArray(cardsResponse) || cardsResponse.length === 0) {
            setStatus("No flashcards found!");
            return;
          }
          formattedCards = cardsResponse.map((card: any) => ({
            id: card.id,
            uid: card.uid,
            set: card.set,
            term: card.term,
            definition: card.definition,
            weight: card.user_flashcards?.[0]?.weight ?? 1,
            lastAttempt: card.user_flashcards?.[0]?.last_attempt
              ? new Date(card.user_flashcards[0].last_attempt).getTime()
              : 0,
          }));
        } else {
          // use the previously commented-out Supabase query
          const { data, error: cardsError } = await supabase
            .from("flashcards")
            .select(
              `
          uid,
          id,
          set,
          term,
          definition,
          user_flashcards!left(
            weight,
            last_attempt
          )
        `,
            )
            .eq("set", setId)
            .order("id", { ascending: true });

          if (cardsError || !data || data.length === 0) {
            setStatus("No flashcards found!");
            return;
          }

          formattedCards = data.map((card: any) => ({
            id: card.id,
            uid: card.uid,
            set: card.set,
            term: card.term,
            definition: card.definition,
            weight: card.user_flashcards?.[0]?.weight ?? 1,
            lastAttempt: card.user_flashcards?.[0]?.last_attempt
              ? new Date(card.user_flashcards[0].last_attempt).getTime()
              : 0,
          }));
        }

        setFlashcards(formattedCards);
        localStorage.setItem("last-set", setIdStr);
      } catch (error) {
        console.error(error);
        setStatus(`Error ${error}, failed to load data!`);
      }
    };

    fetchData();
  }, [searchParams, user]);

  return { flashcards, status };
};
