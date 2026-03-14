"use client";

import React from "react";

const MANUAL_LABEL = " Manual check: ";
const VALIDATION_LABEL = " Validation: ";

export interface CheckAndValidateBlockProps {
  /** Raw instructions string (Quick check / Manual check / Validation). */
  content?: string;
  /** Class name for the wrapper and paragraph text. */
  className?: string;
  /** Fallback when content is missing. */
  fallback?: React.ReactNode;
}

/**
 * Parses egg manualCheckAndValidation into Quick check, Manual check, and Validation
 * paragraphs with bold headings and clear separation.
 */
export const CheckAndValidateBlock: React.FC<CheckAndValidateBlockProps> = ({
  content,
  className = "text-[10px] sm:text-xs text-noir-foreground/70",
  fallback,
}) => {
  if (!content?.trim()) {
    return <>{fallback ?? null}</>;
  }

  const iManual = content.indexOf(MANUAL_LABEL);
  const iValidation = content.indexOf(VALIDATION_LABEL);

  if (iManual === -1 || iValidation === -1 || iValidation <= iManual) {
    return <p className={className}>{content}</p>;
  }

  const quickRaw = content.slice(0, iManual).trim();
  const quickContent = quickRaw.replace(/^Quick check:\s*/i, "");
  const manualContent = content.slice(iManual + MANUAL_LABEL.length, iValidation).trim();
  const validationContent = content.slice(iValidation + VALIDATION_LABEL.length).trim();

  return (
    <div className="space-y-3">
      {quickContent.length > 0 && (
        <p className={className}>
          <strong className="text-noir-foreground/90">Quick check:</strong>{" "}
          {quickContent}
        </p>
      )}
      {manualContent.length > 0 && (
        <p className={className}>
          <strong className="text-noir-foreground/90">Manual check:</strong>{" "}
          {manualContent}
        </p>
      )}
      {validationContent.length > 0 && (
        <p className={className}>
          <strong className="text-noir-foreground/90">Egg validation:</strong>{" "}
          {validationContent}
        </p>
      )}
    </div>
  );
};
