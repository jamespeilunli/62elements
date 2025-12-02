"use client";

import { useFlashcardData, Flashcard, FlashcardAttempt } from "../../hooks/useFlashcardData";
import { getDifficultyString } from "../../lib/studyAlgorithm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, PenTool, Brain, /*Puzzle,*/ Star, Edit } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";

const filterCategories = ["New", "Challenging", "Familiar", "Proficient", "Starred"];

type FlashcardProps = {
  flashcards: Flashcard[];
  flashcardAttempts: FlashcardAttempt[];
};

const FlashcardsDisplay = (props: FlashcardProps) => {
  const flashcards = props.flashcards;
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setDirection(-1);
      setCurrentCardIndex((prevIndex) => prevIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleNextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setDirection(1);
      setCurrentCardIndex((prevIndex) => prevIndex + 1);
      setIsFlipped(false);
    }
  };

  const toggleCardFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const variants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction === 1 ? 100 : -100,
    }),

    exit: (direction: number) => ({
      opacity: 0,
      x: direction === 1 ? -100 : 100,
    }),
  };

  return (
    <div className="flex flex-col items-center mb-8">
      <div className="flex justify-center items-center w-full max-w-2xl mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevCard}
          disabled={currentCardIndex === 0}
          aria-label="Previous card"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={currentCardIndex}
            custom={direction}
            variants={variants}
            initial="initial"
            animate={{ opacity: 1, x: 0 }}
            exit="exit"
            transition={{ duration: 0.3 }}
            className="mx-4 w-full"
          >
            <Card className="w-full h-64 cursor-pointer perspective-1000" onClick={toggleCardFlip}>
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.5 }}
                className="w-full h-full [transform-style:preserve-3d]"
              >
                <CardContent className="flex items-center justify-center h-full p-6 text-center absolute w-full [backface-visibility:hidden] [transform:rotateX(0deg)] [transform:rotateY(0deg)]">
                  <p className="text-xl">{flashcards[currentCardIndex].term}</p>
                </CardContent>
                <CardContent className="flex items-center justify-center h-full p-6 text-center absolute w-full [backface-visibility:hidden] [transform:rotateX(0deg)] [transform:rotateY(180deg)]">
                  <p className="text-xl">{flashcards[currentCardIndex].definition}</p>
                </CardContent>
              </motion.div>
            </Card>
          </motion.div>
        </AnimatePresence>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextCard}
          disabled={currentCardIndex === flashcards.length - 1}
          aria-label="Next card"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">
        Card {currentCardIndex + 1} of {flashcards.length}
      </div>
    </div>
  );
};

