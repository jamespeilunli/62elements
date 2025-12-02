"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import BackLink from "@/components/back-link";
import { useAuth } from "@/contexts/AuthContext";
import {
  Algorithm,
  ChunkedSpacedRepetitionAlgorithm,
  ChunkedSpacedRepetitionConfig,
} from "../../../lib/studyAlgorithm";
import { Flashcard, FlashcardAttempt, FlashcardAttemptResult, useFlashcardData } from "../../../hooks/useFlashcardData";
import { supabase } from "@/lib/supabaseClient";
import { Check, Settings, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, Suspense, useState, useRef } from "react";
import { getUserSetPreferences, upsertUserSetPreferences } from "@/lib/data";
import { isShortAnswerCorrect } from "@/lib/answerValidation";

type QuizMode = "term-to-definition" | "definition-to-term" | "both";
type AnswerType = "multiple-choice" | "short-answer" | "both";
type RigorousnessLevel = "relaxed" | "balanced" | "intense";
type PracticeSettings = {
  quizMode: QuizMode;
  answerType: AnswerType;
  rigorousness: RigorousnessLevel;
  chunkSize: number;
};
const defaultSettings: PracticeSettings = {
  quizMode: "both",
  answerType: "short-answer",
  rigorousness: "balanced",
  chunkSize: 7,
};
const mergeSettings = (base: PracticeSettings, update: Partial<PracticeSettings>): PracticeSettings => ({
  ...base,
  ...update,
});
const rigorousnessPresets: Record<RigorousnessLevel, Omit<ChunkedSpacedRepetitionConfig, "chunkSize">> = {
  relaxed: {
    masteryTarget: 1,
    difficultyThreshold: 0.2,
    difficultyWeight: 0.6,
    attemptWeight: 0.4,
  },
  balanced: {
    masteryTarget: 2,
    difficultyThreshold: 0.1,
    difficultyWeight: 0.7,
    attemptWeight: 0.3,
  },
  intense: {
    masteryTarget: 3,
    difficultyThreshold: 0.08,
    difficultyWeight: 0.8,
    attemptWeight: 0.2,
  },
};

interface PracticeState {
  flashcards: Flashcard[];
  flashcardAttempts: FlashcardAttempt[];
  currentCardIndex: number;
  userAnswer: string;
  showAnswer: boolean;
  score: number;
  totalAttempts: number;
  isTermQuestion: boolean;
  isShortAnswerQuestion: boolean;
  isCorrect: boolean;
  settings: PracticeSettings;
}

type PracticeAction =
  | { type: "SHUFFLE_CARDS"; cards: Flashcard[] }
  | { type: "SET_FLASHCARD_ATTEMPTS"; attempts: FlashcardAttempt[] }
  | { type: "REPLACE_ATTEMPT"; prevId: number; savedAttempt: FlashcardAttempt }
  | { type: "SET_SETTINGS"; settings: Partial<PracticeSettings> }
  | { type: "SUBMIT_ANSWER"; isCorrect: boolean; userAnswer: string; attempt: FlashcardAttempt }
  | { type: "NEXT_QUESTION"; algorithm: Algorithm }
  | { type: "PREPARE_QUESTION" }
  | { type: "MARK_CORRECT"; attemptId: number }
  | { type: "MARK_UNSURE"; attemptId: number }
  | { type: "MARK_INCORRECT"; attemptId: number };

