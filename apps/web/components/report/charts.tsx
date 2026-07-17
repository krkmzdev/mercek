'use client';

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';
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

export function ParetoChart({ data }: { data: NonNullable<ReportCharts['pareto']> }) {
  return (
    <Frame title="En çok ciro yapan SKU’lar" height={Math.max(140, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={110} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Bar dataKey="value" fill={ACCENT} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          <LabelList dataKey="value" position="right" formatter={(v) => `${tl(Number(v))} ₺`} fill={AXIS} fontSize={11} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

export function CategoryTrendChart({ data }: { data: NonNullable<ReportCharts['categoryTrend']> }) {
  const rows = [...data].sort((a, b) => a.changePct - b.changePct);
  return (
    <Frame title="Kategori ciro değişimi (ilk → son ay)" height={Math.max(140, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 56, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="category" width={90} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Bar dataKey="changePct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.category} fill={r.changePct < 0 ? CRITICAL : POSITIVE} />
          ))}
          <LabelList dataKey="changePct" position="right" formatter={(v) => `${Number(v) > 0 ? '+' : ''}${tl(Number(v), 1)}%`} fill={AXIS} fontSize={11} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

export function ReturnBySkuChart({ data }: { data: NonNullable<ReportCharts['returnBySku']> }) {
  const rows = data.slice(0, 6);
  return (
    <Frame title="SKU bazlı iade oranı" height={Math.max(140, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="sku" width={80} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Bar dataKey="returnRatePct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.sku} fill={r.returnRatePct >= 20 ? CRITICAL : r.returnRatePct >= 12 ? WARNING : ACCENT} />
          ))}
          <LabelList dataKey="returnRatePct" position="right" formatter={(v) => `%${tl(Number(v), 1)}`} fill={AXIS} fontSize={11} />
        </Bar>
      </BarChart>
    </Frame>
  );
}
