'use client';

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { ReportCharts } from '@/lib/report';

const AXIS = 'var(--color-faint)';
const ACCENT = 'var(--color-accent)';
const CRITICAL = 'var(--color-critical)';
const WARNING = 'var(--color-warning)';
const POSITIVE = 'var(--color-positive)';

function Frame({ title, height, children }: { title: string; height: number; children: React.ReactElement }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-wider text-faint">{title}</p>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

const tl = (v: number, frac = 0): string =>
  v.toLocaleString('tr-TR', { minimumFractionDigits: frac, maximumFractionDigits: frac });

type BarLabelProps = {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: unknown;
};

/**
 * Plain-SVG bar-end label. Unlike recharts' default label it never word-wraps
 * (so "580.818 ₺" or "-66,5%" stay on one line) and it flips to the correct
 * side for negative bars, so the value never lands on top of the category axis.
 */
function barLabel(props: BarLabelProps, format: (v: number) => string): React.ReactElement {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  const value = Number(props.value ?? 0);
  const negative = value < 0;
  const pad = 5;
  // recharts places negative bars with x at the zero baseline and a NEGATIVE
  // width, so the bar's outer end is `x + width` for either sign.
  const end = x + width;
  return (
    <text
      x={negative ? end - pad : end + pad}
      y={y + height / 2}
      dy="0.32em"
      textAnchor={negative ? 'end' : 'start'}
      fill={AXIS}
      fontSize={11}
    >
      {format(value)}
    </text>
  );
}

/** Symmetric, padded x-domain so diverging bars leave room for their end labels. */
function signedDomain(values: number[]): [number, number] {
  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
  const p = maxAbs * 1.5;
  return [-p, p];
}

/** Right-padded x-domain (0→max) so bars don't touch the edge and labels fit. */
const paddedMax = (m: number): number => m * 1.22;

export function ParetoChart({ data }: { data: NonNullable<ReportCharts['pareto']> }) {
  return (
    <Frame title="En çok ciro yapan SKU’lar" height={Math.max(140, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, paddedMax]} hide />
        <YAxis type="category" dataKey="label" width={110} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Bar dataKey="value" fill={ACCENT} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          <LabelList dataKey="value" content={(p) => barLabel(p, (v) => `${tl(v)} ₺`)} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

export function CategoryTrendChart({ data }: { data: NonNullable<ReportCharts['categoryTrend']> }) {
  const rows = [...data].sort((a, b) => a.changePct - b.changePct);
  return (
    <Frame title="Kategori ciro değişimi (ilk → son ay)" height={Math.max(140, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={signedDomain(rows.map((r) => r.changePct))} hide />
        <YAxis type="category" dataKey="category" width={90} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Bar dataKey="changePct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.category} fill={r.changePct < 0 ? CRITICAL : POSITIVE} />
          ))}
          <LabelList dataKey="changePct" content={(p) => barLabel(p, (v) => `${v > 0 ? '+' : ''}${tl(v, 1)}%`)} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

const QUAD_COLOR: Record<string, string> = { star: POSITIVE, plowhorse: WARNING, puzzle: 'var(--color-opportunity)', dog: CRITICAL };

export function MenuMatrixChart({ data }: { data: NonNullable<ReportCharts['menuMatrix']> }) {
  return (
    <Frame title="Menü Mühendisliği — popülerlik × katkı payı" height={300}>
      <ScatterChart margin={{ left: 4, right: 12, top: 8, bottom: 20 }}>
        <XAxis type="number" dataKey="popularityPct" name="Popülerlik" unit="%" tick={{ fill: AXIS, fontSize: 11 }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
        <YAxis type="number" dataKey="cmPerUnit" name="Katkı/adet" unit="₺" tick={{ fill: AXIS, fontSize: 11 }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
        <ZAxis range={[80, 80]} />
        <Scatter data={data} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.item} fill={QUAD_COLOR[d.quadrant] ?? ACCENT} />
          ))}
          <LabelList dataKey="item" position="top" fill={AXIS} fontSize={10} />
        </Scatter>
      </ScatterChart>
    </Frame>
  );
}

export function DaypartMarginChart({ data }: { data: NonNullable<ReportCharts['daypartMargin']> }) {
  return (
    <Frame title="Öğün bazlı food cost %" height={Math.max(140, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, paddedMax]} hide />
        <YAxis type="category" dataKey="daypart" width={70} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Bar dataKey="foodCostPct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.daypart} fill={(d.foodCostPct ?? 0) > 40 ? CRITICAL : (d.foodCostPct ?? 0) > 32 ? WARNING : POSITIVE} />
          ))}
          <LabelList dataKey="foodCostPct" content={(p) => barLabel(p, (v) => `%${tl(v, 1)}`)} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

export function RealReturnChart({ data }: { data: NonNullable<ReportCharts['realReturn']> }) {
  return (
    <Frame title="TÜFE-reel büyüme (yıllık)" height={170}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={signedDomain(data.map((d) => d.value))} hide />
        <YAxis type="category" dataKey="label" width={80} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.value < 0 ? CRITICAL : d.label.toLowerCase().includes('tüfe') ? WARNING : ACCENT} />
          ))}
          <LabelList dataKey="value" content={(p) => barLabel(p, (v) => `%${tl(v, 1)}`)} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

