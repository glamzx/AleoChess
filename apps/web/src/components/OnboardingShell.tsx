"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

export function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 rounded-full transition-all",
            i < step ? "w-6 bg-sky" : "w-2 bg-pale"
          )}
        />
      ))}
    </div>
  );
}

export function OnboardingHeader({
  step,
  total,
  back
}: {
  step: number;
  total: number;
  back?: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <Link
        href={back ?? "/"}
        aria-label="Back"
        className="grid h-10 w-10 place-items-center rounded-full bg-white text-cobalt shadow-card transition active:scale-95"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <div className="flex-1">
        <ProgressDots step={step} total={total} />
      </div>
      <span className="tabnum w-10 text-right text-sm font-extrabold text-muted">
        {step}/{total}
      </span>
    </div>
  );
}
