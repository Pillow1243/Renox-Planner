/**
 * تست‌های محاسباتی (انتخابگرها): عادت، مالی، گزارش، OKR، سلامت و جست‌وجو
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dayKey, startOfDay } from '../lib/jalali';
import {
  bmi,
  bmiZone,
  buildReportSummary,
  buildSearchIndex,
  financeSummary,
  goalProgress,
  habitCompletionRate,
  habitHeatmapData,
  habitStreak,
  projectProgress,
  searchIndex,
  todayTasks,
} from '../lib/selectors';
import type { Category, Goal, Habit, HabitLog, HealthLog, Task, Transaction } from '../lib/types';

const base = { userId: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

const makeHabit = (over: Partial<Habit> = {}): Habit =>
  ({ ...base, id: 'h1', name: 'مطالعه', icon: 'BookOpen', color: '#57886A', frequency: 'daily', weekdays: [0, 1, 2, 3, 4, 5, 6], target: 1, kind: 'good', archived: false, ...over }) as Habit;

const makeLog = (date: Date, over: Partial<HabitLog> = {}): HabitLog =>
  ({ ...base, id: `l-${dayKey(date)}`, habitId: 'h1', date: dayKey(date), count: 1, ...over }) as unknown as HabitLog;

const makeTask = (over: Partial<Task> = {}): Task =>
  ({ ...base, id: `t${Math.random()}`, title: 'کار', status: 'todo', priority: 'medium', important: true, urgent: false, repeatRule: 'none', spent: 0, order: 0, tags: [], ...over }) as Task;

test('زنجیره عادت با روزهای پیوسته درست شمرده می‌شود', () => {
  const today = startOfDay(new Date());
  const habit = makeHabit();
  const logs = [0, 1, 2, 3, 4].map((i) => makeLog(addDays(today, -i)));
  assert.equal(habitStreak(habit, logs, today), 5);

  // امروز ثبت نشده → زنجیره نشکسته؛ از دیروز شمرده می‌شود
  const withoutToday = [1, 2, 3].map((i) => makeLog(addDays(today, -i)));
  assert.equal(habitStreak(habit, withoutToday, today), 3);

  // یک روز میانی قطع شده → زنجیره از آن نقطه قطع می‌شود
  const broken = [0, 2, 3].map((i) => makeLog(addDays(today, -i)));
  assert.equal(habitStreak(habit, broken, today), 1);
});

test('نرخ پایبندی عادت‌ها بین صفر و صد است', () => {
  const today = startOfDay(new Date());
  const habits = [makeHabit()];
  const logs = Array.from({ length: 15 }, (_, i) => makeLog(addDays(today, -i)));
  const rate = habitCompletionRate(habits, logs, 30, today);
  assert.ok(rate >= 0 && rate <= 100, 'نرخ باید داخل بازه باشد');
  assert.equal(rate, 50, '۱۵ روز از ۳۰ روز → ۵۰٪');
});

test('داده هیتمپ عادت‌ها طول درست دارد', () => {
  const today = startOfDay(new Date());
  const data = habitHeatmapData([makeHabit()], [makeLog(today)], 60);
  assert.equal(data.length, 60);
  assert.equal(data[data.length - 1].value, 1, 'آخرین خانه همان امروز است');
});

test('محاسبه BMI و ناحیه آن درست است', () => {
  assert.equal(bmi(70, 175), 22.9);
  assert.equal(bmi(undefined, 175), null);
  assert.equal(bmiZone(17).label, 'کم‌وزن');
  assert.equal(bmiZone(22).label, 'وزن نرمال');
  assert.equal(bmiZone(29).label, 'اضافه‌وزن');
  assert.equal(bmiZone(35).label, 'چاقی');
});

test('پیشرفت پروژه و درصد اهداف OKR محاسبه می‌شود', () => {
  const tasks = [
    makeTask({ projectId: 'p1', status: 'done' }),
    makeTask({ projectId: 'p1', status: 'todo' }),
    makeTask({ projectId: 'p1', status: 'todo' }),
    makeTask({ projectId: 'p2', status: 'done' }),
  ];
  const progress = projectProgress(tasks, 'p1');
  assert.deepEqual(progress, { total: 3, done: 1, percent: 33 });

  const goal = {
    ...base,
    id: 'g1',
    title: 'هدف',
    horizon: 'short',
    category: 'شخصی',
    color: '#57886A',
    progress: 0,
    completed: false,
    keyResults: [
      { id: 'k1', goalId: 'g1', title: 'KR1', target: 10, current: 10 },
      { id: 'k2', goalId: 'g1', title: 'KR2', target: 10, current: 5 },
    ],
  } as unknown as Goal;
  assert.equal(goalProgress(goal), 75, 'میانگین ۱۰۰٪ و ۵۰٪ = ۷۵٪');
});

test('خلاصه مالی درآمد، هزینه و دسته‌ها را جمع می‌زند', () => {
  const categories = [
    { ...base, id: 'c1', name: 'خوراک', icon: 'Utensils', color: '#BE7857', type: 'expense' },
    { ...base, id: 'c2', name: 'حقوق', icon: 'Banknote', color: '#57886A', type: 'income' },
  ] as unknown as Category[];

  const tx = [
    { ...base, id: 'x1', type: 'income', amount: 10_000_000, amountBase: 10_000_000, title: 'حقوق', date: dayKey(new Date()), categoryId: 'c2', tags: [] },
    { ...base, id: 'x2', type: 'expense', amount: 2_000_000, amountBase: 2_000_000, title: 'خرید', date: dayKey(new Date()), categoryId: 'c1', tags: [] },
    { ...base, id: 'x3', type: 'expense', amount: 1_000_000, amountBase: 1_000_000, title: 'خرید', date: dayKey(new Date()), categoryId: 'c1', tags: [] },
  ] as unknown as Transaction[];

  const summary = financeSummary(tx, categories, addDays(new Date(), -1), addDays(new Date(), 1));
  assert.equal(summary.income, 10_000_000);
  assert.equal(summary.expense, 3_000_000);
  const food = summary.byCategory.find((c) => c.name === 'خوراک');
  assert.equal(food?.value, 3_000_000);
});

test('خلاصه گزارش همه شاخص‌های کلیدی را برمی‌گرداند', () => {
  const now = new Date();
  const tasks = [
    makeTask({ status: 'done', completedAt: dayKey(now) }),
    makeTask({ status: 'done', completedAt: dayKey(now) }),
    makeTask({ status: 'todo', dueDate: dayKey(now) }),
  ];
  const habits = [makeHabit()];
  const habitLogs = [makeLog(startOfDay(now))];
  const health = [{ ...base, id: 'hl1', date: dayKey(now), sleepHours: 7.5, water: 6 }] as unknown as HealthLog[];
  const tx = [{ ...base, id: 'x1', type: 'income', amount: 500, amountBase: 500, title: 'درآمد', date: dayKey(now), tags: [] }] as unknown as Transaction[];

  const summary = buildReportSummary({
    tasks,
    habits,
    habitLogs,
    transactions: tx,
    health,
    journal: [],
    workouts: [],
    sessions: [],
    from: addDays(now, -7),
    to: now,
  });

  assert.equal(summary.tasksCompleted, 2);
  assert.equal(summary.tasksCreated, 3);
  assert.ok(summary.completionRate > 0);
  assert.equal(summary.income, 500);
  assert.equal(summary.sleepAvg, 7.5);
});

test('تسک‌های امروز را جدا می‌کند', () => {
  const now = new Date();
  const tasks = [makeTask({ dueDate: dayKey(now) }), makeTask({ dueDate: dayKey(addDays(now, 3)) })];
  assert.equal(todayTasks(tasks).length, 1);
});

test('نمایه جست‌وجو ساخته و جست‌وجو می‌شود', () => {
  const now = new Date();
  const index = buildSearchIndex({
    tasks: [makeTask({ title: 'تهیه گزارش مالی پروژه' })],
    notes: [{ ...base, id: 'n1', title: 'ایده‌های بازاریابی', content: '<p>متن آزمایشی</p>', pinned: false, tags: [] }] as never,
    journal: [],
    events: [],
    transactions: [],
    goals: [],
    projects: [],
    habits: [makeHabit({ name: 'ورزش صبحگاهی' })],
  });

  assert.ok(index.length >= 3, 'همه انواع در نمایه هستند');
  const results = searchIndex(index, 'گزارش مالی', 5);
  assert.ok(results.length >= 1, 'نتیجه مرتبط پیدا می‌شود');
  assert.equal(results[0].type, 'task');

  // جست‌وجوی عربی/فارسی با نرمال‌سازی (ی/ي و ک/ك)
  const fa = searchIndex(index, 'ورزش صبحگاهي', 5);
  assert.ok(fa.length >= 1, 'نرمال‌سازی حروف عربی به فارسی کار می‌کند');
});
