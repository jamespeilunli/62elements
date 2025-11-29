import { Flashcard, FlashcardAttempt } from "../hooks/useFlashcardData";

export interface Algorithm {
  nextQuestion(flashcards: Flashcard[], flashcardAttempts: FlashcardAttempt[]): number;
}

export type ChunkedSpacedRepetitionConfig = {
  chunkSize: number;
  masteryTarget: number;
  difficultyThreshold: number;
  difficultyWeight: number;
  attemptWeight: number;
};

const DEFAULT_CONFIG: ChunkedSpacedRepetitionConfig = {
  chunkSize: 7,
  masteryTarget: 3,
  difficultyThreshold: 0.1,
  difficultyWeight: 0.7,
  attemptWeight: 0.3,
};

function getCardStats(card: Flashcard, attempts: FlashcardAttempt[]) {
  const cardAttempts = attempts
    .map((attempt, index) => ({ attempt, overallIndex: index }))
    .filter(({ attempt }) => attempt.flashcardUid === card.uid)
    .slice(-10);

  if (cardAttempts.length === 0) {
    return { difficulty: 1, totalAttempts: 0, priority: 0.5 };
  }

  const cardAttemptRange = cardAttempts[cardAttempts.length - 1].overallIndex - cardAttempts[0].overallIndex;

  const difficultyFactor =
    cardAttempts.reduce((acc, { attempt, overallIndex }, index) => {
      const timeFactor =
        cardAttempts.length === 1 ? 1 : (overallIndex - cardAttempts[0].overallIndex) / cardAttemptRange;
      const speedFactor = Math.min(1, (attempt.responseMs ?? 0) / 10000);
      const accuracyFactor = attempt.result === "incorrect" ? 1 : attempt.result === "unsure" ? 0.5 : 0;
      const value = timeFactor * (0.9 * accuracyFactor + 0.1 * speedFactor);
      return acc + value;
    }, 0) / cardAttempts.length;

  const recencyFactor = Math.min(10, attempts.length - cardAttempts[cardAttempts.length - 1].overallIndex) / 10;
  const randomFactor = Math.random();
  const priority = 0.7 * difficultyFactor + 0.25 * recencyFactor + 0.05 * randomFactor;

  return {
    difficulty: difficultyFactor,
    totalAttempts: cardAttempts.length,
    priority,
  };
}

export function getDifficultyString(card: Flashcard, attempts: FlashcardAttempt[]): string {
  const stats = getCardStats(card, attempts);
  if (stats.totalAttempts === 0) {
    return "New";
  }

  if (stats.difficulty <= 0.1) return "Proficient";
  if (stats.difficulty <= 0.3) return "Familiar";
  return "Challenging";
}

export class ChunkedSpacedRepetitionAlgorithm implements Algorithm {
  private inReview: boolean = false;
  private currentChunk: Flashcard[] = [];
  private config: ChunkedSpacedRepetitionConfig;

  constructor(config: Partial<ChunkedSpacedRepetitionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setConfig(config: Partial<ChunkedSpacedRepetitionConfig>) {
    this.config = { ...this.config, ...config };
    this.currentChunk = [];
    this.inReview = false;
  }

  nextQuestion(flashcards: Flashcard[], flashcardAttempts: FlashcardAttempt[]): number {
    const chunkSize = Math.min(this.config.chunkSize, flashcards.length);

    if (
      this.currentChunk.length === 0 ||
      this.currentChunk.length > chunkSize ||
      !this.chunkHasUnlearnedWords(this.currentChunk, flashcardAttempts)
    ) {
      this.inReview = !this.inReview;
      this.currentChunk = this.buildChunk(flashcards, flashcardAttempts, chunkSize);
    }

    const selectedId = this.nextQuestionFromChunk(this.currentChunk, flashcardAttempts);
    return flashcards.findIndex((card) => card.uid === selectedId);
  }

  private findReviewCards(flashcards: Flashcard[], attempts: FlashcardAttempt[]): Flashcard[] {
    return flashcards.filter((card) => getCardStats(card, attempts).totalAttempts > 0);
  }

  private buildChunk(flashcards: Flashcard[], attempts: FlashcardAttempt[], chunkSize: number): Flashcard[] {
    const pool = this.inReview ? this.findReviewCards(flashcards, attempts) : flashcards;
    const source = pool.length > 0 ? pool : flashcards;

    const scoredCards = source
      .map((card) => ({ card, score: this.getChunkScore(card, attempts) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, chunkSize)
      .map(({ card }) => card);

    return scoredCards;
  }

  private getChunkScore(card: Flashcard, attempts: FlashcardAttempt[]): number {
    const stats = getCardStats(card, attempts);
    const attemptScore = Math.max(0, this.config.masteryTarget - stats.totalAttempts) / this.config.masteryTarget;
    return this.config.difficultyWeight * stats.difficulty + this.config.attemptWeight * attemptScore;
  }

  private chunkHasUnlearnedWords(chunk: Flashcard[], attempts: FlashcardAttempt[]): boolean {
    return chunk.some((card) => {
      const stats = getCardStats(card, attempts);
      return stats.totalAttempts < this.config.masteryTarget || stats.difficulty > this.config.difficultyThreshold;
    });
  }

  private nextQuestionFromChunk(chunk: Flashcard[], attempts: FlashcardAttempt[]): number {
    if (chunk.length === 0) return 0;

    return chunk.reduce(
      (bestCard, card, index) => {
        const stats = getCardStats(card, attempts);
        const priority = stats.priority;

        if (priority > bestCard.priority || (priority === bestCard.priority && index < bestCard.index)) {
          return { id: card.uid, priority, index };
        }

        return bestCard;
      },
      { id: chunk[0].uid, priority: -Infinity, index: chunk.length },
    ).id;
  }
}
