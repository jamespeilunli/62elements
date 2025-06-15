"use client";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

function LoginButton() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error.message);
        return;
      }
      setSession(data.session);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div>
      {session ? (
        <button
          className="text-sm font-medium hover:underline underline-offset-4"
          onClick={() => supabase.auth.signOut()}
        >
          Sign Out
        </button>
      ) : (
        <Link className="text-sm font-medium hover:underline underline-offset-4" href="/login">
          Log In
        </Link>
      )}
    </div>
  );
}

const Header = () => {
  return (
    <header className="px-4 lg:px-6 h-14 flex items-center border-b">
      <Link className="flex items-center justify-center" href="/">
        <BookOpen className="h-6 w-6 mr-2" />
        <span className="font-bold hover:underline underline-offset-4">62elements</span>
      </Link>
      <nav className="ml-auto flex items-center gap-4 sm:gap-6">
        <LoginButton />
        <Link className="text-sm font-medium hover:underline underline-offset-4" href="/library">
          Library
        </Link>
        <Link className="text-sm font-medium hover:underline underline-offset-4" href="/about">
          About
        </Link>
      </nav>
    </header>
  );
};

export default Header;
