import Link from "next/link";
import type { Route } from "next";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({ page, pageCount, total, pageSize, href }: { page: number; pageCount: number; total: number; pageSize: number; href: (page: number) => Route }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const link = (target: number, label: string, disabled: boolean) =>
    disabled ? (
      <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")} aria-disabled>
        {label}
      </span>
    ) : (
      <Link href={href(target)} className={buttonVariants({ variant: "outline", size: "sm" })}>
        {label}
      </Link>
    );
  return (
    <nav className="flex items-center justify-between gap-4 pt-3 text-xs text-muted-foreground" aria-label="Pagination">
      <span className="tabular-nums">
        {from}–{to} of {total}
      </span>
      {pageCount > 1 && (
        <div className="flex gap-2">
          {link(page - 1, "Previous", page <= 1)}
          {link(page + 1, "Next", page >= pageCount)}
        </div>
      )}
    </nav>
  );
}
