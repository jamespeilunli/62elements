import { useAuth } from "@/contexts/AuthContext";
import { getFlashcardAttemptsBySetId, getFlashcardsBySetId, getSetById } from "@/lib/data";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export type FlashcardAttemptResult = "correct" | "incorrect" | "unsure";

export interface FlashcardAttempt {
  id: number;
  flashcardUid: number;
  attemptedAt: string;
  result: FlashcardAttemptResult;
  responseMs: number;
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
      setStatus("Loading...");
      try {
        const { data: setData, error: setError } = await getSetById(setId);
        if (!setData || setError) {
          setStatus(`Error ${setError}: Could not fetch set`);
          return;
        }

        setSet(setData as FlashcardSet);

        const [{ data: flashcards, error: cardsError }, { data: attempts, error: attemptsError }] = await Promise.all([
          getFlashcardsBySetId(setId),
          getFlashcardAttemptsBySetId(setId),
        ]);

        if (cardsError || !flashcards || flashcards.length === 0) {
          setStatus("No flashcards found!");
          return;
        }

        if (attemptsError) {
          console.error("Failed to fetch flashcard attempts:", attemptsError);
        }

        const formattedCards: Flashcard[] = flashcards.map((card: any) => ({
          uid: card.uid,
          term: card.term,
          definition: card.definition,
        }));

        const formattedAttempts: FlashcardAttempt[] =
          attempts?.map((attempt: any) => ({
            id: attempt.id,
            flashcardUid: attempt.flashcard_uid,
            attemptedAt: attempt.attempted_at,
            result: attempt.result,
            responseMs: attempt.response_ms ?? 0,
          })) ?? [];

        setFlashcards(formattedCards);
        setFlashcardAttempts(formattedAttempts);
        setStatus("");
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
