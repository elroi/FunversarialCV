import type { Copy } from "./types";

export const hrCopy: Copy = {
  tagline:
    "Add subtle, AI-visible signals to your CV so you can see how hiring tools interpret it.",
  piiModeBadge: "Private processing: no CV storage",
  resourcesLink: "Resources",
  backHome: "Back home",

  experimentFlowCollapsibleTitle: "How to run a fair test",
  experimentFlowLabel: "RUN THE CV EXPERIMENT",
  positioningLine:
    "Run a simple before-and-after test to see whether AI-visible signals change the output.",
  flowSteps: [
    "Start with our sample CV (recommended) or upload your own CV",
    "Add subtle AI-visible signals to your CV",
    "Download your modified CV",
    "Test both versions in a real AI tool\n(ChatGPT / Claude)",
    "Compare how the outputs differ",
    "Confirm whether the signals changed the AI's response",
  ] as const,
  experimentFlowClarifier:
    "Look for changes in tone, ranking, or interpretation of your experience.",
  philosophyLine:
    "This isn't about tricking the system — it's about understanding how your inputs shape the results.",
  introLead:
    "Use this to compare before-and-after results and learn how AI tools interpret the same CV under slightly different signal conditions.",
  introDetail: "",
  piiNotice:
    "Your CV is processed in your browser first. Before anything leaves your device, we replace your email, phone, and other contact details (we call this PII) with temporary placeholders. Our server only sees those placeholders, never your real contact information. Processing is in memory only—we don’t store your document after your new CV is generated.",
  privacyDetailsSummary: "How we protect your contact details",

  inputChannel: "Upload your CV",
  maxFileHint: "Max 4 MB. Word (.docx) only.",
  verifyHowToAnchor: "How to verify",
  verifyPayloadHint:
    "Only temporary placeholders are sent — your real contact details never leave your device.",
  sampleCvTitle: "Use a sample CV",
  sampleCvAriaLabel: "Expand Use a sample CV",
  sampleCvDescription:
    "Try the tool without your own file — use Clean for a normal example, or Dirty to see how hidden signals look in a CV.",
  cleanLabel: "Clean · DOCX",
  cleanSublabel: "Normal sample",
  dirtyLabel: "Dirty · DOCX",
  dirtySublabel: "Sample with hidden signals",
  demoLoadingMessage: "Generating sample CV… this may take a few seconds.",
  demoArmedInlineHint:
    "Sample CV loaded — Engine Configuration is open below. Use Add signals when you're ready.",
  lastPresetLabel: "Last sample:",
  armedCvLabel: "CV loaded:",
  downloadDemoLabel: "Download the current sample as-is",
  selectDemoLabel: "Choose a sample above and click here to view it",
  changeFileButton: "Change file",
  engineConfigIntroNoCv:
    "Choose which signals to add, open each section to adjust details, then upload a CV and run Add signals.",
  engineConfigIntroCvReady:
    "Open each section to adjust details, then click Add signals.",
  outputPlainTextHint:
    'The result will be plain text unless “Preserve styles” is on (for options that only add content).',
  preserveStylesLabel: "Preserve styles",
  preserveStylesSummary: "We keep your layout and formatting when possible.",
  preserveStylesDetailAnchor: "More info",
  preserveStylesDesc:
    "If an option changes the main text, we may have to rebuild the document and some formatting might change; the log will say which approach was used.",
  eggsToRunTitle: "Options to add",
  engineConfigTitle: "How it runs",
  styleAffecting: "May change layout",
  styleSafe: "Layout-safe",
  hardenButton: "Add signals",
  hardenProcessing: "Processing…",
  hardenAriaProcessing: "Add signals (processing…)",
  hardenAriaDefault: "Add signals",
  hardenAriaAwaitingConfigChange:
    "Add signals — output matches your current options; change options, then run again.",
  successScanComplete: "Scan complete (no options applied — document unchanged):",
  successHardenedReady: "Your new CV is ready:",
  downloadButton: "Download",
  errorAlertPrefix: "Something went wrong:",
  retryButton: "Retry",
  retryAria: "Retry",
  pipelineStatusTitle: "Processing steps",
  pipelineStatusToggle: "Processing steps",

  serverPdfConfirmTitle: "Server processing needed",
  serverPdfConfirmDesc:
    "This PDF can’t be processed in your browser. The file and your chosen options can only be handled by our server.",
  serverPdfConfirmEggsLabel: "Options that will run on the server:",
  serverPdfConfirmNote:
    "You can continue and let the server apply these options, or turn them off and continue without any options.",
  serverPdfConfirmContinue: "Continue (use server)",
  serverPdfConfirmUncheckContinue: "Turn off options and continue",
  serverPdfConfirmCancel: "Cancel",

  dualityMonitorTitle: "Processing steps",
  copyLogButton: "Copy log",
  copiedStatus: "Copied.",
  copyFailedStatus: "Copy failed.",
  statusIdle: "Idle",
  statusProcessing: "Processing",
  statusCompleted: "Completed",
  statusError: "Error",
  pipelineStagesTitle: "Steps",
  stageAccept: "Accept file",
  stageDualityCheck: "Pre-check",
  stageDehydration: "Replace contact details",
  stageInjection: "Add signals",
  stageRehydration: "Restore contact details",
  preHardeningScanTitle: "Pre-check (before adding our signals)",
  preHardeningScanTooltip:
    "We scan your CV for any existing hidden instructions or tracking links before adding our own, so you can see what was already there.",
  piiStatelessVolatile:
    "Same privacy model as upload: in-memory processing; we don’t store your documents.",
  awaitingFirstScan: "Waiting for a CV. Upload one to start.",
  noSuspiciousPatterns:
    "No existing hidden instructions or tracking links found in your CV.",
  suspiciousPatternsDetected:
    "We found existing hidden instructions, tracking links, or extra metadata:",
  dualityRemediationLabel: "What this means",
  dualityRemediationMessage:
    "Your CV already contains some hidden or automated elements. Adding more may make it harder for AI tools to read the document clearly.",
  terminalLogTitle: "Log",
  terminalLogAriaLabel: "Processing log",
  awaitingInputLog: "Waiting for a CV… upload one to start.",
  auditLogHeader:
    "FunversarialCV local log (only on your device; nothing is stored on our servers)\n",
  auditLogEmpty: "No entries yet. Upload a CV to start.\n",

  dropzoneTitle: "Upload your CV",
  dropzonePrompt: "Drop your CV here",
  dropzoneHint: "browse",
  dropzonePiiNotice:
    "Contacts are replaced with placeholders before anything is sent; we don’t keep your file after you download.",
  dropzoneSrHint:
    "Upload a Word document (.docx). Contacts are replaced with placeholders before send; nothing is stored after you download your result.",
  errorOnlyDocx: "Only Word documents (.docx) are allowed.",
  errorFileTooLarge: "File is too large.",

  eggInvisibleHandTitle: "Quiet note to AI (Invisible Hand)",
  eggIncidentMailtoTitle: "Report-by-email link (Mailto Surprise)",
  eggCanaryWingTitle: "Tracking link (Canary Wing)",
  eggMetadataShadowTitle: "Hidden document property (Metadata Shadow)",

  invisibleHandDescription:
    "Add a hidden note that only AI systems can see, so you can test whether screening tools follow invisible instructions. Leave blank to use the default note.",
  invisibleHandTrapLabel: "Custom note (optional)",
  invisibleHandPlaceholder: "Leave blank to use the default note.",
  invisibleHandHint:
    "{n}/{max} characters. Letters, numbers, spaces, and basic punctuation only (no HTML or code).",
  invisibleHandHowToTitle: "How to check and validate",

  incidentMailtoDescription: "",
  incidentMailtoResultingLink: "Resulting link — copy to add to your CV manually",
  incidentMailtoCopyButton: "Copy link",
  incidentMailtoPlaceholderBody:
    "This report was triggered by a test signal added to a CV.",

  canaryWingDescription: "",
  canaryWingResultingLink: "Resulting link — copy to add to your CV manually",
  canaryWingCopyButton: "Copy link",

  metadataShadowDescription:
    "Add a hidden property to the document (e.g. Ranking: Top_1%). Use letters, numbers, and underscores only. Don’t put personal contact details in the value.",
  metadataShadowPropertyName: "Property name",
  metadataShadowPropertyValue: "Property value",
  metadataShadowPlaceholderKey: "Ranking",
  metadataShadowPlaceholderValue: "Top_1_Percent",
  metadataShadowHowToTitle: "How to check and validate",

  resourcesUsageTitle: "Usage and responsibility",
  resourcesUsageBody1:
    "FunversarialCV is for learning and research only. It helps you explore how AI-assisted hiring tools handle CVs and test them in a controlled way, with your permission.",
  resourcesUsageBody2:
    "We don’t guarantee that this tool will find or prevent every issue, and it isn’t legal, compliance, or HR advice. You are responsible for how you use it and any documents you create, including following laws and your organization’s policies.",
  resourcesUsageBody3:
    "Don’t use it to mislead people or bypass security. Only use it where you’re allowed to run this kind of test.",
  resourcesWhyTitle: "Why add signals to a CV?",
  resourcesWhyBody:
    "FunversarialCV is an educational tool that adds hidden, test-friendly signals to your CV so you can see how AI screening systems behave. The signals are based on common security and AI guidelines. They’re designed so humans can still read the CV normally, while you learn how automated tools interpret it.",
  resourcesPreserveStylesTitle: "Preserve styles and layout",
  resourcesPreserveStylesBody:
    "When you turn on “Preserve styles”, we try to keep your existing layout and formatting by editing the document’s structure instead of rebuilding it from plain text. When that isn’t possible (for example with some PDFs or when an option changes the main text), we rebuild and the interface will show which approach was used.",
  resourcesWhatAreEggsTitle: "What are these options?",
  resourcesWhatAreEggsBody1:
    "Each option adds a different kind of hidden or test signal to your CV. For example: a note only AI systems can see, a trackable link, or extra metadata. The document stays readable for people.",
  resourcesWhatAreEggsBody2:
    "Think of them like easter eggs in software: small, intentional additions that are there to be discovered. These are for learning how AI hiring tools work, not for tricking human reviewers or breaking applicant systems.",
  resourcesForCandidatesTitle: "For job seekers",
  resourcesForCandidatesBody1:
    "Use this tool responsibly. Only add these signals to CVs you submit to systems you own or where you have clear permission to test (for example, roles or companies that say they use AI screening and are open to research).",
  resourcesForCandidatesBody2:
    "Be careful with regulated or very formal roles where unusual formatting could be misunderstood. Keep a standard CV for normal applications.",
  resourcesForCandidatesBody3:
    "Treat Funversarial CVs as an optional, educational way to see how AI-aware employers handle your application, not as a replacement for your main CV.",
  resourcesForHiringTeamsTitle: "For hiring and HR teams",
  resourcesForHiringTeamsBody1:
    "Many hiring pipelines use AI to summarize or rank CVs. This tool helps you see, in a safe way, how those systems react to hidden instructions or extra metadata — without trying to deceive human reviewers.",
  resourcesForHiringTeamsBody2:
    "We recommend trying it in a test or sandbox environment first. Use it to check that your screening tools don’t over-trust document content and that a human is still in the loop for important decisions.",
  resourcesSecurityTitle: "Privacy and how we handle your data",
  resourcesSecurityBody1:
    "FunversarialCV doesn’t store your documents. Everything is processed in memory only. In your browser, we replace your email, phone, and address (PII) with temporary placeholders before anything is sent. Our server only receives those placeholders, not your real contact details.",
  resourcesSecurityBody2:
    "All the options run on this placeholder version on the server. The server sends back a version with placeholders; your browser puts your real contact details back in and gives you the final file. We don’t keep the result on our side.",
  resourcesSecurityBody3:
    "We use document libraries that only read and edit data — no macros, scripts, or code in your file are run.",
  resourcesSecurityBody4:
    "If you want to verify that only placeholders are sent: open your browser’s Developer Tools → Network, click “Add signals”, and inspect the request. You should see tokens like {{PII_EMAIL_0}}, not your real email or phone.",
  resourcesSecurityBody5: "",
  resourcesSecurityFlowTitle: "How your CV is processed",
  resourcesSecurityDiagramTitle: "Overview",
  resourcesFlowStep1: "[1] Load — Your CV is uploaded and kept in memory only.",
  resourcesFlowStep2:
    "[2] Replace contact details — Email, phone, and similar details are replaced with temporary placeholders.",
  resourcesFlowStep3:
    "[3] Pre-check — We scan the CV for any existing hidden instructions or tracking links.",
  resourcesFlowStep4:
    "[4] Add options — The options you chose are applied to the placeholder version (no code is run).",
  resourcesFlowStep5:
    "[5] Restore contact details — Placeholders are replaced with your real details in the final file.",
  resourcesFlowStep6:
    "[6] Send back and clear — The new CV is sent to your browser and we don’t keep anything on the server.",
  resourcesOwaspTitle: "How this relates to AI and security standards",
  resourcesOwaspBody1:
    "The options in FunversarialCV are inspired by common frameworks for AI and security (such as the OWASP Top 10 for LLM Applications). For example, the “invisible note” option relates to how systems handle hidden instructions; others relate to over-trusting metadata or summaries.",
  resourcesOwaspBody2:
    "The aim is to help you test and improve AI-assisted hiring tools, not to misuse CVs in real recruitment or bypass human judgment.",
  resourcesOwaspBody3:
    "For the full OWASP Top 10 for LLM Applications and a video overview, see the links below.",
  resourcesOwaspLinkText: "OWASP Top 10 for LLM Applications",
  resourcesOwaspTalkText: "Recommended talk: OWASP's Top 10 Ways to Attack LLMs",
  resourcesGetStartedTitle: "Get started",
  resourcesGetStartedBody1:
    "Want to try without uploading your own CV? Use the sample CVs on the main page to see how each option works, with no real data.",
  resourcesGetStartedBody2:
    "If you’re a job seeker, keep your main CV for normal applications and only use this in pipelines where you’re allowed to test. Start with one option and add more if you like.",
  resourcesGetStartedBody3:
    "If you’re in hiring or HR, run this in a test environment. Compare how normal and “signaled” CVs move through your pipeline and use that to improve prompts and guardrails.",

  validationLabTitle: "Validation Lab",
  validationLabCollapsibleAriaLabel:
    "Validation Lab: show or hide prompts for testing your CV in an external AI",
  validationLabPromptCollapsibleAriaLabel: "Prompt {id}: show or hide full text and copy button",
  validationLabManualMirrorProtocol:
    "How to test your CV with added signals in an external AI:\n\n(1) Add signals and download your CV on this page.\n(2) Open an external AI (e.g. ChatGPT or Claude) in another tab and paste the downloaded CV into the chat.\n(3) Pick a prompt below, click Copy, and paste it into the same conversation.\n(4) Compare the AI’s reply to the goal described under that prompt (e.g. did it follow hidden instructions or use hidden metadata?). If the reply matches the goal, the test succeeded.",
  validationLabMatchBadgeHint:
    "Enabled means this prompt’s option was applied in your last successful Add signals run on this page—the badge reflects your latest downloaded CV, not checkboxes alone. After you change options, run Add signals again to refresh.",
  validationMatchBadgeAriaLabel:
    "Enabled: this prompt’s target option was applied in your last successful run on this page.",
  validationCopySuccessLogMessage: "> [SYSTEM] {id} Prompt copied to clipboard",
  validationCopyButton: "Copy",
  validationCopyButtonSuccess: "Copied",
  validationMatchLabel: "Enabled",

  audienceSecurity: "For security pros",
  audienceHr: "For HR",
};