export function CccTrendChart({ data }: { data: NonNullable<ReportCharts['cccTrend']> }) {
  return (
    <Frame title="Nakit dönüşüm süresi (gün)" height={200}>
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
        <XAxis dataKey="period" tick={{ fill: AXIS, fontSize: 10 }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
        <Line type="monotone" dataKey="ccc" stroke={CRITICAL} strokeWidth={2} dot={{ r: 3, fill: CRITICAL }} isAnimationActive={false} />
      </LineChart>
    </Frame>
  );
}

export function OeeDecompositionChart({ data }: { data: NonNullable<ReportCharts['oeeDecomposition']> }) {
  return (
    <Frame title="OEE ayrıştırması (A × P × Q)" height={190}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, 122]} hide />
        <YAxis type="category" dataKey="label" width={110} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.label.toLowerCase().includes('oee') ? ACCENT : d.value < 80 ? CRITICAL : POSITIVE} />
          ))}
          <LabelList dataKey="value" content={(p) => barLabel(p, (v) => `%${tl(v, 1)}`)} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

export function MachineOeeChart({ data }: { data: NonNullable<ReportCharts['machineOee']> }) {
  const rows = [...data].sort((a, b) => a.oee - b.oee);
  return (
    <Frame title="Makine bazlı OEE %" height={Math.max(140, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, 122]} hide />
        <YAxis type="category" dataKey="machine" width={60} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Bar dataKey="oee" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {rows.map((d) => (
            <Cell key={d.machine} fill={d.oee < 60 ? CRITICAL : d.oee < 75 ? WARNING : POSITIVE} />
          ))}
          <LabelList dataKey="oee" content={(p) => barLabel(p, (v) => `%${tl(v, 1)}`)} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

export function DowntimeParetoChart({ data }: { data: NonNullable<ReportCharts['downtimePareto']> }) {
  const rows = data.slice(0, 6);
  return (
    <Frame title="Duruş Pareto (dakika)" height={Math.max(140, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, paddedMax]} hide />
        <YAxis type="category" dataKey="reason" width={120} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Bar dataKey="downtimeMin" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {rows.map((d, i) => (
            <Cell key={d.reason} fill={i === 0 ? CRITICAL : ACCENT} />
          ))}
          <LabelList dataKey="downtimeMin" content={(p) => barLabel(p, (v) => `${tl(v)} dk`)} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

export function MrrTrendChart({ data }: { data: NonNullable<ReportCharts['mrrTrend']> }) {
  return (
    <Frame title="MRR trendi" height={200}>
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
        <XAxis dataKey="month" tick={{ fill: AXIS, fontSize: 9 }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} interval={2} />
        <YAxis tick={{ fill: AXIS, fontSize: 10 }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => tl(Number(v))} />
        <Line type="monotone" dataKey="mrr" stroke={ACCENT} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </Frame>
  );
}

export function MrrMovementChart({ data }: { data: NonNullable<ReportCharts['mrrMovement']> }) {
  return (
    <Frame title="MRR hareketi (son ay)" height={190}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={signedDomain(data.map((d) => d.value))} hide />
        <YAxis type="category" dataKey="label" width={90} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.value < 0 ? CRITICAL : POSITIVE} />
          ))}
          <LabelList dataKey="value" content={(p) => barLabel(p, (v) => tl(v))} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

const COHORT_COLORS = [ACCENT, 'var(--color-opportunity)', WARNING];

export function CohortRetentionChart({ data }: { data: NonNullable<ReportCharts['cohortRetention']> }) {
  const cohorts = data.slice(0, 3);
  const maxLen = Math.max(...cohorts.map((c) => c.retentionPct.length), 0);
  const rows = Array.from({ length: maxLen }, (_, k) => {
    const point: Record<string, number> = { k };
    cohorts.forEach((c, i) => {
      if (c.retentionPct[k] !== undefined) point[`c${i}`] = c.retentionPct[k]!;
    });
    return point;
  });
  return (
    <Frame title="Kohort retention (ilk 3 kohort, %)" height={220}>
      <LineChart data={rows} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
        <XAxis dataKey="k" tick={{ fill: AXIS, fontSize: 10 }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} label={{ value: 'ay', position: 'insideBottom', offset: -2, fill: AXIS, fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fill: AXIS, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
        {cohorts.map((c, i) => (
          <Line key={c.cohort} type="monotone" dataKey={`c${i}`} name={c.cohort} stroke={COHORT_COLORS[i]} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        ))}
      </LineChart>
    </Frame>
  );
}

export function ReturnBySkuChart({ data }: { data: NonNullable<ReportCharts['returnBySku']> }) {
  const rows = data.slice(0, 6);
  return (
    <Frame title="SKU bazlı iade oranı" height={Math.max(140, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, paddedMax]} hide />
        <YAxis type="category" dataKey="sku" width={80} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Bar dataKey="returnRatePct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.sku} fill={r.returnRatePct >= 20 ? CRITICAL : r.returnRatePct >= 12 ? WARNING : ACCENT} />
          ))}
          <LabelList dataKey="returnRatePct" content={(p) => barLabel(p, (v) => `%${tl(v, 1)}`)} />
        </Bar>
      </BarChart>
    </Frame>
  );
}
