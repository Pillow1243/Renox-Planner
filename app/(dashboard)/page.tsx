'use client';

/**
 * داشبورد — نمای کلی امروز
 * کارت‌های ماژولار با قابلیت جابه‌جایی (Drag & Drop) و ذخیره چیدمان در تنظیمات
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePlanner } from '@/stores/planner-store';
import { useUser, useMounted, useNow } from '@/hooks/use-planner';
import { dayKey, formatJalali, greeting, weekdayName } from '@/lib/jalali';
import { PRIORITY_COLOR, PRIORITY_LABEL } from '@/lib/constants';
import {
  eisenhowerQuadrants,
  goalProgress,
  habitHeatmapData,
  habitStreak,
  healthSeries,
  isHabitDue,
  weeklyFocusSeries,
} from '@/lib/selectors';
import { cn, formatNumber, toPersianDigits } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Badge, Button, Card, EmptyState, Progress, ProgressRing, Skeleton, Switch } from '@/components/ui/primitives';
import { AreaTrendChart, Sparkline } from '@/components/ui/charts';
import { fireConfetti, playChime } from '@/components/ui/confetti';
import { StatCard } from '@/components/shared/stat-card';
import { useQuickAdd } from '@/components/shared/quick-add-context';
import { getWeather, getWeatherForecast, getRandomQuote, type WeatherNow, type WeatherDay, type Quote } from '@/lib/external-apis';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';

/* ============================ کارت‌های داشبورد =========================== */
const CARD_META: Record<string, { title: string; icon: string }> = {
  today: { title: 'خلاصه امروز', icon: 'Sparkles' },
  stats: { title: 'آمار سریع', icon: 'Activity' },
  'week-chart': { title: 'روند هفته', icon: 'BarChart3' },
  habits: { title: 'عادت‌های امروز', icon: 'Flame' },
  goals: { title: 'اهداف نزدیک', icon: 'Target' },
  quote: { title: 'نقل‌قول روز', icon: 'Quote' },
  weather: { title: 'آب‌وهوا', icon: 'CloudSun' },
  upcoming: { title: 'رویدادهای پیش‌رو', icon: 'CalendarDays' },
  water: { title: 'آب و خواب', icon: 'Droplets' },
  focus: { title: 'تمرکز هفته', icon: 'Timer' },
};

function SortableCard({ id, editing, children }: { id: string; editing: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editing });
  return (
    <motion.section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-20 opacity-80')}
      layout
    >
      {editing && (
        <button
          {...attributes}
          {...listeners}
          className="absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 cursor-grab items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1 text-[10px] font-bold shadow-soft active:cursor-grabbing"
          aria-label="جابه‌جایی کارت"
        >
          <Icon name="Grid2x2" size={11} /> جابه‌جا کن
        </button>
      )}
      <div className={cn(editing && 'ring-1 ring-dashed ring-[rgb(var(--accent)/0.4)] rounded-card')}>{children}</div>
    </motion.section>
  );
}

