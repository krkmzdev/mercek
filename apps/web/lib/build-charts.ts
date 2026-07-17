import type { EnrichResult } from '@mercek/core';
import { computeSignals as retailSignals } from '@mercek/adapter-retail';
import { computeFnbSignals } from '@mercek/adapter-fnb';
import { computeFinanceSignals } from '@mercek/adapter-finance';
import { computeMfgSignals } from '@mercek/adapter-manufacturing';
import { computeSaasSignals } from '@mercek/adapter-saas';
import type { SectorId } from '@mercek/sdk';
import type { ReportCharts } from './report';

/* eslint-disable @typescript-eslint/no-explicit-any -- pipeline output is erased across sectors */

/** Build the sector-specific report charts from an enriched pipeline result. */
export function buildChartsFor(sector: SectorId, e: EnrichResult<any>): ReportCharts {
  switch (sector) {
    case 'RETAIL': {
      const s = retailSignals(e.data);
      const pareto = e.kpis.find((k) => k.kpiId === 'pareto');
      return {
        pareto: pareto?.breakdown?.map((b) => ({ label: b.label, value: b.value.toNumber() })),
        categoryTrend: s.categoryTrend.map((c) => ({ category: c.category, first: c.firstRev, last: c.lastRev, changePct: c.changePct })),
        returnBySku: s.returnBySku.map((r) => ({ sku: r.sku, returnRatePct: r.returnRatePct, sales: r.sales })),
      };
    }
    case 'FNB': {
      const s = computeFnbSignals(e.data);
      return {
        menuMatrix: s.menu?.items.map((i) => ({ item: i.item, popularityPct: i.popularityPct, cmPerUnit: i.cmPerUnit, quadrant: i.quadrant })),
        daypartMargin: s.daypartMargin.map((d) => ({ daypart: d.daypart, revenuePct: d.revenuePct, foodCostPct: d.foodCostPct })),
      };
    }
    case 'FINANCE': {
      const s = computeFinanceSignals(e.data);
      const rr = s.realReturn;
      return {
        realReturn: rr
          ? [
              { label: 'Nominal', value: rr.nominalGrowthPct },
              { label: 'TÜFE', value: rr.inflationPct },
              { label: 'Reel', value: rr.realGrowthPct },
            ]
          : undefined,
        cccTrend: s.ccc.map((c) => ({ period: c.period, ccc: c.ccc })),
      };
    }
    case 'MANUFACTURING': {
      const s = computeMfgSignals(e.data);
      const pct = (x: number): number => Math.round(x * 1000) / 10;
      return {
        oeeDecomposition: s.overall
          ? [
              { label: 'Kullanılabilirlik', value: pct(s.overall.availability) },
              { label: 'Performans', value: pct(s.overall.performance) },
              { label: 'Kalite', value: pct(s.overall.quality) },
              { label: 'OEE', value: pct(s.overall.oee) },
            ]
          : undefined,
        machineOee: s.byMachine.map((m) => ({ machine: m.machineId, oee: pct(m.oee), availability: pct(m.availability) })),
        downtimePareto: s.downtime.map((d) => ({ reason: d.reason, downtimeMin: d.downtimeMin })),
      };
    }
    case 'SAAS': {
      const s = computeSaasSignals(e.data);
      const m = s.movement;
      return {
        mrrTrend: s.mrrTrend.map((t) => ({ month: t.month, mrr: t.mrr })),
        mrrMovement: m
          ? [
              { label: 'Yeni', value: Math.round(m.newMrr) },
              { label: 'Genişleme', value: Math.round(m.expansion) },
              { label: 'Daralma', value: -Math.round(m.contraction) },
              { label: 'Churn', value: -Math.round(m.churn) },
            ]
          : undefined,
        cohortRetention: s.cohorts.slice(0, 3).map((c) => ({ cohort: c.cohort, retentionPct: c.retentionPct })),
      };
    }
    default:
      return {};
  }
}
