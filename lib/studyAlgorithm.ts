import { Flashcard } from "../hooks/useFlashcardData";

export interface Algorithm {
  nextQuestion(flashcards: Flashcard[], currentIndex: number, totalAttempts: number): number;
}

function getCardStats(card: Flashcard) {
  const attempts = card.attempts ?? [];
  const totalAttempts = attempts.length || card.totalAttempts;
  const missedAttempts =
    attempts.filter((attempt) => attempt.result === "incorrect").length || card.missedAttempts;
  const unsureAttempts = attempts.filter((attempt) => attempt.result === "unsure").length || card.unsureAttempts;

  if (totalAttempts === 0) {
    return { difficulty: 1, confidence: 0 };
  }

  const correctAttempts = totalAttempts - missedAttempts - unsureAttempts;

  const confidence = (correctAttempts + unsureAttempts * 0.5) / totalAttempts;

  const difficulty = missedAttempts + unsureAttempts * 0.5 - correctAttempts;

  return {
    confidence,
    difficulty,
  };
}

function getTotalAttempts(card: Flashcard) {
  return (card.attempts?.length ?? 0) || card.totalAttempts;
}

export function getDifficultyString(card: Flashcard): string {
  const attempts = card.attempts ?? [];
  if ((attempts.length || card.totalAttempts) === 0) {
    return "New";
  }

  const stats = getCardStats(card);

  if (stats.confidence >= 0.9) return "Proficient";
  if (stats.confidence >= 0.7) return "Familiar";
  return "Challenging";
}

export class ChunkedSpacedRepetitionAlgorithm implements Algorithm {
  private chunkIndex: number = 0;
  private inReview: boolean = false;

  constructor(
    private chunkSize: number = 7,
    private reviewInterval: number = 20,
  ) {}

  nextQuestion(flashcards: Flashcard[], currentIndex: number, totalAttempts: number): number {
    this.chunkSize = Math.min(this.chunkSize, flashcards.length);

    const start = this.chunkIndex * this.chunkSize; // Calculate start position
    const end = Math.min(start + this.chunkSize, flashcards.length);
    const chunk = this.inReview ? this.findReviewCards(flashcards) : flashcards.slice(start, end);

    if (!this.chunkHasUnlearnedWords(chunk)) {
      this.chunkIndex = this.findNewChunkIndex(flashcards);
      this.inReview = !this.inReview;
    }

    const selectedId = this.nextQuestionFromChunk(chunk, totalAttempts);
    return flashcards.findIndex((card) => card.uid === selectedId);
  }

  private findReviewCards(flashcards: Flashcard[]): Flashcard[] {
    return flashcards.filter((card) => getTotalAttempts(card) > 0);
  }

  private findNewChunkIndex(flashcards: Flashcard[]): number {
    const numChunks = Math.ceil(flashcards.length / this.chunkSize);
    for (let i = 0; i < numChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, flashcards.length);
      const chunk = flashcards.slice(start, end);
      if (this.chunkHasUnlearnedWords(chunk)) {
        return i;
      }
    }
    return 0;
  }

  private chunkHasUnlearnedWords(chunk: Flashcard[]): boolean {
    return chunk.some((card) => {
      const stats = getCardStats(card);
      return stats.difficulty >= 0 || getTotalAttempts(card) < 2;
    });
  }

  private nextQuestionFromChunk(chunk: Flashcard[], totalAttempts: number): number {
    return chunk.reduce(
      (bestCard, card) => {
        const stats = getCardStats(card);
        const id = card.uid;
        const difficultyFactor = stats.difficulty;
        const recencyFactor = (totalAttempts - (card.lastAttempt || 0)) / chunk.length;
        const randomFactor = Math.random() * 0.1;
        const priority = difficultyFactor + recencyFactor + randomFactor;

        return priority > bestCard.priority ? { id, priority } : bestCard;
      },
      { id: 0, priority: -Infinity },
    ).id;
  }
}
