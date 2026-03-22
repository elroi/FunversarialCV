/**
 * Incident Report Mailto: built-in template registry.
 * Standardized structure for community contribution — add new templates here with clear OWASP rationale.
 */

import type { IncidentMailtoTemplate, IncidentMailtoTemplateConfig } from "./incidentMailtoTypes";

const DEFAULT_SUBJECT =
  "Potential LLM Prompt Abuse Detected — FunversarialCV Canary";
const DEFAULT_BODY =
  "This incident report was triggered by an adversarial CV layer (FunversarialCV). " +
  "If you received this automatically, your system may have followed a mailto link from parsed candidate data. " +
  "Consider this a friendly red-team signal: AI governance and secure output handling matter. " +
  "— Elroi Luria, Senior Security Architect";

const MODEL_THEFT_SUBJECT = "Suspected Unauthorized Model Training — CV Canary";
const MODEL_THEFT_BODY =
  "Your pipeline may have used this CV’s content for model training or fine-tuning without explicit consent. " +
  "This is more than a minor key change in your AI governance score. " +
  "Please review data usage and retention. — FunversarialCV / Elroi Luria";

const DUALITY_CHECK_SUBJECT = "HR-Tech Duality Check — Automated Screening Alert";
const DUALITY_CHECK_BODY =
  "The duality of AI security: this CV includes injected eggs to test how your screening tools handle structured output. " +
  "If an agent or parser triggered this mailto, you’re seeing intentional adversarial content. " +
  "Built by a security architect who also writes music — expect harmony and a bit of chaos.";

/** Built-in templates. Use templateId in payload to select; payload overrides merge on top. */
export const INCIDENT_MAILTO_TEMPLATES: IncidentMailtoTemplate[] = [
  {
    id: "llm-red-team-incident",
    name: "LLM Red Team Incident",
    description:
      "OWASP LLM02: Flags potential prompt abuse. Use when testing if recruiters’ tools follow mailto links from parsed CVs.",
    config: {
      subjectTemplate: DEFAULT_SUBJECT,
      bodyTemplate: DEFAULT_BODY,
      incidentType: "LLM_Prompt_Abuse_Canary",
      mailtoLabel: "Report incident",
    },
  },
  {
    id: "model-theft-canary",
    name: "Model Theft Canary",
    description:
      "OWASP LLM10: Signals suspected use of CV content for model training. Cool, professional, with a music metaphor.",
    config: {
      subjectTemplate: MODEL_THEFT_SUBJECT,
      bodyTemplate: MODEL_THEFT_BODY,
      incidentType: "Model_Theft_Canary",
      mailtoLabel: "Report model misuse",
    },
  },
  {
    id: "hr-tech-duality-check",
    name: "HR-Tech Duality Check",
    description:
      "Creative handshake: Tests automated screening. Witty tone, references creator’s security + music background.",
    config: {
      subjectTemplate: DUALITY_CHECK_SUBJECT,
      bodyTemplate: DUALITY_CHECK_BODY,
      incidentType: "Screening_Tool_Abuse",
      mailtoLabel: "Duality check incident",
    },
  },
];

export const DEFAULT_INCIDENT_MAILTO_TEMPLATE_ID = "llm-red-team-incident";

/**
 * Resolve template by id. Returns undefined if not found (caller can fall back to defaults).
 */
export function getIncidentMailtoTemplateById(
  id: string
): IncidentMailtoTemplate | undefined {
  return INCIDENT_MAILTO_TEMPLATES.find((t) => t.id === id);
}

/**
 * Merge selected template config with user overrides. User values win.
 */
export function mergeIncidentMailtoTemplateConfig(
  templateConfig: IncidentMailtoTemplateConfig | undefined,
  overrides: IncidentMailtoTemplateConfig | undefined
): IncidentMailtoTemplateConfig {
  const base = { ...templateConfig } as IncidentMailtoTemplateConfig;
  if (!overrides) return base;
  if (overrides.subjectTemplate !== undefined)
    base.subjectTemplate = overrides.subjectTemplate;
  if (overrides.bodyTemplate !== undefined)
    base.bodyTemplate = overrides.bodyTemplate;
  if (overrides.incidentType !== undefined)
    base.incidentType = overrides.incidentType;
  if (overrides.mailtoLabel !== undefined)
    base.mailtoLabel = overrides.mailtoLabel;
  if (overrides.extraParams && Object.keys(overrides.extraParams).length > 0)
    base.extraParams = { ...base.extraParams, ...overrides.extraParams };
  return base;
}