function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case "SHUFFLE_CARDS":
      return { ...state, flashcards: action.cards };
    case "SET_FLASHCARD_ATTEMPTS": {
      return { ...state, flashcardAttempts: action.attempts };
    }
    case "REPLACE_ATTEMPT": {
      const attemptIndex = state.flashcardAttempts.findIndex((attempt) => attempt.id === action.prevId);
      if (attemptIndex === -1) return state;

      const updatedAttempts = [...state.flashcardAttempts];
      updatedAttempts[attemptIndex] = action.savedAttempt;
      return { ...state, flashcardAttempts: updatedAttempts };
    }
    case "SET_SETTINGS":
      return { ...state, settings: mergeSettings(state.settings, action.settings) };
    case "SUBMIT_ANSWER": {
      const flashcardAttempts = [...state.flashcardAttempts, action.attempt];

      return {
        ...state,
        flashcardAttempts,
        showAnswer: true,
        totalAttempts: state.totalAttempts + 1,
        score: action.isCorrect ? state.score + 1 : state.score,
        isCorrect: action.isCorrect,
        userAnswer: action.userAnswer,
      };
    }
    case "NEXT_QUESTION": {
      const nextCardIndex = action.algorithm.nextQuestion(state.flashcards, state.flashcardAttempts);

      return { ...state, currentCardIndex: nextCardIndex };
    }
    case "PREPARE_QUESTION": {
      const isTermQuestion =
        state.settings.quizMode === "term-to-definition" || (state.settings.quizMode === "both" && Math.random() < 0.5);
      const isShortAnswerQuestion =
        state.settings.answerType === "short-answer" || (state.settings.answerType === "both" && Math.random() < 0.5);
      return {
        ...state,
        userAnswer: "",
        showAnswer: false,
        isTermQuestion,
        isShortAnswerQuestion,
        isCorrect: false,
      };
    }
    case "MARK_CORRECT": {
      const attemptIndex = state.flashcardAttempts.findIndex((attempt) => attempt.id === action.attemptId);

      if (attemptIndex === -1) return state;

      const updatedAttempts = [...state.flashcardAttempts];
      updatedAttempts[attemptIndex] = { ...updatedAttempts[attemptIndex], result: "correct" };

      return {
        ...state,
        flashcardAttempts: updatedAttempts,
        score: state.score + 1,
      };
    }
    case "MARK_UNSURE": {
      const attemptIndex = state.flashcardAttempts.findIndex((attempt) => attempt.id === action.attemptId);

      if (attemptIndex === -1) return state;

      const updatedAttempts = [...state.flashcardAttempts];
      updatedAttempts[attemptIndex] = { ...updatedAttempts[attemptIndex], result: "unsure" };

      return {
        ...state,
        flashcardAttempts: updatedAttempts,
      };
    }
    case "MARK_INCORRECT": {
      const attemptIndex = state.flashcardAttempts.findIndex((attempt) => attempt.id === action.attemptId);

      if (attemptIndex === -1) return state;

      const updatedAttempts = [...state.flashcardAttempts];
      const prevResult = updatedAttempts[attemptIndex].result;
      updatedAttempts[attemptIndex] = { ...updatedAttempts[attemptIndex], result: "incorrect" };

      const adjustedScore = prevResult === "correct" ? Math.max(0, state.score - 1) : state.score;

      return {
        ...state,
        flashcardAttempts: updatedAttempts,
        score: adjustedScore,
      };
    }
    default:
      return state;
  }
}

const initialState: PracticeState = {
  flashcards: [],
  flashcardAttempts: [],
  currentCardIndex: 0,
  userAnswer: "",
  showAnswer: false,
  score: 0,
  totalAttempts: 0,
  isTermQuestion: true,
  isShortAnswerQuestion: true,
  isCorrect: false,
  settings: defaultSettings,
};

function AnswerInput({ handleAnswer }: { handleAnswer: (value: string) => Promise<void> | void }) {
  const [userAnswer, setUserAnswer] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleAnswer(userAnswer);
      }}
    >
      <Input
        autoFocus
        onChange={(e) => setUserAnswer(e.target.value)}
        placeholder="Type your answer here"
        className="mb-4"
      />
      <Button type="submit">Submit Answer</Button>
    </form>
  );
}

const rigorousnessOptions: RigorousnessLevel[] = ["relaxed", "balanced", "intense"];

function NumberField({
  id,
  label,
  value,
  onChange,
  min = 1,
  max = 50,
  step = 1,
  helper,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  helper?: string;
}) {
  return (
    <div className="sm:col-span-2">
      <div className="flex items-center">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          step={step}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
          className="w-32 mx-4"
        />
      </div>
      {helper ? <span className="text-xs text-muted-foreground">{helper}</span> : null}
    </div>
  );
}

