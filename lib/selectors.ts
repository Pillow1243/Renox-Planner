/**
 * توابع محاسباتی خالص (Pure Selectors)
 * جدا نگه‌داشتن این منطق از کامپوننت‌ها هم کد را تست‌پذیر می‌کند و هم
 * امکان گزارش‌گیری سریع روی داده‌های بزرگ را می‌دهد.
 */
import { addDays, dayKey, formatJalali, startOfDay, toJalali, weekdayName, currentWeekRange } from './jalali';
import type {
  Goal,
  Habit,
  HabitLog,
  HealthLog,
  JournalEntry,
  ReportSummary,
  Task,
  Transaction,
  WorkoutLog,
  FocusSession,
} from './types';
import { avg, pct, toNumber } from './utils';

/* --------------------------------- عادت‌ها -------------------------------- */
/** تعداد روزهای پیوسته موفق برای یک عادت (Streak جاری) */
export function habitStreak(habit: Habit, logs: HabitLog[], today = new Date()): number {
  const map = new Map(logs.filter((l) => l.habitId === habit.id).map((l) => [l.date, l.count]));
  let streak = 0;
  for (let i = 0; i < 400; i += 1) {
    const date = addDays(today, -i);
    const count = map.get(dayKey(date)) ?? 0;
    const done = count >= (habit.target || 1);
    // امروز اگر انجام نشده باشد، زنجیره را نمی‌شکند
    if (!done && i === 0) continue;
    if (!done) break;
    streak += 1;
  }
  return streak;
}

/** بهترین زنجیره تاریخی */
export function habitBestStreak(habit: Habit, logs: HabitLog[]): number {
  const dates = logs
    .filter((l) => l.habitId === habit.id && l.count >= (habit.target || 1))
    .map((l) => l.date)
    .sort();
  let best = 0;
  let current = 0;
  let prev: Date | null = null;
  dates.forEach((d) => {
    const date = startOfDay(d);
    if (prev && Math.round((date.getTime() - prev.getTime()) / 86400000) === 1) current += 1;
    else current = 1;
    best = Math.max(best, current);
    prev = date;
  });
  return best;
}

/** نرخ انجام عادت‌ها در یک بازه */
export function habitCompletionRate(habits: Habit[], logs: HabitLog[], days = 30, end = new Date()): number {
  if (!habits.length) return 0;
  const start = addDays(end, -(days - 1));
  const inRange = logs.filter((l) => {
    const d = startOfDay(l.date);
    return d >= startOfDay(start) && d <= startOfDay(end);
  });
  const expected = habits.reduce((sum, h) => {
    if (h.frequency === 'daily') return sum + days;
    if (h.frequency === 'weekly') return sum + Math.max(1, Math.round((days / 7) * Math.max(1, h.weekdays.length)));
    return sum + Math.max(1, Math.round(days / 30));
  }, 0);
  return pct(inRange.length, expected);
}

/** داده هیتمپ عادت‌ها (تعداد انجام‌شده در هر روز) */
export function habitHeatmapData(habits: Habit[], logs: HabitLog[], days = 182) {
  const byDate = new Map<string, number>();
  logs.forEach((l) => {
    const habit = habits.find((h) => h.id === l.habitId);
    if (!habit) return;
    if (l.count >= (habit.target || 1)) byDate.set(l.date, (byDate.get(l.date) ?? 0) + 1);
  });
  return Array.from({ length: days }, (_, i) => {
    const key = dayKey(addDays(new Date(), -(days - 1 - i)));
    return { date: key, value: byDate.get(key) ?? 0 };
  });
}

/** آیا عادت باید در تاریخ مشخص انجام شود؟ */
export function isHabitDue(habit: Habit, date: Date): boolean {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekly') {
    const idx = (date.getDay() + 1) % 7;
    return habit.weekdays.length ? habit.weekdays.includes(idx) : true;
  }
  return true; // ماهانه: همیشه در دسترس
}

/* ---------------------------------- تسک‌ها -------------------------------- */
export function tasksForDate(tasks: Task[], date: Date): Task[] {
  const key = dayKey(date);
  return tasks.filter((t) => t.dueDate && dayKey(t.dueDate) === key);
}

export function overdueTasks(tasks: Task[]): Task[] {
  const today = startOfDay(new Date());
  return tasks.filter((t) => t.status !== 'done' && t.dueDate && startOfDay(t.dueDate) < today);
}

export function todayTasks(tasks: Task[]): Task[] {
  return tasksForDate(tasks, new Date());
}

