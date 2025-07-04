"use client";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

function LoginButton() {
  const { session, signOut, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {session ? (
        <button className="text-sm font-medium hover:underline underline-offset-4" onClick={signOut}>
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
