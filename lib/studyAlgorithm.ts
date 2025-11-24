import { Flashcard, weightToDifficulty } from "../hooks/useFlashcardData";

export interface Algorithm {
  nextQuestion(flashcards: Flashcard[], currentIndex: number, totalAttempts: number): number;
}

export class SpacedRepetitionAlgorithm implements Algorithm {
  nextQuestion(flashcards: Flashcard[], currentIndex: number, totalAttempts: number): number {
    return flashcards.reduce(
      (bestCard, card, index) => {
        const difficultyFactor = weightToDifficulty.length - card.weight;
        const recencyFactor = (totalAttempts - (card.lastAttempt || 0)) / flashcards.length;
        const randomFactor = Math.random();

        const priority = difficultyFactor + recencyFactor + 0.1 * randomFactor;

        return priority > bestCard.priority ? { index, priority } : bestCard;
      },
      { index: 0, priority: -Infinity },
    ).index;
  }
}
