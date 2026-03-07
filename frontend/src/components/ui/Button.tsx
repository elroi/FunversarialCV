import React, { forwardRef } from "react";
import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-neon-green bg-noir-panel text-neon-green hover:bg-neon-green/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/50",
  secondary:
    "border border-noir-border bg-noir-panel text-neon-cyan hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={clsx(
        "rounded-lg px-4 py-3 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 min-h-[44px]",
        variantClasses[variant],
        className
      )}
      disabled={disabled}
      {...rest}
    />
  )
);
Button.displayName = "Button";
