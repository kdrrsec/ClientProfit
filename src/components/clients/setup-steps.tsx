import { Check } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/utils";

export const SETUP_STEPS = [
  { id: "client" },
  { id: "services" },
  { id: "costs" },
  { id: "domains" },
  { id: "hosting" },
  { id: "done" },
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number]["id"];

export function setupHref(clientId: string, step: SetupStep): Route {
  return `/clients/${clientId}/setup?step=${step}` as Route;
}

export async function SetupSteps({ current, clientId }: { current: SetupStep; clientId?: string }) {
  const { t } = await getI18n();
  const currentIndex = SETUP_STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm" aria-label={t("setup.progress")}>
      {SETUP_STEPS.map((s, i) => {
        const done = i < currentIndex;
        const isCurrent = i === currentIndex;
        const content = (
          <>
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[11px] tabular-nums",
                done && "border-foreground bg-foreground text-background",
                isCurrent && "border-foreground font-semibold",
              )}
              aria-hidden
            >
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            <span className={cn(!isCurrent && "text-muted-foreground", isCurrent && "font-medium")}>{t(`setup.step.${s.id}`)}</span>
          </>
        );
        // Steps after "client" are navigable once the client exists.
        const linkable = clientId && s.id !== "client" && !isCurrent;
        return (
          <li key={s.id} className="flex items-center gap-2" aria-current={isCurrent ? "step" : undefined}>
            {linkable ? (
              <Link href={setupHref(clientId, s.id)} className="flex items-center gap-2 hover:underline">
                {content}
              </Link>
            ) : (
              <span className="flex items-center gap-2">{content}</span>
            )}
            {i < SETUP_STEPS.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
