"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { deleteSet } from "@/lib/data";

type DeleteSetButtonProps = {
  setId: number;
  setTitle: string;
  onDeleted: (setId: number) => void;
};

export function DeleteSetButton({ setId, setTitle, onDeleted }: DeleteSetButtonProps) {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete “${setTitle}”?\n\nThis permanently deletes the set, its flashcards, study history, and saved practice preferences. This action cannot be undone.`,
    );

    if (!confirmed) return;

    if (!user) {
      window.alert("You must be logged in to delete a set.");
      return;
    }

    setIsDeleting(true);

    try {
      const { deleted, error } = await deleteSet(setId, user.id);

      if (error) {
        console.error("Failed to delete set:", error);
        window.alert("We couldn't delete this set. Please try again.");
        return;
      }

      if (!deleted) {
        window.alert("This set no longer exists or you don't have permission to delete it.");
        return;
      }

      onDeleted(setId);
    } catch (error) {
      console.error("Failed to delete set:", error);
      window.alert("We couldn't delete this set. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button variant="outline" disabled={isDeleting} onClick={handleDelete}>
      <Trash2 data-icon="inline-start" />
      {isDeleting ? "Deleting…" : "Delete"}
    </Button>
  );
}
