"use client";

import { useState } from "react";
import Image from "next/image";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
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
    <div className="flex justify-center items-center h-screen">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="flex overflow-hidden rounded-full select-none h-24 w-24 shrink-0">
            {!imageError && avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="User avatar"
                width={96}
                height={96}
                className="rounded-full object-cover"
                onError={handleImageError}
              />
            ) : (
              <div className="h-24 w-24 shrink-0 bg-gray-300 flex items-center justify-center rounded-full">
                <User className="h-12 w-12 text-gray-600" />
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold">{profile?.name}</p>
            <p className="text-gray-500">{profile?.email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
