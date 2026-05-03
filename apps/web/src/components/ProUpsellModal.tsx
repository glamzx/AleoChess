"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles } from "lucide-react";
import { ChunkyButton } from "./ChunkyButton";
import { proFeatures } from "@/lib/mock";
import { cn } from "@/lib/cn";

export function ProUpsellModal({
  open,
  onOpenChange,
  initialPlan = "annual"
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialPlan?: "monthly" | "annual";
}) {
  const [plan, setPlan] = React.useState<"monthly" | "annual">(initialPlan);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ y: 80, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 80, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-hero bg-white shadow-hero"
          >
            {/* sparkle gradient header */}
            <div
              className="relative px-6 pb-8 pt-7 text-white"
              style={{
                background:
                  "linear-gradient(135deg,#A86BFF 0%,#7A3CFF 45%,#FFD700 100%)"
              }}
            >
              <button
                onClick={() => onOpenChange(false)}
                className="absolute right-3 top-3 rounded-full bg-white/20 p-1.5 hover:bg-white/30"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-proGold" />
                <span className="text-xs font-extrabold uppercase tracking-widest">
                  Aleo Pro
                </span>
              </div>
              <h2 className="mt-2 text-3xl font-extrabold leading-tight">
                Unlock the full Aleo experience
              </h2>
              <p className="mt-1 text-sm font-bold text-white/85">
                Deeper coaching. Pro courses. Every skin.
              </p>
            </div>

            <div className="space-y-3 p-6">
              <div className="rounded-card bg-pale p-1">
                <div className="grid grid-cols-2 gap-1">
                  {(["monthly", "annual"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlan(p)}
                      className={cn(
                        "rounded-chip px-4 py-2 text-sm font-extrabold capitalize transition",
                        plan === p
                          ? "bg-white text-navy shadow-card"
                          : "text-cobalt"
                      )}
                    >
                      {p === "annual" ? "Annual · save 35%" : "Monthly"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {proFeatures.map((f) => (
                  <div
                    key={f.feat}
                    className="flex items-center justify-between rounded-chip px-3 py-2 odd:bg-surfaceLight"
                  >
                    <span className="font-bold text-navy">{f.feat}</span>
                    <span className="flex items-center gap-3 text-sm">
                      <span
                        className={cn(
                          "tabnum w-12 text-center font-extrabold",
                          f.free ? "text-winGreen" : "text-muted"
                        )}
                      >
                        {f.free ? "✓" : "—"}
                      </span>
                      <span
                        className={cn(
                          "tabnum w-12 text-center font-extrabold",
                          f.pro ? "text-sparkle" : "text-muted"
                        )}
                      >
                        {f.pro ? <Check className="mx-auto h-4 w-4" /> : "—"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <ChunkyButton
                variant="pro"
                size="lg"
                block
                pill
                className="mt-4"
              >
                {plan === "annual"
                  ? "Get Pro · $59.99 / year"
                  : "Get Pro · $7.99 / month"}
              </ChunkyButton>
              <p className="text-center text-xs font-bold text-muted">
                Cancel anytime. Auto-renews unless canceled.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
