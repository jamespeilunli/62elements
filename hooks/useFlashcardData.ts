// hooks/useFlashcardData.ts

import { fetchFilteredTable } from "../lib/utils";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export type Difficulty = "New" | "Challenging" | "Familiar" | "Proficient";
export const weightToDifficulty: Difficulty[] = ["New", "Challenging", "Familiar", "Proficient"];

export type Flashcard = {
  id: number;
  set: number;
  term: string;
  definition: string;
  weight: number;
  lastStudied: number;
};

export const useFlashcardData = () => {
  const searchParams = useSearchParams();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
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
        const setsResponse = await fetchFilteredTable("/api/get-sets", setId, "id");
        if (setsResponse.status !== 200) {
          setStatus(`Error ${setsResponse.status}: Could not fetch sets`);
          return;
        }
        const sets = setsResponse.data;
        if (sets.length === 0) {
          setStatus("Invalid flashcard set!");
          return;
        }
        setStatus(`Studying ${sets[0].title}`);

        const cardsResponse = await fetchFilteredTable("/api/get-flashcards", setId, "set");
        if (cardsResponse.status !== 200) {
          setStatus(`Error ${cardsResponse.status}: Could not fetch cards`);
          return;
        }
        const cards = cardsResponse.data;
        if (cards.length === 0) {
          setStatus("No flashcards found!");
          return;
        }

        const formattedCards = cards.map((card: Flashcard) => ({
          ...card,
          weight: 0,
          lastStudied: Date.now(),
        }));
        setFlashcards(formattedCards);
        localStorage.setItem("flashcards", JSON.stringify(formattedCards));
      } catch (error) {
        setStatus("Failed to load data!");
        console.error(error);
      }
    };

    fetchData();
  }, [searchParams]);

  return { flashcards, status };
};
