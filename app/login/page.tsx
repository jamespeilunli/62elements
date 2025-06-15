"use client";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: process.env.NEXT_PUBLIC_VERCEL_URL + "/",
      },
    });
    if (error) console.error("Error logging in with Google:", error.message);
  };

  return (
    <div className="login-page">
      <h1>Login</h1>
      <button onClick={handleGoogleLogin}>Sign in with Google</button>
    </div>
  );
}
