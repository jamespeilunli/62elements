import { time } from "console";
import { Flashcard, FlashcardAttempt } from "../hooks/useFlashcardData";

export interface Algorithm {
  nextQuestion(flashcards: Flashcard[], flashcardAttempts: FlashcardAttempt[], currentIndex: number): number;
}

function getCardStats(card: Flashcard, attempts: FlashcardAttempt[]) {
  const cardAttempts = attempts
    .map((attempt, index) => ({ attempt, overallIndex: index }))
    .filter(({ attempt }) => attempt.flashcardUid === card.uid);

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
      console.log(value + " = " + timeFactor + " * (0.9 * " + accuracyFactor + " + 0.1 * " + speedFactor);
      return acc + value;
    }, 0) / cardAttempts.length;

  const recencyFactor = Math.min(10, attempts.length - cardAttempts[cardAttempts.length - 1].overallIndex) / 10;
  const priority = 0.8 * difficultyFactor + 0.2 * recencyFactor;
  console.log(priority + " = 0.7 * " + difficultyFactor + " + 0.3 * " + recencyFactor);

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
  private chunkIndex: number = 0;
  private inReview: boolean = false;

  constructor(private chunkSize: number = 7) {}

  nextQuestion(flashcards: Flashcard[], flashcardAttempts: FlashcardAttempt[], currentIndex: number): number {
    this.chunkSize = Math.min(this.chunkSize, flashcards.length);

    const start = this.chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, flashcards.length);
    const chunk = this.inReview ? this.findReviewCards(flashcards, flashcardAttempts) : flashcards.slice(start, end);

    if (!this.chunkHasUnlearnedWords(chunk, flashcardAttempts)) {
      this.chunkIndex = this.findNewChunkIndex(flashcards, flashcardAttempts);
      this.inReview = !this.inReview;
    }

    const selectedId = this.nextQuestionFromChunk(chunk, flashcardAttempts);
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
      return stats.totalAttempts === 0 || stats.difficulty >= 0.1;
    });
  }

  private nextQuestionFromChunk(chunk: Flashcard[], attempts: FlashcardAttempt[]): number {
    if (chunk.length === 0) return 0;

    return chunk.reduce(
      (bestCard, card, index) => {
        console.log(card.term);
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
