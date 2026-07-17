import { Decimal, type KpiDefinition, type KpiResult, type SourceRef } from '@mercek/sdk';
import type { SaasCanonical } from './canonical';
import { currentMrr, latestMovement, months, mrrByCustomer, type Movement } from './saas';

const D = (n: number): Decimal => new Decimal(n);
const ok = (id: string, v: number, ref: SourceRef): KpiResult => ({ kpiId: id, status: 'ok', value: D(v), evidence: [ref] });
const na = (id: string, reason: string): KpiResult => ({ kpiId: id, status: 'unavailable', unavailableReason: reason, evidence: [] });

function moveKpi(
  id: string,
  label: { tr: string; en: string },
  unit: KpiDefinition<SaasCanonical>['unit'],
  formula: { tr: string; en: string },
  direction: KpiDefinition<SaasCanonical>['direction'],
  interpretation: { tr: string; en: string },
  calc: (m: Movement) => number | null,
  benchmarkKey?: string,
): KpiDefinition<SaasCanonical> {
  return {
    id, label, unit, formula, requiredFields: ['mrr', 'customerId', 'month'], direction, benchmarkKey, interpretation,
    compute: (d) => {
      const m = latestMovement(d.rows);
      if (!m) return na(id, 'En az 2 ay veri gerekli.');
      const v = calc(m);
      return v !== null && Number.isFinite(v) ? ok(id, v, d.sourceRef) : na(id, 'Hesaplanamadı.');
    },
  };
}

export function saasKpis(): KpiDefinition<SaasCanonical>[] {
  return [
    {
      id: 'mrr', label: { tr: 'MRR', en: 'MRR' }, unit: 'currency',
      formula: { tr: 'Σ aktif MRR (son ay)', en: 'Σ active MRR' }, requiredFields: ['mrr'], direction: 'higher-better',
      interpretation: { tr: 'Aylık tekrarlayan gelir.', en: 'Monthly recurring revenue.' },
      compute: (d) => ok('mrr', currentMrr(d), d.sourceRef),
    },
    {
      id: 'arr', label: { tr: 'ARR', en: 'ARR' }, unit: 'currency',
      formula: { tr: 'MRR × 12', en: 'MRR × 12' }, requiredFields: ['mrr'], direction: 'higher-better',
      interpretation: { tr: 'Yıllık tekrarlayan gelir.', en: 'Annual recurring revenue.' },
      compute: (d) => ok('arr', currentMrr(d) * 12, d.sourceRef),
    },
    {
      id: 'active_customers', label: { tr: 'Aktif Müşteri', en: 'Active Customers' }, unit: 'count',
      formula: { tr: 'son aydaki aktif müşteri sayısı', en: 'active customers, latest month' }, requiredFields: ['customerId'], direction: 'higher-better',
      interpretation: { tr: 'Ödeme yapan müşteri adedi.', en: 'Paying customers.' },
      compute: (d) => {
        const ms = months(d.rows);
        if (ms.length === 0) return na('active_customers', 'Ay verisi yok.');
        return ok('active_customers', mrrByCustomer(d.rows, ms[ms.length - 1]!).size, d.sourceRef);
      },
    },
    {
      id: 'arpa', label: { tr: 'ARPA', en: 'ARPA' }, unit: 'currency',
      formula: { tr: 'MRR ÷ aktif müşteri', en: 'MRR ÷ active customers' }, requiredFields: ['mrr', 'customerId'], direction: 'higher-better',
      interpretation: { tr: 'Müşteri başına ortalama gelir.', en: 'Average revenue per account.' },
      compute: (d) => {
        const ms = months(d.rows);
        const n = ms.length ? mrrByCustomer(d.rows, ms[ms.length - 1]!).size : 0;
        return n === 0 ? na('arpa', 'Aktif müşteri yok.') : ok('arpa', currentMrr(d) / n, d.sourceRef);
      },
    },
    moveKpi('nrr', { tr: 'Net Gelir Tutundurma (NRR) %', en: 'NRR %' }, 'percent',
      { tr: '(başlangıç + genişleme − daralma − churn) ÷ başlangıç × 100', en: '(start + exp − contr − churn) ÷ start × 100' },
      'higher-better', { tr: '100 üstü sağlıklı büyüme; altı sızdıran kova.', en: '>100 healthy; <100 leaky.' },
      (m) => (m.startMrr === 0 ? null : ((m.startMrr + m.expansion - m.contraction - m.churn) / m.startMrr) * 100), 'nrr'),
    moveKpi('grr', { tr: 'Brüt Gelir Tutundurma (GRR) %', en: 'GRR %' }, 'percent',
      { tr: '(başlangıç − daralma − churn) ÷ başlangıç × 100', en: '(start − contr − churn) ÷ start × 100' },
      'higher-better', { tr: 'Genişleme hariç tutundurma.', en: 'Retention ex-expansion.' },
      (m) => (m.startMrr === 0 ? null : ((m.startMrr - m.contraction - m.churn) / m.startMrr) * 100)),
    moveKpi('quick_ratio', { tr: 'Quick Ratio', en: 'Quick Ratio' }, 'ratio',
      { tr: '(yeni + genişleme) ÷ (daralma + churn)', en: '(new + expansion) ÷ (contraction + churn)' },
      'higher-better', { tr: 'Sağlıklı SaaS ~4. ~1 civarı sızdıran kova: her yeni dolar bir kayıpla götürülüyor.', en: 'Healthy ~4; ~1 = leaky bucket.' },
      (m) => (m.contraction + m.churn === 0 ? null : (m.newMrr + m.expansion) / (m.contraction + m.churn))),
    moveKpi('logo_churn', { tr: 'Logo Churn %', en: 'Logo Churn %' }, 'percent',
      { tr: 'ayrılan müşteri ÷ başlangıç müşteri × 100', en: 'churned ÷ start customers × 100' },
      'lower-better', { tr: 'Müşteri (adet) kaybı oranı.', en: 'Customer count churn.' },
      (m) => (m.startCustomers === 0 ? null : (m.churnedCustomers / m.startCustomers) * 100)),
    moveKpi('revenue_churn', { tr: 'Gelir Churn %', en: 'Revenue Churn %' }, 'percent',
      { tr: 'churn MRR ÷ başlangıç MRR × 100', en: 'churned MRR ÷ start MRR × 100' },
      'lower-better', { tr: 'Gelir (değer) kaybı oranı.', en: 'Revenue churn.' },
      (m) => (m.startMrr === 0 ? null : (m.churn / m.startMrr) * 100)),
    moveKpi('mrr_growth', { tr: 'MRR Büyüme %', en: 'MRR Growth %' }, 'percent',
      { tr: '(son − önceki) ÷ önceki × 100', en: '(end − start) ÷ start × 100' },
      'higher-better', { tr: 'Aylık MRR değişimi (net, brüt değil).', en: 'Net monthly MRR change.' },
      (m) => (m.startMrr === 0 ? null : ((m.endMrr - m.startMrr) / m.startMrr) * 100)),
    moveKpi('net_new_mrr', { tr: 'Net Yeni MRR', en: 'Net New MRR' }, 'currency',
      { tr: 'yeni + genişleme − daralma − churn', en: 'new + expansion − contraction − churn' },
      'higher-better', { tr: 'Ayın net MRR hareketi.', en: 'Net MRR movement.' },
      (m) => m.newMrr + m.expansion - m.contraction - m.churn),
  ];
}
