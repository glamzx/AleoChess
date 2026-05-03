"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "pro" | "danger" | "success" | "ghost" | "muted";
type Size = "sm" | "md" | "lg" | "xl";

export interface ChunkyButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  pill?: boolean;
  asChild?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-sky text-white shadow-chunky active:shadow-chunkyPressed hover:bg-[#3CB9FF]",
  pro:
    "bg-proGold text-navy shadow-chunkyGold active:shadow-chunkyGoldPressed hover:bg-[#FFE03B]",
  danger:
    "bg-lossRed text-white shadow-chunkyDanger active:shadow-[0_2px_0_0_#C73838] hover:bg-[#FF6262]",
  success:
    "bg-winGreen text-white shadow-chunkySuccess active:shadow-[0_2px_0_0_#3F9101] hover:bg-[#67D90E]",
  muted:
    "bg-[#E5E5E5] text-[#AFAFAF] shadow-chunkyMuted active:shadow-[0_2px_0_0_#C7C7C7]",
  ghost:
    "bg-pale text-cobalt shadow-[0_4px_0_0_#B4DCFA] active:shadow-[0_2px_0_0_#B4DCFA] hover:bg-[#D2EEFF]"
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-7 text-base",
  xl: "h-16 px-8 text-lg"
};

export const ChunkyButton = React.forwardRef<HTMLButtonElement, ChunkyButtonProps>(
  function ChunkyButton(
    {
      variant = "primary",
      size = "md",
      block,
      pill,
      className,
      children,
      iconLeft,
      iconRight,
      loading,
      disabled,
      ...rest
    },
    ref
  ) {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "chunky relative inline-flex items-center justify-center gap-2 font-extrabold tracking-tight select-none",
          "uppercase",
          pill ? "rounded-full" : "rounded-card",
          sizeClass[size],
          isDisabled ? variantClass.muted : variantClass[variant],
          block && "w-full",
          isDisabled && "cursor-not-allowed",
          className
        )}
        {...rest}
      >
        {loading ? (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden
          />
        ) : (
          iconLeft
        )}
        <span>{children}</span>
        {!loading && iconRight}
      </button>
    );
  }
);
