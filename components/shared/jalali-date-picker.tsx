'use client';

/**
 * انتخاب‌گر تاریخ شمسی
 * یک تقویم جلالی سبک با ناوبری ماه/سال، نمایش تعطیلات و میان‌بر «امروز/فردا».
 * مقدار خروجی به صورت Date (یا رشته ISO) برگردانده می‌شود تا در پایگاه داده
 * میلادی ذخیره شود و فقط نمایش شمسی باشد.
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  buildMonthGrid,
  JALALI_MONTHS,
  jalaliMonthLength,
  monthTitle,
  toGregorian,
  toJalali,
  formatJalali,
  weekdayName,
  WEEKDAYS_SHORT,
  addDays,
} from '@/lib/jalali';
import { cn, toPersianDigits, toLatinDigits } from '@/lib/utils';
import { getIranHolidaysForMonth } from '@/lib/external-apis';
import { Icon } from '@/components/ui/icon';
import { useClickOutside } from '@/hooks/use-planner';

export interface JalaliDatePickerProps {
  value?: string | Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  /** نمایش دکمه پاک کردن */
  clearable?: boolean;
}

export function JalaliDatePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  className,
  clearable = true,
}: JalaliDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? new Date(value) : null;
  const [view, setView] = React.useState(() => {
    const j = toJalali(selected ?? new Date());
    return { jy: j.jy, jm: j.jm };
  });
  const [yearMode, setYearMode] = React.useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  const holidays = React.useMemo(() => getIranHolidaysForMonth(view.jy, view.jm), [view.jy, view.jm]);
  const weeks = React.useMemo(() => buildMonthGrid(view.jy, view.jm, holidays), [view.jy, view.jm, holidays]);

  const shiftMonth = (delta: number) => {
    setView((v) => {
      let jm = v.jm + delta;
      let jy = v.jy;
      while (jm > 12) {
        jm -= 12;
        jy += 1;
      }
      while (jm < 1) {
        jm += 12;
        jy -= 1;
      }
      return { jy, jm };
    });
  };

  const pick = (date: Date) => {
    onChange(date);
    setOpen(false);
  };

  const yearOptions = Array.from({ length: 21 }, (_, i) => toJalali(new Date()).jy - 10 + i);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="field flex items-center justify-between gap-2 text-right"
      >
        <span className={cn('truncate', !selected && 'text-[rgb(var(--text-subtle))]')}>
          {selected ? `${weekdayName(selected)}، ${toPersianDigits(toJalali(selected).jd)} ${JALALI_MONTHS[toJalali(selected).jm - 1]} ${toPersianDigits(toJalali(selected).jy)}` : placeholder}
        </span>
        <span className="flex items-center gap-1">
          {clearable && selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  onChange(null);
                }
              }}
              className="rounded-md p-0.5 text-[rgb(var(--text-subtle))] hover:bg-[rgb(var(--text)/0.08)]"
              aria-label="پاک کردن تاریخ"
            >
              <Icon name="X" size={13} />
            </span>
          )}
          <Icon name="Calendar" size={16} className="text-[rgb(var(--text-subtle))]" />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="glass absolute z-50 mt-2 w-[312px] rounded-2xl p-3 shadow-lifted"
            role="dialog"
          >
            {/* سربرگ ناوبری */}
            <div className="mb-2 flex items-center justify-between">
              <button type="button" className="btn btn-ghost h-8 w-8 p-0" onClick={() => shiftMonth(-1)} aria-label="ماه قبل">
                <Icon name="ChevronRight" size={16} />
              </button>
              <button
                type="button"
                onClick={() => setYearMode((y) => !y)}
                className="rounded-lg px-3 py-1.5 text-sm font-bold hover:bg-[rgb(var(--text)/0.06)]"
              >
                {monthTitle(view.jy, view.jm)}
              </button>
              <button type="button" className="btn btn-ghost h-8 w-8 p-0" onClick={() => shiftMonth(1)} aria-label="ماه بعد">
                <Icon name="ChevronLeft" size={16} />
              </button>
            </div>

            {yearMode ? (
              <div className="grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto p-1">
                {yearOptions.map((jy) => (
                  <button
                    key={jy}
                    type="button"
                    onClick={() => {
                      setView((v) => ({ ...v, jy }));
                      setYearMode(false);
                    }}
                    className={cn(
                      'num rounded-lg py-2 text-sm transition-colors',
                      jy === view.jy
                        ? 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]'
                        : 'hover:bg-[rgb(var(--text)/0.06)]'
                    )}
                  >
                    {toPersianDigits(jy)}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="mb-1 grid grid-cols-7 gap-1">
                  {WEEKDAYS_SHORT.map((d) => (
                    <span key={d} className="py-1 text-center text-[10px] font-bold text-[rgb(var(--text-subtle))]">
                      {d}
                    </span>
                  ))}
                </div>
                <div className="space-y-1">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1">
                      {week.map((cell) => {
                        const isSelected =
                          selected && toJalali(selected).jy === cell.jalali.jy && toJalali(selected).jm === cell.jalali.jm && toJalali(selected).jd === cell.jalali.jd;
                        return (
                          <button
                            key={cell.key}
                            type="button"
                            onClick={() => pick(cell.date)}
                            title={cell.holidayTitle}
                            className={cn(
                              'num relative grid h-9 place-items-center rounded-lg text-[13px] transition-all duration-150',
                              !cell.inMonth && 'text-[rgb(var(--text-subtle))] opacity-45',
                              cell.isHoliday && cell.inMonth && 'text-[rgb(var(--danger))]',
                              isSelected
                                ? 'bg-[rgb(var(--accent))] font-bold text-[rgb(var(--accent-contrast))]'
                                : 'hover:bg-[rgb(var(--text)/0.07)]',
                              cell.isToday && !isSelected && 'ring-1 ring-[rgb(var(--accent))]'
                            )}
                          >
                            {toPersianDigits(cell.jalali.jd)}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* میان‌برها */}
            <div className="mt-2 flex items-center gap-1.5 border-t border-[rgb(var(--border))] pt-2">
              <button type="button" className="btn btn-ghost flex-1 py-1.5 text-xs" onClick={() => pick(new Date())}>
                امروز
              </button>
              <button type="button" className="btn btn-ghost flex-1 py-1.5 text-xs" onClick={() => pick(addDays(new Date(), 1))}>
                فردا
              </button>
              <button
                type="button"
                className="btn btn-ghost flex-1 py-1.5 text-xs"
                onClick={() => pick(addDays(new Date(), 7))}
              >
                هفته بعد
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** ورودی سریع تاریخ شمسی به شکل ۱۴۰۴/۰۷/۱۳ */
export function JalaliTextInput({
  value,
  onChange,
  className,
}: {
  value?: string | null;
  onChange: (v: string | null) => void;
  className?: string;
}) {
  const [text, setText] = React.useState(() => (value ? toPersianDigits(formatJalali(value, 'YYYY/MM/DD', { persian: false })) : ''));

  const commit = (raw: string) => {
    const clean = toLatinDigits(raw).replace(/[^\d/]/g, '');
    const parts = clean.split('/').filter(Boolean).map(Number);
    if (parts.length === 3 && parts[0] > 1200) {
      const [jy, jm, jd] = parts;
      const maxDay = jalaliMonthLength(jy, jm);
      const date = toGregorian(jy, jm, Math.min(jd, maxDay));
      onChange(date.toISOString());
      setText(toPersianDigits(`${jy}/${String(jm).padStart(2, '0')}/${String(Math.min(jd, maxDay)).padStart(2, '0')}`));
    } else if (!clean) {
      onChange(null);
      setText('');
    }
  };

  return (
    <input
      className={cn('field num', className)}
      value={text}
      placeholder="۱۴۰۴/۰۷/۱۳"
      inputMode="numeric"
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
      }}
    />
  );
}
