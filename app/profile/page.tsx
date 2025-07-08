"use client";

import { useState } from "react";
import Image from "next/image";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { profile, loading } = useProfile();
  const [imageError, setImageError] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url;

  const handleImageError = () => {
    setImageError(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-6 sm:space-y-0 sm:space-x-8">
        <div className="flex-shrink-0">
          <div className="flex overflow-hidden rounded-full select-none h-24 w-24 md:h-32 md:w-32 shrink-0">
            {!imageError && avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="User avatar"
                width={128}
                height={128}
                className="rounded-full object-cover"
                onError={handleImageError}
              />
            ) : (
              <div className="h-full w-full bg-gray-300 flex items-center justify-center rounded-full">
                <User className="h-16 w-16 text-gray-600" />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center sm:items-start space-y-4">
          <div className="text-center sm:text-left">
            <p className="text-2xl font-semibold">{profile?.name || "User"}</p>
            <p className="text-gray-500 dark:text-gray-400">{profile?.email}</p>
          </div>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
