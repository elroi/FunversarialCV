/**
 * Incident Report Mailto egg: type definitions.
 * Separates email-routing fields from template/content fields for clear UI and validation.
 */

/** Email-routing and link behavior (CC, BCC, which token, display mode). */
export interface IncidentMailtoEmailConfig {
  /** CC addresses (e.g. security@company.com). Non-PII service addresses only. */
  cc?: string[];
  /** BCC addresses. */
  bcc?: string[];
  /** 0-based index of which {{PII_EMAIL_n}} to use when multiple exist. Default 0. */
  targetTokenIndex?: number;
  /** How to present the link: replace visible email with link, or append a separate incident link. */
  mode?: "wrap-visible-email" | "append-separate-link";
}

/** Template content and semantics (subject, body, incident type, optional params). */
export interface IncidentMailtoTemplateConfig {
  /** Predefined template id from INCIDENT_MAILTO_TEMPLATES. When set, template is merged with overrides below. */
  templateId?: string;
  /** Email subject line. */
  subjectTemplate?: string;
  /** Email body. */
  bodyTemplate?: string;
  /** Free-form tag e.g. Unauthorized_Model_Training, Screening_Tool_Abuse. */
  incidentType?: string;
  /** Extra mailto query params (e.g. x-funversarial-cv-version). */
  extraParams?: Record<string, string>;
  /** Visible label for the link when mode is append-separate-link; else optional. */
  mailtoLabel?: string;
}

/** Full payload: email config + template config. Serialized as JSON string for IEgg payload. */
export interface IncidentMailtoConfig {
  emailConfig?: IncidentMailtoEmailConfig;
  templateConfig?: IncidentMailtoTemplateConfig;
}

/**
 * Community-contributed template. Standard structure for the registry.
 * Add new entries to INCIDENT_MAILTO_TEMPLATES and document OWASP rationale in description.
 */
export interface IncidentMailtoTemplate {
  id: string;
  name: string;
  description: string;
  /** Template content; merged with user overrides when this template is selected. */
  config: IncidentMailtoTemplateConfig;
}
