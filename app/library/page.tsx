"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type FlashcardSet = {
  id: number;
  title: string;
  cards: number;
  rating?: number;
  category: string;
  user_id: string;
  is_public: boolean;
};

export default function PopularFlashcardSets() {
  const [sets, setSets] = useState<FlashcardSet[] | undefined>(undefined);
  const [mySets, setMySets] = useState<FlashcardSet[] | undefined>(undefined);
  const { user } = useAuth();

  useEffect(() => {
    const fetchVisibleData = async () => {
      const res = await fetch("/api/get-visible-sets");
      const data = await res.json();
      setSets(data);
    };

    fetchVisibleData();
  }, []);

  useEffect(() => {
    const fetchMyData = async () => {
      if (user) {
        const { data } = await supabase.from("sets").select("*").eq("user_id", user.id);
        setMySets(data ?? []);
      } else {
        setMySets([]);
      }
    };
    fetchMyData();
  }, [user]);

  return (
    <div className="flex flex-col bg-background">
      <main className="flex-1 py-12 container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Public Flashcard Library</h1>
          <Link href="/create-set">
            <Button>Create Set</Button>
          </Link>
        </div>
        {!sets && <div className="container mx-auto px-4 py-8">Loading flashcard sets...</div>}
        {sets && sets.length == 0 && <div className="container mx-auto px-4 py-8">No sets</div>}
        {sets && sets.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sets.map((set) => (
              <Card key={set.id} className="flex flex-col justify-between">
                <CardHeader>
                  <CardTitle>{set.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{set.category}</p>
                  <p className="text-sm">{set.cards} cards</p>
                  <div className="flex items-center mt-2">
                    <Star className="h-4 w-4 fill-primary text-primary mr-1" />
                    <span className="text-sm">{set.rating?.toFixed(1) ?? ""}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/study?set-id=${set.id}`}>
                    <Button>Study Now</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
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
      <main className="flex-1 py-12 container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Flashcards</h1>
        </div>
        {!mySets && <div className="container mx-auto px-4 py-8">Loading flashcard sets...</div>}
        {mySets && mySets.length == 0 && <div className="container mx-auto px-4 py-8">No sets</div>}
        {mySets && mySets.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mySets.map((set) => (
              <Card key={set.id} className="flex flex-col justify-between">
                <CardHeader>
                  <CardTitle>{set.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{set.category}</p>
                  <p className="text-sm">{set.cards} cards</p>
                </CardContent>
                <CardFooter>
                  <Link href={`/study?set-id=${set.id}`}>
                    <Button>Study Now</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
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
  );
}
