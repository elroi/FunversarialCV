/**
 * Centralized UI copy type. Every user-facing string is keyed here so we can
 * switch between security (technical) and HR (plain English) audiences.
 */
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
  flowSteps: readonly [string, string, string, string, string, string];
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
  sampleCvTitle: string;
  sampleCvAriaLabel: string;
  sampleCvDescription: string;
  cleanLabel: string;
  cleanSublabel: string;
  dirtyLabel: string;
  dirtySublabel: string;
  demoLoadingMessage: string;
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
  preserveStylesDesc: string;
  eggsToRunTitle: string;
  engineConfigTitle: string;
  styleAffecting: string;
  styleSafe: string;
  hardenButton: string;
  hardenProcessing: string;
  hardenAriaProcessing: string;
  hardenAriaDefault: string;
  successScanComplete: string;
  successHardenedReady: string;
  downloadButton: string;
  reprocessButton: string;
  reprocessAria: string;
  errorAlertPrefix: string;
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
  dropzonePiiNotice: string;
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
  incidentMailtoResultingLink: string;
  incidentMailtoCopyButton: string;
  incidentMailtoPlaceholderBody: string;

  // —— CanaryWingConfigCard ——
  canaryWingDescription: string;
  canaryWingResultingLink: string;
  canaryWingCopyButton: string;

  // —— MetadataShadowConfigCard ——
  metadataShadowDescription: string;
  metadataShadowPropertyName: string;
  metadataShadowPropertyValue: string;
  metadataShadowPlaceholderKey: string;
  metadataShadowPlaceholderValue: string;
  metadataShadowHowToTitle: string;

  // —— Resources page ——
  resourcesUsageTitle: string;
  resourcesUsageBody1: string;
  resourcesUsageBody2: string;
  resourcesUsageBody3: string;
  resourcesWhyTitle: string;
  resourcesWhyBody: string;
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
  /** Template: {id} = prompt id (e.g. LLM01). Used for per-prompt fold buttons. */
  validationLabPromptCollapsibleAriaLabel: string;
  validationLabManualMirrorProtocol: string;
  validationLabMatchBadgeHint: string;
  validationCopySuccessLogMessage: string; // template: use {id} for prompt id
  validationCopyButton: string;
  validationCopyButtonSuccess: string;
  validationMatchLabel: string;

  // —— Audience switcher ——
  audienceSecurity: string;
  audienceHr: string;
}
