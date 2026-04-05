---
name: Lab journey coherence
overview: "Superseded layout (see Phase H in docs/VALIDATION_LAB_CONTENT_AUDIT.md): harness-first order (sample JD → ingestion → External comparative evaluation fold → prompts); in-app-first fair-test copy; #validation-lab-guided opens outer lab + expands protocol fold. Original coherence work: console anchors, same-page links, lab file defaults, tests."
todos:
  - id: reorder-validation-lab
    content: Reorder ValidationLab sections and/or add sub-anchors; align protocol spatial language with DOM
    status: completed
  - id: console-anchors
    content: Add page.tsx ids for upload and inject/download; link from protocol (security + hr) and verify ProtocolStepRichText
    status: completed
  - id: file-semantics
    content: labHardenedDocxFile from post-inject blob + consoleSelectedDocxFile fallback; pick file in panel overrides
    status: completed
  - id: copy-protocol-rewrite
    content: Rewrite validationLabManualMirrorProtocol to chronological A→B→C→D; update validationLabProtocol tests + copy.test.ts
    status: completed
  - id: e2e-journey
    content: validation-lab.spec.ts — DOM order + protocol link to #console-cv-upload viewport
    status: completed
isProject: false
---

# Coherent Validation Lab: inject → harness → try in AI

## Decisions (locked)

1. **Layout (historical):** This plan shipped protocol-first; product later moved to **harness-first** (JD → harness → guided protocol in a nested fold → prompts). Anchors unchanged: `#validation-lab`, `#validation-lab-guided`, `#validation-lab-jd`, `#validation-lab-harness`.
2. **Same-page links:** [`protocolStepRichText.tsx`](frontend/src/lib/protocolStepRichText.tsx) renders `[label](#id)` and `[label](/#id)` in-page (no `target=_blank`); `https?` links unchanged. IDs must match `[a-zA-Z][a-zA-Z0-9_-]*`.
3. **Console anchors:** `console-cv-upload`, `console-armed-cv`, `console-inject-eggs`, `console-download-armed-docx` on [`page.tsx`](frontend/app/page.tsx).
4. **File default:** After successful harden, `labHardenedDocxFile` = `File` from in-memory blob; active file = `pickFile ?? hardenedOutput ?? consoleSelected`. Copy keys `labHarnessSourcePicked` / `labHarnessSourceHardenedOutput` / `labHarnessSourceConsoleSelection`.
5. **No** `docs/API.md` change (no API contract change).

## Target layout (implemented)

```mermaid
flowchart TB
  subgraph main [Main console above fold]
    A1[console-cv-upload]
    A2[console-armed-cv]
    A3[console-inject-eggs]
    A4[console-download-armed-docx]
    A1 --> A2 --> A3 --> A4
  end
  subgraph lab [Validation Lab fold current]
    B1[validation-lab-jd]
    B2[validation-lab-harness]
    B3[validation-lab-guided protocol fold]
    B4[Test prompts]
    B1 --> B2 --> B3 --> B4
  end
  main -->|steps 1-2 links| lab
```

## References

- Protocol + harness copy: [`security.ts`](frontend/src/copy/security.ts), [`hr.ts`](frontend/src/copy/hr.ts) — single coordinated edit surface for `validationLabManualMirrorProtocol`.
- Parser tests: [`validationLabProtocol.test.ts`](frontend/src/lib/validationLabProtocol.test.ts).

## Non-goals (unchanged)

- No change to lab API routes or `labCompleteEnabled` behavior.
- PDF / Phase E deferred.
