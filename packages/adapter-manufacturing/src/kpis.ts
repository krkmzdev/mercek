import { Decimal, type KpiDefinition, type KpiResult, type SourceRef } from '@mercek/sdk';
import type { MfgCanonical, MfgRow } from './canonical';
import { computeOee, downtimePareto, oeeByMachine } from './oee';

const D = (n: number): Decimal => new Decimal(n);
const sum = (rows: MfgRow[], f: (r: MfgRow) => number): number => rows.reduce((s, r) => s + f(r), 0);
const ok = (id: string, v: number, ref: SourceRef, breakdown?: KpiResult['breakdown']): KpiResult => ({ kpiId: id, status: 'ok', value: D(v), evidence: [ref], breakdown });
const na = (id: string, reason: string): KpiResult => ({ kpiId: id, status: 'unavailable', unavailableReason: reason, evidence: [] });

export function manufacturingKpis(): KpiDefinition<MfgCanonical>[] {
  const oeeKpi = (
    id: string,
    label: { tr: string; en: string },
    formula: { tr: string; en: string },
    pick: (o: NonNullable<ReturnType<typeof computeOee>>) => number,
    direction: KpiDefinition<MfgCanonical>['direction'],
    interpretation: { tr: string; en: string },
    benchmarkKey?: string,
  ): KpiDefinition<MfgCanonical> => ({
    id, label, unit: 'percent', formula, requiredFields: ['runtime', 'plannedTime', 'totalCount', 'goodCount'],
    direction, benchmarkKey, interpretation,
    compute: (d) => {
      const o = computeOee(d.rows);
      return o ? ok(id, pick(o) * 100, d.sourceRef) : na(id, 'Yetersiz üretim verisi.');
    },
  });

  return [
    oeeKpi('oee', { tr: 'OEE', en: 'OEE' }, { tr: 'Kullanılabilirlik × Performans × Kalite', en: 'A × P × Q' },
      (o) => o.oee, 'target-band', { tr: 'Dünya standardı ~85%. Her zaman A×P×Q’ya ayrıştır.', en: 'World-class ~85%.' }, 'oee'),
    oeeKpi('availability', { tr: 'Kullanılabilirlik (A)', en: 'Availability' }, { tr: 'çalışma süresi ÷ planlı süre', en: 'runtime ÷ planned' },
      (o) => o.availability, 'higher-better', { tr: 'Duruşların etkisi; ~90% hedef.', en: 'Impact of downtime.' }),
    oeeKpi('performance', { tr: 'Performans (P)', en: 'Performance' }, { tr: '(ideal çevrim × adet) ÷ çalışma süresi', en: '(ideal × count) ÷ runtime' },
      (o) => o.performance, 'higher-better', { tr: 'Hız kayıpları; ~95% hedef.', en: 'Speed losses.' }),
    oeeKpi('quality', { tr: 'Kalite (Q)', en: 'Quality' }, { tr: 'sağlam adet ÷ toplam adet', en: 'good ÷ total' },
      (o) => o.quality, 'higher-better', { tr: 'Fire/ret kaybı; ~99% hedef.', en: 'Defect losses.' }),

    {
      id: 'first_pass_yield', label: { tr: 'İlk Geçiş Verimi (FPY)', en: 'First Pass Yield' }, unit: 'percent',
      formula: { tr: 'ilk geçiş sağlam ÷ toplam × 100', en: 'first-pass good ÷ total × 100' },
      requiredFields: ['goodCount', 'totalCount'], direction: 'higher-better',
      interpretation: { tr: 'Yeniden işlem olmadan sağlam çıkan oran.', en: 'Right-first-time rate.' },
      compute: (d) => {
        const total = sum(d.rows, (r) => r.totalCount);
        if (total === 0) return na('first_pass_yield', 'Üretim adedi yok.');
        return ok('first_pass_yield', (sum(d.rows, (r) => r.goodCount) / total) * 100, d.sourceRef);
      },
    },
    {
      id: 'scrap_rate', label: { tr: 'Fire (Scrap) Oranı %', en: 'Scrap Rate %' }, unit: 'percent',
      formula: { tr: '(toplam − sağlam) ÷ toplam × 100', en: 'scrap ÷ total × 100' },
      requiredFields: ['goodCount', 'totalCount'], direction: 'lower-better',
      interpretation: { tr: 'Hurdaya ayrılan üretim oranı.', en: 'Scrapped output share.' },
      compute: (d) => {
        const total = sum(d.rows, (r) => r.totalCount);
        if (total === 0) return na('scrap_rate', 'Üretim adedi yok.');
        return ok('scrap_rate', ((total - sum(d.rows, (r) => r.goodCount)) / total) * 100, d.sourceRef);
      },
    },
    {
      id: 'capacity_utilization', label: { tr: 'Kapasite Kullanımı %', en: 'Capacity Utilization %' }, unit: 'percent',
      formula: { tr: 'gerçek üretim ÷ teorik kapasite × 100', en: 'actual ÷ theoretical × 100' },
      requiredFields: ['totalCount', 'plannedTime', 'idealCycleTime'], direction: 'higher-better',
      interpretation: { tr: 'Planlı sürede teorik maksimuma kıyasla üretim.', en: 'Output vs theoretical max.' },
      compute: (d) => {
        const theoretical = sum(d.rows, (r) => (r.idealCycleTime > 0 ? r.plannedTime / r.idealCycleTime : 0));
        if (theoretical === 0) return na('capacity_utilization', 'İdeal çevrim verisi yok.');
        return ok('capacity_utilization', (sum(d.rows, (r) => r.totalCount) / theoretical) * 100, d.sourceRef);
      },
    },
    {
      id: 'mtbf', label: { tr: 'MTBF (saat)', en: 'MTBF (h)' }, unit: 'ratio',
      formula: { tr: 'çalışma süresi ÷ arıza sayısı ÷ 60', en: 'operating time ÷ failures ÷ 60' },
      requiredFields: ['downtimeReason', 'runtime'], direction: 'higher-better',
      interpretation: { tr: 'Arızalar arası ortalama çalışma (saat).', en: 'Mean time between failures.' },
      compute: (d) => {
        const failures = d.rows.filter((r) => r.downtimeReason && r.downtimeReason.trim() !== '').length;
        if (failures === 0) return na('mtbf', 'Duruş/arıza kaydı yok.');
        return ok('mtbf', sum(d.rows, (r) => r.runtime) / failures / 60, d.sourceRef);
      },
    },
    {
      id: 'mttr', label: { tr: 'MTTR (dakika)', en: 'MTTR (min)' }, unit: 'ratio',
      formula: { tr: 'toplam duruş ÷ arıza sayısı', en: 'total downtime ÷ failures' },
      requiredFields: ['downtimeReason', 'plannedTime', 'runtime'], direction: 'lower-better',
      interpretation: { tr: 'Arıza başına ortalama onarım süresi.', en: 'Mean time to repair.' },
      compute: (d) => {
        const failRows = d.rows.filter((r) => r.downtimeReason && r.downtimeReason.trim() !== '');
        if (failRows.length === 0) return na('mttr', 'Duruş/arıza kaydı yok.');
        const downtime = sum(failRows, (r) => Math.max(0, r.plannedTime - r.runtime));
        return ok('mttr', downtime / failRows.length, d.sourceRef);
      },
    },
    {
      id: 'downtime_top_share', label: { tr: 'En Büyük Duruş Nedeni %', en: 'Top Downtime Cause %' }, unit: 'percent',
      formula: { tr: 'en büyük duruş nedeninin toplam duruş içindeki payı', en: 'top reason share of downtime' },
      requiredFields: ['downtimeReason'], direction: 'target-band',
      interpretation: { tr: 'Duruş Pareto’sunun tepesi — önce buna saldır.', en: 'Attack the top Pareto reason first.' },
      compute: (d) => {
        const pareto = downtimePareto(d.rows);
        if (pareto.length === 0) return na('downtime_top_share', 'Duruş verisi yok.');
        const breakdown = pareto.slice(0, 6).map((p) => ({ label: p.reason, value: D(p.downtimeMin) }));
        return ok('downtime_top_share', pareto[0]!.sharePct, d.sourceRef, breakdown);
      },
    },
    {
      id: 'worst_machine_oee', label: { tr: 'En Düşük Makine OEE %', en: 'Worst Machine OEE %' }, unit: 'percent',
      formula: { tr: 'en düşük OEE’ye sahip makinenin OEE’si', en: 'lowest machine OEE' },
      requiredFields: ['machineId'], direction: 'higher-better',
      interpretation: { tr: 'Kompozit OEE’nin gizlediği sorunlu makine.', en: 'The machine the composite hides.' },
      compute: (d) => {
        const machines = oeeByMachine(d.rows);
        if (machines.length === 0) return na('worst_machine_oee', 'Makine verisi yok.');
        const breakdown = machines.map((m) => ({ label: m.machineId, value: D(Math.round(m.oee * 1000) / 10) }));
        return ok('worst_machine_oee', machines[0]!.oee * 100, d.sourceRef, breakdown);
      },
    },
  ];
}
