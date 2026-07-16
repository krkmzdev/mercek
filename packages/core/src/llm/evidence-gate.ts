import type { Finding, Insight, KpiResult } from '@mercek/sdk';

/**
 * Evidence-validation gate (spec §8.4). Post-process every Insight: a finding
 * whose evidence references a KPI that is not in the computed `ok` set is a
 * hallucination and gets flagged (not silently shipped). The flag rate is a
 * quality metric worth logging.
 */
export interface EvidenceFlag {
  findingTitle: string;
  reason: string;
}

export interface EvidenceReport {
  flags: EvidenceFlag[];
  totalFindings: number;
  /** flags ÷ findings, in [0,1]. */
  flagRate: number;
}

function findingFlaws(finding: Finding, okKpiIds: Set<string>): string | null {
  if (finding.evidence.length === 0) return 'no evidence';
  for (const ev of finding.evidence) {
    if (ev.kpiId !== null && !okKpiIds.has(ev.kpiId)) {
      return `evidence cites unknown/unavailable KPI "${ev.kpiId}"`;
    }
    if (ev.kpiId === null && ev.sourceRef === null) {
      return 'evidence has neither a KPI nor a source reference';
    }
  }
  return null;
}

export function validateInsightEvidence(insight: Insight, kpis: KpiResult[]): EvidenceReport {
  const okKpiIds = new Set(kpis.filter((k) => k.status === 'ok').map((k) => k.kpiId));
  const flags: EvidenceFlag[] = [];

  for (const finding of insight.findings) {
    const flaw = findingFlaws(finding, okKpiIds);
    if (flaw) flags.push({ findingTitle: finding.title, reason: flaw });
  }

  const totalFindings = insight.findings.length;
  return {
    flags,
    totalFindings,
    flagRate: totalFindings === 0 ? 0 : flags.length / totalFindings,
  };
}
