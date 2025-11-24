import { useAuth } from "@/contexts/AuthContext";
import { getSetById, getUserFlashcards } from "@/lib/data";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export interface Flashcard {
  uid: number;
  term: string;
  definition: string;
  totalAttempts: number;
  missedAttempts: number;
  unsureAttempts: number;
  lastAttempt: number;
}

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

        setStatus(`Studying ${set.title}`);

        if (user) {
          await supabase.rpc("ensure_user_flashcards", {
            p_set: setId,
          });
        }

        const { data: flashcards, error: cardsError } = await getUserFlashcards(setId);

        if (cardsError || !flashcards || flashcards.length === 0) {
          setStatus("No flashcards found!");
          return;
        }

        const formattedCards: Flashcard[] = flashcards.map((card: any) => {
          console.log(card.user_flashcards?.[0]);
          return {
            uid: card.uid,
            set: card.set,
            term: card.term,
            definition: card.definition,
            weight: card.user_flashcards?.[0]?.weight ?? 1,
            lastAttempt: card.user_flashcards?.[0]?.last_attempt
              ? new Date(card.user_flashcards[0].last_attempt).getTime()
              : 0,
            totalAttempts: card.user_flashcards?.[0]?.total_attempts ?? 0,
            unsureAttempts: card.user_flashcards?.[0]?.unsure_attempts ?? 0,
            missedAttempts: card.user_flashcards?.[0]?.missed_attempts ?? 0,
          };
        });

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
