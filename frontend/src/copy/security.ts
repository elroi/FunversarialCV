import type { Copy } from "./types";

export const securityCopy: Copy = {
  tagline: "Adversarial CV egg-injection console for LLM-driven hiring workflows.",
  piiModeBadge: "PII · client vault (tokenized outbound)",
  resourcesLink: "Resources",
  backHome: "Back home",

  experimentFlowCollapsibleTitle: "How to run a fair test",
  experimentFlowLabel: "RUN THE CV EXPERIMENT",
  positioningLine:
    "Execute a controlled before/after evaluation to measure model behavior shifts.",
  flowSteps: [
    "Start with our sample CV (recommended)\nor upload your own CV",
    "Inject adversarial layers",
    "Download your \"armed\" CV",
    "Test both versions against a real LLM\n(ChatGPT / Claude)",
    "Observe differences in behavior",
    "Confirm or reject the observed influence",
  ] as const,
  philosophyLine:
    "This isn't about breaking the model — it's about understanding how inputs shape outcomes.",
  introLead:
    "**FunversarialCV** is an educational adversarial simulation for **hands-on professional exploration**, **authorized** security testing, and LLM research in hiring pipelines.",
  introDetail:
    "Signals are implemented as **OWASP-aligned** patterns; PII is dehydrated in your browser so outbound traffic carries tokens only; the service keeps **zero retention** after each response (**authorized testing and research only**).",
  piiNotice:
    "Your CV is processed in your browser first. Before anything leaves your device, we replace email, phone, and other identifiers with short-lived tokens. Our server only sees tokens, never your raw contact details. Operation is in-memory with zero retention; PII is dehydrated for transit and rehydrated only in your browser for the final file.",
  privacyDetailsSummary: "PII handling (details)",

  inputChannel: "Input Channel",
  maxFileHint: "Max 4 MB. DOCX (Word) only.",
  verifyHowToAnchor: "How to verify",
  verifyPayloadHint:
    "Before you trust the service, upload a dummy CV or use our sample CV to test. Once a file has been uploaded, open the browser's DevTools (F12 or right‑click → Inspect), switch to the Network tab, then click Inject Eggs. Find the POST request to /api/harden and inspect its payload (Request Payload or Form Data). You should see tokenized placeholders such as {{PII_EMAIL_0}} or {{PII_PHONE_0}}; the request must not contain your raw email, phone, or other identifiers. That confirms only dehydrated tokens are sent and the server never receives your contact details.",
  sampleCvTitle: "Use Sample CV to Test",
  sampleCvAriaLabel: "Expand Use Sample CV to Test",
  sampleCvDescription:
    "Load a synthetic demo CV instead of your own — use Clean for a safe baseline, or Dirty to explore adversarial content.",
  cleanLabel: "Clean · DOCX",
  cleanSublabel: "Baseline sample",
  dirtyLabel: "Dirty · DOCX",
  dirtySublabel: "Adversarial sample",
  demoLoadingMessage: "> Generating demo CV… this may take a few seconds.",
  demoArmedInlineHint:
    "> Sample CV armed — Engine Configuration opened below. Use Inject Eggs when ready.",
  lastPresetLabel: "> Last preset:",
  armedCvLabel: "> Armed CV:",
  downloadDemoLabel: "Download to view current demo as-is",
  selectDemoLabel: "Select demo document and click here to view as-is",
  changeFileButton: "Change file",
  engineConfigIntroNoCv:
    "Choose which eggs to run, expand each to set payloads, then arm a CV and Inject Eggs.",
  engineConfigIntroCvReady: "Expand each egg to set payloads, then click Inject Eggs.",
  outputPlainTextHint:
    'Output uses plain-text layout unless "Preserve styles" is on (add-only eggs only).',
  preserveStylesLabel: "Preserve styles",
  preserveStylesSummary:
    "We keep layout via in-place structure edits when possible.",
  preserveStylesDetailAnchor: "More info",
  preserveStylesDesc:
    "If an egg changes body text we rebuild and styles may not be preserved; the log will indicate which path was used.",
  eggsToRunTitle: "Eggs to run",
  engineConfigTitle: "Engine Configuration",
  styleAffecting: "STYLE-AFFECTING",
  styleSafe: "STYLE-SAFE",
  hardenButton: "Inject Eggs",
  hardenProcessing: "Injecting…",
  hardenAriaProcessing: "Inject Eggs (injecting…)",
  hardenAriaDefault: "Inject Eggs",
  hardenAriaAwaitingConfigChange:
    "Inject Eggs — output matches your current egg settings; change eggs or options, then run again.",
  successScanComplete: "Scan complete (no eggs applied — document unchanged):",
  successHardenedReady: "CV ready (eggs injected):",
  downloadButton: "Download",
  errorAlertPrefix: "> Alert:",
  retryButton: "Retry",
  retryAria: "Retry",
  pipelineStatusTitle: "Pipeline Status",
  pipelineStatusToggle: "Pipeline status",

  serverPdfConfirmTitle: "Server-side processing required",
  serverPdfConfirmDesc:
    "This PDF could not be processed in the browser. The file and the selected eggs can only be processed by the server.",
  serverPdfConfirmEggsLabel: "Selected eggs that will run on the server:",
  serverPdfConfirmNote:
    "You can continue with the server processing these eggs, or uncheck them and continue without eggs.",
  serverPdfConfirmContinue: "Continue (use server)",
  serverPdfConfirmUncheckContinue: "Uncheck eggs and continue",
  serverPdfConfirmCancel: "Cancel",

  dualityMonitorTitle: "Duality Monitor",
  copyLogButton: "> Copy log",
  copiedStatus: "Copied.",
  copyFailedStatus: "Copy failed.",
  statusIdle: "Idle",
  statusProcessing: "Processing",
  statusCompleted: "Completed",
  statusError: "Error",
  pipelineStagesTitle: "Pipeline Stages",
  stageAccept: "Accept Buffer",
  stageDualityCheck: "Duality Check",
  stageDehydration: "Dehydration",
  stageInjection: "Injection",
  stageRehydration: "Rehydration",
  preHardeningScanTitle:
    "Pre-injection scan (Duality – original vs. Funversarial layer)",
  preHardeningScanTooltip:
    "Duality compares the CV's original adversarial surface with the Funversarial layer we add: first scanning for existing prompt-injection or canary-style patterns, then tracking the additional patterns introduced by eggs.",
  piiStatelessVolatile:
    "Same vault model as upload: in-memory tokens; no CV persistence server-side.",
  awaitingFirstScan: "Awaiting first scan. Drop a CV to begin analysis.",
  noSuspiciousPatterns:
    "No suspicious prompt-injection patterns detected in the original CV.",
  suspiciousPatternsDetected:
    "Suspicious patterns detected (prompt-injection, canary URLs, or metadata):",
  dualityRemediationLabel: "Remediation",
  dualityRemediationMessage:
    "Warning: Existing adversarial layers (prompt injection, canary URLs, or metadata) may decrease document readability for modern LLM parsers.",
  terminalLogTitle: "Terminal Log",
  terminalLogAriaLabel: "Terminal log",
  awaitingInputLog: "> Awaiting input… drop a CV to start the pipeline.",
  auditLogHeader:
    "FunversarialCV local audit log (client-side only; nothing stored server-side)\n",
  auditLogEmpty: "> No entries yet. Drop a CV to start the pipeline.\n",

  dropzoneTitle: "Funversarial Upload Channel",
  dropzonePrompt: "Drop your CV here",
  dropzoneHint: "browse",
  dropzonePiiNotice:
    "PII dehydrated client-side; outbound request carries tokens only. Nothing persisted after response.",
  dropzoneSrHint:
    "Upload a Word (.docx). Client dehydrates PII before send; server sees tokens only; no document storage after download.",
  errorOnlyDocx: "Only Word documents (.docx) are allowed.",
  errorFileTooLarge: "File is too large.",

  eggInvisibleHandTitle: "The Invisible Hand (LLM01)",
  eggIncidentMailtoTitle: "Mailto Surprise (LLM02)",
  eggCanaryWingTitle: "Canary Wing (LLM10)",
  eggMetadataShadowTitle: "The Metadata Shadow (LLM02)",

  invisibleHandDescription:
    "Optional custom trap text for AI parsers. Leave blank to use the default system note (0.5pt white, invisible to humans).",
  invisibleHandTrapLabel: "Trap text (optional)",
  invisibleHandPlaceholder: "Leave blank to use default system note.",
  invisibleHandHint:
    "{n}/{max} characters. No HTML or script; letters, digits, spaces, and basic punctuation only.",
  invisibleHandHowToTitle: "How to check & validate",

  incidentMailtoDescription: "", // card-specific; uses manualCheckAndValidation or fallback
  incidentMailtoResultingLink: "Resulting link — copy to enrich your CV manually",
  incidentMailtoCopyButton: "Copy link",
  incidentMailtoPlaceholderBody: "This incident was triggered by an adversarial CV layer.",

  canaryWingDescription: "",
  canaryWingResultingLink: "Resulting link — copy to enrich your CV manually",
  canaryWingCopyButton: "Copy link",

  metadataShadowDescription:
    "Add a custom document property (e.g. Ranking: Top_1%). Keys: letters, numbers, underscore only. No PII in values.",
  metadataShadowPropertyName: "Property name",
  metadataShadowPropertyValue: "Property value",
  metadataShadowPlaceholderKey: "Ranking",
  metadataShadowPlaceholderValue: "Top_1_Percent",
  metadataShadowHowToTitle: "How to check & validate",

  resourcesUsageTitle: "Usage and responsibility",
  resourcesUsageBody1:
    "FunversarialCV is provided for educational and research purposes only. It is intended to help practitioners explore and improve defenses of AI-assisted hiring workflows against adversarial behaviour in a controlled, permissioned setting.",
  resourcesUsageBody2:
    "No guarantee is made that this tool will detect, prevent, or simulate every attack pattern, and it does not constitute legal, compliance, or HR advice. You are solely responsible for how you use this tool and any documents produced with it, including compliance with all applicable laws, regulations, and organizational policies.",
  resourcesUsageBody3:
    "Do not weaponize FunversarialCV: do not use it to evade legitimate security controls, deceive human reviewers, or cause harm. Use it only where you have explicit authorization to perform adversarial testing.",
  resourcesWhyTitle: "Why Funversarial CVs?",
  resourcesWhyBody:
    "FunversarialCV exists as an educational tool to deliberately inject adversarial eggs into CVs and probe AI-driven screening systems. It layers OWASP-aligned adversarial patterns into documents so security teams, hiring organizations, and candidates can explore how large language models behave under prompt injection, invisible instructions, and noisy metadata – without sacrificing human readability.",
  resourcesPreserveStylesTitle: "Preserve styles and document structure (AST)",
  resourcesPreserveStylesBody:
    "When you enable Preserve styles, we try to keep your original layout and formatting by editing the document at the structure level instead of rebuilding it from plain text. That structure is often called an AST (abstract syntax tree): a tree representation of the document (e.g. for DOCX, the XML in word/document.xml). We modify specific nodes (e.g. wrapping the email run in a hyperlink) so styles and layout stay intact. When AST-level edits aren't possible – for example with some PDFs or when an egg changes body text – we fall back to a rebuild path; the UI and log indicate which path was used.",
  resourcesWhatAreEggsTitle: "What are eggs?",
  resourcesWhatAreEggsBody1:
    "Eggs are small, composable adversarial patterns that can be layered into a CV. Each egg targets specific LLM behaviours – for example, prompt injection, hallucination, or over-trust in metadata – while keeping the document readable to humans.",
  resourcesWhatAreEggsBody2:
    "The concept is inspired by classic easter eggs in games and software: hidden elements that are meant to be searched for, surfaced, and understood. Funversarial eggs are designed for educational red-teaming of AI-assisted hiring stacks, not for bypassing human review or ATS rules in production.",
  resourcesForCandidatesTitle: "For candidates",
  resourcesForCandidatesBody1:
    "Act responsibly! This is an educational tool. Only use a Funversarial CV on systems having AI-heavy or agentic hiring flows you own or for which you have explicit written permission to do so.",
  resourcesForCandidatesBody2:
    "For example, when roles or organizations publicly discuss LLM-based screening and are open to research-oriented or red-teaming style exercises. Even when doing so, you should exercise caution and avoid using CVs with injected eggs for conservative, compliance-heavy, or regulated roles where any non-standard formatting could be misinterpreted.",
  resourcesForCandidatesBody3:
    "Keep a clean, conventional CV for traditional channels, and treat Funversarial CVs as an opt-in, educational track for AI-aware organizations that understand adversarial testing and OWASP LLM risks.",
  resourcesForHiringTeamsTitle: "For hiring teams",
  resourcesForHiringTeamsBody1:
    "Many modern pipelines quietly rely on LLMs to summarize, shortlist, or rank candidates. Funversarial CVs help you understand, in an educational and controlled way, how fragile those systems can be in the face of subtle prompt injection, hallucination bait, or metadata manipulation, without intending to trick human reviewers.",
  resourcesForHiringTeamsBody2:
    "We recommend evaluating Funversarial CVs as an educational signal in sandboxes or test tenants first. Use them to validate that screening agents do not over-trust document content, and that human-in-the-loop controls remain in place when high-stakes decisions are involved.",
  resourcesSecurityTitle: "Security, privacy, and the Stateless Vault",
  resourcesSecurityBody1:
    "FunversarialCV follows a Stateless Vault model: documents are processed in-memory only and are never persisted to disk or long term storage. Dehydration and rehydration occur in your browser. Before any data leaves your device, the client performs PII dehydration – replacing sensitive elements like email addresses, phone numbers, or postal addresses with short-lived tokens. Only the tokenized text (and metadata like original MIME type) is sent to the server; the server never sees your raw contact details.",
  resourcesSecurityBody2:
    "All eggs and adversarial patterns operate only on this dehydrated document on the server. The server returns a tokenized buffer; the browser rehydrates PII back into the final document and streams it to you as a download. The output document is never stored server-side; the system is designed for zero-retention after response completion.",
  resourcesSecurityBody3:
    "Low-level parsers such as pdf-lib and docx are used strictly as data manipulators – no macros, scripts, or embedded code are executed during processing.",
  resourcesSecurityBody4:
    "For security reviewers: To verify that only tokens leave the browser, open DevTools → Network, click Inject Eggs, and inspect the POST /api/harden request. The payload should contain placeholders like {{PII_EMAIL_0}} and must not contain raw email, phone, or address strings. E2E tests in frontend/e2e/specs/happy-path.spec.ts assert this; key client logic lives in frontend/src/lib/clientVault.ts and frontend/app/api/harden/route.ts for the server.",
  resourcesSecurityBody5: "",
  resourcesSecurityFlowTitle: "Processing flow (Stateless Vault)",
  resourcesSecurityDiagramTitle: "System diagram",
  resourcesFlowStep1: "> [1] Load — CV is uploaded from the browser and held in memory only.",
  resourcesFlowStep2:
    "> [2] Dehydrate PII — emails, phone numbers, and similar identifiers are replaced with short-lived vault tokens.",
  resourcesFlowStep3:
    "> [3] Analyze duality — the original CV is scanned for existing prompt-injection or other adversarial patterns.",
  resourcesFlowStep4:
    "> [4] Apply eggs — selected adversarial eggs are layered onto the dehydrated document only (no macros or scripts executed).",
  resourcesFlowStep5:
    "> [5] Rehydrate PII — tokens are replaced with the original PII in the outgoing buffer.",
  resourcesFlowStep6:
    "> [6] Stream & purge — the CV with injected eggs is streamed back as a base64 buffer and in-memory data is discarded, with nothing persisted server-side.",
  resourcesOwaspTitle: "OWASP LLM alignment and eggs",
  resourcesOwaspBody1:
    "Each egg in FunversarialCV is designed with reference to the OWASP Top 10 for LLM Applications. For example, invisible prompt injections and \"LLM-trap\" style instructions are tied to risks around prompt injection and insecure output handling, while hallucination-oriented patterns are used to surface over-reliance on model-generated summaries.",
  resourcesOwaspBody2:
    "The goal is defensive: to make it easier for practitioners to reason about, test, and harden AI-assisted hiring stacks – not to weaponize CVs in production environments or bypass human judgment.",
  resourcesOwaspBody3:
    "For the full OWASP Top 10 for LLM Applications, see the link below. For a high-level overview in video form, watch the recommended talk.",
  resourcesOwaspLinkText: "OWASP Top 10 for LLM Applications",
  resourcesOwaspTalkText: "Recommended talk: OWASP's Top 10 Ways to Attack LLMs",
  resourcesGetStartedTitle: "Get started",
  resourcesGetStartedBody1:
    "Want to try this out but afraid to upload your own file? Use the built-in demo CVs from the main FunversarialCV console first to see how different eggs behave without touching any real data.",
  resourcesGetStartedBody2:
    "If you are a candidate, keep your conventional CV as the primary version and only use Funversarial CVs in AI-heavy pipelines where you have explicit permission to experiment. Start with a single egg enabled and incrementally layer on more complexity.",
  resourcesGetStartedBody3:
    "If you are part of a hiring or security team, wire Funversarial CVs into a sandbox or test tenant of your hiring stack. Compare how clean and Funversarial CVs move through your pipeline, and use the differences to tighten prompts, add guardrails, and reinforce human-in-the-loop review.",

  validationLabTitle: "Validation Lab",
  validationLabCollapsibleAriaLabel:
    "Validation Lab: show or hide Manual Mirror protocol and external LLM prompts",
  validationLabPromptCollapsibleAriaLabel: "Prompt {id}: show or hide full text and copy control",
  validationLabManualMirrorProtocol:
    "Manual Mirror Protocol — How to test your Armed CV in an external LLM:\n\n(1) Inject Eggs and download your CV on this page.\n(2) Open an external LLM (e.g. ChatGPT, Claude) in another tab and paste the downloaded CV into the chat.\n(3) Pick a prompt below, click [COPY], and paste it into the same conversation.\n(4) Compare the model’s reply to the diagnostic goal under that prompt (e.g. did it follow hidden instructions, leak metadata, or over-trust the document?). If the behaviour matches the goal, your forensic proof-of-concept succeeds.",
  validationLabMatchBadgeHint:
    "ENABLED means this prompt’s egg was applied in your last successful Inject Eggs run on this page—the badge reflects your latest downloaded CV, not checkboxes alone. After you change eggs or payloads, click Inject Eggs again to refresh.",
  validationMatchBadgeAriaLabel:
    "ENABLED: this prompt’s egg was applied in your last successful Inject Eggs run on this page.",
  validationCopySuccessLogMessage: "> [SYSTEM] {id} Prompt copied to clipboard",
  validationCopyButton: "COPY",
  validationCopyButtonSuccess: "SUCCESS",
  validationMatchLabel: "ENABLED",

  audienceSecurity: "For security pros",
  audienceHr: "For HR",
};
