import { Flashcard, FlashcardAttempt } from "../hooks/useFlashcardData";

export interface Algorithm {
  nextQuestion(flashcards: Flashcard[], flashcardAttempts: FlashcardAttempt[]): number;
}

export type ChunkedSpacedRepetitionConfig = {
  chunkSize: number;
  difficultyThreshold: number;
  difficultyWeight: number;
  attemptWeight: number;
};

const DEFAULT_CONFIG: ChunkedSpacedRepetitionConfig = {
  chunkSize: 7,
  difficultyThreshold: 0.1,
  difficultyWeight: 0.9,
  attemptWeight: 0.1,
};

function getCardStats(card: Flashcard, attempts: FlashcardAttempt[]) {
  const allCardAttempts = attempts
    .map((attempt, overallIndex) => ({ attempt, overallIndex }))
    .filter(({ attempt }) => attempt.flashcardUid === card.uid);

  const cardAttempts = allCardAttempts.slice(-5);

  if (allCardAttempts.length === 0) {
    return { difficulty: 0.0, totalAttempts: 0, totalMissedAttempts: 0, priority: 0.5, recency: Infinity };
  }

  const totalMissedAttempts = allCardAttempts.reduce(
    (count, { attempt }) => (attempt.result === "incorrect" ? count + 1 : count),
    0,
  );

  const lastOverallIndex = cardAttempts[cardAttempts.length - 1].overallIndex;
  const recency = Math.max(0, attempts.length - 1 - lastOverallIndex);

  const n = cardAttempts.length;
  let weightedSum = 0;
  let weightTotal = 0;

  cardAttempts.forEach(({ attempt }, idx) => {
    const recencyPos = n === 1 ? 1 : idx / (n - 1);

    const weight = 0.2 + 0.8 * recencyPos; // oldest ≈ 0.3, newest = 1.0

    const accuracyScore = attempt.result === "incorrect" ? 1 : attempt.result === "unsure" ? 0.6 : 0;

    const seconds = (attempt.responseMs ?? 0) / 1000;
    const speedScore = Math.min(1, seconds / 10);

    const attemptDifficulty = 0.95 * accuracyScore + 0.05 * speedScore;

    weightedSum += weight * attemptDifficulty;
    weightTotal += weight;
  });

  const difficultyFactor = weightTotal > 0 ? weightedSum / weightTotal : 0;

  const recencyFactor = Math.min(recency / 20, 1);

  const randomFactor = Math.random();
  const priority = recencyFactor === 0 ? 0 : 0.75 * difficultyFactor + 0.25 * recencyFactor + 0.05 * randomFactor;

  return {
    difficulty: difficultyFactor,
    totalAttempts: allCardAttempts.length,
    totalMissedAttempts,
    priority,
    recency,
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
  private currentChunk: Flashcard[] = [];
  private config: ChunkedSpacedRepetitionConfig;
  private inReview: boolean = false;

  constructor(config: Partial<ChunkedSpacedRepetitionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setConfig(config: Partial<ChunkedSpacedRepetitionConfig>) {
    this.config = { ...this.config, ...config };
    this.currentChunk = [];
  }

  nextQuestion(flashcards: Flashcard[], flashcardAttempts: FlashcardAttempt[]): number {
    const chunkSize = Math.min(this.config.chunkSize, flashcards.length);
    const hasUnlearnedInChunk = this.chunkHasUnlearnedWords(this.currentChunk, flashcardAttempts);

    const needsNewChunk =
      this.currentChunk.length === 0 || this.currentChunk.length > chunkSize || !hasUnlearnedInChunk;

    if (needsNewChunk) {
      this.inReview = !this.inReview;

      const reviewPool = this.inReview ? this.findReviewCards(flashcards, flashcardAttempts, chunkSize) : [];
      this.currentChunk = this.buildChunk(flashcards, flashcardAttempts, chunkSize, reviewPool);
    }

    const selectedId = this.nextQuestionFromChunk(this.currentChunk, flashcardAttempts);
    return flashcards.findIndex((card) => card.uid === selectedId);
  }

  private findReviewCards(flashcards: Flashcard[], attempts: FlashcardAttempt[], chunkSize: number): Flashcard[] {
    return flashcards
      .map((card) => ({ card, stats: getCardStats(card, attempts) }))
      .filter(({ stats }) => stats.totalAttempts > 0 && stats.totalMissedAttempts > 1)
      .sort((a, b) => b.stats.recency - a.stats.recency)
      .slice(0, chunkSize)
      .map(({ card }) => card);
  }

  private buildChunk(
    flashcards: Flashcard[],
    attempts: FlashcardAttempt[],
    chunkSize: number,
    reviewPool: Flashcard[],
  ): Flashcard[] {
    const source = reviewPool.length > 0 ? reviewPool : flashcards;

    const cardsWithStats = source.map((card, index) => ({ card, stats: getCardStats(card, attempts), index }));
    const guaranteedNewCards = cardsWithStats
      .filter(({ stats }) => stats.totalAttempts === 0)
      .slice(0, Math.min(2, chunkSize));

    const remainingSlots = chunkSize - guaranteedNewCards.length;

    const scoredCards = cardsWithStats
      .filter(({ card }) => !guaranteedNewCards.some(({ card: newCard }) => newCard.uid === card.uid))
      .map(({ card }) => ({ card, score: this.getChunkScore(card, attempts) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, remainingSlots)
      .map(({ card }) => card);

    return [...guaranteedNewCards.map(({ card }) => card), ...scoredCards];
  }

  private getChunkScore(card: Flashcard, attempts: FlashcardAttempt[]): number {
    const stats = getCardStats(card, attempts);
    const attemptScore = Math.max(0, 2 - stats.totalAttempts) / 2;
    return this.config.difficultyWeight * stats.difficulty + this.config.attemptWeight * attemptScore;
  }

  private chunkHasUnlearnedWords(chunk: Flashcard[], attempts: FlashcardAttempt[]): boolean {
    return chunk.some((card) => {
      const stats = getCardStats(card, attempts);
      return stats.totalAttempts < 1 || stats.recency > 10 || stats.difficulty > this.config.difficultyThreshold;
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
