"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { AleoMascot } from "./AleoMascot";
import { ChunkyButton } from "./ChunkyButton";

export function MascotFAB() {
  const t = useTranslations("mascot");
  const tips = t.raw("tips") as string[];
  const [open, setOpen] = React.useState(false);
  const [idx, setIdx] = React.useState(0);

  return (
    <>
      <button
        aria-label={t("open")}
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-white shadow-hero transition active:scale-95 lg:bottom-6 lg:right-6"
      >
        <AleoMascot mood="cheer" size={56} bobbing={false} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 sm:items-center sm:p-6"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="relative w-full max-w-sm rounded-hero bg-white p-6 shadow-hero"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 rounded-full bg-pale p-1.5 text-cobalt"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3">
                <AleoMascot mood="thinking" size={96} />
                <div className="flex-1">
                  <div className="text-xs font-extrabold uppercase tracking-widest text-cobalt">
                    {t("label")}
                  </div>
                  <p className="mt-1 text-sm font-bold leading-snug text-navy">
                    {tips[idx]}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <ChunkyButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIdx((i) => (i + 1) % tips.length)}
                >
                  {t("next")}
                </ChunkyButton>
                <ChunkyButton
                  variant="primary"
                  size="sm"
                  block
                  onClick={() => setOpen(false)}
                >
                  {t("gotIt")}
                </ChunkyButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
