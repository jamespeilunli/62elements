import { useAuth } from "@/contexts/AuthContext";
import { getSetById, getUserFlashcards } from "@/lib/data";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export type FlashcardAttemptResult = "correct" | "incorrect" | "unsure";

export interface FlashcardAttempt {
  id: number;
  flashcardUid: number;
  attempted_at: string;
  result: FlashcardAttemptResult;
  response_ms: number;
}

export interface Flashcard {
  uid: number;
  term: string;
  definition: string;
}

export interface FlashcardSet {
  id: number;
  title: string;
  category?: string | null;
  is_public?: boolean;
  user_id?: string;
}

export const useFlashcardData = () => {
  const searchParams = useSearchParams();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardAttempts, setFlashcardAttempts] = useState<FlashcardAttempt[]>([]);
  const [status, setStatus] = useState<string>("Loading...");
  const [set, setSet] = useState<FlashcardSet | null>(null);
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
    if (Number.isNaN(setId)) {
      setStatus("Invalid set id");
      return;
    }

    const fetchData = async () => {
      try {
        const { data: set, error: setError } = await getSetById(setId);
        if (!set) {
          setStatus(`Error ${setError}: Could not fetch set`);
          return;
        }

        setSet(set as FlashcardSet);

        const { data: flashcards, error: cardsError } = await getUserFlashcards(setId);

        if (cardsError || !flashcards || flashcards.length === 0) {
          setStatus("No flashcards found!");
          return;
        }

        const allAttempts: FlashcardAttempt[] = [];

        const formattedCards: Flashcard[] = flashcards.map((card: any) => {
          const attempts = Array.isArray(card.flashcard_attempts)
            ? [...card.flashcard_attempts]
                .map((attempt) => ({
                  id: attempt.id,
                  flashcardUid: attempt.flashcard_uid ?? card.uid,
                  attempted_at: attempt.attempted_at,
                  result: attempt.result,
                  response_ms: attempt.response_ms ?? 0,
                }))
                .sort((a, b) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime())
            : [];

          allAttempts.push(...attempts);

          return {
            uid: card.uid,
            term: card.term,
            definition: card.definition,
          };
        });

        setFlashcards(formattedCards);
        setFlashcardAttempts(allAttempts);
        localStorage.setItem("last-set", setIdStr);
      } catch (error) {
        console.error(error);
        setStatus(`Error ${error}, failed to load data!`);
      }
    };

    fetchData();
  }, [searchParams, user]);

  return { status, flashcards, flashcardAttempts, set };
};
