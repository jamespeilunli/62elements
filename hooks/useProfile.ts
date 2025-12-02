import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProfileUpdate {
  name?: string;
  email?: string;
}

const buildProfile = (user: User): Profile => {
  const name = user.user_metadata?.name ?? user.user_metadata?.full_name ?? null;

  return {
    id: user.id,
    name,
    email: user.email ?? null,
    created_at: user.created_at,
    updated_at: user.user_metadata?.updated_at ?? user.last_sign_in_at ?? null,
  };
};

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(buildProfile(user));
    setLoading(false);
  }, [user, authLoading]);

  const updateProfile = useCallback(
    async (updates: ProfileUpdate): Promise<boolean> => {
      if (!user) return false;

      const metadata = {
        ...(user.user_metadata ?? {}),
        ...(updates.name !== undefined ? { name: updates.name } : {}),
      };

      const { data, error } = await supabase.auth.updateUser({
        ...(updates.email ? { email: updates.email } : {}),
        data: metadata,
      });

      if (error) {
        console.error("Error updating profile:", error);
        return false;
      }

      setProfile(buildProfile(data.user));
      return true;
    },
    [user],
  );

  return { profile, loading, updateProfile };
}
