/**
 * Shared mailto URI builder for Incident Mailto egg.
 * Used by the egg (server) and the config card (client) so the preview matches the embedded link.
 */

import type { IncidentMailtoConfig, IncidentMailtoTemplateConfig } from "./incidentMailtoTypes";
import {
  getIncidentMailtoTemplateById,
  mergeIncidentMailtoTemplateConfig,
  DEFAULT_INCIDENT_MAILTO_TEMPLATE_ID,
} from "./incidentMailtoTemplates";

/**
 * Resolve template config from full payload config (template id + overrides).
 */
export function getResolvedTemplateConfigFromConfig(
  config: IncidentMailtoConfig
): IncidentMailtoTemplateConfig {
  const templateConfig = config.templateConfig ?? {};
  const templateId =
    templateConfig.templateId ?? DEFAULT_INCIDENT_MAILTO_TEMPLATE_ID;
  const builtIn = getIncidentMailtoTemplateById(templateId)?.config;
  return mergeIncidentMailtoTemplateConfig(builtIn, templateConfig);
}

/**
 * Build the mailto URI for a given recipient token and template config.
 * Used by the egg and by the config card for the copyable preview.
 */
export function buildMailtoUri(
  token: string,
  template: IncidentMailtoTemplateConfig
): string {
  const params = new URLSearchParams();
  const subject = template.subjectTemplate ?? "Incident Report — FunversarialCV";
  const body =
    template.bodyTemplate ??
    "This incident was triggered by an adversarial CV layer. — FunversarialCV";
  params.set("subject", subject);
  params.set("body", body);
  if (template.incidentType) {
    params.set("x-incident-type", template.incidentType);
  }
  if (template.extraParams) {
    for (const [k, v] of Object.entries(template.extraParams)) {
      if (k && v !== undefined) params.set(k, v);
    }
  }
  const query = params.toString();
  const base = `mailto:${token}`;
  return query ? `${base}?${query}` : base;
}

/**
 * Build the mailto URI that would be used for the current config, with a placeholder token.
 * Use this in the UI for the "resulting link" preview (e.g. {{PII_EMAIL_0}}).
 */
export function buildMailtoPreview(
  config: IncidentMailtoConfig,
  tokenPlaceholder: string
): string {
  const template = getResolvedTemplateConfigFromConfig(config);
  return buildMailtoUri(tokenPlaceholder, template);
}
