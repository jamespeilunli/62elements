"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, X, Shuffle, RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";

let flashcards = [{ id: 1, term: "Loading...", definition: "Loading..." }];

type QuizMode = "term-to-definition" | "definition-to-term" | "both";
type AnswerType = "multiple-choice" | "short-answer" | "both";

function PracticePage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const setIdStr = searchParams.get("set-id");
    if (setIdStr) {
      const setId = parseInt(setIdStr!);
      const fetchData = async () => {
        const res = await fetch(process.env.NEXT_PUBLIC_URL + "/api/get-flashcards");
        const data = await res.json();

        const new_data: { id: number; set: number; term: string; definition: string; difficulty: string }[] = [];
        for (const flashcard of data) {
          if (flashcard.set === setId) {
            new_data.push({
              id: flashcard.id,
              set: flashcard.set,
              term: flashcard.term,
              definition: flashcard.definition,
              difficulty: "New",
            });
          }
        }
        if (new_data.length === 0) {
          alert("Invalid flashcard set!");
          return;
        }

        localStorage.setItem("flashcards", JSON.stringify(new_data));
        flashcards = new_data;
        setShuffledCards(flashcards);
      };

      fetchData();
    } else {
      if (localStorage.getItem("flashcards")) {
        flashcards = JSON.parse(localStorage.getItem("flashcards")!);
        setShuffledCards(flashcards);
      }
    }

    setIsClient(true);
    console.log(shuffledCards);
    shuffleCards();
  }, []);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [quizMode, setQuizMode] = useState<QuizMode>("both");
  const [answerType, setAnswerType] = useState<AnswerType>("short-answer");
  const [userAnswer, setUserAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [shuffledCards, setShuffledCards] = useState(flashcards);
  const [isClient, setIsClient] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [isTermQuestion, setIsTermQuestion] = useState(true);
  const [isShortAnswerQuestion, setIsShortAnswerQuestion] = useState(true);
  const [isCorrect, setIsCorrect] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const newIsTermQuestion = useCallback(() => {
    return quizMode === "term-to-definition" || (quizMode === "both" && Math.random() < 0.5);
  }, [quizMode]);

  const newIsShortAnswerQuestion = useCallback(() => {
    return answerType === "short-answer" || (answerType === "both" && Math.random() < 0.5);
  }, [answerType]);

  const shuffleCards = useCallback(() => {
    setShuffledCards([...flashcards].sort(() => Math.random() - 0.5));
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setIsTermQuestion(newIsTermQuestion());
    setIsShortAnswerQuestion(newIsShortAnswerQuestion());
  }, [newIsTermQuestion, newIsShortAnswerQuestion]);

  const nextQuestion = useCallback(() => {
    setAnswerSubmitted(false);
    if (currentCardIndex < shuffledCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      shuffleCards();
    }
    setIsCorrect(false);
    setUserAnswer("");
    setShowAnswer(false);
  }, [currentCardIndex, shuffledCards, shuffleCards]);

  const validateAnswer = (guess: string, rightAnswer: string): boolean => {
    // normalize NFKD is used here to turn subscript and superscript characters to their normal counterparts
    guess = guess.normalize("NFKD").replace(/−/g, "-").toLowerCase().trim();
    rightAnswer = rightAnswer.normalize("NFKD").replace(/−/g, "-").toLowerCase().trim();
    if (guess == rightAnswer) {
      return true;
    }

    // handle duplicate definitions or terms
    if (isTermQuestion) {
      return (
        guess in flashcards.filter((flashcard) => flashcard.definition === guess).map((flashcard) => flashcard.term)
      );
    } else {
      return (
        guess in flashcards.filter((flashcard) => flashcard.term === guess).map((flashcard) => flashcard.definition)
      );
    }
  };

  useEffect(() => {
    shuffleCards();
  }, [shuffleCards]);

  useEffect(() => {
    if (isShortAnswerQuestion && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.value = "";
    }
  }, [isShortAnswerQuestion, currentCardIndex]);

  const currentCard = shuffledCards[currentCardIndex];
  useEffect(() => {
    setIsTermQuestion(newIsTermQuestion());
    setIsShortAnswerQuestion(newIsShortAnswerQuestion());

    setUserAnswer("");
    setShowAnswer(false);
  }, [currentCardIndex, quizMode, newIsTermQuestion, newIsShortAnswerQuestion]);

  const question = isTermQuestion ? currentCard.definition : currentCard.term;
  const correctAnswer = isTermQuestion ? currentCard.term : currentCard.definition;

  const generateOptions = () => {
    const options = [correctAnswer];
    while (new Set(options).size < Math.min(4, flashcards.length)) {
      const randomCard = flashcards[Math.floor(Math.random() * flashcards.length)];
      const randomAnswer = isTermQuestion ? randomCard.term : randomCard.definition;
      if (!options.includes(randomAnswer)) {
        options.push(randomAnswer);
      }
    }
    return options.sort(() => Math.random() - 0.5);
  };

  const options = generateOptions();

  const handleAnswer = useCallback(
    (answer: string) => {
      setUserAnswer(answer);
      setShowAnswer(true);
      setTotalAttempts(totalAttempts + 1);
      if (validateAnswer(answer, correctAnswer)) {
        setScore(score + 1);
        setIsCorrect(true);
      } else {
        setIsCorrect(false);
      }
      setAnswerSubmitted(true);
    },
    [correctAnswer, score, totalAttempts]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (answerSubmitted) {
        if (event.key === " " || event.key === "Enter") {
          nextQuestion();
          event.preventDefault();
        }
      } else if (userAnswer === "" && !isShortAnswerQuestion) {
        for (const i of ["1", "2", "3", "4"]) {
          if (event.key === i) {
            handleAnswer(options[parseInt(i) - 1]);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [answerSubmitted, userAnswer, answerType, options, isShortAnswerQuestion, handleAnswer, nextQuestion]);

  const iWasRight = () => {
    setScore(score + 1);
    nextQuestion();
  };

  return (
    <div>
      {isClient ? (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Practice Mode</h1>

          <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="quiz-mode">Quiz Mode:</Label>
              <select
                id="quiz-mode"
                value={quizMode}
                onChange={(e) => setQuizMode(e.target.value as QuizMode)}
                className="text-gray-700 border rounded p-2"
              >
                <option value="term-to-definition">Term to Definition</option>
                <option value="definition-to-term">Definition to Term</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="quiz-mode">Answer Type: </Label>
              <select
                id="answer-type"
                value={answerType}
                onChange={(e) => setAnswerType(e.target.value as AnswerType)}
                className="text-gray-700 border rounded p-2"
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

          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">{question}</h2>
              {!showAnswer && !isShortAnswerQuestion && (
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
              {!showAnswer && isShortAnswerQuestion && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAnswer(userAnswer);
                  }}
                >
                  <Input
                    ref={inputRef}
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here"
                    className="mb-4"
                  />
                  <Button type="submit">Submit Answer</Button>
                </form>
              )}
              {showAnswer && (
                <div className="mt-4">
                  <p className="font-semibold">
                    {isCorrect ? (
                      <span className="text-green-600 flex items-center">
                        <Check className="h-5 w-5 mr-2" /> Correct!
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <X className="h-5 w-5 mr-2" /> {userAnswer} is incorrect. The correct answer is: {correctAnswer}
                      </span>
                    )}
                  </p>
                  <Button onClick={nextQuestion} className="mt-4">
                    Next Question
                  </Button>
                  {!isCorrect && (
                    <Button onClick={iWasRight} className="ml-4">
                      I Was Right
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Progress</h3>
            <Progress value={(score / totalAttempts) * 100} className="w-full" />
            <p className="mt-2">
              Score: {score} / {totalAttempts}
            </p>
          </div>

          <Button onClick={() => window.location.reload()} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Practice Session
          </Button>
        </div>
      ) : (
        "Loading..."
      )}
    </div>
  );
}
const Page = () => {
  return (
    <Suspense>
      <PracticePage />
    </Suspense>
  );
};

export default Page;
