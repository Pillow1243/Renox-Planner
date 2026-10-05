'use client';

/** کارت آماری: عدد درشت، آیکون رنگی، تغییر روزانه و اسپارک‌لاین */
import * as React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/icon';
import { Sparkline, type SeriesPoint } from '@/components/ui/charts';
import { cn, formatNumber, toPersianDigits } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  icon: string;
  color?: string;
  /** تغییر نسبت به دوره قبل (درصد) */
  delta?: number;
  spark?: SeriesPoint[];
  sparkKey?: string;
  hint?: string;
  onClick?: () => void;
  index?: number;
}

export function StatCard({
  label,
  value,
  unit,
  icon,
  color = 'rgb(var(--accent))',
  delta,
  spark,
  sparkKey = 'value',
  hint,
  onClick,
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={cn('card p-4', onClick && 'card-hover cursor-pointer')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ backgroundColor: `${color}1F`, color }}
          >
            <Icon name={icon} size={17} />
          </span>
          <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</span>
        </div>
        {typeof delta === 'number' && (
          <span
            className={cn(
              'chip !px-2 !py-0.5 text-[10px]',
              delta >= 0
                ? 'bg-[rgb(var(--success)/0.14)] text-[rgb(var(--success))]'
                : 'bg-[rgb(var(--danger)/0.14)] text-[rgb(var(--danger))]'
            )}
          >
            <Icon name={delta >= 0 ? 'ArrowUpRight' : 'ArrowDownRight'} size={11} />
            {toPersianDigits(Math.abs(delta).toFixed(0))}٪
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="num text-[26px] font-extrabold leading-none">
            {typeof value === 'number' ? formatNumber(value) : value}
          </span>
          {unit && <span className="text-xs text-[rgb(var(--text-subtle))]">{unit}</span>}
        </div>
        {spark && spark.length > 1 && (
          <div className="w-20">
            <Sparkline data={spark} dataKey={sparkKey} color={color} height={34} />
          </div>
        )}
      </div>

      {hint && <p className="mt-2 text-[11px] text-[rgb(var(--text-subtle))]">{hint}</p>}
    </motion.div>
  );
}

export default StatCard;
