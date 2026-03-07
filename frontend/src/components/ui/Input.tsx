import React from "react";
import clsx from "clsx";

const inputBase =
  "w-full rounded border border-noir-border bg-noir-bg px-2 py-1.5 text-xs text-noir-foreground placeholder:text-noir-foreground/40 focus:border-neon-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/30";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className, ...rest }) => (
  <input className={clsx(inputBase, className)} {...rest} />
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea: React.FC<TextareaProps> = ({ className, ...rest }) => (
  <textarea className={clsx(inputBase, "resize-y", className)} {...rest} />
);
