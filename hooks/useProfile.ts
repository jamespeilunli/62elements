import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  name?: string;
  email?: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return null;

    const { data, error } = await supabase.from("profiles").select("*").single(); //.eq("id", user.id).single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setProfile(await fetchProfile());
      setLoading(false);
    };

    load();
  }, [user, fetchProfile]);

  const updateProfile = useCallback(
    async (updates: ProfileUpdate): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single();

      if (error) {
        console.error("Error updating profile:", error);
        return false;
      }

      setProfile(data);
      return true;
    },
    [user],
  );

  return { profile, loading, updateProfile };
}