const PracticeSummary = (props: FlashcardProps) => {
  const { flashcards, flashcardAttempts } = props;
  type DifficultAttempt = {
    card: Flashcard;
    stats: {
      lastStudied: number;
      totalAttempts: number;
      totalMisses: number;
      todaysAttempts: number;
      todaysMisses: number;
      todaysCorrect: number;
      lastResult: FlashcardAttempt["result"] | null;
    };
  };

  const now = new Date();
  const todayString = now.toDateString();

  const attemptCounts = flashcardAttempts.reduce(
    (acc, attempt) => {
      const dateString = new Date(attempt.attemptedAt).toDateString();
      acc.total += 1;
      if (dateString === todayString) acc.today += 1;
      return acc;
    },
    { total: 0, today: 0 },
  );

  const totalAttempts = attemptCounts.total;
  const todayAttempts = attemptCounts.today;
  const priorAttempts = Math.max(totalAttempts - todayAttempts, 0);
  const totalCorrect = flashcardAttempts.filter((attempt) => attempt.result === "correct").length;
  const accuracy = totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 100);

  const todayDeltaPercent =
    priorAttempts === 0 ? (todayAttempts > 0 ? 100 : 0) : Math.round((todayAttempts / priorAttempts) * 100);

  const formatAgo = (timeMs: number) => {
    if (timeMs <= 0) return "never";
    const diffMs = now.getTime() - timeMs;
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const mostMissedCards: DifficultAttempt[] = useMemo(() => {
    const attemptsByCard = new Map<number, FlashcardAttempt[]>();

    // Group attempts by card for simpler calculations.
    flashcardAttempts.forEach((attempt) => {
      const attemptsForCard = attemptsByCard.get(attempt.flashcardUid) ?? [];
      attemptsForCard.push(attempt);
      attemptsByCard.set(attempt.flashcardUid, attemptsForCard);
    });

    const difficultAttempts: DifficultAttempt[] = [];

    attemptsByCard.forEach((attempts, cardUid) => {
      const card = flashcards.find((c) => c.uid === cardUid);
      if (!card) return;

      const orderedAttempts = [...attempts].sort(
        (a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime(),
      );
      const lastAttempt = orderedAttempts.at(-1);
      const totalMisses = orderedAttempts.filter((attempt) => attempt.result !== "correct").length;
      if (totalMisses === 0) return;

      const todaysAttempts = orderedAttempts.filter(
        (attempt) => new Date(attempt.attemptedAt).toDateString() === todayString,
      );
      const todaysMisses = todaysAttempts.filter((attempt) => attempt.result !== "correct").length;
      const todaysCorrect = todaysAttempts.filter((attempt) => attempt.result === "correct").length;

      difficultAttempts.push({
        card,
        stats: {
          lastStudied: lastAttempt ? new Date(lastAttempt.attemptedAt).getTime() : 0,
          totalAttempts: orderedAttempts.length,
          totalMisses,
          todaysAttempts: todaysAttempts.length,
          todaysMisses,
          todaysCorrect,
          lastResult: lastAttempt?.result ?? null,
        },
      });
    });

    const topMissed = difficultAttempts
      .sort((a, b) => {
        return b.stats.totalMisses - a.stats.totalMisses;
      })
      .slice(0, 10);

    return topMissed.sort((a, b) => b.stats.lastStudied - a.stats.lastStudied);
  }, [flashcardAttempts, flashcards, todayString]);

  return (
    <Card className="mb-10">
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total attempts</p>
            <p className="text-2xl font-semibold">{totalAttempts}</p>
            <p className="text-xs text-muted-foreground mt-1">All time practice for this set</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Today&apos;s attempts</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold">{todayAttempts}</p>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  todayDeltaPercent > 0
                    ? "text-emerald-700 bg-emerald-50"
                    : todayDeltaPercent === 0
                      ? "text-muted-foreground bg-muted/50"
                      : "text-amber-700 bg-amber-50"
                }`}
              >
                {todayDeltaPercent > 0 ? "+" : ""}
                {todayDeltaPercent}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs all previous attempts: {priorAttempts}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Accuracy</p>
            <p className="text-2xl font-semibold">{accuracy}%</p>
            <Progress value={accuracy} className="mt-2 h-3 bg-muted [&>div]:bg-emerald-500" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Most missed cards</h3>
            <p className="text-xs text-muted-foreground">Ranked by all-time miss/unsure count</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mostMissedCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No misses recorded yet.</p>
            ) : (
              <TooltipProvider delayDuration={150}>
                {mostMissedCards.map(({ card, stats }) => (
                  <Tooltip key={card.uid}>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                        <span className="font-medium">{card.term}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="space-y-1">
                      <p className="text-sm font-semibold">{card.term}</p>
                      <p className="text-xs text-muted-foreground">Last studied: {formatAgo(stats.lastStudied)}</p>
                      <p className="text-xs text-muted-foreground">
                        All time: {stats.totalAttempts} (
                        <span className="text-emerald-600 font-medium">
                          {stats.totalAttempts - stats.totalMisses} correct
                        </span>
                        , <span className="text-red-600 font-medium">{stats.totalMisses} miss/unsure</span>)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Today: {stats.todaysAttempts} (
                        <span className="text-emerald-600 font-medium">{stats.todaysCorrect} correct</span>,{" "}
                        <span className="text-red-600 font-medium">{stats.todaysMisses} miss/unsure</span>)
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        Last result:{" "}
                        <span
                          className={` ${
                            stats.lastResult === "correct"
                              ? "text-emerald-600"
                              : stats.lastResult
                                ? "text-red-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {stats.lastResult ? stats.lastResult : "N/A"}
                        </span>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const FlashcardTable = (props: FlashcardProps) => {
  const flashcards = props.flashcards;
  const { flashcardAttempts } = props;
  const [starredCards, setStarredCards] = useState<number[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const toggleStar = (id: number) => {
    setStarredCards((prev) => (prev.includes(id) ? prev.filter((cardId) => cardId !== id) : [...prev, id]));
  };

  const filteredCards =
    activeFilter === "All"
      ? flashcards
      : flashcards.filter((card) =>
          activeFilter === "Starred"
            ? starredCards.includes(card.uid)
            : getDifficultyString(card, flashcardAttempts) === activeFilter,
        );

  return (
    <div>
      <div className="mt-24">
        <h2 className="text-3xl font-bold mb-4">Flashcards List</h2>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <Button variant={activeFilter === "All" ? "default" : "outline"} onClick={() => setActiveFilter("All")}>
            All
          </Button>
          {filterCategories.map((category) => (
            <Button
              key={category}
              variant={activeFilter === category ? "default" : "outline"}
              onClick={() => setActiveFilter(category)}
            >
              {category === "Starred" && <Star className="h-4 w-4 mr-2" />}
              {category}
            </Button>
          ))}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Term</TableHead>
            <TableHead>Definition</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCards.map((card) => (
            <TableRow key={card.uid}>
              <TableCell>{card.term}</TableCell>
              <TableCell>{card.definition}</TableCell>
              <TableCell>{getDifficultyString(card, flashcardAttempts)}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleStar(card.uid)}
                    aria-label={starredCards.includes(card.uid) ? "Unstar" : "Star"}
                  >
                    <Star className={`h-4 w-4 ${starredCards.includes(card.uid) ? "fill-yellow-400" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      /* Implement edit functionality */
                    }}
                    aria-label="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const StudySet = () => {
  const { flashcards, flashcardAttempts, status, set } = useFlashcardData();
  const { user } = useAuth();

  const [isGlowing, setIsGlowing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsGlowing(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{flashcards.length != 0 ? `Studying ${set?.title}` : status}</h1>

      {flashcards.length != 0 && (
        <div>
          <FlashcardsDisplay flashcards={flashcards} flashcardAttempts={flashcardAttempts} />

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <Button key="[COMING SOON]" variant="outline" asChild>
              <Link href={`/study/coming-soon`}>
                <PenTool className="h-4 w-4 mr-2" />
                Coming Soon
              </Link>
            </Button>

            <Button
              key="Practice"
              variant="outline"
              asChild
              className={`
            ${isGlowing && "shadow-[0_0_25px_rgba(255,0,203,0.7)]"}
          `}
            >
              <Link href={`/study/practice`}>
                <Brain className="h-4 w-4 mr-2" />
                Practice
              </Link>
            </Button>
          </div>

          {user && <PracticeSummary flashcards={flashcards} flashcardAttempts={flashcardAttempts} />}
          <FlashcardTable flashcards={flashcards} flashcardAttempts={flashcardAttempts} />
        </div>
      )}
    </div>
  );
};

const Page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudySet />
    </Suspense>
  );
};

export default Page;
