'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Check, X, Shuffle, RotateCcw } from "lucide-react"

// Mock flashcards data
const flashcards = [
  { id: 1, term: 'What is the capital of France?', definition: 'Paris' },
  { id: 2, term: 'Who painted the Mona Lisa?', definition: 'Leonardo da Vinci' },
  { id: 3, term: 'What is the chemical symbol for gold?', definition: 'Au' },
  { id: 4, term: 'What is the largest planet in our solar system?', definition: 'Jupiter' },
  { id: 5, term: 'Who wrote "Romeo and Juliet"?', definition: 'William Shakespeare' },
]

type QuizMode = 'term-to-definition' | 'definition-to-term' | 'both'
type AnswerType = 'multiple-choice' | 'short-answer'

export default function PracticePage() {
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [quizMode, setQuizMode] = useState<QuizMode>('both')
  const [answerType, setAnswerType] = useState<AnswerType>('multiple-choice')
  const [userAnswer, setUserAnswer] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [shuffledCards, setShuffledCards] = useState(flashcards)
  const [isClient, setIsClient] = useState(false)
  const [answerSubmitted, setAnswerSubmitted] = useState(false)

  useEffect(() => {
    setIsClient(true)
    shuffleCards()
  }, [])

  const shuffleCards = () => {
    setShuffledCards([...flashcards].sort(() => Math.random() - 0.5))
    setCurrentCardIndex(0)
    //setScore(0)
    //setTotalAttempts(0)
    setShowAnswer(false)
  }

  const currentCard = shuffledCards[currentCardIndex]
  const isTermQuestion = quizMode === 'term-to-definition' //|| (quizMode === 'both' && Math.random() < 0.5)

  const question = isTermQuestion ? currentCard.definition : currentCard.term 
  const correctAnswer = isTermQuestion ? currentCard.term : currentCard.definition 

  const generateOptions = () => {
    const options = [correctAnswer]
    while (options.length < 4) {
      const randomCard = flashcards[Math.floor(Math.random() * flashcards.length)]
      const randomAnswer = isTermQuestion ? randomCard.term : randomCard.definition 
      if (!options.includes(randomAnswer)) {
        options.push(randomAnswer)
      }
    }
    return options.sort(() => Math.random() - 0.5)
  }

  const options = generateOptions()

  const handleAnswer = (answer: string) => {
    console.log(answer)
    setUserAnswer(answer)
    setShowAnswer(true)
    setTotalAttempts(totalAttempts + 1)
    if (answer === correctAnswer) {
      setScore(score + 1)
    }
    setAnswerSubmitted(true);
  }


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (answerSubmitted) {
        if (event.key === 'Enter') {
          nextQuestion();
        }
      } else if (userAnswer === '' && answerType === "multiple-choice") {
        for (let i of ['1','2','3','4']) {
          if (event.key === i) {
            console.log(options)
            handleAnswer(options[parseInt(i)-1])
          }
        }
      }
    };

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [answerSubmitted, userAnswer, answerType, options]);

  const nextQuestion = () => {
    setAnswerSubmitted(false);
    if (currentCardIndex < shuffledCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
    } else {
      shuffleCards()
    }
    setUserAnswer('')
    setShowAnswer(false)
  }

  return (
    <div>{isClient ? 
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Practice Mode</h1>
      
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center space-x-2">
          <Label htmlFor="quiz-mode">Quiz Mode:</Label>
          <select
            id="quiz-mode"
            value={quizMode}
            onChange={(e) => setQuizMode(e.target.value as QuizMode)}
            className="border rounded p-2"
          >
            <option value="term-to-definition">Term to Definition</option>
            <option value="definition-to-term">Definition to Term</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="answer-type">Answer Type:</Label>
          <Switch
            id="answer-type"
            checked={answerType === 'multiple-choice'}
            onCheckedChange={(checked) => setAnswerType(checked ? 'multiple-choice' : 'short-answer')}
          />
          <span>{answerType === 'multiple-choice' ? 'Multiple Choice' : 'Short Answer'}</span>
        </div>
        <Button onClick={shuffleCards} variant="outline">
          <Shuffle className="h-4 w-4 mr-2" />
          Shuffle Cards
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">{question}</h2>
          {!showAnswer && answerType === 'multiple-choice' && (
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
          {!showAnswer && answerType === 'short-answer' && (
            <form onSubmit={(e) => { e.preventDefault(); handleAnswer(userAnswer); }}>
              <Input
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
                {userAnswer === correctAnswer ? (
                  <span className="text-green-600 flex items-center">
                    <Check className="h-5 w-5 mr-2" /> Correct!
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center">
                    <X className="h-5 w-5 mr-2" /> Incorrect. The correct answer is: {correctAnswer}
                  </span>
                )}
              </p>
              <Button onClick={nextQuestion} className="mt-4">Next Question</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Progress</h3>
        <Progress value={(score / totalAttempts) * 100} className="w-full" />
        <p className="mt-2">Score: {score} / {totalAttempts}</p>
      </div>

      <Button onClick={() => window.location.reload()} variant="outline">
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset Practice Session
      </Button>
    </div>
        : 0}
</div>
  )
}