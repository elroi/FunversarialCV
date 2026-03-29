/**
 * Egg library barrel export.
 */

export {
  invisibleHand,
  DEFAULT_INVISIBLE_HAND_TRAP,
  getInvisibleHandTrapText,
} from "./InvisibleHand";
export { incidentMailto } from "./IncidentMailto";
export {
  INCIDENT_MAILTO_TEMPLATES,
  DEFAULT_INCIDENT_MAILTO_TEMPLATE_ID,
  getIncidentMailtoTemplateById,
  mergeIncidentMailtoTemplateConfig,
} from "./templates/incidentMailtoTemplates";
export type {
  IncidentMailtoConfig,
  IncidentMailtoEmailConfig,
  IncidentMailtoTemplateConfig,
  IncidentMailtoTemplate,
} from "./templates/incidentMailtoTypes";

export { AVAILABLE_EGGS } from "./registry";
