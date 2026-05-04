"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { ChunkyButton } from "@/components/ChunkyButton";

export default function VerifiedPage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-pale via-white to-pale px-6 text-center">
      {/* Decorative blurs */}
      <span className="pointer-events-none absolute -left-20 -top-16 h-64 w-64 rounded-full bg-sky/30 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-winGreen/20 blur-3xl" />
      <span className="pointer-events-none absolute left-1/2 top-1/4 h-40 w-40 -translate-x-1/2 rounded-full bg-proGold/20 blur-3xl" />

      {/* Confetti sparkles */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0.5],
              y: [0, -20, -40],
            }}
            transition={{
              delay: 0.8 + i * 0.15,
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
            style={{
              left: `${15 + i * 10}%`,
              top: `${30 + (i % 3) * 15}%`,
            }}
          >
            <Sparkles className="h-5 w-5 text-proGold" />
          </motion.div>
        ))}
      </motion.div>

      {/* Main content */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative flex flex-col items-center gap-6"
      >
        {/* Celebration mascot — large */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 180, damping: 12 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot/celebrate.png"
            alt="Celebration mascot"
            className="h-56 w-56 object-contain drop-shadow-xl"
          />
        </motion.div>

        {/* Success badge */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 250, damping: 14 }}
          className="flex items-center gap-2 rounded-full bg-winGreen px-5 py-2.5 text-white shadow-hero"
        >
          <CheckCircle2 className="h-6 w-6" />
          <span className="text-lg font-extrabold">Verified!</span>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-2"
        >
          <h1 className="text-3xl font-extrabold text-navy">
            Email Confirmed! 🎉
          </h1>
          <p className="max-w-sm text-base font-bold text-cobalt">
            Your account is ready. Time to play some chess and become a champion!
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="w-full max-w-xs"
        >
          <Link href="/play">
            <ChunkyButton
              block
              size="xl"
              pill
              iconLeft={<ArrowRight className="h-5 w-5" />}
            >
              Start Playing
            </ChunkyButton>
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
