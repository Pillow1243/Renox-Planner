/**
 * داده‌های نمونه (Seed) — با اولین اجرا بارگذاری می‌شوند تا کاربر
 * بلافاصله یک برنامه‌ریز زنده و پر از محتوا ببیند. از تنظیمات قابل پاک‌سازی است.
 */
import { DEFAULT_CATEGORIES } from './constants';
import { addDays, dayKey, toJalali } from './jalali';
import { nowISO, uid } from './utils';
import type {
  Account,
  AppNotification,
  Budget,
  CalendarEvent,
  Category,
  FocusSession,
  Folder,
  FoodLog,
  Goal,
  Habit,
  HabitLog,
  HealthLog,
  JournalEntry,
  Medication,
  Note,
  Project,
  Reminder,
  Task,
  Transaction,
  UserProfile,
  WorkoutLog,
} from './types';

const iso = (d: Date) => d.toISOString();
const d = (offset: number) => addDays(new Date(), offset);

export function createSeedUser(): UserProfile {
  return {
    id: uid('usr'),
    name: 'کاربر رنوکس',
    email: 'you@renox.app',
    bio: 'در حال ساختن نسخهٔ بهتری از خودم، یک روز در یک زمان.',
    currency: 'IRR',
    timezone: 'Asia/Tehran',
    createdAt: nowISO(),
  };
}

export function createSeedProjects(): Project[] {
  const base = { archived: false, createdAt: nowISO(), updatedAt: nowISO() };
  return [
    { id: 'prj_life', name: 'رشد شخصی', description: 'عادت‌ها، مطالعه و یادگیری', color: '#57886A', icon: 'Sprout', ...base },
    { id: 'prj_work', name: 'کار و حرفه', description: 'پروژه‌های شغلی و درآمد', color: '#6C7FA8', icon: 'Briefcase', ...base },
    { id: 'prj_home', name: 'خانه و خانواده', description: 'کارهای خانه و روابط', color: '#BE7857', icon: 'Home', ...base },
  ];
}

export function createSeedTasks(): Task[] {
  const t = (over: Partial<Task>): Task => ({
    id: uid('tsk'),
    title: '',
    status: 'todo',
    priority: 'medium',
    important: true,
    urgent: false,
    tags: [],
    subtasks: [],
    attachments: [],
    repeat: 'none',
    spent: 0,
    order: 0,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...over,
  });

  return [
    t({
      title: 'مرور اهداف هفتگی و تنظیم اولویت‌ها',
      description: 'هر شنبه صبح ۳۰ دقیقه برای بازبینی هفته.',
      priority: 'high',
      urgent: true,
      important: true,
      dueDate: iso(d(0)),
      dueTime: '09:30',
      projectId: 'prj_life',
      tags: ['برنامه‌ریزی', 'هفتگی'],
      repeat: 'weekly',
      estimate: 30,
      subtasks: [
        { id: uid('st'), title: 'بازبینی تسک‌های عقب‌افتاده', done: true },
        { id: uid('st'), title: 'انتخاب ۳ اولویت اصلی هفته', done: false },
        { id: uid('st'), title: 'به‌روزرسانی تقویم', done: false },
      ],
      status: 'in_progress',
    }),
    t({
      title: 'طراحی صفحه فرود پروژه جدید',
      projectId: 'prj_work',
      priority: 'urgent',
      urgent: true,
      important: true,
      dueDate: iso(d(1)),
      dueTime: '14:00',
      tags: ['طراحی', 'UI'],
      estimate: 180,
      subtasks: [
        { id: uid('st'), title: 'جمع‌آوری رفرنس', done: true },
        { id: uid('st'), title: 'وایرفریم', done: true },
        { id: uid('st'), title: 'نمونه رنگی', done: false },
        { id: uid('st'), title: 'تحویل به تیم بک‌اند', done: false },
      ],
    }),
    t({
      title: 'پرداخت قبض‌های ماه',
      projectId: 'prj_home',
      priority: 'high',
      urgent: true,
      important: false,
      dueDate: iso(d(3)),
      tags: ['مالی'],
      repeat: 'monthly',
      estimate: 20,
    }),
    t({
      title: 'مطالعه ۳۰ صفحه از کتاب «عادت‌های اتمی»',
      projectId: 'prj_life',
      priority: 'medium',
      important: true,
      dueDate: iso(d(0)),
      tags: ['کتاب', 'یادگیری'],
      repeat: 'daily',
      estimate: 45,
      status: 'in_progress',
    }),
    t({
      title: 'برنامه‌ریزی سفر آخر هفته',
      projectId: 'prj_home',
      priority: 'low',
      important: false,
      dueDate: iso(d(6)),
      tags: ['تفریح'],
      estimate: 60,
    }),
    t({
      title: 'ورزش صبحگاهی — دوی سبک',
      projectId: 'prj_life',
      priority: 'high',
      important: true,
      dueDate: iso(d(0)),
      dueTime: '06:30',
      tags: ['سلامت'],
      repeat: 'weekdays',
      estimate: 40,
      status: 'done',
      completedAt: iso(new Date()),
      spent: 35,
    }),
    t({
      title: 'جلسه هفتگی تیم محصول',
      projectId: 'prj_work',
      priority: 'medium',
      important: true,
      urgent: true,
      dueDate: iso(d(2)),
      dueTime: '11:00',
      tags: ['جلسه'],
      estimate: 60,
    }),
    t({
      title: 'به‌روزرسانی رزومه و پورتفولیو',
      priority: 'medium',
      important: true,
      dueDate: iso(d(12)),
      tags: ['شغلی'],
      estimate: 120,
      status: 'review',
    }),
  ];
}

