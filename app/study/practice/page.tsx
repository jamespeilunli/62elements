"use client";

import { Flashcard, useFlashcardData } from "../../../hooks/useFlashcardData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, X, Shuffle, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, Suspense, useState } from "react";

type QuizMode = "term-to-definition" | "definition-to-term" | "both";
type AnswerType = "multiple-choice" | "short-answer" | "both";

interface PracticeState {
  shuffledCards: Flashcard[];
  currentCardIndex: number;
  quizMode: QuizMode;
  answerType: AnswerType;
  userAnswer: string;
  showAnswer: boolean;
  score: number;
  totalAttempts: number;
  isTermQuestion: boolean;
  isShortAnswerQuestion: boolean;
  isCorrect: boolean;
}

type PracticeAction =
  | { type: "SHUFFLE_CARDS"; cards: Flashcard[] }
  | { type: "SET_QUIZ_MODE"; quizMode: QuizMode }
  | { type: "SET_ANSWER_TYPE"; answerType: AnswerType }
  | { type: "SUBMIT_ANSWER"; isCorrect: boolean; userAnswer: string }
  | { type: "NEXT_QUESTION" }
  | { type: "PREPARE_QUESTION" }
  | { type: "MARK_CORRECT" };

function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case "SHUFFLE_CARDS":
      return { ...state, shuffledCards: action.cards, currentCardIndex: 0 };
    case "SET_QUIZ_MODE":
      return { ...state, quizMode: action.quizMode };
    case "SET_ANSWER_TYPE":
      return { ...state, answerType: action.answerType };
    case "SUBMIT_ANSWER":
      return {
        ...state,
        showAnswer: true,
        totalAttempts: state.totalAttempts + 1,
        score: action.isCorrect ? state.score + 1 : state.score,
        isCorrect: action.isCorrect,
        userAnswer: action.userAnswer,
      };
    case "NEXT_QUESTION": {
      const nextIndex = state.currentCardIndex + 1;
      return nextIndex < state.shuffledCards.length
        ? { ...state, currentCardIndex: nextIndex }
        : {
            ...state,
            shuffledCards: [...state.shuffledCards].sort(() => Math.random() - 0.5),
            currentCardIndex: 0,
          };
    }
    case "PREPARE_QUESTION": {
      const isTermQuestion =
        state.quizMode === "term-to-definition" || (state.quizMode === "both" && Math.random() < 0.5);
      const isShortAnswerQuestion =
        state.answerType === "short-answer" || (state.answerType === "both" && Math.random() < 0.5);
      return {
        ...state,
        userAnswer: "",
        showAnswer: false,
        isTermQuestion,
        isShortAnswerQuestion,
        isCorrect: false,
      };
    }
    case "MARK_CORRECT":
      return { ...state, score: state.score + 1 };
    default:
      return state;
  }
}

const initialState: PracticeState = {
  shuffledCards: [],
  currentCardIndex: 0,
  quizMode: "both",
  answerType: "short-answer",
  userAnswer: "",
  showAnswer: false,
  score: 0,
  totalAttempts: 0,
  isTermQuestion: true,
  isShortAnswerQuestion: true,
  isCorrect: false,
};

function AnswerInput({ handleAnswer }: { handleAnswer: (value: string) => void }) {
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

function QuizControls({
  quizMode,
  answerType,
  dispatch,
  shuffleCards,
}: {
  quizMode: QuizMode;
  answerType: AnswerType;
  dispatch: React.Dispatch<PracticeAction>;
  shuffleCards: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
      <div className="flex items-center space-x-2">
        <Label htmlFor="quiz-mode">Quiz Mode:</Label>
        <select
          id="quiz-mode"
          value={quizMode}
          onChange={(e) =>
            dispatch({
              type: "SET_QUIZ_MODE",
              quizMode: e.target.value as QuizMode,
            })
          }
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
          onChange={(e) =>
            dispatch({
              type: "SET_ANSWER_TYPE",
              answerType: e.target.value as AnswerType,
            })
          }
          className="border rounded p-2"
        >
          <option value="multiple-choice">Multiple Choice</option>
          <option value="short-answer">Short Answer</option>
          <option value="both">Both</option>
        </select>
      </div>
      <Button onClick={shuffleCards} variant="outline">
        <Shuffle className="h-4 w-4 mr-2" />
        Shuffle Cards
      </Button>
    </div>
  );
}

function PracticePage() {
  const { flashcards, status } = useFlashcardData();
  const [state, dispatch] = useReducer(practiceReducer, initialState);
  const currentCard = state.shuffledCards[state.currentCardIndex];

  const shuffleCards = useCallback(() => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    dispatch({ type: "SHUFFLE_CARDS", cards: shuffled });
    dispatch({ type: "PREPARE_QUESTION" });
  }, [flashcards]);

  useEffect(() => {
    if (flashcards.length > 0) shuffleCards();
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
    while (new Set(options).size < Math.min(4, state.shuffledCards.length)) {
      const randomCard = state.shuffledCards[Math.floor(Math.random() * state.shuffledCards.length)];
      const randomAnswer = state.isTermQuestion ? randomCard.term : randomCard.definition;
      if (!options.includes(randomAnswer)) options.push(randomAnswer);
    }
    return options.sort(() => Math.random() - 0.5);
  }, [currentCard, state.isTermQuestion, state.shuffledCards, correctAnswer]);

  const validateAnswer = useCallback(
    (guess: string) => {
      const normalize = (str: string) => str.normalize("NFKD").replace(/−/g, "-").toLowerCase().trim();

      return normalize(guess) === normalize(correctAnswer);
    },
    [correctAnswer],
  );

  const handleAnswer = useCallback(
    (answer: string) => {
      const isCorrect = validateAnswer(answer);
      dispatch({
        type: "SUBMIT_ANSWER",
        isCorrect,
        userAnswer: answer,
      });
    },
    [validateAnswer],
  );

  const nextQuestion = useCallback(() => {
    dispatch({ type: "NEXT_QUESTION" });
    dispatch({ type: "PREPARE_QUESTION" });
  }, []);

  useEffect(() => {
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
  }, [state.showAnswer, state.isShortAnswerQuestion, state.userAnswer, options, handleAnswer, nextQuestion]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{currentCard ? "Practice Mode" : status}</h1>
      {currentCard && (
        <div>
          <QuizControls
            quizMode={state.quizMode}
            answerType={state.answerType}
            dispatch={dispatch}
            shuffleCards={shuffleCards}
          />

          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">{question}</h2>

              {!state.showAnswer && !state.isShortAnswerQuestion && (
                <RadioGroup onValueChange={handleAnswer}>
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
                <div className="mt-4">
                  <p className="font-semibold">
                    {state.isCorrect ? (
                      <span className="text-green-600 flex items-center">
                        <Check className="h-5 w-5 mr-2" /> Correct!
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <X className="h-5 w-5 mr-2" />
                        {state.userAnswer ? `${state.userAnswer} is incorrect. ` : ""}
                        The correct answer is: {correctAnswer}
                      </span>
                    )}
                  </p>
                  <Button onClick={nextQuestion} className="mt-4">
                    Next Question
                  </Button>
                  {!state.isCorrect && (
                    <Button
                      onClick={() => {
                        dispatch({ type: "MARK_CORRECT" });
                        nextQuestion();
                      }}
                      className="ml-4"
                    >
                      I Was Right
                    </Button>
                  )}
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

          <Button onClick={() => window.location.reload()} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Practice Session
          </Button>
        </div>
      )}
    </div>
  );
}

const Page = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <PracticePage />
  </Suspense>
);

export default Page;
