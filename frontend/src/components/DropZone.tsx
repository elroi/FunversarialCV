"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useCopy } from "../copy";

export interface DropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeBytes?: number;
  /** Optional ref the parent can use to open the file picker (e.g. for "Change file"). */
  openFilePickerRef?: React.MutableRefObject<(() => void) | null>;
}

const ACCEPTED_EXTENSIONS = [".docx"];

function isAcceptedFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelect,
  accept = ".docx",
  maxSizeBytes,
  openFilePickerRef,
}) => {
  const copy = useCopy();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!openFilePickerRef) return;
    openFilePickerRef.current = () => {
      inputRef.current?.click();
    };
    return () => {
      openFilePickerRef.current = null;
    };
  }, [openFilePickerRef]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];

      if (!isAcceptedFile(file)) {
        setError(copy.errorOnlyDocx);
        return;
      }

      if (maxSizeBytes && file.size > maxSizeBytes) {
        setError(copy.errorFileTooLarge);
        return;
      }

      setError(null);
      onFileSelect(file);
    },
    [maxSizeBytes, onFileSelect, copy.errorOnlyDocx, copy.errorFileTooLarge]
  );

  const onDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    handleFiles(event.dataTransfer.files);
  };

  const onDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const onDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor="cv-upload-input"
        aria-label="Upload CV"
        aria-describedby={error ? "dropzone-error" : undefined}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={clsx(
          "relative flex flex-col items-center justify-center rounded-xl border border-dashed px-8 py-10 cursor-pointer transition-all noir-shell",
          "bg-panel/70 border-border text-sm",
          "hover:border-success/80 hover:shadow-success",
          isDragOver && "border-success shadow-success bg-panel/90"
        )}
      >
        <div className="pointer-events-none scanlines absolute inset-0 rounded-xl" />
        <div className="relative z-10 flex flex-col items-center space-y-2">
          <p className="text-caption uppercase tracking-[0.2em] text-accent">
            {copy.dropzoneTitle}
          </p>
          <p className="text-lg font-semibold text-success">
            {copy.dropzonePrompt}
          </p>
          <p className="text-sm text-foreground/70">
            .docx (Word) • Drag &amp; drop or{" "}
            <span className="text-accent">{copy.dropzoneHint}</span>
          </p>
          <p className="text-caption text-foreground/50">
            {copy.dropzonePiiNotice}
          </p>
        </div>
      </label>

      <span id="cv-upload-hint" className="sr-only">
        {copy.dropzoneSrHint}
      </span>
        <input
          id="cv-upload-input"
          ref={inputRef}
          data-testid="dropzone-input"
          type="file"
          accept={accept}
          onChange={onChange}
        aria-describedby={error ? "dropzone-error cv-upload-hint" : "cv-upload-hint"}
        className="hidden"
        />

      {error && (
        <p
          id="dropzone-error"
          className="text-sm font-medium text-error"
        >
          {error}
        </p>
      )}
    </div>
  );
};

