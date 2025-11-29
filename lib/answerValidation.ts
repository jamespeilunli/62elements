const normalizeAnswerText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/−/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const levenshteinDistance = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = Array(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  return matrix[a.length][b.length];
};

const splitAlternativeAnswers = (answer: string) =>
  answer
    .split(/(?:\s+or\s+|\/|;|\|)/i)
    .map((part) => normalizeAnswerText(part))
    .filter(Boolean);

const hasHighWordOverlap = (guess: string, target: string) => {
  if (!guess || !target) return false;

  const guessWords = guess.split(" ");
  const targetWords = target.split(" ");

  if (targetWords.length === 0) return false;

  const targetSet = new Set(targetWords);
  const sharedWordCount = guessWords.filter((word) => targetSet.has(word)).length;
  const overlapRatio = sharedWordCount / targetWords.length;

  return overlapRatio >= 0.7 && guess.length >= target.length * 0.6;
};

const sharesKeyWord = (guess: string, target: string) => {
  if (!guess || !target) return false;

  const guessWords = new Set(guess.split(" ").filter((word) => word.length >= 4));
  const targetWords = target.split(" ");

  return targetWords.some((word) => word.length >= 4 && guessWords.has(word));
};

export const isShortAnswerCorrect = (guess: string, correctAnswer: string) => {
  const normalizedGuess = normalizeAnswerText(guess);
  const possibleAnswers = splitAlternativeAnswers(correctAnswer);

  if (!normalizedGuess) return false;

  return possibleAnswers.some((answer) => {
    if (!answer) return false;
    if (normalizedGuess === answer) return true;

    const distance = levenshteinDistance(normalizedGuess, answer);
    const allowedDistance = Math.max(1, Math.ceil(answer.length * 0.15));
    if (distance <= allowedDistance) return true;

    if (sharesKeyWord(normalizedGuess, answer)) return true;

    return hasHighWordOverlap(normalizedGuess, answer);
  });
};
