"use client";
import { GoogleLogin } from "@/components/google-login";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { FlaskConical } from "lucide-react";
import { BookOpen, Brain, Zap } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { session, loading } = useAuth();

  return (
    <div className="flex flex-col">
      <main className="flex-1">
        <section className="w-full py-16 md:py-20 lg:py-30 xl:py-40">
          <div className="container px-4 md:px-6 mx-auto max-w-[1200px]">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  62elements
                </h1>
                <p className="mx-auto max-w-[700px] md:text-xl ">
                  Boost your learning with our intuitive and powerful flashcard app.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/library">
                  <Button variant="outline">Get Started</Button>
                </Link>
                <Link href="/about">
                  <Button variant="outline">Learn More</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="flex-1">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2 mx-8">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Featured Flashcard Set</h2>
                <p className="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Prepare for your upcoming Chemistry quizzes and tests with our curated element symbols flashcard set.
                </p>
              </div>
            </div>
            <div className="mt-10 flex justify-center">
              <Card className="fg-card text-card-foreground mx-8 max-w-96 items-center">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Element Symbols</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                  <FlaskConical className="h-12 w-12 text-primary" />
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="secondary">62 Cards</Badge>
                    <Badge variant="secondary">Chemistry</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    From Palladium (Pd) to Antimony (Sb), cover all the element symbols you need to know.
                  </p>
                  <Button asChild size="lg">
                    <Link href="/study?set-id=0">Start Studying</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section className="invert w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-black">
          <div className="container px-4 md:px-6 mx-auto max-w-[1200px]">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-2 p-4 rounded-lg">
                <Zap className="h-8 w-8 mb-2 " />
                <h2 className="text-xl font-bold ">Quick Creation</h2>
                <p className="text-center  ">
                  [COMING SOON] Create flashcards in seconds with our intuitive interface.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 p-4 rounded-lg">
                <Brain className="h-8 w-8 mb-2 " />
                <h2 className="text-xl font-bold ">Smart Study</h2>
                <p className="text-center ">
                  [COMING SOON] Our algorithm adapts to your learning pace for efficient studying.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 p-4 rounded-lg">
                <BookOpen className="h-8 w-8 mb-2 " />
                <h2 className="text-xl font-bold ">Library</h2>
                <p className="text-center ">Access pre-made decks or share your own.</p>
              </div>
            </div>
          </div>
        </section>
        {!session && !loading && (
          <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6 mx-auto max-w-[1200px]">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Start Learning Today</h2>
                  <GoogleLogin />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
