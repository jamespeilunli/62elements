"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function CreateSetForm() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [flashcards, setFlashcards] = useState([{ question: "", answer: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  const handleAddCard = () => {
    setFlashcards([...flashcards, { question: "", answer: "" }]);
  };

  const handleRemoveCard = (index: number) => {
    const newFlashcards = flashcards.filter((_, i) => i !== index);
    setFlashcards(newFlashcards);
  };

  const handleCardChange = (index: number, field: "question" | "answer", value: string) => {
    const newFlashcards = [...flashcards];
    newFlashcards[index][field] = value;
    setFlashcards(newFlashcards);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!user) {
      setError("You must be logged in to create a set.");
      setLoading(false);
      return;
    }

    if (!title.trim()) {
      setError("Title is required.");
      setLoading(false);
      return;
    }

    if (flashcards.some((card) => !card.question.trim() || !card.answer.trim())) {
      setError("All flashcards must have a term and a definition.");
      setLoading(false);
      return;
    }

    try {
      // Insert the set
      const { data: set, error: setError } = await supabase
        .from("sets")
        .insert({
          title,
          category,
          is_public: isPublic,
          user_id: user.id,
        })
        .select()
        .single();

      if (setError) throw setError;
      if (!set) throw new Error("Failed to create set.");

      // Insert the flashcards
      const flashcardData = flashcards.map((card) => ({
        set: set.id,
        term: card.question,
        definition: card.answer,
        user_id: user.id,
      }));

      console.log(flashcardData);
      const { error: flashcardsError } = await supabase.from("flashcards").insert(flashcardData);

      if (flashcardsError) throw flashcardsError;

      router.push(`/study?set_id=${set.id}`);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create a New Flashcard Set</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Biology Chapter 5"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Science"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} />
            <Label htmlFor="isPublic">Public</Label>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Flashcards</h3>
            <div className="space-y-4">
              {flashcards.map((card, index) => (
                <div key={index} className="p-4 border rounded-md space-y-2 relative">
                  <Label className="absolute -top-3 left-2 bg-background px-1 text-sm text-muted-foreground">
                    Card {index + 1}
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor={`question-${index}`}>Term</Label>
                      <Input
                        id={`question-${index}`}
                        value={card.question}
                        onChange={(e) => handleCardChange(index, "question", e.target.value)}
                        placeholder="Term"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`answer-${index}`}>Definition</Label>
                      <Input
                        id={`answer-${index}`}
                        value={card.answer}
                        onChange={(e) => handleCardChange(index, "answer", e.target.value)}
                        placeholder="Definition"
                        required
                      />
                    </div>
                  </div>
                  <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveCard(index)}>
                    Remove Card
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddCard} className="mt-4">
              Add Card
            </Button>
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Set"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
