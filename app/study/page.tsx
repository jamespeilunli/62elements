"use client";

import { useFlashcardData, Flashcard } from "../../hooks/useFlashcardData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, PenTool, Brain, /*Puzzle,*/ Star, Edit } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";

const filterCategories = ["New", "Challenging", "Familiar", "Proficient", "Starred"];

type FlashcardTableProps = {
  flashcards: Flashcard[];
};

const FlashcardTable = (props: FlashcardTableProps) => {
  const [starredCards, setStarredCards] = useState<number[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const toggleStar = (id: number) => {
    setStarredCards((prev) => (prev.includes(id) ? prev.filter((cardId) => cardId !== id) : [...prev, id]));
  };

  const filteredCards =
    activeFilter === "All"
      ? props.flashcards
      : props.flashcards.filter((card) =>
          activeFilter === "Starred" ? starredCards.includes(card.id) : card.difficulty === activeFilter
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
          <TableRow key={card.id}>
            <TableCell>{card.term}</TableCell>
            <TableCell>{card.definition}</TableCell>
            <TableCell>{card.difficulty}</TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleStar(card.id)}
                  aria-label={starredCards.includes(card.id) ? "Unstar" : "Star"}
                >
                  <Star className={`h-4 w-4 ${starredCards.includes(card.id) ? "fill-yellow-400" : ""}`} />
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
  console.log("E")
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const { flashcards, status } = useFlashcardData();

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

  const [isGlowing, setIsGlowing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsGlowing(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{status}</h1>
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
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentCardIndex}
              initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
              transition={{ duration: 0.3 }}
              className="mx-4 w-full"
            >
              <Card className="w-full h-64 cursor-pointer perspective-1000" onClick={toggleCardFlip}>
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full [transform-style:preserve-3d]"
                >
                  <CardContent className="flex items-center justify-center h-full p-6 text-center absolute w-full [backface-visibility:hidden]">
                    <p className="text-xl">{flashcards[currentCardIndex].term}</p>
                  </CardContent>
                  <CardContent className="flex items-center justify-center h-full p-6 text-center absolute w-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
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

        <FlashcardTable flashcards={flashcards} />
    </div>
  );
};

const Page = () => {
  return (
    <Suspense>
      <StudySet />
    </Suspense>
  );
};

export default Page;
