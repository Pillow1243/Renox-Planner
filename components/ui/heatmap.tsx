'use client';

/**
 * هیتمپ فعالیت (شبیه مشارکت‌های گیت‌هاب اما با هفته ایرانی از شنبه)
 * برای عادت‌ها، تمرکز، نوشتن ژورنال و ... استفاده می‌شود.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatJalali, dayKey, WEEKDAYS_SHORT } from '@/lib/jalali';
import { Tooltip } from './primitives';

export interface HeatDay {
  date: string; // YYYY-MM-DD
  value: number;
  max?: number;
}

export function Heatmap({
  data,
  weeks = 26,
  color = 'rgb(var(--accent))',
  unit = '',
  onDayClick,
  className,
}: {
  data: HeatDay[];
  weeks?: number;
  color?: string;
  unit?: string;
  onDayClick?: (date: string) => void;
  className?: string;
}) {
  const map = React.useMemo(() => new Map(data.map((d) => [d.date, d])), [data]);
  const maxValue = React.useMemo(() => Math.max(1, ...data.map((d) => d.max ?? d.value)), [data]);

  /** ساخت شبکه: ستون‌ها هفته و سطرها روز هفته */
  const columns = React.useMemo(() => {
    const today = new Date();
    // آخرین شنبه
    const offset = (today.getDay() + 1) % 7;
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - offset);
    const start = new Date(startOfThisWeek);
    start.setDate(startOfThisWeek.getDate() - (weeks - 1) * 7);

    const cols: { date: string; value: number; ratio: number }[][] = [];
    for (let w = 0; w < weeks; w += 1) {
      const col: { date: string; value: number; ratio: number }[] = [];
      for (let d = 0; d < 7; d += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key = dayKey(date);
        const value = map.get(key)?.value ?? 0;
        col.push({ date: key, value, ratio: Math.min(1, value / maxValue) });
      }
      cols.push(col);
    }
    return cols;
  }, [map, maxValue, weeks]);

  const levelStyles = (ratio: number) => {
    if (ratio <= 0) return { backgroundColor: 'rgb(var(--text) / 0.07)' };
    const alpha = 0.25 + ratio * 0.75;
    return { backgroundColor: color.replace('rgb(', 'rgb(').replace(')', ` / ${alpha})`) };
  };

  return (
    <div className={cn('flex gap-2', className)}>
      {/* برچسب روزهای هفته */}
      <div className="flex shrink-0 flex-col gap-[3px] pt-0.5 text-[9px] leading-none text-[rgb(var(--text-subtle))]">
        {WEEKDAYS_SHORT.map((d, i) => (
          <span key={d} className="grid h-[13px] items-center">
            {i % 2 === 0 ? d : ''}
          </span>
        ))}
      </div>

      <div className="no-scrollbar flex flex-1 gap-[3px] overflow-x-auto pb-1">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((cell) => (
              <Tooltip
                key={cell.date}
                label={`${formatJalali(cell.date)} — ${cell.value > 0 ? `${cell.value} ${unit}` : 'بدون فعالیت'}`}
              >
                <button
                  type="button"
                  onClick={() => onDayClick?.(cell.date)}
                  aria-label={`${cell.date}: ${cell.value}`}
                  className="h-[13px] w-[13px] rounded-[4px] transition-transform duration-150 hover:scale-125"
                  style={levelStyles(cell.ratio)}
                />
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Heatmap;
