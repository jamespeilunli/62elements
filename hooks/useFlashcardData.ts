// hooks/useFlashcardData.ts

import { fetchFilteredTable } from "../lib/utils";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export type Flashcard = {
  id: number;
  set: number;
  term: string;
  definition: string;
  difficulty: string;
};

export const useFlashcardData = () => {
  const searchParams = useSearchParams();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([
    { id: 1, set: -1, term: "Loading...", definition: "Loading...", difficulty: "New" },
  ]);
  const [status, setStatus] = useState<string>("Loading...");

  useEffect(() => {
    const setIdStr = searchParams.get("set-id");
    if (!setIdStr) {
      if (typeof window !== "undefined" && localStorage.getItem("flashcards")) {
        setFlashcards(JSON.parse(localStorage.getItem("flashcards")!));
      } else {
        setStatus("No set selected!");
      }
      return;
    }

    const setId = parseInt(setIdStr);

    const fetchData = async () => {
      try {
        const sets = await fetchFilteredTable("/api/get-sets", setId, "id");
        if (sets.length === 0) {
          setStatus("Invalid flashcard set!");
          return;
        }
        setStatus(`Studying ${sets[0].title}`);

        const cards = await fetchFilteredTable("/api/get-flashcards", setId, "set");
        const formattedCards = cards.map((card: Flashcard) => ({
          ...card,
          difficulty: "New",
        }));
        if (formattedCards.length === 0) {
          setStatus("No flashcards found!");
          return;
        }
        setFlashcards(formattedCards);
        localStorage.setItem("flashcards", JSON.stringify(formattedCards));
      } catch (error) {
        setStatus("Failed to load data!");
        console.error(error);
      }
    };

    fetchData();
  }, [searchParams]);

  return { flashcards, status, setFlashcards };
};
