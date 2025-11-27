import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type BackLinkProps = {
  href: string;
  label?: string;
  className?: string;
};

const BackLink = ({ href, label = "Back", className }: BackLinkProps) => {
  return (
    <Button variant="ghost" size="sm" asChild className={cn("px-0", className)}>
      <Link href={href} className="inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        <span>{label}</span>
      </Link>
    </Button>
  );
};

export default BackLink;
