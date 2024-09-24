import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { BookOpen, ChevronLeft, ChevronRight, Search, Star } from "lucide-react"
import Link from "next/link"

// Mock data for popular flashcard sets
const popularSets = [
  { id: 1, title: "Element Symbols", cards: 62, rating: 5.0, category: "Chemistry" },
  { id: 2, title: "Element Locations", cards: 62, rating: 5.0, category: "Chemistry" },
]

export default function PopularFlashcardSets() {
  return (
    <div className="flex flex-col min-h-screen bg-background">

      <main className="flex-1 py-12 container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Public Flashcard Library</h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {popularSets.map((set) => (
            <Card key={set.id} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>{set.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{set.category}</p>
                <p className="text-sm">{set.cards} cards</p>
                <div className="flex items-center mt-2">
                  <Star className="h-4 w-4 fill-primary text-primary mr-1" />
                  <span className="text-sm">{set.rating.toFixed(1)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Link href="/study">
                  <Button>Study Now</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="flex justify-center items-center space-x-2 mt-8">
          <Button variant="outline" size="icon" disabled>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          <p className="text-sm">
            Page <span className="font-medium">1</span> of <span className="font-medium">1</span>
          </p>
          <Button variant="outline" size="icon" disabled>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </main>

    </div>
  )
}