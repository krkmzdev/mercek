/**
 * Escalation from `analyze` (Flash) to `analyze-deep` (Pro), spec §9.2. Any one
 * trigger escalates. Every escalation should be logged — "what fraction of runs
 * needed Pro?" is a real engineering finding for the case study.
 */
export interface EscalationSignals {
  /** From `MapResult.confidence`. */
  mapConfidence: number;
  /** How many KPIs came back `unavailable`. */
  unavailableKpiCount: number;
  /** Structured-output validation already failed once on Flash. */
  flashValidationFailed: boolean;
  /** User explicitly asked for deep mode (rate-limited harder). */
  userRequestedDeep: boolean;
}

export interface EscalationDecision {
  escalate: boolean;
  reasons: string[];
}

export const MAP_CONFIDENCE_FLOOR = 0.7;
export const MAX_UNAVAILABLE_KPIS = 3;

export function shouldEscalate(signals: EscalationSignals): EscalationDecision {
  const reasons: string[] = [];
  if (signals.mapConfidence < MAP_CONFIDENCE_FLOOR) {
    reasons.push(`map confidence ${signals.mapConfidence.toFixed(2)} < ${MAP_CONFIDENCE_FLOOR}`);
  }
  if (signals.unavailableKpiCount > MAX_UNAVAILABLE_KPIS) {
    reasons.push(`${signals.unavailableKpiCount} KPIs unavailable (> ${MAX_UNAVAILABLE_KPIS})`);
  }
  if (signals.flashValidationFailed) reasons.push('flash structured-output validation failed');
  if (signals.userRequestedDeep) reasons.push('user requested deep mode');
  return { escalate: reasons.length > 0, reasons };
}