/** ماتریس آیزنهاور */
export function eisenhowerQuadrants(tasks: Task[]) {
  const open = tasks.filter((t) => t.status !== 'done');
  return {
    do: open.filter((t) => t.important && t.urgent),
    plan: open.filter((t) => t.important && !t.urgent),
    delegate: open.filter((t) => !t.important && t.urgent),
    delete: open.filter((t) => !t.important && !t.urgent),
  };
}

/** پیشرفت یک پروژه بر اساس تسک‌های تکمیل‌شده */
export function projectProgress(tasks: Task[], projectId: string): { total: number; done: number; percent: number } {
  const list = tasks.filter((t) => t.projectId === projectId);
  const done = list.filter((t) => t.status === 'done').length;
  return { total: list.length, done, percent: pct(done, list.length) };
}

/** پیشرفت یک هدف: اگر KR دارد بر اساس آن، وگرنه مقدار دستی */
export function goalProgress(goal: Goal): number {
  if (goal.keyResults.length) {
    const ratios = goal.keyResults.map((kr) => (kr.target > 0 ? Math.min(1, kr.current / kr.target) : 0));
    return Math.round(avg(ratios) * 100);
  }
  return Math.max(0, Math.min(100, goal.progress));
}

/* ---------------------------------- مالی ---------------------------------- */
export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
  byCategory: { name: string; value: number; color: string; id?: string }[];
  daily: { label: string; value: number }[];
}

export function financeSummary(
  transactions: Transaction[],
  categories: { id: string; name: string; color: string }[],
  from: Date,
  to: Date
): FinanceSummary {
  const inRange = transactions.filter((t) => {
    const d = startOfDay(t.date);
    return d >= startOfDay(from) && d <= startOfDay(to);
  });
  const income = inRange.filter((t) => t.type === 'income').reduce((s, t) => s + t.amountBase, 0);
  const expense = inRange.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amountBase, 0);

  const byCatMap = new Map<string, number>();
  inRange
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const key = t.categoryId ?? 'other';
      byCatMap.set(key, (byCatMap.get(key) ?? 0) + t.amountBase);
    });

  const byCategory = [...byCatMap.entries()]
    .map(([id, value]) => {
      const cat = categories.find((c) => c.id === id);
      return { id, name: cat?.name ?? 'دسته‌نشده', value, color: cat?.color ?? '#7E7E88' };
    })
    .sort((a, b) => b.value - a.value);

  const days: { label: string; value: number }[] = [];
  const totalDays = Math.min(31, Math.max(1, Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000) + 1));
  for (let i = 0; i < totalDays; i += 1) {
    const date = addDays(from, i);
    const key = dayKey(date);
    const value = inRange.filter((t) => t.type === 'expense' && dayKey(t.date) === key).reduce((s, t) => s + t.amountBase, 0);
    days.push({ label: String(toJalali(date).jd), value });
  }

  return {
    income,
    expense,
    balance: income - expense,
    savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
    byCategory,
    daily: days,
  };
}

/* --------------------------------- سلامت ---------------------------------- */
export function bmi(weightKg?: number, heightCm?: number): number | null {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  return Number((weightKg / (h * h)).toFixed(1));
}

export function bmiZone(value: number): { label: string; color: string } {
  if (value < 18.5) return { label: 'کم‌وزن', color: '#6C7FA8' };
  if (value < 25) return { label: 'وزن نرمال', color: '#57886A' };
  if (value < 30) return { label: 'اضافه‌وزن', color: '#AD9268' };
  return { label: 'چاقی', color: '#C0554A' };
}

export function healthSeries(logs: HealthLog[], days = 30) {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
  return sorted.map((l) => ({
    label: formatJalali(l.date, 'DD/MM'),
    وزن: l.weight ?? 0,
    خواب: l.sleepHours ?? 0,
    آب: l.water ?? 0,
    قدم: l.steps ?? 0,
    کالری: l.calories ?? 0,
  }));
}