/* ============================ کارت‌های محتوا ============================= */
function TodayCard() {
  const tasks = usePlanner((s) => s.tasks);
  const habits = usePlanner((s) => s.habits);
  const habitLogs = usePlanner((s) => s.habitLogs);
  const events = usePlanner((s) => s.events);
  const router = useRouter();
  const now = useNow(60000);
  const today = dayKey(now);

  const todayTasks = tasks.filter((t) => t.dueDate && dayKey(t.dueDate) === today);
  const done = todayTasks.filter((t) => t.status === 'done').length;
  const dueHabits = habits.filter((h) => isHabitDue(h, now));
  const doneHabits = dueHabits.filter(
    (h) => (habitLogs.find((l) => l.habitId === h.id && l.date === today)?.count ?? 0) >= (h.target || 1)
  ).length;
  const todayEvents = events.filter((e) => dayKey(e.start) === today);
  const progress = Math.round(((done / Math.max(1, todayTasks.length)) * 60 + (doneHabits / Math.max(1, dueHabits.length)) * 40));

  return (
    <Card className="overflow-hidden">
      <div className="relative p-5 sm:p-6">
        <div
          className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full opacity-[0.12] blur-2xl"
          style={{ background: 'radial-gradient(circle, rgb(var(--accent)), transparent 70%)' }}
        />
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="!bg-[rgb(var(--accent-soft))] !text-[rgb(var(--accent))]" dot>
                {formatJalali(now, 'dddd، DD MMMM YYYY')}
              </Badge>
            </div>
            <h2 className="text-xl font-extrabold sm:text-2xl">
              {todayTasks.length === 0
                ? 'امروز تسکی نداری — وقت برنامه‌ریزی است'
                : done === todayTasks.length
                ? 'همه تسک‌های امروز انجام شد 🎉'
                : `${toPersianDigits(todayTasks.length - done)} کار تا پایان امروز`}
            </h2>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[rgb(var(--text-muted))]">
              <span className="flex items-center gap-1.5">
                <Icon name="CheckSquare" size={14} /> {toPersianDigits(done)} از {toPersianDigits(todayTasks.length)} تسک
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="Flame" size={14} /> {toPersianDigits(doneHabits)} از {toPersianDigits(dueHabits.length)} عادت
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="CalendarDays" size={14} /> {toPersianDigits(todayEvents.length)} رویداد
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" icon="Play" onClick={() => router.push('/focus')}>
                شروع تمرکز
              </Button>
              <Button size="sm" variant="outline" icon="ListChecks" onClick={() => router.push('/tasks')}>
                فهرست امروز
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <ProgressRing value={progress} size={132} stroke={11} label="پیشرفت امروز">
              <span className="num text-3xl font-black">{toPersianDigits(progress)}٪</span>
              <span className="mt-0.5 block text-[10px] text-[rgb(var(--text-subtle))]">پیشرفت امروز</span>
            </ProgressRing>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatsCard() {
  const tasks = usePlanner((s) => s.tasks);
  const habitLogs = usePlanner((s) => s.habitLogs);
  const sessions = usePlanner((s) => s.sessions);
  const transactions = usePlanner((s) => s.transactions);
  const health = usePlanner((s) => s.health);
  const settings = usePlanner((s) => s.settings);
  const today = dayKey(new Date());

  const openTasks = tasks.filter((t) => t.status !== 'done').length;
  const focusToday = sessions.filter((s) => dayKey(s.startedAt) === today && s.mode === 'focus').reduce((a, b) => a + b.minutes, 0);
  const water = health.find((h) => h.date === today)?.water ?? 0;
  const expenseToday = transactions.filter((t) => t.type === 'expense' && dayKey(t.date) === today).reduce((a, b) => a + b.amountBase, 0);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d);
    return {
      label: weekdayName(d, true),
      تسک: tasks.filter((t) => t.completedAt && dayKey(t.completedAt) === key).length,
      عادت: habitLogs.filter((l) => l.date === key).length,
    };
  });

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard label="تسک‌های باز" value={openTasks} icon="CheckSquare" color="#57886A" index={0} spark={last7} sparkKey="تسک" />
      <StatCard label="تمرکز امروز" value={focusToday} unit="دقیقه" icon="Timer" color="#6C7FA8" index={1} />
      <StatCard
        label="آب امروز"
        value={water}
        unit={`از ${toPersianDigits(settings.waterGoal)}`}
        icon="Droplets"
        color="#4F8A96"
        index={2}
      />
      <StatCard label="هزینه امروز" value={expenseToday} unit="تومان" icon="Wallet" color="#BE7857" index={3} />
    </div>
  );
}

function WeekChartCard() {
  const tasks = usePlanner((s) => s.tasks);
  const habitLogs = usePlanner((s) => s.habitLogs);
  const sessions = usePlanner((s) => s.sessions);

  const data = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d);
    return {
      label: weekdayName(d, true),
      تسک: tasks.filter((t) => t.completedAt && dayKey(t.completedAt) === key).length,
      عادت: habitLogs.filter((l) => l.date === key).length,
      تمرکز: sessions.filter((s) => dayKey(s.startedAt) === key).reduce((a, b) => a + b.minutes, 0) / 10,
    };
  });

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
            <Icon name="BarChart3" size={17} />
          </span>
          <div>
            <h3 className="text-sm font-bold">روند هفت روز گذشته</h3>
            <p className="text-[11px] text-[rgb(var(--text-subtle))]">تسک، عادت و تمرکز (تمرکز ÷ ۱۰ دقیقه)</p>
          </div>
        </div>
        <Link href="/reports" className="text-[11px] font-bold text-[rgb(var(--accent))] hover:underline">
          گزارش کامل
        </Link>
      </div>
      <AreaTrendChart
        data={data}
        series={[
          { key: 'تسک', name: 'تسک انجام‌شده', color: '#57886A' },
          { key: 'عادت', name: 'عادت ثبت‌شده', color: '#AD9268' },
          { key: 'تمرکز', name: 'تمرکز (۱۰ دقیقه)', color: '#6C7FA8' },
        ]}
        height={230}
      />
    </Card>
  );
}

