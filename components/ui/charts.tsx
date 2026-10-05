'use client';

/**
 * نمودارهای برنامه بر پایه Recharts
 * همه نمودارها با رنگ‌های ملایم، تولتیپ فارسی و جهت راست‌به‌چپ تنظیم شده‌اند.
 */
import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '@/lib/constants';
import { formatNumber, toPersianDigits } from '@/lib/utils';

/* ------------------------------ تولتیپ فارسی ------------------------------ */
function PersianTooltip({
  active,
  payload,
  label,
  unit = '',
  labelFormatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; dataKey?: string }[];
  label?: string;
  unit?: string;
  labelFormatter?: (l: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lifted" dir="rtl">
      {label && <p className="mb-1 font-bold">{labelFormatter ? labelFormatter(label) : label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[rgb(var(--text-muted))]">{p.name}</span>
          <span className="num font-bold">{formatNumber(Number(p.value ?? 0), { digits: Number(p.value) % 1 ? 1 : 0 })}</span>
          {unit && <span className="text-[rgb(var(--text-subtle))]">{unit}</span>}
        </div>
      ))}
    </div>
  );
}

export interface SeriesPoint {
  label: string;
  [key: string]: string | number;
}

/* --------------------------------- اسپارک‌لاین ---------------------------- */
export function Sparkline({
  data,
  dataKey = 'value',
  color = 'rgb(var(--accent))',
  height = 44,
}: {
  data: SeriesPoint[];
  dataKey?: string;
  color?: string;
  height?: number;
}) {
  return (
    <div className="chart-ltr w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${dataKey}-${color.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${dataKey}-${color.replace(/\W/g, '')})`}
            isAnimationActive
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------- نمودار خطی ------------------------------ */
export function TrendChart({
  data,
  series,
  height = 260,
  unit,
  labelFormatter,
}: {
  data: SeriesPoint[];
  series: { key: string; name: string; color?: string }[];
  height?: number;
  unit?: string;
  labelFormatter?: (l: string) => string;
}) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="rgb(var(--text) / 0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            reversed
            tick={{ fontSize: 11, fill: 'rgb(var(--text-subtle))' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            orientation="right"
            tick={{ fontSize: 11, fill: 'rgb(var(--text-subtle))' }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => toPersianDigits(String(v))}
          />
          <Tooltip content={<PersianTooltip unit={unit} labelFormatter={labelFormatter} />} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2.4}
              dot={{ r: 3, strokeWidth: 0, fill: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
              activeDot={{ r: 5 }}
              animationDuration={800}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------ نمودار مساحتی ---------------------------- */
export function AreaTrendChart({
  data,
  series,
  height = 240,
  unit,
}: {
  data: SeriesPoint[];
  series: { key: string; name: string; color?: string }[];
  height?: number;
  unit?: string;
}) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            {series.map((s, i) => {
              const color = s.color ?? CHART_COLORS[i % CHART_COLORS.length];
              return (
                <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.34} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="rgb(var(--text) / 0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            reversed
            tick={{ fontSize: 11, fill: 'rgb(var(--text-subtle))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            orientation="right"
            tick={{ fontSize: 11, fill: 'rgb(var(--text-subtle))' }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => toPersianDigits(String(v))}
          />
          <Tooltip content={<PersianTooltip unit={unit} />} />
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2.2}
              fill={`url(#area-${s.key})`}
              animationDuration={800}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------ نمودار ستونی ----------------------------- */
export function BarsChart({
  data,
  dataKey = 'value',
  height = 220,
  color = 'rgb(var(--accent))',
  unit,
  colors,
}: {
  data: SeriesPoint[];
  dataKey?: string;
  height?: number;
  color?: string;
  unit?: string;
  /** رنگ اختصاصی هر ستون */
  colors?: string[];
}) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barCategoryGap="24%">
          <CartesianGrid strokeDasharray="3 6" stroke="rgb(var(--text) / 0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            reversed
            tick={{ fontSize: 11, fill: 'rgb(var(--text-subtle))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            orientation="right"
            tick={{ fontSize: 11, fill: 'rgb(var(--text-subtle))' }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => toPersianDigits(String(v))}
          />
          <Tooltip content={<PersianTooltip unit={unit} />} cursor={{ fill: 'rgb(var(--text) / 0.05)' }} />
          <Bar dataKey={dataKey} radius={[8, 8, 4, 4]} fill={color} animationDuration={800}>
            {colors?.map((c, i) => <Cell key={i} fill={c} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------- دونات ---------------------------------- */
export function DonutChart({
  data,
  height = 220,
  innerRadius = 58,
  outerRadius = 84,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            stroke="none"
            animationDuration={800}
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={d.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<PersianTooltip />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-[rgb(var(--text-muted))]">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
          <div className="num text-xl font-extrabold">{centerValue}</div>
          <div className="text-[11px] text-[rgb(var(--text-subtle))]">{centerLabel}</div>
        </div>
      )}
      {total === 0 && (
        <div className="absolute inset-0 grid place-items-center text-xs text-[rgb(var(--text-subtle))]">
          داده‌ای برای نمایش نیست
        </div>
      )}
    </div>
  );
}

/* ----------------------------- نوار پیشرفت حلقه‌ای ------------------------ */
export function RadialProgress({
  value,
  height = 180,
  color = 'rgb(var(--accent))',
  label,
}: {
  value: number;
  height?: number;
  color?: string;
  label?: string;
}) {
  const data = [{ name: label ?? 'پیشرفت', value: Math.max(0, Math.min(100, value)), fill: color }];
  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart data={data} innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={-270}>
          <RadialBar dataKey="value" cornerRadius={12} background={{ fill: 'rgb(var(--text) / 0.08)' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="num text-2xl font-extrabold">{toPersianDigits(Math.round(value))}٪</div>
          {label && <div className="text-[11px] text-[rgb(var(--text-subtle))]">{label}</div>}
        </div>
      </div>
    </div>
  );
}

/** نمودار مقایسه‌ای درآمد/هزینه */
export function IncomeExpenseChart({ data, height = 260 }: { data: SeriesPoint[]; height?: number }) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barGap={6}>
          <CartesianGrid strokeDasharray="3 6" stroke="rgb(var(--text) / 0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            reversed
            tick={{ fontSize: 11, fill: 'rgb(var(--text-subtle))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            orientation="right"
            tick={{ fontSize: 11, fill: 'rgb(var(--text-subtle))' }}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v) => formatNumber(Number(v) / 1_000_000, { persian: true })}
          />
          <Tooltip content={<PersianTooltip unit="میلیون" labelFormatter={(l) => l} />} cursor={{ fill: 'rgb(var(--text) / 0.05)' }} />
          <Legend
            verticalAlign="top"
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-[rgb(var(--text-muted))]">{value}</span>}
          />
          <Bar dataKey="درآمد" fill={CHART_COLORS[0]} radius={[8, 8, 4, 4]} animationDuration={800} />
          <Bar dataKey="هزینه" fill={CHART_COLORS[1]} radius={[8, 8, 4, 4]} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** نمودار ساعت‌های مطالعه/تمرکز روی روزهای هفته */
export function WeeklyFocusChart({ data, height = 200 }: { data: SeriesPoint[]; height?: number }) {
  return <BarsChart data={data} dataKey="دقیقه" unit="دقیقه" height={height} color={CHART_COLORS[3]} />;
}

export { PersianTooltip };
