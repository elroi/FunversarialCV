/**
 * Centralized UI copy type. Every user-facing string is keyed here so we can
 * switch between security (technical) and HR (plain English) audiences.
 */

/** One copyable prompt row in the home Validation Lab; `id` values are stable across audiences (badge mapping). */
export interface ValidationLabPromptEntry {
  id: string;
  title: string;
  description: string;
  prompt: string;
  owaspLink?: string;
  eggIds: readonly string[];
}

export interface Copy {
  // —— Home: header & badges ——
  tagline: string;
  piiModeBadge: string;
  resourcesLink: string;
  backHome: string;

  // —— Home: intro ——
  /** Collapsed title for the experiment steps panel (plain language navigation). */
  experimentFlowCollapsibleTitle: string;
  experimentFlowLabel: string;
  positioningLine: string;
  flowSteps: readonly [string, string, string, string, string, string, string];
  /** Optional helper line below flow steps (e.g. HR-only). */
  experimentFlowClarifier?: string;
  philosophyLine: string;
  /** Short framing above the input channel (both audiences). */
  introLead: string;
  /** Extra security framing after the experiment panel; use "" for HR. */
  introDetail: string;
  piiNotice: string;
  /** Collapsed title for the foldable PII / privacy notice block (reduces duplicate trust copy above the fold). */
  privacyDetailsSummary: string;

  // —— Home: input ——
  inputChannel: string;
  maxFileHint: string;
  verifyHowToAnchor: string;
  verifyPayloadHint: string;
  /** Primary sample CV CTA (full label; trailing ▶ may be split for aria-hidden in UI). */
  cleanCvCta: string;
  /** Secondary sample CV CTA (pre-injected / dirty preset). */
  dirtyCvCta: string;
  /** Decorative line between sample CTAs and the file drop zone. */
  cvUploadSampleSeparator: string;
  /** Single trust line under the upload cluster (not repeated inside DropZone). */
  uploadPrivacyLine: string;
  demoLoadingMessage: string;
  /** Shown under “Last preset” after a sample CV arms successfully (Engine section auto-opens). */
  demoArmedInlineHint: string;
  lastPresetLabel: string;
  armedCvLabel: string;
  downloadDemoLabel: string;
  selectDemoLabel: string;
  changeFileButton: string;
  /** Shown at top of Engine Configuration when no CV is loaded yet. */
  engineConfigIntroNoCv: string;
  /** Shown at top of Engine Configuration once a CV is armed (replaces upload/arm step). */
  engineConfigIntroCvReady: string;
  outputPlainTextHint: string;
  preserveStylesLabel: string;
  /** Short line always visible next to Preserve styles. */
  preserveStylesSummary: string;
  /** Inline control label to expand full preserve-styles explanation (like “How to verify”). */
  preserveStylesDetailAnchor: string;
  /** Full explanation shown when the anchor is expanded. */
  preserveStylesDesc: string;
  eggsToRunTitle: string;
  /** Caption for the Output / format block (preserve styles, PDF) inside engine config. */
  engineOutputSectionTitle: string;
  engineConfigTitle: string;
  styleAffecting: string;
  styleSafe: string;
  hardenButton: string;
  hardenProcessing: string;
  hardenAriaProcessing: string;
  hardenAriaDefault: string;
  /** Shown when the pipeline button is disabled because output already matches current egg/options config. */
  hardenAriaAwaitingConfigChange: string;
  successScanComplete: string;
  successHardenedReady: string;
  downloadButton: string;
  /** Secondary download when server also returns a PDF export (eggs embedded for parsers). */
  downloadPdfButton: string;
  /** Checkbox: request bundled PDF export alongside Word output. */
  includePdfExportLabel: string;
  /** One-line summary under the PDF checkbox (details in expandable region). */
  includePdfExportSummary: string;
  /** Inline control to expand full PDF export explanation. */
  includePdfExportDetailAnchor: string;
  /** Full PDF export caveats when detail anchor is expanded. */
  includePdfExportDetailDesc: string;
  /** Shown when egg/options in the UI differ from the last successful output; download still serves that prior run. */
  downloadStaleConfigWarning: string;
  errorAlertPrefix: string;
  /** Shown when client dehydration fails and we refuse to upload the original document. */
  errorDehydrationClientFailed: string;
  retryButton: string;
  retryAria: string;
  pipelineStatusTitle: string;
  pipelineStatusToggle: string;

  // —— Server PDF confirm ——
  serverPdfConfirmTitle: string;
  serverPdfConfirmDesc: string;
  serverPdfConfirmEggsLabel: string;
  serverPdfConfirmNote: string;
  serverPdfConfirmContinue: string;
  serverPdfConfirmUncheckContinue: string;
  serverPdfConfirmCancel: string;

