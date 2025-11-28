import { Flashcard, FlashcardAttempt } from "../hooks/useFlashcardData";

export interface Algorithm {
  nextQuestion(
    flashcards: Flashcard[],
    flashcardAttempts: FlashcardAttempt[],
    currentIndex: number,
    totalAttempts: number,
  ): number;
}

function getCardStats(card: Flashcard, attempts: FlashcardAttempt[]) {
  const cardAttempts = attempts.filter((attempt) => attempt.flashcardUid === card.uid);
  const missedAttempts = cardAttempts.filter((attempt) => attempt.result === "incorrect").length;
  const unsureAttempts = cardAttempts.filter((attempt) => attempt.result === "unsure").length;
  const totalAttempts = cardAttempts.length;
  const lastAttemptIndex = totalAttempts;

  if (totalAttempts === 0) {
    return { difficulty: 1, confidence: 0, totalAttempts };
  }

  const correctAttempts = totalAttempts - missedAttempts - unsureAttempts;

  const confidence = (correctAttempts + unsureAttempts * 0.5) / totalAttempts;

  const difficulty = missedAttempts + unsureAttempts * 0.5 - correctAttempts;

  return {
    confidence,
    difficulty,
    totalAttempts,
    lastAttemptIndex,
  };
}

export function getDifficultyString(card: Flashcard, attempts: FlashcardAttempt[]): string {
  const stats = getCardStats(card, attempts);
  if (stats.totalAttempts === 0) {
    return "New";
  }

  if (stats.confidence >= 0.9) return "Proficient";
  if (stats.confidence >= 0.7) return "Familiar";
  return "Challenging";
}

export class ChunkedSpacedRepetitionAlgorithm implements Algorithm {
  private chunkIndex: number = 0;
  private inReview: boolean = false;

  constructor(private chunkSize: number = 7) {}

  nextQuestion(
    flashcards: Flashcard[],
    flashcardAttempts: FlashcardAttempt[],
    currentIndex: number,
    totalAttempts: number,
  ): number {
    this.chunkSize = Math.min(this.chunkSize, flashcards.length);

    const start = this.chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, flashcards.length);
    const chunk = this.inReview ? this.findReviewCards(flashcards, flashcardAttempts) : flashcards.slice(start, end);

    if (!this.chunkHasUnlearnedWords(chunk, flashcardAttempts)) {
      this.chunkIndex = this.findNewChunkIndex(flashcards, flashcardAttempts);
      this.inReview = !this.inReview;
    }

    const selectedId = this.nextQuestionFromChunk(chunk, flashcardAttempts, totalAttempts);
    return flashcards.findIndex((card) => card.uid === selectedId);
  }

  private findReviewCards(flashcards: Flashcard[], attempts: FlashcardAttempt[]): Flashcard[] {
    return flashcards.filter((card) => getCardStats(card, attempts).totalAttempts > 0);
  }

  private findNewChunkIndex(flashcards: Flashcard[], attempts: FlashcardAttempt[]): number {
    const numChunks = Math.ceil(flashcards.length / this.chunkSize);
    for (let i = 0; i < numChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, flashcards.length);
      const chunk = flashcards.slice(start, end);
      if (this.chunkHasUnlearnedWords(chunk, attempts)) {
        return i;
      }
    }
    return 0;
  }

  private chunkHasUnlearnedWords(chunk: Flashcard[], attempts: FlashcardAttempt[]): boolean {
    return chunk.some((card) => {
      const stats = getCardStats(card, attempts);
      return stats.difficulty >= 0 || stats.totalAttempts < 2;
    });
  }

  private nextQuestionFromChunk(chunk: Flashcard[], attempts: FlashcardAttempt[], totalAttempts: number): number {
    return chunk.reduce(
      (bestCard, card) => {
        const stats = getCardStats(card, attempts);
        const id = card.uid;
        const difficultyFactor = stats.difficulty;
        const recencyFactor = (totalAttempts - (stats.lastAttemptIndex || 0)) / chunk.length;
        const randomFactor = Math.random() * 0.1;
        const priority = difficultyFactor + recencyFactor + randomFactor;

        return priority > bestCard.priority ? { id, priority } : bestCard;
      },
      { id: 0, priority: -Infinity },
    ).id;
  }
}
