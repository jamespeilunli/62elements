"use client";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import Image from "next/image";

export function ProfileDropdownMenu() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const [imageError, setImageError] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const name = profile?.name;

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <div className="flex overflow-hidden rounded-full select-none h-8 w-8 shrink-0">
              {!imageError && avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="User avatar"
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <div className="h-8 w-8 shrink-0 bg-gray-300 flex items-center justify-center rounded-full">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>{name ?? "My Account"}</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link className="text-sm" href="/profile">
                <User />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>
              <LogOut />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