function HabitsCard() {
  const habits = usePlanner((s) => s.habits);
  const habitLogs = usePlanner((s) => s.habitLogs);
  const toggleHabit = usePlanner((s) => s.toggleHabit);
  const settings = usePlanner((s) => s.settings);
  const toast = useToast();
  const today = dayKey(new Date());
  const due = habits.filter((h) => isHabitDue(h, new Date()));

  if (!due.length) {
    return (
      <Card className="p-5">
        <EmptyState
          icon="Flame"
          title="هنوز عادتی نساخته‌ای"
          description="با یک عادت کوچک شروع کن؛ تداوم، معجزه می‌کند."
          action={
            <Button icon="Plus" size="sm" onClick={() => (window.location.href = '/habits')}>
              ساخت عادت
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(140,111,168,0.12)] text-[#8C6FA8]">
            <Icon name="Flame" size={17} />
          </span>
          <div>
            <h3 className="text-sm font-bold">عادت‌های امروز</h3>
            <p className="text-[11px] text-[rgb(var(--text-subtle))]">با یک کلیک ثبت کن</p>
          </div>
        </div>
        <Link href="/habits" className="text-[11px] font-bold text-[rgb(var(--accent))] hover:underline">
          همه عادت‌ها
        </Link>
      </div>

      <ul className="space-y-2">
        {due.slice(0, 5).map((habit) => {
          const log = habitLogs.find((l) => l.habitId === habit.id && l.date === today);
          const count = log?.count ?? 0;
          const done = count >= (habit.target || 1);
          const streak = habitStreak(habit, habitLogs);
          return (
            <li key={habit.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-2.5">
              <button
                onClick={() => {
                  toggleHabit(habit.id, today);
                  if (!done) {
                    fireConfetti(18);
                    if (settings.sounds) playChime('success');
                    toast.success(`«${habit.name}» ثبت شد`, streak > 0 ? `زنجیره ${toPersianDigits(streak + 1)} روزه!` : undefined);
                  }
                }}
                className={cn(
                  'grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all duration-300 active:scale-90',
                  done ? 'text-white' : 'bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]'
                )}
                style={done ? { backgroundColor: habit.color } : undefined}
                aria-label={done ? 'لغو ثبت عادت' : 'ثبت عادت'}
              >
                <Icon name={done ? 'Check' : habit.icon} size={18} />
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-semibold', done && 'opacity-70')}>{habit.name}</p>
                <p className="num text-[11px] text-[rgb(var(--text-subtle))]">
                  {habit.target > 1 ? `${toPersianDigits(count)}/${toPersianDigits(habit.target)} ${habit.unit ?? ''}` : done ? 'انجام شد' : 'در انتظار'}
                </p>
              </div>
              {habit.target > 1 && <Progress value={(count / habit.target) * 100} className="w-16" color={habit.color} height={6} />}
              {streak > 0 && (
                <span className="chip num shrink-0 bg-[rgba(190,120,87,0.14)] text-[#BE7857]" title="زنجیره روزهای پیوسته">
                  🔥 {toPersianDigits(streak)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function GoalsCard() {
  const goals = usePlanner((s) => s.goals);
  const tasks = usePlanner((s) => s.tasks);
  const active = goals.filter((g) => !g.completed).slice(0, 3);

  return (
    <Card className="p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(190,120,87,0.12)] text-[#BE7857]">
            <Icon name="Target" size={17} />
          </span>
          <div>
            <h3 className="text-sm font-bold">اهداف نزدیک</h3>
            <p className="text-[11px] text-[rgb(var(--text-subtle))]">پیشرفت بر اساس نتایج کلیدی</p>
          </div>
        </div>
        <Link href="/goals" className="text-[11px] font-bold text-[rgb(var(--accent))] hover:underline">
          مدیریت اهداف
        </Link>
      </div>

      {active.length === 0 ? (
        <EmptyState icon="Target" title="هدف فعالی نداری" description="هدف روشن، انرژی روزانه می‌سازد." />
      ) : (
        <ul className="space-y-3">
          {active.map((goal) => {
            const value = goalProgress(goal);
            const linked = tasks.filter((t) => t.goalId === goal.id).length;
            return (
              <li key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{goal.title}</span>
                  <span className="num shrink-0 text-xs font-bold" style={{ color: goal.color }}>
                    {toPersianDigits(value)}٪
                  </span>
                </div>
                <Progress value={value} color={goal.color} height={7} />
                <p className="text-[10.5px] text-[rgb(var(--text-subtle))]">
                  {goal.category}
                  {linked > 0 && ` • ${toPersianDigits(linked)} تسک مرتبط`}
                  {goal.targetDate && ` • تا ${formatJalali(goal.targetDate, 'DD MMMM YYYY')}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function WeatherCard() {
  const city = usePlanner((s) => s.settings.city);
  const { data, isLoading } = useQuery<WeatherNow>({
    queryKey: ['weather', city.latitude, city.longitude],
    queryFn: () => getWeather(city.latitude, city.longitude, city.name),
    staleTime: 10 * 60 * 1000,
  });
  const { data: forecast } = useQuery<WeatherDay[]>({
    queryKey: ['forecast', city.latitude, city.longitude],
    queryFn: () => getWeatherForecast(city.latitude, city.longitude),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <Card className="overflow-hidden">
      <div className="relative p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(79,138,150,0.12)] text-[#4F8A96]">
              <Icon name="CloudSun" size={17} />
            </span>
            <div>
              <h3 className="text-sm font-bold">آب‌وهوای {city.name}</h3>
              <p className="text-[11px] text-[rgb(var(--text-subtle))]">Open-Meteo — بدون کلید</p>
            </div>
          </div>
          <Link href="/settings" className="text-[11px] font-bold text-[rgb(var(--accent))] hover:underline">
            تغییر شهر
          </Link>
        </div>

        {isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : (
          <>
            <div className="flex items-end gap-4">
              <span className="text-5xl">{data.icon}</span>
              <div>
                <p className="num text-3xl font-black">
                  {toPersianDigits(data.temperature)}
                  <span className="text-base font-bold">°C</span>
                </p>
                <p className="text-xs text-[rgb(var(--text-muted))]">{data.description}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: 'Thermometer', label: 'حس واقعی', value: `${toPersianDigits(data.apparent)}°` },
                { icon: 'Droplets', label: 'رطوبت', value: `${toPersianDigits(data.humidity)}٪` },
                { icon: 'Wind', label: 'باد', value: `${toPersianDigits(data.wind)} km/h` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-[rgb(var(--text)/0.04)] p-2.5">
                  <Icon name={item.icon} size={15} className="mx-auto text-[rgb(var(--text-subtle))]" />
                  <p className="num mt-1 text-xs font-bold">{item.value}</p>
                  <p className="text-[10px] text-[rgb(var(--text-subtle))]">{item.label}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {forecast && forecast.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {forecast.map((day) => (
              <div key={day.date} className="shrink-0 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-center">
                <p className="text-[10px] text-[rgb(var(--text-subtle))]">{formatJalali(day.date, 'dd')}</p>
                <p className="my-1 text-lg">{day.icon}</p>
                <p className="num text-[11px] font-bold">
                  {toPersianDigits(day.max)}° / {toPersianDigits(day.min)}°
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function QuoteCard() {
  const { data, isLoading } = useQuery<Quote>({
    queryKey: ['quote'],
    queryFn: getRandomQuote,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card className="relative overflow-hidden p-5">
      <Icon name="Quote" size={54} className="absolute -left-1 -top-1 text-[rgb(var(--text)/0.06)]" />
      <div className="relative">
        <p className="mb-2 text-[11px] font-bold text-[rgb(var(--accent))]">نقل‌قول امروز</p>
        {isLoading || !data ? (
          <div className="space-y-2">
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <>
            <p className="text-[15px] font-bold leading-8">«{data.content}»</p>
            <p className="mt-3 text-xs text-[rgb(var(--text-subtle))]">— {data.author}</p>
          </>
        )}
      </div>
    </Card>
  );
}

function UpcomingCard() {
  const events = usePlanner((s) => s.events);
  const tasks = usePlanner((s) => s.tasks);
  // امروز به‌صورت رشته کلید روز نگه داشته می‌شود تا وابستگی useMemo پایدار بماند
  const todayKey = React.useMemo(() => dayKey(new Date()), []);

  const items = React.useMemo(() => {
    const ev = events
      .filter((e) => dayKey(e.start) >= todayKey)
      .slice(0, 20)
      .map((e) => ({ id: e.id, title: e.title, at: e.start, kind: 'رویداد' as const, color: e.color, allDay: e.allDay }));
    const tk = tasks
      .filter((t) => t.status !== 'done' && t.dueDate)
      .slice(0, 40)
      .map((t) => ({
        id: t.id,
        title: t.title,
        at: t.dueDate as string,
        kind: 'تسک' as const,
        color: PRIORITY_COLOR[t.priority],
        allDay: false,
      }));
    return [...ev, ...tk].sort((a, b) => a.at.localeCompare(b.at)).slice(0, 6);
  }, [events, tasks, todayKey]);

  return (
    <Card className="p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(108,127,168,0.12)] text-[#6C7FA8]">
            <Icon name="CalendarDays" size={17} />
          </span>
          <h3 className="text-sm font-bold">پیش‌رو</h3>
        </div>
        <Link href="/calendar" className="text-[11px] font-bold text-[rgb(var(--accent))] hover:underline">
          تقویم
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="CalendarCheck" title="چیزی در پیش نیست" description="تقویمت خالی است — می‌توانی برنامه‌ریزی کنی." />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const date = new Date(item.at);
            const isToday = dayKey(date) === todayKey;
            return (
              <li key={item.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-2.5">
                <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{item.title}</p>
                  <p className="num text-[10.5px] text-[rgb(var(--text-subtle))]">
                    {isToday ? 'امروز' : formatJalali(date, 'dddd DD MMMM')}
                    {!item.allDay && ` — ${toPersianDigits(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`)}`}
                  </p>
                </div>
                <Badge color={item.color}>{item.kind}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function HealthCard() {
  const health = usePlanner((s) => s.health);
  const settings = usePlanner((s) => s.settings);
  const addWater = usePlanner((s) => s.addWater);
  const toast = useToast();
  const today = dayKey(new Date());
  const todayLog = health.find((h) => h.date === today);
  const water = todayLog?.water ?? 0;
  const sleep = todayLog?.sleepHours ?? 0;
  const series = healthSeries(health, 14);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(79,138,150,0.12)] text-[#4F8A96]">
            <Icon name="Droplets" size={17} />
          </span>
          <div>
            <h3 className="text-sm font-bold">آب و خواب</h3>
            <p className="text-[11px] text-[rgb(var(--text-subtle))]">هدف: {toPersianDigits(settings.waterGoal)} لیوان آب، {toPersianDigits(settings.sleepGoal)} ساعت خواب</p>
          </div>
        </div>
        <Link href="/health" className="text-[11px] font-bold text-[rgb(var(--accent))] hover:underline">
          سلامت
        </Link>
      </div>

      {/* نمایش بصری لیوان‌های آب */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {Array.from({ length: Math.max(settings.waterGoal, water) }, (_, i) => {
          const filled = i < water;
          return (
            <button
              key={i}
              onClick={() => {
                addWater(today, filled && i === water - 1 ? -1 : 1);
                if (!filled) {
                  if (settings.sounds) playChime('tick');
                  if (i + 1 === settings.waterGoal) {
                    fireConfetti(30);
                    toast.success('هدف آب امروز کامل شد! 💧');
                  }
                }
              }}
              aria-label={`لیوان ${i + 1}`}
              className={cn(
                'grid h-9 w-7 place-items-end overflow-hidden rounded-b-lg rounded-t-sm border-2 transition-all duration-300',
                filled ? 'border-[#4F8A96]' : 'border-[rgb(var(--border))] hover:border-[#4F8A96]/50'
              )}
            >
              <span
                className="w-full rounded-b-sm bg-[#4F8A96] transition-all duration-500"
                style={{ height: filled ? '78%' : '0%' }}
              />
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[rgb(var(--text)/0.04)] p-3">
          <p className="text-[10.5px] text-[rgb(var(--text-subtle))]">خواب دیشب</p>
          <p className="num text-lg font-extrabold">{sleep ? toPersianDigits(sleep) : '—'}<span className="text-xs font-medium"> ساعت</span></p>
        </div>
        <div className="rounded-xl bg-[rgb(var(--text)/0.04)] p-3">
          <p className="text-[10.5px] text-[rgb(var(--text-subtle))]">روند ۱۴ روزه خواب</p>
          <Sparkline data={series.map((s) => ({ label: s.label, value: s.خواب }))} height={40} color="#6C7FA8" />
        </div>
      </div>
    </Card>
  );
}

function FocusCard() {
  const data = weeklyFocusSeries(usePlanner((s) => s.sessions));
  const total = data.reduce((a, b) => a + b.دقیقه, 0);

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(108,127,168,0.12)] text-[#6C7FA8]">
            <Icon name="Timer" size={17} />
          </span>
          <div>
            <h3 className="text-sm font-bold">تمرکز این هفته</h3>
            <p className="num text-[11px] text-[rgb(var(--text-subtle))]}">{formatNumber(total)} دقیقه در {toPersianDigits(data.filter((d) => d.دقیقه > 0).length)} روز</p>
          </div>
        </div>
        <Link href="/focus" className="text-[11px] font-bold text-[rgb(var(--accent))] hover:underline">
          پومودورو
        </Link>
      </div>
      <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
        {data.map((d) => {
          const max = Math.max(...data.map((x) => x.دقیقه), 1);
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(d.دقیقه / max) * 84}px` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[26px] rounded-t-lg bg-gradient-to-t from-[#6C7FA8]/45 to-[#6C7FA8]"
                title={`${d.دقیقه} دقیقه`}
              />
              <span className="text-[10px] text-[rgb(var(--text-subtle))]">{d.label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ============================== صفحه داشبورد ============================= */
export default function DashboardPage() {
  const settings = usePlanner((s) => s.settings);
  const updateSettings = usePlanner((s) => s.updateSettings);
  const mounted = useMounted();
  const [editing, setEditing] = React.useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const layout = settings.dashboardLayout?.length ? settings.dashboardLayout : Object.keys(CARD_META);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = layout.indexOf(String(active.id));
    const newIndex = layout.indexOf(String(over.id));
    updateSettings({ dashboardLayout: arrayMove(layout, oldIndex, newIndex) });
  };

  const renderCard = (id: string) => {
    switch (id) {
      case 'today':
        return <TodayCard />;
      case 'stats':
        return <StatsCard />;
      case 'week-chart':
        return <WeekChartCard />;
      case 'habits':
        return <HabitsCard />;
      case 'goals':
        return <GoalsCard />;
      case 'quote':
        return <QuoteCard />;
      case 'weather':
        return <WeatherCard />;
      case 'upcoming':
        return <UpcomingCard />;
      case 'water':
        return <HealthCard />;
      case 'focus':
        return <FocusCard />;
      default:
        return null;
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-40" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Skeleton className="h-24" count={4} />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* نوار ابزار چیدمان */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">داشبورد</h1>
          <p className="mt-0.5 text-xs text-[rgb(var(--text-subtle))]">
            {greeting()} — همه چیز امروز در یک نگاه
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="hidden items-center gap-2 text-xs text-[rgb(var(--text-muted))] sm:flex">
            <Switch checked={editing} onChange={setEditing} label="حالت چیدمان" />
            چیدمان دلخواه
          </label>
          <Button
            size="sm"
            variant={editing ? 'primary' : 'outline'}
            icon={editing ? 'Check' : 'LayoutGrid'}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? 'پایان چیدمان' : 'چیدمان'}
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={layout} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AnimatePresence>
              {layout.map((id) => {
                const node = renderCard(id);
                if (!node) return null;
                const full = id === 'today' || id === 'stats' || id === 'week-chart';
                return (
                  <SortableCard key={id} id={id} editing={editing}>
                    <div className={full ? 'xl:col-span-2' : ''}>{node}</div>
                  </SortableCard>
                );
              })}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>

      <p className="pt-2 text-center text-[11px] text-[rgb(var(--text-subtle))]">
        نکته: با <kbd className="rounded border border-[rgb(var(--border))] px-1.5 py-0.5 font-bold">⌘K</kbd> در همه‌چیز جست‌وجو کن و با{' '}
        <kbd className="rounded border border-[rgb(var(--border))] px-1.5 py-0.5 font-bold">⌘N</kbd> تسک جدید بساز.
      </p>
    </div>
  );
}