  // —— DualityMonitor ——
  dualityMonitorTitle: string;
  copyLogButton: string;
  copiedStatus: string;
  copyFailedStatus: string;
  statusIdle: string;
  statusProcessing: string;
  statusCompleted: string;
  statusError: string;
  pipelineStagesTitle: string;
  stageAccept: string;
  stageDualityCheck: string;
  stageDehydration: string;
  stageInjection: string;
  stageRehydration: string;
  preHardeningScanTitle: string;
  preHardeningScanTooltip: string;
  piiStatelessVolatile: string;
  awaitingFirstScan: string;
  noSuspiciousPatterns: string;
  suspiciousPatternsDetected: string;
  dualityRemediationLabel: string;
  dualityRemediationMessage: string;
  terminalLogTitle: string;
  terminalLogAriaLabel: string;
  awaitingInputLog: string;
  auditLogHeader: string;
  auditLogEmpty: string;

  // —— DropZone ——
  dropzoneTitle: string;
  dropzonePrompt: string;
  dropzoneHint: string;
  dropzoneSrHint: string;
  errorOnlyDocx: string;
  errorFileTooLarge: string;

  // —— Egg card titles (for collapsible headers) ——
  eggInvisibleHandTitle: string;
  eggIncidentMailtoTitle: string;
  eggCanaryWingTitle: string;
  eggMetadataShadowTitle: string;

  // —— InvisibleHandConfigCard ——
  invisibleHandDescription: string;
  invisibleHandTrapLabel: string;
  invisibleHandPlaceholder: string;
  invisibleHandHint: string;
  invisibleHandHowToTitle: string;

  // —— IncidentMailtoConfigCard ——
  incidentMailtoDescription: string;
  incidentMailtoCardTooltip: string;
  incidentMailtoResultingLink: string;
  incidentMailtoCopyButton: string;
  incidentMailtoPlaceholderBody: string;

  // —— CanaryWingConfigCard ——
  canaryWingDescription: string;
  canaryWingResultingLink: string;
  canaryWingCopyButton: string;

  // —— MetadataShadowConfigCard ——
  metadataShadowDescription: string;
  metadataShadowCustomLegend: string;
  metadataShadowPropertyKeyFormatHint: string;
  metadataShadowPropertyName: string;
  metadataShadowPropertyValue: string;
  metadataShadowPlaceholderKey: string;
  metadataShadowPlaceholderValue: string;
  metadataShadowAddProperty: string;
  metadataShadowRemoveRow: string;
  metadataShadowCustomKeyCap: string;
  metadataShadowStandardSectionTitle: string;
  metadataShadowStandardScope: string;
  metadataShadowStandardTitle: string;
  metadataShadowStandardSubject: string;
  metadataShadowStandardAuthor: string;
  metadataShadowStandardKeywords: string;
  metadataShadowAuthorLabNote: string;
  metadataShadowHowToTitle: string;
  /** Shown when serialize is blocked until the user fixes validation errors. */
  metadataShadowPayloadStaleHint: string;
  metadataShadowErrKeyRequired: string;
  metadataShadowErrValueRequired: string;
  metadataShadowErrInvalidKey: string;
  metadataShadowErrValueTooLong: string;
  metadataShadowErrPiiValue: string;
  /** Use "{key}" placeholder for the duplicate property name. */
  metadataShadowErrDuplicateKey: string;
  metadataShadowErrTooManyKeys: string;
  metadataShadowErrStandardTooLong: string;
  metadataShadowErrPiiStandard: string;

  // —— Resources page ——
  resourcesUsageTitle: string;
  resourcesUsageBody1: string;
  resourcesUsageBody2: string;
  resourcesUsageBody3: string;
  resourcesWhyTitle: string;
  resourcesWhyBody: string;
  resourcesAtsTitle: string;
  resourcesAtsBody1: string;
  resourcesAtsBody2: string;
  resourcesAtsBulletKeyword: string;
  resourcesAtsBulletRanking: string;
  resourcesAtsBulletFormatting: string;
  resourcesPreserveStylesTitle: string;
  resourcesPreserveStylesBody: string;
  resourcesWhatAreEggsTitle: string;
  resourcesWhatAreEggsBody1: string;
  resourcesWhatAreEggsBody2: string;
  resourcesForCandidatesTitle: string;
  resourcesForCandidatesBody1: string;
  resourcesForCandidatesBody2: string;
  resourcesForCandidatesBody3: string;
  resourcesForHiringTeamsTitle: string;
  resourcesForHiringTeamsBody1: string;
  resourcesForHiringTeamsBody2: string;
  resourcesSecurityTitle: string;
  resourcesSecurityBody1: string;
  resourcesSecurityBody2: string;
  resourcesSecurityBody3: string;
  resourcesSecurityBody4: string;
  resourcesSecurityBody5: string;
  resourcesSecurityFlowTitle: string;
  resourcesSecurityDiagramTitle: string;
  resourcesFlowStep1: string;
  resourcesFlowStep2: string;
  resourcesFlowStep3: string;
  resourcesFlowStep4: string;
  resourcesFlowStep5: string;
  resourcesFlowStep6: string;
  /** Monospace flow diagram beside the step list; wording matches audience (HR vs security). */
  resourcesDiagramAscii: string;
  /** Accessible name for the diagram region (screen readers). */
  resourcesDiagramAriaLabel: string;
  resourcesOwaspTitle: string;
  resourcesOwaspBody1: string;
  resourcesOwaspBody2: string;
  resourcesOwaspBody3: string;
  resourcesOwaspLinkText: string;
  resourcesOwaspTalkText: string;
  resourcesGetStartedTitle: string;
  resourcesGetStartedBody1: string;
  resourcesGetStartedBody2: string;
  resourcesGetStartedBody3: string;