/* --------------------------------- ژورنال --------------------------------- */
export function journalStreak(entries: JournalEntry[]): number {
  const set = new Set(entries.map((e) => e.date));
  let streak = 0;
  for (let i = 0; i < 400; i += 1) {
    const key = dayKey(addDays(new Date(), -i));
    if (set.has(key)) streak += 1;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

export function moodSeries(entries: JournalEntry[], days = 14) {
  const map = new Map(entries.map((e) => [e.date, e]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(new Date(), -(days - 1 - i));
    const entry = map.get(dayKey(date));
    return {
      label: formatJalali(date, 'DD/MM'),
      حال: entry?.mood ?? 0,
      انرژی: entry?.energy ?? 0,
    };
  });
}

/* --------------------------------- تمرکز ---------------------------------- */
export function focusMinutesInRange(sessions: FocusSession[], from: Date, to: Date): number {
  return sessions
    .filter((s) => {
      const d = startOfDay(s.startedAt);
      return d >= startOfDay(from) && d <= startOfDay(to) && s.mode === 'focus';
    })
    .reduce((sum, s) => sum + s.minutes, 0);
}

export function weeklyFocusSeries(sessions: FocusSession[]) {
  const { days } = currentWeekRange();
  return days.map((d) => {
    const key = dayKey(d);
    const minutes = sessions
      .filter((s) => dayKey(s.startedAt) === key && s.mode === 'focus')
      .reduce((sum, s) => sum + s.minutes, 0);
    return { label: weekdayName(d, true), دقیقه: minutes };
  });
}

/* -------------------------------- گزارش کلی -------------------------------- */
export function buildReportSummary(input: {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  transactions: Transaction[];
  health: HealthLog[];
  journal: JournalEntry[];
  workouts: WorkoutLog[];
  sessions: FocusSession[];
  from: Date;
  to: Date;
}): ReportSummary {
  const { tasks, habits, habitLogs, transactions, health, journal, workouts, sessions, from, to } = input;
  const created = tasks.filter((t) => {
    const d = startOfDay(t.createdAt);
    return d >= startOfDay(from) && d <= startOfDay(to);
  });
  const completed = tasks.filter((t) => {
    if (!t.completedAt) return false;
    const d = startOfDay(t.completedAt);
    return d >= startOfDay(from) && d <= startOfDay(to);
  });
  const inRangeHealth = health.filter((h) => {
    const d = startOfDay(h.date);
    return d >= startOfDay(from) && d <= startOfDay(to);
  });
  const inRangeTx = transactions.filter((t) => {
    const d = startOfDay(t.date);
    return d >= startOfDay(from) && d <= startOfDay(to);
  });
  const days = Math.max(1, Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000) + 1);

  return {
    tasksCompleted: completed.length,
    tasksCreated: created.length,
    completionRate: pct(completed.length, Math.max(created.length, completed.length)),
    focusMinutes: focusMinutesInRange(sessions, from, to),
    habitRate: habitCompletionRate(habits, habitLogs, days, to),
    income: inRangeTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amountBase, 0),
    expense: inRangeTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amountBase, 0),
    sleepAvg: Number(avg(inRangeHealth.map((h) => toNumber(h.sleepHours)).filter(Boolean)).toFixed(1)),
    waterAvg: Number(avg(inRangeHealth.map((h) => toNumber(h.water)).filter(Boolean)).toFixed(1)),
    workoutMinutes: workouts
      .filter((w) => {
        const d = startOfDay(w.date);
        return d >= startOfDay(from) && d <= startOfDay(to);
      })
      .reduce((s, w) => s + w.duration, 0),
    journalStreak: journalStreak(journal),
  };
}

/* --------------------------------- جست‌وجو --------------------------------- */
export interface SearchableItem {
  id: string;
  type: 'task' | 'note' | 'habit' | 'journal' | 'event' | 'transaction' | 'goal' | 'project' | 'health' | 'focus';
  title: string;
  subtitle?: string;
  href: string;
  icon: string;
  date?: string;
  tags?: string[];
}

/** نرمال‌سازی متن فارسی برای جست‌وجوی دقیق‌تر */
export function normalizeFa(text: string): string {
  return text
    .replace(/[ىي]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u0652\u200c]/g, '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[أإآ]/g, 'ا')
    .toLowerCase()
    .trim();
}

