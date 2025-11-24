import { Flashcard, weightToDifficulty } from "../hooks/useFlashcardData";

export interface Algorithm {
  nextQuestion(flashcards: Flashcard[], currentIndex: number, totalAttempts: number): number;
}

function getCardStats(card: Flashcard) {
  if (card.totalAttempts === 0) {
    return { difficulty: 1, mastery: 0, confidence: 0 };
  }

  const correctAttempts = card.totalAttempts - card.missedAttempts - card.unsureAttempts;
  const accuracy = correctAttempts / card.totalAttempts;

  const confidence = (correctAttempts + card.unsureAttempts * 0.5) / card.totalAttempts;

  const attemptFactor = Math.min(card.totalAttempts / 3, 1); // Need ~3 attempts
  const mastery = confidence * attemptFactor;

  return {
    accuracy,
    confidence,
    mastery,
    difficulty: 1 - confidence,
  };
}

export class SpacedRepetitionAlgorithm implements Algorithm {
  nextQuestion(flashcards: Flashcard[], currentIndex: number, totalAttempts: number): number {
    return flashcards.reduce(
      (bestCard, card, index) => {
        const stats = getCardStats(card);

        const difficultyFactor = stats.difficulty * 5;
        const recencyFactor = (totalAttempts - (card.lastAttempt || 0)) / flashcards.length;
        const randomFactor = Math.random() * 0.1;

        const priority = difficultyFactor + recencyFactor + randomFactor;

        return priority > bestCard.priority ? { index, priority } : bestCard;
      },
      { index: 0, priority: -Infinity },
    ).index;
  }
}

export class ChunkedSpacedRepetitionAlgorithm implements Algorithm {
  private reviewCardsRemaining: number = 0;
  private lastSelectedIndex: number | null = null;

  constructor(
    private chunkSize: number = 7,
    private masteryThreshold: number = 0.7,
    private reviewInterval: number = 20,
    private reviewCount: number = 5,
  ) {}

  nextQuestion(flashcards: Flashcard[], currentIndex: number, totalAttempts: number): number {
    if (totalAttempts > 0 && totalAttempts % this.reviewInterval === 0) {
      this.reviewCardsRemaining = this.reviewCount;
    }

    let selectedIndex: number;

    if (this.reviewCardsRemaining > 0) {
      this.reviewCardsRemaining--;
      selectedIndex = this.selectReviewCard(flashcards, totalAttempts);
    } else {
      const chunk = this.findActiveChunk(flashcards);
      selectedIndex = this.selectFromChunk(flashcards, chunk, totalAttempts);
    }

    this.lastSelectedIndex = selectedIndex;
    return selectedIndex;
  }

  private findActiveChunk(flashcards: Flashcard[]): number {
    const numChunks = Math.ceil(flashcards.length / this.chunkSize);
    for (let i = 0; i < numChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, flashcards.length);
      const chunk = flashcards.slice(start, end);
      if (
        chunk.some((card) => {
          const stats = getCardStats(card);
          return stats.mastery < this.masteryThreshold;
        })
      ) {
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
      if (i === this.lastSelectedIndex) continue;

      const card = flashcards[i];
      const stats = getCardStats(card);
      const difficultyFactor = stats.difficulty * 5;
      const recencyFactor = (totalAttempts - (card.lastAttempt || 0)) / this.chunkSize;
      const unsurePenalty = card.unsureAttempts * 0.5;
      const score = difficultyFactor + recencyFactor + unsurePenalty;

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
      if (i === this.lastSelectedIndex) continue;

      const card = flashcards[i];
      if (!card.lastAttempt) continue;

      const stats = getCardStats(card);
      const difficultyFactor = stats.difficulty * 2;
      const recencyFactor = (totalAttempts - card.lastAttempt) / flashcards.length;
      const missedBonus = card.missedAttempts * 0.2;
      const score = difficultyFactor + recencyFactor + missedBonus;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }
}