function QuizControls({
  settings,
  onChange,
}: {
  settings: PracticeSettings;
  onChange: (update: Partial<PracticeSettings>) => void;
}) {
  const { quizMode, answerType, rigorousness, chunkSize } = settings;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex items-center space-x-2">
        <Label htmlFor="quiz-mode">Quiz Mode:</Label>
        <select
          id="quiz-mode"
          value={quizMode}
          onChange={(e) => onChange({ quizMode: e.target.value as QuizMode })}
          className="border rounded p-2"
        >
          <option value="term-to-definition">Term to Definition</option>
          <option value="definition-to-term">Definition to Term</option>
          <option value="both">Both</option>
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <Label htmlFor="answer-type">Answer Type:</Label>
        <select
          id="answer-type"
          value={answerType}
          onChange={(e) => onChange({ answerType: e.target.value as AnswerType })}
          className="border rounded p-2"
        >
          <option value="multiple-choice">Multiple Choice</option>
          <option value="short-answer">Short Answer</option>
          <option value="both">Both</option>
        </select>
      </div>
      <div className="flex items-center space-x-2 sm:col-span-2">
        <Label htmlFor="rigorousness">Rigorousness:</Label>
        <select
          id="rigorousness"
          value={rigorousness}
          onChange={(e) => onChange({ rigorousness: e.target.value as RigorousnessLevel })}
          className="border rounded p-2"
        >
          <option value="relaxed">Relaxed</option>
          <option value="balanced">Balanced</option>
          <option value="intense">Intense</option>
        </select>
      </div>
      <NumberField
        id="chunk-size"
        label="Chunk Size:"
        value={chunkSize}
        onChange={(value) => onChange({ chunkSize: value })}
        helper="How many cards to pull into each rotation."
      />
    </div>
  );
}