/** ساخت نمایه جست‌وجوی سراسری از تمام ماژول‌ها */
export function buildSearchIndex(input: {
  tasks: Task[];
  notes: { id: string; title: string; content: string; tags: string[] }[];
  habits: Habit[];
  journal: JournalEntry[];
  events: { id: string; title: string; description?: string; start: string }[];
  transactions: Transaction[];
  goals: Goal[];
  projects: { id: string; name: string; description?: string }[];
}): (SearchableItem & { haystack: string })[] {
  const items: (SearchableItem & { haystack: string })[] = [];

  input.tasks.forEach((t) =>
    items.push({
      id: t.id,
      type: 'task',
      title: t.title,
      subtitle: t.description,
      href: `/tasks?q=${encodeURIComponent(t.title)}`,
      icon: 'CheckSquare',
      date: t.dueDate,
      tags: t.tags,
      haystack: normalizeFa([t.title, t.description ?? '', t.tags.join(' ')].join(' ')),
    })
  );

  input.notes.forEach((n) =>
    items.push({
      id: n.id,
      type: 'note',
      title: n.title,
      subtitle: n.content.replace(/<[^>]*>/g, ' ').slice(0, 90),
      href: `/notes?id=${n.id}`,
      icon: 'StickyNote',
      tags: n.tags,
      haystack: normalizeFa([n.title, n.content.replace(/<[^>]*>/g, ' '), n.tags.join(' ')].join(' ')),
    })
  );

  input.habits.forEach((h) =>
    items.push({
      id: h.id,
      type: 'habit',
      title: h.name,
      subtitle: 'عادت',
      href: '/habits',
      icon: 'Flame',
      haystack: normalizeFa(h.name),
    })
  );

  input.journal.forEach((j) =>
    items.push({
      id: j.id,
      type: 'journal',
      title: j.title || formatJalali(j.date, 'DD MMMM YYYY'),
      subtitle: j.content.replace(/<[^>]*>/g, ' ').slice(0, 90),
      href: `/journal?date=${j.date}`,
      icon: 'BookHeart',
      date: j.date,
      haystack: normalizeFa([j.title, j.content, j.lessons, j.highlights, j.gratitude.join(' ')].join(' ')),
    })
  );

  input.events.forEach((e) =>
    items.push({
      id: e.id,
      type: 'event',
      title: e.title,
      subtitle: e.description,
      href: `/calendar?date=${dayKey(e.start)}`,
      icon: 'CalendarDays',
      date: e.start,
      haystack: normalizeFa([e.title, e.description ?? ''].join(' ')),
    })
  );

  input.transactions.forEach((t) =>
    items.push({
      id: t.id,
      type: 'transaction',
      title: t.title,
      subtitle: t.type === 'income' ? 'درآمد' : t.type === 'expense' ? 'هزینه' : 'انتقال',
      href: '/finance',
      icon: 'Wallet',
      date: t.date,
      haystack: normalizeFa([t.title, t.note ?? '', t.tags.join(' ')].join(' ')),
    })
  );

  input.goals.forEach((g) =>
    items.push({
      id: g.id,
      type: 'goal',
      title: g.title,
      subtitle: g.category,
      href: '/goals',
      icon: 'Target',
      haystack: normalizeFa([g.title, g.description ?? '', g.category].join(' ')),
    })
  );

  input.projects.forEach((p) =>
    items.push({
      id: p.id,
      type: 'project',
      title: p.name,
      subtitle: p.description,
      href: '/projects',
      icon: 'FolderKanban',
      haystack: normalizeFa([p.name, p.description ?? ''].join(' ')),
    })
  );

  return items;
}

/** جست‌وجو در نمایه با رتبه‌بندی ساده (عنوان مهم‌تر از توضیحات) */
export function searchIndex(
  index: (SearchableItem & { haystack: string })[],
  query: string,
  limit = 20
): SearchableItem[] {
  const q = normalizeFa(query);
  if (!q) return [];
  return index
    .map((item) => {
      const title = normalizeFa(item.title);
      let score = 0;
      if (title === q) score += 100;
      if (title.startsWith(q)) score += 60;
      if (title.includes(q)) score += 40;
      if (item.haystack.includes(q)) score += 18;
      if (item.tags?.some((t) => normalizeFa(t).includes(q))) score += 12;
      return { item, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item);
}

/** گروه‌بندی نتایج بر اساس نوع برای نمایش */
export function groupSearchResults(results: SearchableItem[]) {
  const labels: Record<string, string> = {
    task: 'تسک‌ها',
    note: 'یادداشت‌ها',
    habit: 'عادت‌ها',
    journal: 'ژورنال',
    event: 'رویدادها',
    transaction: 'مالی',
    goal: 'اهداف',
    project: 'پروژه‌ها',
  };
  const groups = new Map<string, SearchableItem[]>();
  results.forEach((r) => {
    if (!groups.has(r.type)) groups.set(r.type, []);
    groups.get(r.type)!.push(r);
  });
  return [...groups.entries()].map(([type, items]) => ({ type, label: labels[type] ?? type, items }));
}
