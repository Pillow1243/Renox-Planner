'use client';

/**
 * ماژول عادت‌ها
 *  - ثبت روزانه با شمارش هدف (مثلاً ۸ لیوان آب)
 *  - زنجیره (Streak) و بهترین رکورد
 *  - هیتمپ ۶ ماهه، نمودار ماهانه
 *  - جشن کاغذرنگی هنگام کامل‌شدن هدف روز
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { useMounted } from '@/hooks/use-planner';
import { addDays, dayKey, formatJalali, WEEKDAYS, weekdayIndexJalali } from '@/lib/jalali';
import { habitBestStreak, habitCompletionRate, habitHeatmapData, habitStreak, isHabitDue } from '@/lib/selectors';
import { cn, pct, toPersianDigits } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Badge, Button, Card, EmptyState, Progress, ProgressRing, SegmentedControl, Skeleton, Tooltip } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/modal';
import { Heatmap } from '@/components/ui/heatmap';
import { BarsChart } from '@/components/ui/charts';
import { fireConfetti, playChime } from '@/components/ui/confetti';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { HabitDialog } from '@/components/shared/dialogs';
import { useQuickAdd } from '@/components/shared/quick-add-context';

export default function HabitsPage() {
  const habits = usePlanner((s) => s.habits);
  const habitLogs = usePlanner((s) => s.habitLogs);
  const settings = usePlanner((s) => s.settings);
  const setHabitCount = usePlanner((s) => s.setHabitCount);
  const removeHabit = usePlanner((s) => s.removeHabit);
  const mounted = useMounted();
  const toast = useToast();
  const { open: openDialog } = useQuickAdd();

  const [selectedDate, setSelectedDate] = React.useState(dayKey(new Date()));
  const [editing, setEditing] = React.useState<null | (typeof habits)[number]>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<null | string>(null);

  const date = new Date(selectedDate);
  const dueHabits = habits.filter((h) => isHabitDue(h, date));
  const completedToday = dueHabits.filter(
    (h) => (habitLogs.find((l) => l.habitId === h.id && l.date === selectedDate)?.count ?? 0) >= (h.target || 1)
  ).length;

  const rate30 = habitCompletionRate(habits, habitLogs, 30);
  const totalStreak = habits.reduce((sum, h) => sum + habitStreak(h, habitLogs), 0);
  const bestEver = habits.reduce((max, h) => Math.max(max, habitBestStreak(h, habitLogs)), 0);

  /** نمودار ۳۰ روز اخیر: تعداد عادت‌های انجام‌شده در هر روز */
  const monthly = React.useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const d = addDays(new Date(), -(29 - i));
        const key = dayKey(d);
        const count = habits.filter((h) => (habitLogs.find((l) => l.habitId === h.id && l.date === key)?.count ?? 0) >= (h.target || 1)).length;
        return { label: toPersianDigits(d.getDate()), value: count };
      }),
    [habits, habitLogs]
  );

  const heatData = React.useMemo(() => habitHeatmapData(habits, habitLogs, 182), [habits, habitLogs]);

  /** هفت روز اخیر برای انتخاب سریع تاریخ */
  const week = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), -(6 - i))), []);

  const toggle = (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const existing = habitLogs.find((l) => l.habitId === habitId && l.date === selectedDate);
    const count = existing?.count ?? 0;
    const target = habit.target || 1;

    if (count >= target) {
      setHabitCount(habitId, selectedDate, 0);
      return;
    }
    const next = count + 1;
    setHabitCount(habitId, selectedDate, next);
    if (next >= target) {
      fireConfetti(34);
      if (settings.sounds) playChime('success');
      toast.success(`«${habit.name}» کامل شد!`, `زنجیره: ${toPersianDigits(habitStreak(habit, habitLogs) + 1)} روز`);
    } else if (settings.sounds) {
      playChime('tick');
    }
  };

  return (
    <div>
      <PageHeader
        title="عادت‌ها"
        description="کوچک، پیوسته، روزانه. زنجیره‌ات را نشکن 🔥"
        icon="Flame"
        actions={
          <Button
            size="sm"
            icon="Plus"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            عادت جدید
          </Button>
        }
      />

      {/* آمار کلی */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="عادت‌های فعال" value={habits.length} icon="Sprout" color="#57886A" index={0} />
        <StatCard label="نرخ پایبندی ۳۰ روز" value={rate30} unit="٪" icon="TrendingUp" color="#6C7FA8" index={1} />
        <StatCard label="مجموع زنجیره‌ها" value={totalStreak} unit="روز" icon="Flame" color="#BE7857" index={2} />
        <StatCard label="بهترین رکورد" value={bestEver} unit="روز" icon="Trophy" color="#AD9268" index={3} />
      </div>

      {/* انتخاب تاریخ */}
      <Card className="mb-5 flex flex-wrap items-center gap-3 p-3.5">
        <span className="text-xs font-bold text-[rgb(var(--text-muted))]">تاریخ ثبت:</span>
        <div className="flex gap-1.5">
          {week.map((d) => {
            const key = dayKey(d);
            const active = key === selectedDate;
            const count = habits.filter((h) => (habitLogs.find((l) => l.habitId === h.id && l.date === key)?.count ?? 0) >= (h.target || 1)).length;
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(key)}
                className={cn(
                  'flex h-14 w-12 flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] transition-all',
                  active
                    ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]'
                    : 'border-[rgb(var(--border))] hover:border-[rgb(var(--accent)/0.4)]'
                )}
              >
                <span className="text-[9.5px] opacity-70">{WEEKDAYS[weekdayIndexJalali(d)]}</span>
                <span className="num text-[13px] font-bold">{toPersianDigits(d.getDate())}</span>
                {count > 0 && <span className="num text-[9px] font-bold text-[rgb(var(--accent))]">{toPersianDigits(count)}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon="ChevronRight" onClick={() => setSelectedDate(dayKey(addDays(date, -1)))}>
            روز قبل
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedDate(dayKey(addDays(date, 1)))}>
            روز بعد
            <Icon name="ChevronLeft" size={15} />
          </Button>
        </div>
      </Card>

      {!mounted ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-28" count={4} />
        </div>
      ) : habits.length === 0 ? (
        <Card>
          <EmptyState
            icon="Flame"
            title="اولین عادتت را بساز"
            description="پیشنهاد: یک عادت کوچک که کمتر از ۵ دقیقه وقت می‌گیرد — مثل نوشیدن یک لیوان آب."
            action={
              <Button
                icon="Plus"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                ساخت عادت
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* نوار پیشرفت روز */}
          <Card className="mb-5 flex flex-wrap items-center gap-6 p-5">
            <ProgressRing value={pct(completedToday, dueHabits.length)} size={112} stroke={10} label="امروز">
              <span className="num text-2xl font-black">{toPersianDigits(completedToday)}</span>
              <span className="block text-[10px] text-[rgb(var(--text-subtle))]">از {toPersianDigits(dueHabits.length)}</span>
            </ProgressRing>
            <div className="min-w-[200px] flex-1">
              <p className="text-sm font-bold">
                {completedToday === dueHabits.length && dueHabits.length > 0
                  ? 'همه عادت‌های امروز ثبت شد! عالی بود 🎉'
                  : `${toPersianDigits(dueHabits.length - completedToday)} عادت تا کامل‌شدن امروز باقی مانده`}
              </p>
              <p className="mt-1 text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
                روی هر کارت چند بار بزن تا به هدف روزانه برسی. حلقه پیشرفت هر عادت، نسبت به هدفش محاسبه می‌شود.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon="Zap"
                  onClick={() => {
                    dueHabits.forEach((h) => setHabitCount(h.id, selectedDate, h.target || 1));
                    fireConfetti(70);
                    toast.success('همه عادت‌های امروز ثبت شد!');
                  }}
                >
                  ثبت همه
                </Button>
                <Button size="sm" variant="ghost" icon="BookHeart" onClick={() => (window.location.href = '/journal')}>
                  نوشتن ژورنال
                </Button>
              </div>
            </div>
          </Card>

          {/* کارت عادت‌ها */}
          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {habits.map((habit) => {
                const log = habitLogs.find((l) => l.habitId === habit.id && l.date === selectedDate);
                const count = log?.count ?? 0;
                const target = habit.target || 1;
                const done = count >= target;
                const streak = habitStreak(habit, habitLogs, date);
                const best = habitBestStreak(habit, habitLogs);
                const due = isHabitDue(habit, date);
                const last14 = Array.from({ length: 14 }, (_, i) => {
                  const d = addDays(date, -(13 - i));
                  const key = dayKey(d);
                  const l = habitLogs.find((x) => x.habitId === habit.id && x.date === key);
                  return { key, done: (l?.count ?? 0) >= target };
                });

                return (
                  <motion.div key={habit.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                    <Card className={cn('relative overflow-hidden p-4', !due && 'opacity-60')}>
                      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: habit.color }} />
                      <div className="flex items-start gap-3">
                        <Tooltip label={target > 1 ? `${toPersianDigits(count)}/${toPersianDigits(target)}` : done ? 'ثبت شده' : 'ثبت کن'}>
                          <ProgressRing
                            value={pct(count, target)}
                            size={62}
                            stroke={6}
                            color={habit.color}
                          >
                            <span
                              className={cn('grid h-11 w-11 place-items-center rounded-full transition-colors', done ? 'text-white' : 'text-[rgb(var(--text-muted))]')}
                              style={done ? { backgroundColor: habit.color } : { backgroundColor: 'rgb(var(--text) / 0.06)' }}
                            >
                              <Icon name={habit.icon} size={19} />
                            </span>
                          </ProgressRing>
                        </Tooltip>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">{habit.name}</p>
                              <p className="num mt-0.5 text-[10.5px] text-[rgb(var(--text-subtle))]">
                                هدف: {toPersianDigits(target)} {habit.unit ?? 'بار'} • {habit.frequency === 'daily' ? 'روزانه' : habit.frequency === 'weekly' ? 'هفتگی' : 'ماهانه'}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                onClick={() => {
                                  setEditing(habit);
                                  setDialogOpen(true);
                                }}
                                className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:bg-[rgb(var(--text)/0.06)]"
                                aria-label="ویرایش عادت"
                              >
                                <Icon name="Pencil" size={14} />
                              </button>
                              <button
                                onClick={() => setDeleting(habit.id)}
                                className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--danger))]"
                                aria-label="حذف عادت"
                              >
                                <Icon name="Trash2" size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge color={habit.color}>🔥 {toPersianDigits(streak)} روز</Badge>
                            <Badge>رکورد {toPersianDigits(best)}</Badge>
                          </div>
                        </div>
                      </div>

                      {/* ۱۴ روز اخیر */}
                      <div className="mt-3 flex gap-1">
                        {last14.map((d) => (
                          <span
                            key={d.key}
                            title={formatJalali(d.key, 'DD MMMM')}
                            className="h-2.5 flex-1 rounded-full transition-colors"
                            style={{ backgroundColor: d.done ? habit.color : 'rgb(var(--text) / 0.09)' }}
                          />
                        ))}
                      </div>

                      {/* دکمه ثبت */}
                      <div className="mt-3 flex items-center gap-2">
                        {target > 1 ? (
                          <div className="flex flex-1 items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="!px-2.5"
                              onClick={() => setHabitCount(habit.id, selectedDate, Math.max(0, count - 1))}
                              aria-label="کاهش"
                            >
                              −
                            </Button>
                            <div className="num flex-1 text-center text-sm font-bold">
                              {toPersianDigits(count)} / {toPersianDigits(target)}
                            </div>
                            <Button size="sm" variant="outline" className="!px-2.5" onClick={() => toggle(habit.id)} aria-label="افزایش">
                              +
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="flex-1"
                            variant={done ? 'soft' : 'primary'}
                            icon={done ? 'RotateCcw' : 'Check'}
                            onClick={() => toggle(habit.id)}
                          >
                            {done ? 'لغو ثبت' : 'انجام شد'}
                          </Button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* تحلیل */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">هیتمپ ۶ ماه گذشته</h3>
                  <p className="text-[11px] text-[rgb(var(--text-subtle))]">رنگ پررنگ‌تر = عادت‌های بیشتر در آن روز</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[rgb(var(--text-subtle))]">
                  <span>کم</span>
                  {[0.15, 0.35, 0.55, 0.75, 1].map((a) => (
                    <span key={a} className="h-3 w-3 rounded-[4px]" style={{ backgroundColor: `rgb(var(--accent) / ${a})` }} />
                  ))}
                  <span>زیاد</span>
                </div>
              </div>
              <Heatmap data={heatData} weeks={26} unit="عادت" onDayClick={(d) => setSelectedDate(d)} />
            </Card>

            <Card className="p-5">
              <h3 className="mb-1 text-sm font-bold">۳۰ روز اخیر</h3>
              <p className="mb-3 text-[11px] text-[rgb(var(--text-subtle))]">تعداد عادت‌های کامل‌شده در هر روز</p>
              <BarsChart data={monthly} dataKey="value" unit="عادت" height={240} color="rgb(var(--accent))" />
            </Card>
          </div>

          {/* راهنمای روزهای هفته */}
          <Card className="mt-4 p-5">
            <h3 className="mb-3 text-sm font-bold">برنامه هفتگی عادت‌ها</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-center text-xs">
                <thead>
                  <tr className="text-[rgb(var(--text-subtle))]">
                    <th className="py-2 text-right font-semibold">عادت</th>
                    {WEEKDAYS.map((d) => (
                      <th key={d} className="py-2 font-semibold">
                        {d}
                      </th>
                    ))}
                    <th className="py-2 font-semibold">نرخ</th>
                  </tr>
                </thead>
                <tbody>
                  {habits.map((habit) => (
                    <tr key={habit.id} className="border-t border-[rgb(var(--border))]">
                      <td className="py-2.5 text-right font-medium">{habit.name}</td>
                      {WEEKDAYS.map((_, idx) => {
                        const due = habit.frequency === 'daily' || (habit.frequency === 'weekly' && habit.weekdays.includes(idx));
                        const hitsIn = Array.from({ length: 8 }, (_, w) => {
                          const d = addDays(new Date(), -w * 7);
                          return (d.getDay() + 1) % 7 === idx ? dayKey(d) : null;
                        }).filter(Boolean) as string[];
                        const hits = hitsIn.filter((k) => (habitLogs.find((l) => l.habitId === habit.id && l.date === k)?.count ?? 0) >= (habit.target || 1)).length;
                        return (
                          <td key={idx} className="py-2.5">
                            <span
                              className="mx-auto grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold"
                              style={{
                                backgroundColor: due ? `${habit.color}22` : 'rgb(var(--text) / 0.05)',
                                color: due ? habit.color : 'rgb(var(--text-subtle))',
                              }}
                            >
                              {due ? `${toPersianDigits(hits)}/۸` : '—'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="num py-2.5 font-bold">{toPersianDigits(habitCompletionRate([habit], habitLogs, 30))}٪</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <HabitDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        habit={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            removeHabit(deleting);
            toast.success('عادت حذف شد');
          }
        }}
        title="حذف عادت"
        message="با حذف عادت، تمام تاریخچه ثبت آن نیز پاک می‌شود. مطمئنی؟"
      />
    </div>
  );
}