export function createSeedGoals(): Goal[] {
  return [
    {
      id: uid('gol'),
      title: 'رسیدن به وزن سالم و آمادگی جسمانی',
      description: 'کاهش تدریجی وزن با تغذیه متعادل و ورزش منظم',
      horizon: 'mid',
      category: 'سلامت',
      color: '#57886A',
      progress: 0,
      keyResults: [
        { id: uid('kr'), title: 'ورزش در هفته', target: 4, current: 3, unit: 'جلسه' },
        { id: uid('kr'), title: 'نوشیدن آب روزانه', target: 8, current: 6, unit: 'لیوان' },
      ],
      completed: false,
      targetDate: iso(d(90)),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    {
      id: uid('gol'),
      title: 'راه‌اندازی کسب‌وکار فریلنس',
      description: 'رسیدن به درآمد ماهانه پایدار از پروژه‌های مستقل',
      horizon: 'long',
      category: 'مالی',
      color: '#6C7FA8',
      progress: 35,
      keyResults: [
        { id: uid('kr'), title: 'مشتری فعال', target: 5, current: 2, unit: 'نفر' },
        { id: uid('kr'), title: 'درآمد ماهانه', target: 100, current: 35, unit: 'میلیون' },
      ],
      completed: false,
      targetDate: iso(d(240)),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    {
      id: uid('gol'),
      title: 'یادگیری عمیق TypeScript و معماری نرم‌افزار',
      horizon: 'short',
      category: 'یادگیری',
      color: '#AD9268',
      progress: 60,
      keyResults: [{ id: uid('kr'), title: 'ساعت مطالعه', target: 40, current: 24, unit: 'ساعت' }],
      completed: false,
      targetDate: iso(d(45)),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
  ];
}

export function createSeedHabits(): Habit[] {
  const h = (over: Partial<Habit>): Habit => ({
    id: uid('hbt'),
    name: '',
    icon: 'Check',
    color: '#57886A',
    frequency: 'daily',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    target: 1,
    kind: 'good',
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...over,
  });
  return [
    h({ name: 'نوشیدن ۸ لیوان آب', icon: 'Droplets', color: '#4F8A96', target: 8, unit: 'لیوان' }),
    h({ name: 'مطالعه', icon: 'BookOpen', color: '#AD9268', target: 1, unit: 'جلسه' }),
    h({ name: 'ورزش', icon: 'Dumbbell', color: '#57886A', frequency: 'weekly', weekdays: [0, 2, 4] }),
    h({ name: 'مدیتیشن ۱۰ دقیقه', icon: 'Flower2', color: '#8C6FA8' }),
    h({ name: 'خواب پیش از ۲۳', icon: 'Moon', color: '#6C7FA8' }),
    h({ name: 'نوشتن ژورنال', icon: 'PenLine', color: '#BE7857' }),
  ];
}

/** لاگ عادت‌های ۳۵ روز گذشته برای نمایش Heatmap و Streak واقعی */
export function createSeedHabitLogs(habits: Habit[]): HabitLog[] {
  const logs: HabitLog[] = [];
  const today = new Date();
  habits.forEach((habit, hi) => {
    for (let i = 0; i < 35; i += 1) {
      const date = addDays(today, -i);
      // الگوی شبه‌تصادفی اما ثابت برای هر عادت
      const seed = (hi * 7 + i * 13) % 10;
      const skip = habit.frequency === 'weekly' ? ![0, 2, 4].includes((date.getDay() + 1) % 7) : false;
      if (skip) continue;
      if (seed < 3) continue;
      logs.push({
        id: uid('hlog'),
        habitId: habit.id,
        date: dayKey(date),
        count: habit.target,
      });
    }
  });
  return logs;
}

export function createSeedEvents(): CalendarEvent[] {
  const e = (over: Partial<CalendarEvent>): CalendarEvent => ({
    id: uid('evt'),
    title: '',
    type: 'event',
    start: iso(new Date()),
    allDay: false,
    color: '#57886A',
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...over,
  });
  const at = (offset: number, hour: number, minute = 0) => {
    const date = addDays(new Date(), offset);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };
  return [
    e({ title: 'باشگاه ورزشی', start: at(0, 7, 0), end: at(0, 8, 30), color: '#57886A', type: 'event' }),
    e({ title: 'جلسه بررسی پروژه', start: at(0, 11, 0), end: at(0, 12, 0), color: '#6C7FA8', type: 'meeting' }),
    e({ title: 'شام خانوادگی', start: at(1, 20, 0), color: '#BE7857', type: 'event' }),
    e({ title: 'تولد دوستم سارا', start: at(4, 0, 0), allDay: true, color: '#B06A79', type: 'birthday' }),
    e({ title: 'کلاس زبان انگلیسی', start: at(2, 18, 30), end: at(2, 20, 0), color: '#AD9268', type: 'event' }),
    e({ title: 'آزمون پایان دوره', start: at(9, 10, 0), color: '#C0554A', type: 'exam' }),
  ];
}

export function createSeedNotes(): Note[] {
  return [
    {
      id: uid('not'),
      title: 'ایده‌های بهبود بهره‌وری',
      content:
        '<p>۱. شروع روز با سه اولویت مشخص<br>۲. بلوک‌بندی زمان برای کار عمیق<br>۳. قطع اعلان‌ها در ساعت‌های تمرکز<br>۴. بازبینی هفتگی هر شنبه</p>',
      tags: ['بهره‌وری', 'ایده'],
      folderId: 'fld_ideas',
      pinned: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    {
      id: uid('not'),
      title: 'لیست خرید ماهانه',
      content: '<p>برنج، روغن، حبوبات، میوه، مواد شوینده و دستمال کاغذی.</p>',
      tags: ['خرید'],
      folderId: 'fld_home',
      pinned: false,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    {
      id: uid('not'),
      title: 'خلاصه کتاب عادت‌های اتمی',
      content:
        '<p>عادت = نشانه ← اشتیاق ← پاسخ ← پاداش.<br>برای ساختن عادت خوب: واضح، جذاب، آسان، رضایت‌بخش.<br>قانون دو دقیقه: عادت را کوچک شروع کن.</p>',
      tags: ['کتاب', 'یادگیری'],
      folderId: 'fld_learn',
      pinned: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
  ];
}

export function createSeedFolders(): Folder[] {
  return [
    { id: 'fld_ideas', name: 'ایده‌ها', icon: 'Lightbulb', color: '#AD9268', createdAt: nowISO() },
    { id: 'fld_home', name: 'خانه', icon: 'Home', color: '#BE7857', createdAt: nowISO() },
    { id: 'fld_learn', name: 'یادگیری', icon: 'GraduationCap', color: '#57886A', createdAt: nowISO() },
  ];
}

export function createSeedJournal(): JournalEntry[] {
  const entries: JournalEntry[] = [];
  for (let i = 0; i < 12; i += 1) {
    const date = addDays(new Date(), -i);
    const moods = [5, 4, 4, 3, 4, 5, 3, 4, 4, 5, 4, 3] as const;
    entries.push({
      id: uid('jnl'),
      date: dayKey(date),
      title: i === 0 ? 'امروز، روزی برای شروع دوباره' : `یادداشت روزانه — ${dayKey(date)}`,
      content:
        i === 0
          ? '<p>امروز تمرکزم روی کار عمیق بود و توانستم مهم‌ترین کار روز را پیش از ظهر تمام کنم. انرژی‌ام خوب بود و بعد از ورزش احساس سبکی داشتم.</p>'
          : '<p>روز آرامی بود؛ چند کار عقب‌افتاده را بستم و کمی هم مطالعه کردم.</p>',
      mood: moods[i],
      energy: 7 - (i % 3),
      gratitude: i % 2 === 0 ? ['سلامتی', 'خانواده', 'فرصت یادگیری'] : ['یک روز آرام'],
      lessons: i === 0 ? 'شروع روز با سخت‌ترین کار، کل روز را سبک می‌کند.' : 'برنامه‌ریزی شب قبل، صبح‌ها را نجات می‌دهد.',
      highlights: i === 0 ? 'تکمیل تمرکز ۹۰ دقیقه‌ای بدون حواس‌پرتی' : 'پیاده‌روی عصرگاهی',
      createdAt: iso(date),
      updatedAt: iso(date),
    });
  }
  return entries;
}

export function createSeedAccounts(): Account[] {
  return [
    { id: 'acc_cash', name: 'نقدی', type: 'cash', balance: 4_500_000, currency: 'IRR', color: '#57886A', createdAt: nowISO() },
    { id: 'acc_bank', name: 'حساب بانکی', type: 'bank', balance: 42_800_000, currency: 'IRR', color: '#6C7FA8', createdAt: nowISO() },
    { id: 'acc_crypto', name: 'کیف پول رمزارز', type: 'crypto', balance: 12_300_000, currency: 'IRR', color: '#AD9268', createdAt: nowISO() },
  ];
}

export function createSeedCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((cat) => ({ id: uid('cat'), ...cat, createdAt: nowISO() }));
}

export function createSeedTransactions(categories: Category[]): Transaction[] {
  const find = (name: string) => categories.find((c) => c.name === name)?.id;
  const list: Transaction[] = [];
  const mk = (
    type: Transaction['type'],
    title: string,
    categoryName: string,
    amount: number,
    dayOffset: number,
    accountId = 'acc_bank'
  ) => {
    list.push({
      id: uid('txn'),
      type,
      title,
      amount,
      currency: 'IRR',
      amountBase: amount,
      categoryId: find(categoryName),
      accountId,
      date: iso(addDays(new Date(), dayOffset)),
      tags: [],
      recurring: false,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
  };
  mk('income', 'حقوق مهر ماه', 'حقوق', 48_000_000, -5);
  mk('income', 'پروژه طراحی سایت', 'فریلنس', 15_000_000, -12);
  mk('expense', 'خرید هفتگی سوپرمارکت', 'خوراک', 2_350_000, -1, 'acc_cash');
  mk('expense', 'اجاره خانه', 'اجاره', 18_000_000, -3);
  mk('expense', 'تاکسی و مترو', 'حمل‌ونقل', 780_000, -2, 'acc_cash');
  mk('expense', 'اشتراک اینترنت', 'قبوض', 620_000, -4);
  mk('expense', 'کتاب و دوره آنلاین', 'آموزش', 1_450_000, -6);
  mk('expense', 'شام بیرون با دوستان', 'تفریح', 1_900_000, -8, 'acc_cash');
  mk('expense', 'دارو و مکمل', 'سلامت', 940_000, -9);
  mk('expense', 'هدیه تولد', 'هدیه', 1_200_000, -11, 'acc_cash');
  mk('expense', 'خرید پوشاک', 'خرید', 3_100_000, -14);
  mk('expense', 'خرید میوه', 'خوراک', 890_000, -16, 'acc_cash');
  return list;
}

export function createSeedBudgets(categories: Category[]): Budget[] {
  const { jy, jm } = toJalali(new Date());
  const month = `${jy}-${String(jm).padStart(2, '0')}`;
  const budgetOf = (name: string, amount: number) => {
    const cat = categories.find((c) => c.name === name);
    if (!cat) return null;
    return { id: uid('bdg'), categoryId: cat.id, amount, month, createdAt: nowISO() } as Budget;
  };
  return [budgetOf('خوراک', 8_000_000), budgetOf('حمل‌ونقل', 3_000_000), budgetOf('تفریح', 4_000_000)].filter(
    Boolean
  ) as Budget[];
}

export function createSeedHealth(): HealthLog[] {
  const logs: HealthLog[] = [];
  for (let i = 0; i < 21; i += 1) {
    const date = addDays(new Date(), -i);
    logs.push({
      id: uid('hlt'),
      date: dayKey(date),
      weight: Number((79.4 - i * 0.06 + (i % 3) * 0.15).toFixed(1)),
      height: 178,
      sleepHours: Number((7.2 - (i % 4) * 0.35 + (i % 2) * 0.4).toFixed(1)),
      sleepQuality: 4 - (i % 2),
      steps: 6200 + ((i * 731) % 4200),
      water: 5 + (i % 4),
      calories: 1850 + ((i * 97) % 520),
      createdAt: iso(date),
    });
  }
  return logs;
}

export function createSeedWorkouts(): WorkoutLog[] {
  const w = (offset: number, title: string, type: string, duration: number, calories: number): WorkoutLog => ({
    id: uid('wkt'),
    date: dayKey(addDays(new Date(), offset)),
    title,
    type,
    duration,
    calories,
    intensity: 2,
    exercises: [
      { name: 'اسکات', sets: 3, reps: 12, weight: 40 },
      { name: 'پرس سینه', sets: 3, reps: 10, weight: 35 },
      { name: 'پلانک', sets: 3, reps: 1, weight: 0 },
    ],
    createdAt: nowISO(),
  });
  return [
    w(0, 'تمرین قدرتی بالاتنه', 'قدرتی', 50, 380),
    w(-1, 'دوی سبک در پارک', 'هوازی', 35, 300),
    w(-3, 'تمرین پایین‌تنه', 'قدرتی', 55, 420),
    w(-5, 'یوگا و کشش', 'یوگا', 30, 140),
  ];
}

export function createSeedMedications(): Medication[] {
  return [
    {
      id: uid('med'),
      name: 'ویتامین D',
      dose: '۱۰۰۰ واحد',
      times: ['09:00'],
      startDate: dayKey(new Date()),
      active: true,
      createdAt: nowISO(),
    },
    {
      id: uid('med'),
      name: 'مکمل آهن',
      dose: '۱ قرص',
      times: ['21:00'],
      startDate: dayKey(new Date()),
      active: true,
      createdAt: nowISO(),
    },
  ];
}

export function createSeedFoods(): FoodLog[] {
  const mk = (offset: number, meal: FoodLog['meal'], title: string, calories: number): FoodLog => ({
    id: uid('food'),
    date: dayKey(addDays(new Date(), offset)),
    meal,
    title,
    calories,
    protein: 22,
    carbs: 48,
    fat: 14,
    createdAt: nowISO(),
  });
  return [
    mk(0, 'breakfast', 'املت با نان سبوس‌دار', 420),
    mk(0, 'lunch', 'مرغ و برنج قهوه‌ای', 680),
    mk(0, 'snack', 'ماست و میوه', 180),
    mk(-1, 'dinner', 'سوپ سبزیجات', 310),
  ];
}

export function createSeedSessions(): FocusSession[] {
  const list: FocusSession[] = [];
  for (let i = 0; i < 14; i += 1) {
    const started = addDays(new Date(), -i);
    started.setHours(9 + (i % 5), 0, 0, 0);
    list.push({
      id: uid('foc'),
      startedAt: started.toISOString(),
      minutes: 25 * (1 + (i % 3)),
      mode: 'focus',
      completed: true,
      label: i % 3 === 0 ? 'کار عمیق روی پروژه' : 'مطالعه و یادگیری',
    });
  }
  return list;
}

export function createSeedReminders(): Reminder[] {
  return [
    {
      id: uid('rmd'),
      title: 'بررسی تسک‌های امروز',
      at: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
      channel: 'push',
      repeat: 'daily',
      relatedType: 'custom',
      done: false,
      createdAt: nowISO(),
    },
    {
      id: uid('rmd'),
      title: 'نوشیدن آب',
      at: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
      channel: 'in-app',
      repeat: 'daily',
      relatedType: 'habit',
      done: false,
      createdAt: nowISO(),
    },
  ];
}

export function createSeedNotifications(): AppNotification[] {
  return [
    {
      id: uid('ntf'),
      title: 'به Renox Planner خوش آمدید 🎉',
      body: 'برای شروع، اهداف و عادت‌های خود را در تنظیمات اولیه انتخاب کنید.',
      type: 'success',
      read: false,
      href: '/settings',
      createdAt: nowISO(),
    },
    {
      id: uid('ntf'),
      title: 'یادآوری عادت',
      body: 'امروز فقط ۵ لیوان آب نوشیده‌اید؛ ۳ لیوان دیگر تا هدف روزانه.',
      type: 'info',
      read: false,
      href: '/habits',
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
      id: uid('ntf'),
      title: 'گزارش هفتگی آماده است',
      body: 'نرخ تکمیل تسک‌های این هفته: ۷۸٪ — نگاهی به گزارش بیندازید.',
      type: 'info',
      read: true,
      href: '/reports',
      createdAt: new Date(Date.now() - 86400_000).toISOString(),
    },
  ];
}
