'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Eye, PenTool, Brain, Puzzle, Star, Edit } from "lucide-react"
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const studyModes = [
  { name: 'Preview', icon: Eye },
  { name: 'Test', icon: PenTool },
  { name: 'Practice', icon: Brain },
  { name: 'Match', icon: Puzzle },
]

const filterCategories = ['New', 'Challenging', 'Familiar', 'Proficient', 'Starred']

// Mock flashcards data
const flashcards = [
  { id: 1, term: 'What is the capital of France?', definition: 'Paris', difficulty: 'Familiar' },
  { id: 2, term: 'Who painted the Mona Lisa?', definition: 'Leonardo da Vinci', difficulty: 'Challenging' },
  { id: 3, term: 'What is the chemical symbol for gold?', definition: 'Au', difficulty: 'Proficient' },
  { id: 4, term: 'What is the multiplicative identity?', definition: '1', difficulty: 'New' },
]

export default function StudySet() {
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [direction, setDirection] = useState(0)
  const [activeFilter, setActiveFilter] = useState('All')
  const [starredCards, setStarredCards] = useState<number[]>([])

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setDirection(-1)
      setCurrentCardIndex((prevIndex) => prevIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleNextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setDirection(1)
      setCurrentCardIndex((prevIndex) => prevIndex + 1)
      setIsFlipped(false)
    }
  }

  const toggleCardFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const toggleStar = (id: number) => {
    setStarredCards((prev) =>
      prev.includes(id) ? prev.filter((cardId) => cardId !== id) : [...prev, id]
    )
  }

  const filteredCards = activeFilter === 'All'
    ? flashcards
    : flashcards.filter(card => 
        activeFilter === 'Starred' 
          ? starredCards.includes(card.id) 
          : card.difficulty === activeFilter
      )

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Studying: [Set Name]</h1>
      
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
              <Card 
                className="w-full h-64 cursor-pointer perspective-1000"
                onClick={toggleCardFlip}
              >
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
      
      <div className="flex justify-center space-x-4 mb-8">
        {studyModes.map((mode) => (
          <Button key={mode.name} variant="outline" asChild>
            <Link href={`/study/${mode.name.toLowerCase()}`}>
              <mode.icon className="h-4 w-4 mr-2" />
              {mode.name}
            </Link>
          </Button>
        ))}
      </div>
      
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <Button
          variant={activeFilter === 'All' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('All')}
        >
          All
        </Button>
        {filterCategories.map((category) => (
          <Button
            key={category}
            variant={activeFilter === category ? 'default' : 'outline'}
            onClick={() => setActiveFilter(category)}
          >
            {category === 'Starred' && <Star className="h-4 w-4 mr-2" />}
            {category}
          </Button>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Flashcards List</h2>
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
                      onClick={() => {/* Implement edit functionality */}}
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
    </div>
  )
}