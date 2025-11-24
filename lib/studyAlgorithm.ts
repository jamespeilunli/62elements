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

export class ChunkedSpacedRepetitionAlgorithm implements Algorithm {
  private reviewCardsRemaining: number = 0;

  constructor(
    private chunkSize: number = 7,
    private masteryThreshold: number = 3,
    private reviewInterval: number = 20,
    private reviewCount: number = 10,
  ) {}

  nextQuestion(flashcards: Flashcard[], currentIndex: number, totalAttempts: number): number {
    if (totalAttempts > 0 && totalAttempts % this.reviewInterval === 0) {
      this.reviewCardsRemaining = this.reviewCount;
    }

    if (this.reviewCardsRemaining > 0) {
      this.reviewCardsRemaining--;
      return this.selectReviewCard(flashcards, totalAttempts);
    }

    const chunk = this.findActiveChunk(flashcards);
    return this.selectFromChunk(flashcards, chunk, totalAttempts);
  }

  private findActiveChunk(flashcards: Flashcard[]): number {
    const numChunks = Math.ceil(flashcards.length / this.chunkSize);

    for (let i = 0; i < numChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, flashcards.length);
      const chunk = flashcards.slice(start, end);

      if (chunk.some((card) => card.weight < this.masteryThreshold)) {
        return i;
      }
    }
    return 0; // All mastered, restart
  }

  private selectFromChunk(flashcards: Flashcard[], chunk: number, totalAttempts: number): number {
    const start = chunk * this.chunkSize;
    const end = Math.min(start + this.chunkSize, flashcards.length);

    let bestIdx = start;
    let bestScore = -Infinity;

    for (let i = start; i < end; i++) {
      const card = flashcards[i];
      const difficulty = weightToDifficulty.length - card.weight;
      const recency = (totalAttempts - (card.lastAttempt || 0)) / this.chunkSize;
      const score = difficulty * 2 + recency;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private selectReviewCard(flashcards: Flashcard[], totalAttempts: number): number {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < flashcards.length; i++) {
      const card = flashcards[i];
      if (!card.lastAttempt) continue; // Skip unseen cards

      const difficulty = (weightToDifficulty.length - card.weight) * 3;
      const recency = (totalAttempts - card.lastAttempt) / flashcards.length;
      const score = difficulty + recency;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }
}