  // —— Validation Lab ——
  validationLabTitle: string;
  /** Accessible name for the outer Validation Lab expand/collapse control. */
  validationLabCollapsibleAriaLabel: string;
  /** Collapsible title for the synthetic NexusFlow sample job description. */
  sampleJobDescriptionTitle: string;
  /** Short note under the title (e.g. demo CV may not match this role). */
  sampleJobDescriptionIntro: string;
  /** Accessible name for the sample JD expand/collapse control. */
  sampleJobDescriptionAriaLabel: string;
  sampleJobDescriptionCopyButton: string;
  sampleJobDescriptionCopyButtonSuccess: string;
  /** aria-label for the sample JD clipboard button (visible label may abbreviate, e.g. HR "Copy JD"). */
  sampleJobDescriptionCopyAriaLabel: string;
  /** Log line when sample JD is copied (full message, no placeholders). */
  validationJdCopySuccessLogMessage: string;
  /** Template: {id} = prompt id (e.g. LLM01). Used for per-prompt fold buttons. */
  validationLabPromptCollapsibleAriaLabel: string;
  /** Visible title on the External comparative evaluation inner fold (matches protocol block title). */
  validationLabProtocolFoldTitle: string;
  /** Accessible name for the External comparative evaluation expand/collapse control. */
  validationLabProtocolCollapsibleAriaLabel: string;
  validationLabManualMirrorProtocol: string;
  /** Short label for the collapsible block that explains the ENABLED / Enabled badge. */
  validationLabMatchBadgeHintTitle: string;
  validationLabMatchBadgeHint: string;
  /** Caption above the list of validation prompt rows. */
  validationLabPromptListCaption: string;
  /** Full aria-label for the ENABLED / Enabled match badge on a validation prompt row. */
  validationMatchBadgeAriaLabel: string;
  validationCopySuccessLogMessage: string; // template: use {id} for prompt id
  validationCopyButton: string;
  validationCopyButtonSuccess: string;
  validationMatchLabel: string;
  /** Validation Lab copyable prompts (order preserved). */
  validationPrompts: readonly ValidationLabPromptEntry[];

  // —— Lab harness (ingestion + optional completion) ——
  labHarnessTitle: string;
  labHarnessIntro: string;
  labHarnessRunExtract: string;
  labHarnessExtractLoading: string;
  labHarnessNoFile: string;
  labHarnessError: string;
  labHarnessModeDocxForensic: string;
  labHarnessModeServerWordExtractor: string;
  labHarnessModeServerMammoth: string;
  labHarnessModePackageMetadata: string;
  labHarnessModeHyperlinks: string;
  labHarnessHyperlinksEmpty: string;
  labHarnessMetadataEmpty: string;
  labHarnessWarnings: string;
  labHarnessCompareTitle: string;
  labHarnessCompareLeft: string;
  labHarnessCompareRight: string;
  labHarnessOnlyInLeft: string;
  labHarnessOnlyInRight: string;
  labHarnessServerWordVsMammothNote: string;
  labHarnessCompleteTitle: string;
  labHarnessCompleteIntro: string;
  labHarnessJdLabel: string;
  labHarnessModelLabel: string;
  labHarnessCompleteSubmit: string;
  labHarnessCompleteLoading: string;
  labHarnessCompleteError: string;
  labHarnessVendorDisclaimer: string;
  /** Shown when the user picked a .docx in the lab panel (overrides defaults). */
  labHarnessSourcePicked: string;
  /** Shown when analyzing the last successful Inject output held in memory on this tab. */
  labHarnessSourceHardenedOutput: string;
  /** Shown when falling back to the Word file selected on the main console. */
  labHarnessSourceConsoleSelection: string;
  labHarnessPickFile: string;
  /** Label for which extraction mode supplies text to the optional completion call. */
  labHarnessExtractSourceLabel: string;

  // —— Audience switcher ——
  audienceSecurity: string;
  audienceHr: string;
}
