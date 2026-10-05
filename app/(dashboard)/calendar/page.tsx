'use client';

/**
 * تقویم شمسی
 * نمای ماه / هفته / روز + رویدادها + تسک‌های سررسید + تعطیلات رسمی ایران
 */
import * as React from 'react';
import { motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { useMounted } from '@/hooks/use-planner';
import {
  addDays,
  buildMonthGrid,
  currentWeekRange,
  dayKey,
  formatJalali,
  JALALI_MONTHS,
  startOfDay,
  toGregorian,
  toJalali,
  WEEKDAYS_SHORT,
} from '@/lib/jalali';
import { getIranHolidaysForMonth } from '@/lib/external-apis';
import { EVENT_TYPE_LABEL, PRIORITY_COLOR, PRIORITY_LABEL } from '@/lib/constants';
import { cn, toPersianDigits } from '@/lib/utils';
import type { CalendarEvent } from '@/lib/types';
import { Icon } from '@/components/ui/icon';
import { Badge, Button, Card, EmptyState, SegmentedControl, Skeleton } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { EventDialog } from '@/components/shared/dialogs';
import { useQuickAdd } from '@/components/shared/quick-add-context';

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const events = usePlanner((s) => s.events);
  const tasks = usePlanner((s) => s.tasks);
  const removeEvent = usePlanner((s) => s.removeEvent);
  const mounted = useMounted();
  const toast = useToast();
  const { open: openDialog } = useQuickAdd();

  const [view, setView] = React.useState<ViewMode>('month');
  const [cursor, setCursor] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<string>(dayKey(new Date()));
  const [eventDialog, setEventDialog] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const j = toJalali(cursor);
  const holidays = React.useMemo(() => getIranHolidaysForMonth(j.jy, j.jm), [j.jy, j.jm]);
  const weeks = React.useMemo(() => buildMonthGrid(j.jy, j.jm, holidays), [j.jy, j.jm, holidays]);
  const week = React.useMemo(() => currentWeekRange(cursor), [cursor]);

  /** رویدادها و تسک‌های هر روز */
  const byDay = React.useMemo(() => {
    const map = new Map<string, { events: CalendarEvent[]; tasks: typeof tasks }>();
    events.forEach((e) => {
      const key = dayKey(e.start);
      const entry = map.get(key) ?? { events: [], tasks: [] };
      entry.events.push(e);
      map.set(key, entry);
    });
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const key = dayKey(t.dueDate);
      const entry = map.get(key) ?? { events: [], tasks: [] };
      entry.tasks.push(t);
      map.set(key, entry);
    });
    return map;
  }, [events, tasks]);

  const shift = (delta: number) => {
    if (view === 'month') {
      setCursor((c) => {
        const jj = toJalali(c);
        let jm = jj.jm + delta;
        let jy = jj.jy;
        while (jm > 12) {
          jm -= 12;
          jy += 1;
        }
        while (jm < 1) {
          jm += 12;
          jy -= 1;
        }
        return toGregorian(jy, jm, 1);
      });
    } else if (view === 'week') {
      setCursor((c) => addDays(c, delta * 7));
    } else {
      setCursor((c) => addDays(c, delta));
    }
  };

  const selectedData = byDay.get(selectedDay) ?? { events: [], tasks: [] };

  return (
    <div>
      <PageHeader
        title="تقویم شمسی"
        description="رویدادها، تسک‌ها و تعطیلات ایران در یک نمای زیبا"
        icon="CalendarDays"
        actions={
          <>
            <Button size="sm" variant="outline" icon="CalendarCheck" onClick={() => setCursor(new Date())}>
              امروز
            </Button>
            <Button
              size="sm"
              icon="Plus"
              onClick={() => {
                setEditingEvent(null);
                setEventDialog(true);
              }}
            >
              رویداد جدید
            </Button>
          </>
        }
      />

      {/* نوار ابزار */}
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3.5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon="ChevronRight" onClick={() => shift(-1)} aria-label="قبلی" />
          <h2 className="num min-w-[190px] text-center text-base font-extrabold">
            {view === 'month'
              ? `${JALALI_MONTHS[j.jm - 1]} ${toPersianDigits(j.jy)}`
              : view === 'week'
              ? `${formatJalali(week.start, 'DD MMMM')} تا ${formatJalali(week.end, 'DD MMMM YYYY')}`
              : formatJalali(cursor, 'dddd DD MMMM YYYY')}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => shift(1)} aria-label="بعدی">
            <Icon name="ChevronLeft" size={16} />
          </Button>
        </div>

        <SegmentedControl
          size="sm"
          options={[
            { value: 'month', label: 'ماه', icon: 'Grid2x2' },
            { value: 'week', label: 'هفته', icon: 'Columns3' },
            { value: 'day', label: 'روز', icon: 'Calendar' },
          ]}
          value={view}
          onChange={setView}
        />
      </Card>

      {!mounted ? (
        <Skeleton className="h-[520px]" />
      ) : view === 'month' ? (
        <Card className="p-3.5">
          <div className="grid-calendar mb-1 gap-1">
            {WEEKDAYS_SHORT.map((d, i) => (
              <span key={d} className={cn('py-1.5 text-center text-[11px] font-bold', i === 6 ? 'text-[rgb(var(--danger))]' : 'text-[rgb(var(--text-subtle))]')}>
                {d}
              </span>
            ))}
          </div>
          <div className="space-y-1">
            {weeks.map((w, wi) => (
              <div key={wi} className="grid-calendar gap-1">
                {w.map((cell) => {
                  const data = byDay.get(cell.key) ?? { events: [], tasks: [] };
                  const total = data.events.length + data.tasks.length;
                  const isSelected = selectedDay === cell.key;
                  return (
                    <motion.button
                      key={cell.key}
                      whileHover={{ y: -2 }}
                      onClick={() => {
                        setSelectedDay(cell.key);
                        if (!cell.inMonth) setCursor(cell.date);
                      }}
                      className={cn(
                        'group relative min-h-[104px] rounded-xl border p-2 text-right transition-all duration-200',
                        cell.inMonth ? 'border-[rgb(var(--border))] bg-[rgb(var(--surface))]' : 'border-transparent bg-[rgb(var(--text)/0.03)] opacity-50',
                        cell.isHoliday && cell.inMonth && 'bg-[rgb(var(--danger)/0.04)]',
                        isSelected && 'ring-2 ring-[rgb(var(--accent))]',
                        cell.isToday && !isSelected && 'ring-1 ring-[rgb(var(--accent)/0.5)]'
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <span
                          className={cn(
                            'num grid h-6 min-w-6 place-items-center rounded-lg px-1 text-[11px] font-bold',
                            cell.isToday && 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]',
                            !cell.isToday && cell.isHoliday && 'text-[rgb(var(--danger))]'
                          )}
                        >
                          {toPersianDigits(cell.jalali.jd)}
                        </span>
                        {total > 0 && (
                          <span className="num rounded-full bg-[rgb(var(--text)/0.07)] px-1.5 text-[9px] font-bold">{toPersianDigits(total)}</span>
                        )}
                      </div>

                      {cell.holidayTitle && (
                        <p className="mb-1 truncate text-[9.5px] font-bold text-[rgb(var(--danger))]">{cell.holidayTitle}</p>
                      )}

                      <div className="space-y-1">
                        {data.events.slice(0, 2).map((e) => (
                          <span
                            key={e.id}
                            className="flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ backgroundColor: `${e.color}22`, color: e.color }}
                          >
                            {!e.allDay && <span className="num shrink-0">{toPersianDigits(e.start.slice(11, 16))}</span>}
                            <span className="truncate">{e.title}</span>
                          </span>
                        ))}
                        {data.tasks.slice(0, 2).map((t) => (
                          <span
                            key={t.id}
                            className={cn(
                              'flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px]',
                              t.status === 'done' ? 'bg-[rgb(var(--text)/0.05)] line-through opacity-60' : ''
                            )}
                            style={t.status !== 'done' ? { backgroundColor: `${PRIORITY_COLOR[t.priority]}1A`, color: PRIORITY_COLOR[t.priority] } : undefined}
                          >
                            <Icon name="CheckSquare" size={9} className="shrink-0" />
                            <span className="truncate">{t.title}</span>
                          </span>
                        ))}
                        {total > 4 && <span className="num block text-[9px] text-[rgb(var(--text-subtle))]">+{toPersianDigits(total - 4)} مورد دیگر</span>}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      ) : view === 'week' ? (
        <div className="grid gap-2 md:grid-cols-7">
          {week.days.map((d) => {
            const key = dayKey(d);
            const data = byDay.get(key) ?? { events: [], tasks: [] };
            const isToday = key === dayKey(new Date());
            const isFri = (d.getDay() + 1) % 7 === 6;
            return (
              <Card key={key} className={cn('p-3', isToday && 'ring-2 ring-[rgb(var(--accent)/0.5)]')}>
                <div className="mb-2.5 flex items-center justify-between">
                  <div>
                    <p className={cn('text-[11px] font-bold', isFri && 'text-[rgb(var(--danger))]')}>{formatJalali(d, 'dddd')}</p>
                    <p className="num text-lg font-extrabold">{toPersianDigits(toJalali(d).jd)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDay(key);
                      setCursor(d);
                      setView('day');
                    }}
                    className="rounded-lg p-1 text-[rgb(var(--text-subtle))] hover:bg-[rgb(var(--text)/0.06)]"
                    aria-label="نمای روز"
                  >
                    <Icon name="Maximize2" size={14} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {data.events.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        setEditingEvent(e);
                        setEventDialog(true);
                      }}
                      className="block w-full rounded-lg px-2 py-1.5 text-right text-[11px] font-medium"
                      style={{ backgroundColor: `${e.color}1F`, color: e.color }}
                    >
                      <span className="num block text-[9.5px] opacity-80">
                        {e.allDay ? 'تمام روز' : toPersianDigits(e.start.slice(11, 16))}
                      </span>
                      {e.title}
                    </button>
                  ))}
                  {data.tasks.map((t) => (
                    <span
                      key={t.id}
                      className="flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] px-2 py-1.5 text-[11px]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLOR[t.priority] }} />
                      <span className="truncate">{t.title}</span>
                    </span>
                  ))}
                  {data.events.length + data.tasks.length === 0 && <p className="py-4 text-center text-[10.5px] text-[rgb(var(--text-subtle))]">خالی</p>}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* فهرست روزهای نزدیک */}
          <Card className="p-3.5">
            <p className="mb-2.5 text-xs font-bold text-[rgb(var(--text-muted))]">روزهای این هفته</p>
            <ul className="space-y-1">
              {week.days.map((d) => {
                const key = dayKey(d);
                const active = key === selectedDay;
                const count = (byDay.get(key)?.events.length ?? 0) + (byDay.get(key)?.tasks.length ?? 0);
                return (
                  <li key={key}>
                    <button
                      onClick={() => setSelectedDay(key)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-colors',
                        active ? 'bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]' : 'hover:bg-[rgb(var(--text)/0.05)]'
                      )}
                    >
                      <span className="num grid h-8 w-8 place-items-center rounded-lg bg-[rgb(var(--text)/0.06)] text-xs font-bold">
                        {toPersianDigits(toJalali(d).jd)}
                      </span>
                      <span className="flex-1 text-[13px] font-medium">{formatJalali(d, 'dddd')}</span>
                      {count > 0 && <span className="num chip bg-[rgb(var(--text)/0.06)] !px-2 !py-0.5 text-[10px]">{toPersianDigits(count)}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* جزئیات روز */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold">{formatJalali(selectedDay, 'dddd DD MMMM YYYY')}</h3>
                {holidays[selectedDay] && <p className="text-xs font-bold text-[rgb(var(--danger))]">تعطیل رسمی — {holidays[selectedDay]}</p>}
              </div>
              <Button
                size="sm"
                icon="Plus"
                onClick={() => {
                  setEditingEvent(null);
                  setEventDialog(true);
                }}
              >
                افزودن رویداد
              </Button>
            </div>

            {/* تایم‌لاین ساعتی */}
            <div className="relative space-y-1">
              {Array.from({ length: 18 }, (_, i) => i + 6).map((hour) => {
                const hourEvents = selectedData.events.filter((e) => !e.allDay && new Date(e.start).getHours() === hour);
                const hourTasks = selectedData.tasks.filter((t) => t.dueTime && Number(t.dueTime.split(':')[0]) === hour);
                const isNow = new Date().getHours() === hour && selectedDay === dayKey(new Date());
                return (
                  <div key={hour} className={cn('flex gap-3 rounded-xl px-2 py-1.5', isNow && 'bg-[rgb(var(--accent)/0.07)]')}>
                    <span className="num w-12 shrink-0 pt-1 text-[11px] text-[rgb(var(--text-subtle))]">{toPersianDigits(String(hour).padStart(2, '0'))}:۰۰</span>
                    <div className="flex-1 space-y-1.5 border-r border-dashed border-[rgb(var(--border))] pr-3">
                      {hourEvents.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => {
                            setEditingEvent(e);
                            setEventDialog(true);
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-right"
                          style={{ backgroundColor: `${e.color}1F`, borderRight: `3px solid ${e.color}` }}
                        >
                          <span>
                            <span className="block text-[13px] font-bold" style={{ color: e.color }}>
                              {e.title}
                            </span>
                            {e.location && <span className="block text-[10.5px] text-[rgb(var(--text-subtle))]">{e.location}</span>}
                          </span>
                          <span className="chip !px-2 !py-0.5 text-[10px]" style={{ backgroundColor: `${e.color}22`, color: e.color }}>
                            {EVENT_TYPE_LABEL[e.type]}
                          </span>
                        </button>
                      ))}
                      {hourTasks.map((t) => (
                        <span
                          key={t.id}
                          className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-[12.5px]"
                        >
                          <Icon name="CheckSquare" size={14} className="text-[rgb(var(--text-subtle))]" />
                          <span className={cn('flex-1', t.status === 'done' && 'line-through opacity-60')}>{t.title}</span>
                          <Badge color={PRIORITY_COLOR[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* تمام‌روزها */}
            {selectedData.events.some((e) => e.allDay) && (
              <div className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5">
                <p className="mb-2 text-xs font-bold text-[rgb(var(--text-muted))]">رویدادهای تمام‌روز</p>
                {selectedData.events
                  .filter((e) => e.allDay)
                  .map((e) => (
                    <div key={e.id} className="flex items-center gap-2 py-1 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                      {e.title}
                    </div>
                  ))}
              </div>
            )}

            {selectedData.events.length === 0 && selectedData.tasks.length === 0 && (
              <EmptyState icon="CalendarCheck" title="این روز خالی است" description="می‌توانی یک رویداد یا تسک برای این روز بسازی." />
            )}
          </Card>
        </div>
      )}

      {/* راهنمای تعطیلات ماه */}
      {Object.keys(holidays).length > 0 && (
        <Card className="mt-4 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Icon name="Sparkles" size={16} className="text-[rgb(var(--danger))]" />
            تعطیلات و مناسبت‌های ماه
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(holidays)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([key, title]) => (
                <button
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  className="chip border border-[rgb(var(--danger)/0.3)] bg-[rgb(var(--danger)/0.07)] text-[rgb(var(--danger))] transition-colors hover:bg-[rgb(var(--danger)/0.14)]"
                >
                  <span className="num font-bold">{formatJalali(key, 'DD')}</span> {title}
                </button>
              ))}
          </div>
          <p className="mt-3 text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
            تعطیلات رسمی ایران از مجموعه‌داده داخلی محاسبه می‌شوند (همیشه آفلاین در دسترس). تعطیلات قمری تقریبی هستند و بهتر است با تقویم رسمی
            تطبیق داده شوند. برای سایر کشورها از سرویس رایگان Nager.Date استفاده می‌شود.
          </p>
        </Card>
      )}

      <EventDialog
        open={eventDialog}
        onClose={() => {
          setEventDialog(false);
          setEditingEvent(null);
        }}
        event={editingEvent}
        initialDate={new Date(selectedDay)}
      />

      {editingEvent && (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" size="sm" icon="Trash2" onClick={() => setDeleting(editingEvent.id)}>
            حذف رویداد «{editingEvent.title}»
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            removeEvent(deleting);
            setEditingEvent(null);
            toast.success('رویداد حذف شد');
          }
        }}
        title="حذف رویداد"
        message="این رویداد از تقویم حذف شود؟"
      />
    </div>
  );
}
