import Link from "next/link";
import type { Route } from "next";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** A card with a title, optional description and optional "Add" link. */
export function Section({
  title,
  description,
  addHref,
  addLabel,
  children,
  flush,
}: {
  title: string;
  description?: React.ReactNode;
  addHref?: Route;
  addLabel?: string;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {addHref && (
          <Link href={addHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Plus aria-hidden /> {addLabel}
          </Link>
        )}
      </CardHeader>
      <CardContent className={flush ? "px-2" : undefined}>{children}</CardContent>
    </Card>
  );
}

export function FormPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-foreground/20">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
