import { Flashcard } from "../hooks/useFlashcardData";

export interface Algorithm {
  nextQuestion(flashcards: Flashcard[], currentIndex: number, totalAttempts: number): number;
}

function getCardStats(card: Flashcard) {
  if (card.totalAttempts === 0) {
    return { difficulty: 1, confidence: 0 };
  }

  const correctAttempts = card.totalAttempts - card.missedAttempts - card.unsureAttempts;

  const confidence = (correctAttempts + card.unsureAttempts * 0.5) / card.totalAttempts;

  const difficulty = card.missedAttempts + card.unsureAttempts * 0.5 - correctAttempts;

  return {
    confidence,
    difficulty,
  };
}

export function getDifficultyString(card: Flashcard): string {
  if (card.totalAttempts === 0) {
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
    return flashcards.filter((card) => card.totalAttempts > 0);
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
      return stats.difficulty >= 0 || card.totalAttempts < 2;
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
