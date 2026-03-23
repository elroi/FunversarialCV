"use client";

import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { CollapsibleCard } from "./ui/CollapsibleCard";
import { CheckAndValidateBlock } from "./CheckAndValidateBlock";
import { useCopy } from "../copy";
import {
  INCIDENT_MAILTO_TEMPLATES,
  DEFAULT_INCIDENT_MAILTO_TEMPLATE_ID,
  getIncidentMailtoTemplateById,
} from "../eggs/templates/incidentMailtoTemplates";
import { buildMailtoPreview } from "../eggs/templates/incidentMailtoBuild";
import type {
  IncidentMailtoConfig,
  IncidentMailtoEmailConfig,
  IncidentMailtoTemplateConfig,
} from "../eggs/templates/incidentMailtoTypes";

const CUSTOM_TEMPLATE_ID = "__custom__";

export interface IncidentMailtoConfigCardProps {
  /** Current JSON payload; controlled from parent. */
  payload?: string;
  /** Called when user changes config; parent should set payloads["incident-mailto"]. */
  onPayloadChange: (payload: string) => void;
  disabled?: boolean;
  className?: string;
  /** Instructions for manual check and validation (from GET /api/eggs). */
  manualCheckAndValidation?: string;
}

function parsePayloadSafe(payload: string | undefined): IncidentMailtoConfig {
  if (!payload?.trim()) return {};
  try {
    const parsed = JSON.parse(payload) as IncidentMailtoConfig;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export const IncidentMailtoConfigCard: React.FC<IncidentMailtoConfigCardProps> = ({
  payload,
  onPayloadChange,
  disabled = false,
  className,
  manualCheckAndValidation,
}) => {
  const copy = useCopy();
  const config = parsePayloadSafe(payload);

  const [templateId, setTemplateId] = useState<string>(
    config.templateConfig?.templateId ?? DEFAULT_INCIDENT_MAILTO_TEMPLATE_ID
  );
  const [subject, setSubject] = useState(
    config.templateConfig?.subjectTemplate ?? ""
  );
  const [body, setBody] = useState(config.templateConfig?.bodyTemplate ?? "");
  const [incidentType, setIncidentType] = useState(
    config.templateConfig?.incidentType ?? ""
  );
  const [mailtoLabel, setMailtoLabel] = useState(
    config.templateConfig?.mailtoLabel ?? ""
  );
  const [ccInput, setCcInput] = useState(
    (config.emailConfig?.cc ?? []).join(", ")
  );
  const [bccInput, setBccInput] = useState(
    (config.emailConfig?.bcc ?? []).join(", ")
  );
  const [mode, setMode] = useState<"wrap-visible-email" | "append-separate-link">(
    config.emailConfig?.mode ?? "wrap-visible-email"
  );
  const [targetTokenIndex, setTargetTokenIndex] = useState(
    config.emailConfig?.targetTokenIndex ?? 0
  );
  const [showAdvanced, setShowAdvanced] = useState(templateId === CUSTOM_TEMPLATE_ID);

  const selectedTemplate = templateId === CUSTOM_TEMPLATE_ID ? null : getIncidentMailtoTemplateById(templateId);
  const displaySubject = subject || (selectedTemplate?.config.subjectTemplate ?? "");
  const displayBody = body || (selectedTemplate?.config.bodyTemplate ?? "");

  /** Card header is always the egg name (Mailto Surprise); template is shown inside the card. */
  const cardTitle = copy.eggIncidentMailtoTitle;

  const emit = useCallback(
    (next: IncidentMailtoConfig) => {
      onPayloadChange(JSON.stringify(next));
    },
    [onPayloadChange]
  );

  useEffect(() => {
    const cc = ccInput
      .split(/[\s,]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    const bcc = bccInput
      .split(/[\s,]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    const emailConfig: IncidentMailtoEmailConfig = {
      mode,
      targetTokenIndex,
      ...(cc.length ? { cc } : {}),
      ...(bcc.length ? { bcc } : {}),
    };
    const templateConfig: IncidentMailtoTemplateConfig = {
      ...(templateId !== CUSTOM_TEMPLATE_ID ? { templateId } : {}),
      ...(subject ? { subjectTemplate: subject } : {}),
      ...(body ? { bodyTemplate: body } : {}),
      ...(incidentType ? { incidentType } : {}),
      ...(mailtoLabel ? { mailtoLabel } : {}),
    };
    emit({ emailConfig, templateConfig });
  }, [
    ccInput,
    bccInput,
    mode,
    targetTokenIndex,
    templateId,
    subject,
    body,
    incidentType,
    mailtoLabel,
    emit,
  ]);

  const onTemplateChange = (id: string) => {
    setTemplateId(id);
    if (id !== CUSTOM_TEMPLATE_ID) {
      const t = getIncidentMailtoTemplateById(id);
      if (t) {
        setSubject(t.config.subjectTemplate ?? "");
        setBody(t.config.bodyTemplate ?? "");
        setIncidentType(t.config.incidentType ?? "");
        setMailtoLabel(t.config.mailtoLabel ?? "");
      }
      setShowAdvanced(false);
    } else {
      setShowAdvanced(true);
    }
  };

  const tokenPlaceholder = `{{PII_EMAIL_${targetTokenIndex}}}`;
  const resultingLink = buildMailtoPreview(config, tokenPlaceholder);
  const copyMailtoLink = useCallback(() => {
    void navigator.clipboard.writeText(resultingLink);
  }, [resultingLink]);

  return (
    <CollapsibleCard
      title={
        <span className="flex flex-col gap-0.5">
          <span>{cardTitle}</span>
          <span className="text-xs font-mono text-foreground/60">
            {copy.styleSafe}
          </span>
        </span>
      }
      titleId="incident-mailto-card-title"
      contentId="incident-mailto-card-content"
      ariaLabel={`Expand ${copy.eggIncidentMailtoTitle} config`}
      defaultExpanded={false}
      disabled={disabled}
      className={className}
    >
      <p
        className="text-caption sm:text-sm text-foreground/70 mb-4"
        title={copy.incidentMailtoCardTooltip}
      >
        {copy.incidentMailtoDescription}
      </p>

      {/* —— Email fields (routing) —— */}
      <fieldset className="mb-4">
        <legend
          className="text-caption uppercase tracking-wider text-foreground/80 mb-2"
          title="CC, BCC, link placement, and which email token in the CV gets the mailto link."
        >
          Email routing
        </legend>
        <div className="space-y-2">
          <label
            className="block text-caption text-foreground/70"
            title="Optional comma-separated addresses to CC on the incident report (e.g. security@company.com). Non-PII service addresses only."
          >
            CC (comma-separated)
          </label>
          <input
            type="text"
            value={ccInput}
            onChange={(e) => setCcInput(e.target.value)}
            placeholder="security@example.com"
            disabled={disabled}
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none"
            aria-describedby="cc-hint"
            title="Optional comma-separated addresses to CC on the incident report. Non-PII service addresses only."
          />
          <span id="cc-hint" className="text-caption text-foreground/50">
            Non-PII service addresses only.
          </span>
          <label
            className="block text-caption text-foreground/70 mt-2"
            title="Optional comma-separated addresses to BCC on the incident report."
          >
            BCC
          </label>
          <input
            type="text"
            value={bccInput}
            onChange={(e) => setBccInput(e.target.value)}
            placeholder="optional"
            disabled={disabled}
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none"
            title="Optional comma-separated addresses to BCC."
          />
          <div className="flex gap-4 pt-2">
            <label
              className="flex items-center gap-2 text-sm"
              title="Replaces the visible email in the CV with the same text plus the full mailto link in parentheses (e.g. email@example.com (mailto:?...)). Use to test if parsers or clients make the address clickable."
            >
              <input
                type="radio"
                name="incident-mailto-mode"
                checked={mode === "wrap-visible-email"}
                onChange={() => setMode("wrap-visible-email")}
                disabled={disabled}
                className="text-accent focus:ring-accent"
              />
              Wrap visible email
            </label>
            <label
              className="flex items-center gap-2 text-sm"
              title="Keeps the email as-is and adds a separate incident link next to it (e.g. email@example.com — Report incident [mailto:?...]). Use when you want the CV text unchanged but still want a planted link."
            >
              <input
                type="radio"
                name="incident-mailto-mode"
                checked={mode === "append-separate-link"}
                onChange={() => setMode("append-separate-link")}
                disabled={disabled}
                className="text-accent focus:ring-accent"
              />
              Append link
            </label>
          </div>
          <p className="text-caption text-foreground/50 mt-1">
            We try to wrap the email in a link (structure-level edit). If the document structure doesn’t allow it, we append a separate link instead; your choice is respected when possible.
          </p>
          <div className="flex items-center gap-2">
            <label
              className="text-caption text-foreground/70"
              title="Your CV's email addresses are replaced by tokens {{PII_EMAIL_0}}, {{PII_EMAIL_1}}, etc. This index (0-based) chooses which token gets the mailto link. Use 0 for the first email, 1 for the second, and so on."
            >
              Email token index
            </label>
            <input
              type="number"
              min={0}
              value={targetTokenIndex}
              onChange={(e) => setTargetTokenIndex(parseInt(e.target.value, 10) || 0)}
              disabled={disabled}
              className="w-16 rounded border border-border bg-bg px-2 py-1 text-sm focus:border-accent focus:outline-none"
              aria-label="Which PII_EMAIL token to use (0-based)"
              title="0-based index: which {{PII_EMAIL_n}} token gets the mailto link (0 = first email, 1 = second, etc.)."
            />
          </div>
        </div>
      </fieldset>

      {/* —— Template fields —— */}
      <fieldset>
        <legend
          className="text-caption uppercase tracking-wider text-foreground/80 mb-2"
          title="Preset subject, body, and incident type. Override any field to mix styles (e.g. canary wording with a different subject)."
        >
          Incident template
        </legend>
        <div className="space-y-2">
          <label
            className="block text-caption text-foreground/70"
            title="Preset subject, body, and incident type. You can override any field below to mix styles (e.g. canary wording with a different subject)."
          >
            Template
          </label>
          <select
            value={templateId}
            onChange={(e) => onTemplateChange(e.target.value)}
            disabled={disabled}
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
            aria-describedby="template-hint"
            aria-label="Choose incident mailto template"
            title="Choose a preset or Custom to edit everything. Templates are presets — use Override to mix features (e.g. canary body + any subject)."
          >
            {INCIDENT_MAILTO_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value={CUSTOM_TEMPLATE_ID}>Custom / Advanced</option>
          </select>
          <p
            id="template-hint"
            className="text-caption text-foreground/50"
            title="Templates only pre-fill subject, body, and incident type. Features like canary wording are not locked to one template — mix and match via Override."
          >
            Templates are presets. Use &quot;Override subject/body&quot; to mix features (e.g. canary-style body with another subject, or add incident types to any template).
          </p>

          {selectedTemplate?.description && (
            <p className="text-caption text-accent/80 italic">
              {selectedTemplate.description}
            </p>
          )}

          {(showAdvanced || templateId === CUSTOM_TEMPLATE_ID) && (
            <div className="mt-3 space-y-2 pt-2 border-t border-border">
              <label
                className="block text-caption text-foreground/70"
                title="The email subject line of the incident report (mailto subject= parameter)."
              >
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={displaySubject || "Incident Report — FunversarialCV"}
                disabled={disabled}
                className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm placeholder:text-foreground/40 focus:border-accent focus:outline-none"
                title="Subject line of the incident email (mailto subject= parameter)."
              />
              <label
                className="block text-caption text-foreground/70"
                title="The body text of the incident email (mailto body= parameter)."
              >
                Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={displayBody || copy.incidentMailtoPlaceholderBody}
                rows={3}
                disabled={disabled}
                className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm placeholder:text-foreground/40 focus:border-accent focus:outline-none resize-y"
                title="Body text of the incident email (mailto body= parameter). Can include canary-style or custom wording."
              />
              <label
                className="block text-caption text-foreground/70"
                title="Optional tag sent as x-incident-type in the mailto query (e.g. LLM_Prompt_Abuse_Canary, Model_Theft_Canary). Available for any template."
              >
                Incident type tag
              </label>
              <input
                type="text"
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                placeholder="e.g. LLM_Prompt_Abuse_Canary"
                disabled={disabled}
                className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm placeholder:text-foreground/40 focus:border-accent focus:outline-none"
                title="Optional x-incident-type mailto parameter. Use with any template (e.g. canary, screening abuse)."
              />
              <label
                className="block text-caption text-foreground/70"
                title="When using Append link mode, this is the visible label for the incident link (e.g. Report incident)."
              >
                Link label
              </label>
              <input
                type="text"
                value={mailtoLabel}
                onChange={(e) => setMailtoLabel(e.target.value)}
                placeholder="Report incident"
                disabled={disabled}
                className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm placeholder:text-foreground/40 focus:border-accent focus:outline-none"
                title="Visible label for the link when using Append link mode."
              />
            </div>
          )}

          {!showAdvanced && templateId !== CUSTOM_TEMPLATE_ID && (
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="text-caption text-accent hover:underline mt-1"
              title="Templates are presets. Click to show subject, body, incident type, and link label so you can mix features (e.g. canary-style body with another subject)."
            >
              Override subject/body
            </button>
          )}
        </div>
      </fieldset>

      {/* —— Resulting link: copy to add manually to CV —— */}
      <fieldset className="mt-4 pt-4 border-t border-border">
        <legend
          className="text-caption uppercase tracking-wider text-foreground/80 mb-2"
          title="Copy this link to add the incident-report mailto to your CV manually (e.g. in Word or PDF). Replace the placeholder with your email in the document if needed."
        >
          {copy.incidentMailtoResultingLink}
        </legend>
        <p
          id="resulting-link-hint"
          className="text-caption text-foreground/50 mb-2"
          title="Copy this link to add the incident-report mailto to your CV manually (e.g. paste next to your email). Replace {{PII_EMAIL_0}} with your email in the document if needed."
        >
          Copy this link to add it manually to your CV (e.g. paste next to your email). Replace {tokenPlaceholder} with your email in the document if needed.
        </p>
        <div className="flex gap-2 items-center">
          <code
            className="flex-1 min-w-0 rounded border border-border bg-bg px-2 py-1.5 text-caption text-foreground break-all"
            title={resultingLink}
          >
            {resultingLink}
          </code>
          <button
            type="button"
            onClick={copyMailtoLink}
            disabled={disabled}
            className="shrink-0 rounded border border-border bg-panel px-2 py-1.5 text-caption text-accent hover:bg-border/50 focus:border-accent focus:outline-none disabled:opacity-50"
            title="Copy this link to add the incident-report mailto to your CV manually."
            aria-label="Copy resulting mailto link"
          >
            {copy.incidentMailtoCopyButton}
          </button>
        </div>
      </fieldset>

      <div
        className="mt-4 pt-4 border-t border-border"
        role="region"
        aria-labelledby="incident-mailto-check-validate-title"
      >
        <h4
          id="incident-mailto-check-validate-title"
          className="text-caption sm:text-xs uppercase tracking-wider text-foreground/80 mb-2"
        >
          How to check &amp; validate
        </h4>
        {manualCheckAndValidation ? (
          <CheckAndValidateBlock
            content={manualCheckAndValidation}
            fallback={
              <p className="text-caption sm:text-xs text-foreground/50 italic">
                Instructions not available. Ensure the app can reach /api/eggs.
              </p>
            }
          />
        ) : (
          <p className="text-caption sm:text-xs text-foreground/50 italic">
            Instructions not available. Ensure the app can reach /api/eggs.
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
};
