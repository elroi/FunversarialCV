import React from "react";
import clsx from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional scanlines overlay for terminal aesthetic */
  scanlines?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  scanlines = false,
  children,
  ...rest
}) => (
  <div
    className={clsx(
      "rounded-xl border border-noir-border bg-noir-panel/70 p-4 noir-shell",
      scanlines && "relative",
      className
    )}
    data-testid="card"
    {...rest}
  >
    {scanlines && (
      <div className="pointer-events-none scanlines absolute inset-0 rounded-xl" />
    )}
    <div className={scanlines ? "relative z-10" : undefined}>{children}</div>
  </div>
);
