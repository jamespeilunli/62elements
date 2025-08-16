import { useAuth } from "@/contexts/AuthContext";
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
        const setResponse = await fetch(`/api/get-set?set-id=${setId}`);
        if (!setResponse.ok) {
          setStatus(`Error ${setResponse.status}: Could not fetch set`);
          return;
        }
        const set = await setResponse.json();
        setStatus(`Studying set ${set.title}`);

        let flashcardEndpoint;
        try {
          // might want to move to backend eventually, but annoying because need user session
          const { error } = await supabase.rpc("ensure_user_flashcards", {
            p_set: setId,
          });
          if (error) {
            setStatus(`Error ${error}`);
            return;
          }

          flashcardEndpoint = `/api/get-user-flashcards?set-id=${setId}`;
        } catch {
          flashcardEndpoint = `/api/get-flashcards?set-id=${setId}`;
        }

        const cardsResponse = await fetch(flashcardEndpoint);
        if (!cardsResponse.ok) {
          setStatus(`Error ${cardsResponse.status}: Could not fetch cards`);
          return;
        }

        const data = await cardsResponse.json();
        if (!Array.isArray(data) || data.length === 0) {
          setStatus("No flashcards found!");
          return;
        }

        const formattedCards: Flashcard[] = data.map((card: any) => ({
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

        setFlashcards(formattedCards);
        localStorage.setItem("last-set", setIdStr);
      } catch (error) {
        console.error(error);
        setStatus(`Error ${error}, failed to load data!`);
      }
    };

    fetchData();
  }, [searchParams]);

  return { flashcards, status };
};
