'use client';

/**
 * اجزای پایه رابط کاربری (Design System)
 * همه اجزا با ARIA و پشتیبانی کامل کیبورد نوشته شده‌اند.
 */
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, toPersianDigits } from '@/lib/utils';
import { Icon } from './icon';

/* -------------------------------- دکمه‌ها -------------------------------- */
type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'soft';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  soft: 'bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))] hover:brightness-[0.99]',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
  icon: 'h-10 w-10 rounded-xl p-0',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', icon, loading, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn('btn', variantClass[variant], sizeClass[size], className)}
      {...props}
    >
      {loading ? (
        <Icon name="Loader2" size={16} className="animate-spin" />
      ) : (
        icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />
      )}
      {children}
    </button>
  );
});

/* --------------------------------- کارت ---------------------------------- */
export function Card({
  className,
  interactive,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div className={cn('card', interactive && 'card-hover cursor-pointer', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
            <Icon name={icon} size={18} />
          </span>
        )}
        <div className="space-y-0.5">
          <h3 className="text-[15px] font-bold leading-6">{title}</h3>
          {subtitle && <p className="text-xs leading-5 text-[rgb(var(--text-subtle))]">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* -------------------------------- ورودی‌ها ------------------------------- */
export const Field = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Field({ className, ...props }, ref) {
    return <input ref={ref} className={cn('field', className)} {...props} />;
  }
);

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn('field resize-y leading-7', className)} {...props} />;
  }
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn('field appearance-none bg-[rgb(var(--surface))] pl-9', className)} {...props}>
        {children}
      </select>
    );
  }
);

/** برچسب فرم */
export function Label({ children, hint, className }: { children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn('mb-1.5 block text-xs font-semibold text-[rgb(var(--text-muted))]', className)}>
      {children}
      {hint && <span className="mr-1 font-normal text-[rgb(var(--text-subtle))]">— {hint}</span>}
    </label>
  );
}

/* -------------------------------- نشان‌ها --------------------------------- */
export function Badge({
  children,
  color,
  className,
  dot,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn('chip bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]', className)}
      style={color ? { backgroundColor: `${color}1F`, color } : undefined}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color ?? 'currentColor' }} />}
      {children}
    </span>
  );
}

/* ------------------------------- نوار پیشرفت ----------------------------- */
export function Progress({
  value,
  color,
  className,
  height = 8,
  showLabel,
}: {
  value: number;
  color?: string;
  className?: string;
  height?: number;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative w-full overflow-hidden rounded-full bg-[rgb(var(--text)/0.09)]" style={{ height }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color ?? 'rgb(var(--accent))' }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {showLabel && <span className="num shrink-0 text-xs font-semibold text-[rgb(var(--text-muted))]">{toPersianDigits(Math.round(clamped))}٪</span>}
    </div>
  );
}

/* -------------------------------- سوییچ ---------------------------------- */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50',
        checked ? 'bg-[rgb(var(--accent))]' : 'bg-[rgb(var(--text)/0.18)]'
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm',
          checked ? 'right-0.5' : 'right-[22px]'
        )}
      />
    </button>
  );
}

/* --------------------------------- تب‌ها --------------------------------- */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: {
  options: { value: T; label: string; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-1',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors duration-200',
              size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
              active ? 'text-[rgb(var(--text))]' : 'text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--text-muted))]'
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${options.map((o) => o.value).join('-')}`}
                className="absolute inset-0 rounded-lg bg-[rgb(var(--surface))] shadow-soft"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {opt.icon && <Icon name={opt.icon} size={14} />}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ حالت خالی -------------------------------- */
export function EmptyState({
  icon = 'Sparkles',
  title,
  description,
  action,
  className,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 px-6 py-14 text-center', className)}>
      <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-[rgb(var(--accent-soft))]">
        <span className="absolute inset-0 animate-pulse-ring rounded-3xl bg-[rgb(var(--accent)/0.18)]" />
        <Icon name={icon} size={34} className="text-[rgb(var(--accent))]" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-bold">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-xs leading-6 text-[rgb(var(--text-subtle))]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------- اسکلتون -------------------------------- */
export function Skeleton({ className, count = 1 }: { className?: string; count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('skeleton h-4 w-full', className)} />
      ))}
    </>
  );
}

export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('card space-y-3 p-5', className)}>
      <div className="skeleton h-5 w-1/3" />
      <Skeleton count={lines} className="h-3.5" />
      <div className="skeleton h-3.5 w-2/3" />
    </div>
  );
}

/* --------------------------------- آواتار -------------------------------- */
export function Avatar({ name, size = 40, color }: { name: string; size?: number; color?: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color ?? 'rgb(var(--accent))', fontSize: size / 2.6 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/* --------------------------------- تولتیپ -------------------------------- */
export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="pointer-events-none absolute -top-9 right-1/2 z-50 translate-x-1/2 whitespace-nowrap rounded-lg bg-[rgb(var(--text))] px-2.5 py-1.5 text-[11px] font-medium text-[rgb(var(--bg))] shadow-lifted"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* --------------------------- حلقه پیشرفت (Donut) -------------------------- */
export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  color,
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="timer-ring -rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--text) / 0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color ?? 'rgb(var(--accent))'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          {children ?? <span className="num text-2xl font-extrabold">{toPersianDigits(Math.round(clamped))}٪</span>}
          {label && <div className="mt-0.5 text-[11px] text-[rgb(var(--text-subtle))]">{label}</div>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ انتخاب رنگ ------------------------------- */
export function ColorPicker({
  value,
  onChange,
  colors,
}: {
  value: string;
  onChange: (c: string) => void;
  colors: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`رنگ ${c}`}
          onClick={() => onChange(c)}
          className={cn(
            'h-8 w-8 rounded-full border-2 transition-transform duration-200 hover:scale-110',
            value === c ? 'border-[rgb(var(--text))]' : 'border-transparent'
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

/* ------------------------------- انتخاب آیکون ----------------------------- */
export function IconPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (icon: string) => void;
  options: string[];
}) {
  return (
    <div className="grid max-h-40 grid-cols-8 gap-1.5 overflow-y-auto rounded-xl border border-[rgb(var(--border))] p-2">
      {options.map((name) => (
        <button
          key={name}
          type="button"
          aria-label={name}
          onClick={() => onChange(name)}
          className={cn(
            'grid h-9 w-9 place-items-center rounded-lg transition-colors',
            value === name
              ? 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]'
              : 'text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--text)/0.06)]'
          )}
        >
          <Icon name={name} size={17} />
        </button>
      ))}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-[rgb(var(--border))]', className)} />;
}

export function StatDelta({ value, suffix = '٪' }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        'chip gap-1',
        positive ? 'bg-[rgb(var(--success)/0.14)] text-[rgb(var(--success))]' : 'bg-[rgb(var(--danger)/0.14)] text-[rgb(var(--danger))]'
      )}
    >
      <Icon name={positive ? 'TrendingUp' : 'TrendingDown'} size={13} />
      <span className="num">
        {toPersianDigits(Math.abs(value).toFixed(1))}
        {suffix}
      </span>
    </span>
  );
}