function SettingsModal({
  open,
  settings,
  onChange,
  onSave,
  onClose,
  saving,
}: {
  open: boolean;
  settings: PracticeSettings;
  onChange: (update: Partial<PracticeSettings>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">Practice Settings</h2>
            </div>
          </div>
          <QuizControls settings={settings} onChange={onChange} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PracticePage() {
  const { status, flashcards, flashcardAttempts, set } = useFlashcardData();
  const { user } = useAuth();
  const [state, dispatch] = useReducer(practiceReducer, initialState);
  const setId = set?.id ?? null;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [draftSettings, setDraftSettings] = useState<PracticeSettings>(defaultSettings);

  const algorithmConfig = useMemo(
    () => ({
      ...rigorousnessPresets[state.settings.rigorousness],
      chunkSize: state.settings.chunkSize,
    }),
    [state.settings.chunkSize, state.settings.rigorousness],
  );
  const algorithm = useMemo(() => new ChunkedSpacedRepetitionAlgorithm(algorithmConfig), [algorithmConfig]);
  const currentSettings = useMemo(() => state.settings, [state.settings]);

  const currentCard = state.flashcards[state.currentCardIndex];
  const currentCardAttempts = useMemo(() => {
    if (!currentCard) return [];
    return state.flashcardAttempts.filter((attempt) => attempt.flashcardUid === currentCard.uid);
  }, [currentCard, state.flashcardAttempts]);

  const hasInitialized = useRef(false);
  const hasLoadedPreferences = useRef(false);
  const questionStartRef = useRef<number | null>(null);
  const preferenceStorageKey = useMemo(() => (setId !== null ? `practice-preferences-${setId}` : null), [setId]);

  const shuffleCards = useCallback(() => {
    // shuffle: https://stackoverflow.com/a/46545530
    const shuffled = [...flashcards]
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
    dispatch({ type: "SHUFFLE_CARDS", cards: shuffled });
    dispatch({ type: "NEXT_QUESTION", algorithm });
    dispatch({ type: "PREPARE_QUESTION" });
  }, [flashcards, algorithm]);

  const applyPreferences = useCallback(
    (settings: Partial<PracticeSettings>) => {
      const mergedSettings = mergeSettings(currentSettings, settings);
      dispatch({ type: "SET_SETTINGS", settings: mergedSettings });
      setDraftSettings(mergedSettings);
      dispatch({ type: "PREPARE_QUESTION" });
    },
    [currentSettings],
  );

  const updateDraftSettings = useCallback((update: Partial<PracticeSettings>) => {
    setDraftSettings((prev) => mergeSettings(prev, update));
  }, []);

  useEffect(() => {
    dispatch({ type: "SET_FLASHCARD_ATTEMPTS", attempts: flashcardAttempts });
  }, [flashcardAttempts]);

  useEffect(() => {
    if (!state.showAnswer && currentCard) {
      questionStartRef.current = performance.now();
    }
  }, [state.showAnswer, currentCard]);

  useEffect(() => {
    if (setId === null || hasLoadedPreferences.current) return;

    const loadPreferences = async () => {
      let applied = false;
      if (user) {
        const { data, error } = await getUserSetPreferences(setId);
        if (error) {
          console.error("Failed to fetch preferences", error);
        }
        if (data) {
          applyPreferences({
            quizMode: data.quiz_mode,
            answerType: data.answer_type,
            rigorousness: (data.rigorousness ?? undefined) as RigorousnessLevel | undefined,
            chunkSize: typeof data.chunk_size === "number" ? data.chunk_size : undefined,
          });
          applied = true;
        }
      }

      if (!applied && preferenceStorageKey) {
        try {
          const raw = localStorage.getItem(preferenceStorageKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            applyPreferences({
              quizMode: parsed.quizMode as QuizMode,
              answerType: parsed.answerType as AnswerType,
              rigorousness: parsed.rigorousness as RigorousnessLevel | undefined,
              chunkSize: typeof parsed.chunkSize === "number" ? parsed.chunkSize : undefined,
            });
            applied = true;
          }
        } catch (error) {
          console.error("Failed to read stored preferences", error);
        }
      }

      if (applied) {
        hasLoadedPreferences.current = true;
      }
    };

    loadPreferences();
  }, [applyPreferences, preferenceStorageKey, setId, user]);

  useEffect(() => {
    if (!preferenceStorageKey) return;
    const payload = JSON.stringify(mergeSettings(defaultSettings, currentSettings));
    localStorage.setItem(preferenceStorageKey, payload);
  }, [currentSettings, preferenceStorageKey]);

  useEffect(() => {
    if (flashcards.length > 0 && !hasInitialized.current) {
      shuffleCards();
      hasInitialized.current = true;
    }
  }, [flashcards, shuffleCards]);

  const { question, correctAnswer } = useMemo(() => {
    if (!currentCard) return { question: "", correctAnswer: "" };
    return {
      question: state.isTermQuestion ? currentCard.definition : currentCard.term,
      correctAnswer: state.isTermQuestion ? currentCard.term : currentCard.definition,
    };
  }, [currentCard, state.isTermQuestion]);

  const options = useMemo(() => {
    if (!currentCard) return [];
    const options = [correctAnswer];
    while (new Set(options).size < Math.min(4, state.flashcards.length)) {
      const randomCard = state.flashcards[Math.floor(Math.random() * state.flashcards.length)];
      const randomAnswer = state.isTermQuestion ? randomCard.term : randomCard.definition;
      if (!options.includes(randomAnswer)) options.push(randomAnswer);
    }
    return options.sort(() => Math.random() - 0.5);
  }, [currentCard, state.isTermQuestion, state.flashcards, correctAnswer]);

  const validateAnswer = useCallback(
    (guess: string) => {
      return isShortAnswerCorrect(guess, correctAnswer);
    },
    [correctAnswer],
  );

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!currentCard || setId === null) return;

      const isCorrect = validateAnswer(answer);
      const result: FlashcardAttemptResult = isCorrect ? "correct" : "incorrect";
      const durationMs = Math.round(
        questionStartRef.current ? Math.max(0, performance.now() - questionStartRef.current) : 0,
      );

      const localAttempt: FlashcardAttempt = {
        id: -Date.now(), // used in REPLACE_ATTEMPT in order to know what row to replace with the proper id
        flashcardUid: currentCard.uid,
        result,
        attemptedAt: new Date().toISOString(),
        responseMs: durationMs,
      };

      dispatch({
        type: "SUBMIT_ANSWER",
        isCorrect,
        userAnswer: answer,
        attempt: localAttempt,
      });

      if (user?.id) {
        recordFlashcardAttempt({
          flashcardUid: currentCard.uid,
          setId,
          result,
          userId: user.id,
          responseMs: durationMs,
        }).then((savedAttempt) => {
          if (!savedAttempt) return;
          dispatch({ type: "REPLACE_ATTEMPT", prevId: localAttempt.id, savedAttempt });
        });
      }
    },
    [currentCard, setId, user?.id, validateAnswer],
  );

  const nextQuestion = useCallback(() => {
    dispatch({ type: "NEXT_QUESTION", algorithm });
    dispatch({ type: "PREPARE_QUESTION" });
  }, [algorithm]);

  useEffect(() => {
    if (isSettingsOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (state.showAnswer) {
        if (event.key === " " || event.key === "Enter") {
          nextQuestion();
          event.preventDefault();
        }
      } else if (!state.isShortAnswerQuestion) {
        if (["1", "2", "3", "4"].includes(event.key)) {
          const index = parseInt(event.key) - 1;
          if (options[index]) {
            handleAnswer(options[index]);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsOpen, state.showAnswer, state.isShortAnswerQuestion, options, handleAnswer, nextQuestion]);

  const savePreferences = useCallback(async () => {
    if (setId === null) {
      setIsSettingsOpen(false);
      return;
    }

    applyPreferences(draftSettings);
    setIsSavingPreferences(true);

    if (user) {
      try {
        await upsertUserSetPreferences({
          setId,
          quizMode: draftSettings.quizMode,
          answerType: draftSettings.answerType,
          rigorousness: draftSettings.rigorousness,
          chunkSize: draftSettings.chunkSize,
          userId: user.id,
        });
      } catch (error) {
        console.error("Failed to save preferences", error);
      }
    }

    setIsSavingPreferences(false);
    setIsSettingsOpen(false);
  }, [applyPreferences, draftSettings, setId, user]);

  useEffect(() => {
    if (isSettingsOpen) {
      setDraftSettings(mergeSettings(defaultSettings, currentSettings));
    }
  }, [currentSettings, isSettingsOpen]);

  return (
    <div className="container mx-auto px-4 py-8">
      <BackLink href="/study" label="Back to Study" className="mb-4" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{currentCard ? "Practice Mode" : status}</h1>
        {currentCard && (
          <Button
            variant="outline"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Practice settings"
            className="h-10 w-10 p-0"
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </div>
      {currentCard && (
        <div>
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">{question}</h2>
              {!state.showAnswer && !state.isShortAnswerQuestion && (
                <RadioGroup
                  onValueChange={(value) => {
                    handleAnswer(value);
                  }}
                >
                  <div className="space-y-3">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <RadioGroupItem value={option} id={`option-${index}`} className="peer sr-only" />
                        <Label
                          htmlFor={`option-${index}`}
                          className="flex items-center space-x-3 text-sm cursor-pointer flex-grow"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-primary text-primary flex items-center justify-center text-sm font-medium transition-colors peer-checked:bg-primary peer-checked:text-primary-foreground">
                            {index + 1}
                          </div>
                          <span>{option}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
              {!state.showAnswer && state.isShortAnswerQuestion && <AnswerInput handleAnswer={handleAnswer} />}
              {state.showAnswer && (
                <div className="mt-4 space-y-3">
                  {state.isCorrect ? (
                    <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                      <Check className="h-5 w-5 mt-0.5 text-green-600" />
                      <div className="space-y-1">
                        <div className="font-semibold text-green-800">Correct</div>
                        <div className="text-green-800">
                          <span className="font-medium">Your answer:</span>{" "}
                          {state.userAnswer ? state.userAnswer : "(blank)"}
                        </div>
                        <div className="text-green-800">
                          <span className="font-medium">Expected:</span> {correctAnswer}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                      <X className="h-5 w-5 mt-0.5 text-red-600" />
                      <div className="space-y-1">
                        <div className="font-semibold text-red-800">Incorrect</div>
                        {state.userAnswer ? (
                          <div className="text-red-800">
                            <span className="font-medium">Your answer:</span> {state.userAnswer}
                          </div>
                        ) : null}
                        <div className="text-red-800">
                          <span className="font-medium">Expected:</span> {correctAnswer}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={nextQuestion}>Next Question</Button>
                    {!state.isCorrect && (
                      <>
                        <Button
                          onClick={() => {
                            const lastAttempt = currentCardAttempts[currentCardAttempts.length - 1];
                            if (lastAttempt) {
                              dispatch({ type: "MARK_UNSURE", attemptId: lastAttempt.id });
                              if (lastAttempt.id > 0) {
                                updateFlashcardAttemptResult(lastAttempt.id, "unsure");
                              }
                              nextQuestion();
                            }
                          }}
                          variant="outline"
                        >
                          I Was Unsure
                        </Button>

                        <Button
                          onClick={() => {
                            const lastAttempt = currentCardAttempts[currentCardAttempts.length - 1];
                            if (lastAttempt) {
                              dispatch({ type: "MARK_CORRECT", attemptId: lastAttempt.id });
                              if (lastAttempt.id > 0) {
                                updateFlashcardAttemptResult(lastAttempt.id, "correct");
                              }
                              nextQuestion();
                            }
                          }}
                          variant="outline"
                          className="hover:light:bg-green-100 hover:dark:bg-green-700"
                        >
                          I Was Right
                        </Button>
                      </>
                    )}

                    {state.isCorrect && (
                      <>
                        <Button
                          onClick={() => {
                            const lastAttempt = currentCardAttempts[currentCardAttempts.length - 1];
                            if (lastAttempt) {
                              dispatch({ type: "MARK_UNSURE", attemptId: lastAttempt.id });
                              if (lastAttempt.id > 0) {
                                updateFlashcardAttemptResult(lastAttempt.id, "unsure");
                              }
                              nextQuestion();
                            }
                          }}
                          variant="outline"
                        >
                          I Was Unsure
                        </Button>
                        <Button
                          onClick={() => {
                            const lastAttempt = currentCardAttempts[currentCardAttempts.length - 1];
                            if (lastAttempt) {
                              dispatch({ type: "MARK_INCORRECT", attemptId: lastAttempt.id });
                              if (lastAttempt.id > 0) {
                                updateFlashcardAttemptResult(lastAttempt.id, "incorrect");
                              }
                              nextQuestion();
                            }
                          }}
                          variant="outline"
                          className="hover:light:bg-red-100 hover:dark:bg-red-900"
                        >
                          I Was Wrong
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Progress</h3>
            <Progress value={(state.score / state.totalAttempts) * 100 || 0} className="w-full" />
            <p className="mt-2">
              Score: {state.score} / {state.totalAttempts}
            </p>
          </div>
        </div>
      )}
      <SettingsModal
        open={isSettingsOpen}
        settings={draftSettings}
        onChange={updateDraftSettings}
        onSave={savePreferences}
        onClose={() => setIsSettingsOpen(false)}
        saving={isSavingPreferences}
      />
    </div>
  );
}

async function recordFlashcardAttempt({
  flashcardUid,
  setId,
  result,
  userId,
  responseMs = 0,
}: {
  flashcardUid: number;
  setId: number;
  result: FlashcardAttemptResult;
  userId?: string | null;
  responseMs?: number;
}): Promise<FlashcardAttempt | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("flashcard_attempts")
    .insert({
      user_id: userId,
      set_id: setId,
      flashcard_uid: flashcardUid,
      result,
      response_ms: responseMs,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to record flashcard attempt:", error);
    return null;
  }

  return {
    id: data.id,
    flashcardUid: data.flashcard_uid,
    attemptedAt: data.attempted_at,
    result: data.result,
    responseMs: data.response_ms ?? 0,
  };
}

async function updateFlashcardAttemptResult(attemptId: number, result: FlashcardAttemptResult) {
  if (attemptId <= 0) return;

  const { error } = await supabase.from("flashcard_attempts").update({ result }).eq("id", attemptId);

  if (error) {
    console.error("Failed to update flashcard attempt result:", error);
  }
}

const Page = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <PracticePage />
  </Suspense>
);

export default Page;
