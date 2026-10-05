/**
 * تایپ‌های سراسری Renox Planner
 * این تایپ‌ها آینه‌ی مدل داده Prisma (server/prisma/schema.prisma) هستند
 * تا مهاجرت از حالت Local-First به Backend کاملاً یک‌به‌یک باشد.
 */

export type ID = string;
export type ISO = string;

/* ---------------------------------- کاربر --------------------------------- */
export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  id: ID;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  birthDate?: string;
  /** واحد پول پیش‌فرض */
  currency: string;
  timezone: string;
  createdAt: ISO;
}

/* ---------------------------------- تسک‌ها -------------------------------- */
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays';

export interface SubTask {
  id: ID;
  title: string;
  done: boolean;
}

export interface Attachment {
  id: ID;
  name: string;
  size: number;
  type: string;
  /** در حالت دمو فقط نام نگه داشته می‌شود؛ در نسخه سروری URL فایل ذخیره می‌شود */
  url?: string;
}

export interface Task {
  id: ID;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  /** مهم و فوری — ماتریس آیزنهاور */
  important: boolean;
  urgent: boolean;
  dueDate?: ISO;
  dueTime?: string;
  projectId?: ID;
  goalId?: ID;
  tags: string[];
  subtasks: SubTask[];
  attachments: Attachment[];
  repeat: RepeatRule;
  /** تخمین زمان به دقیقه */
  estimate?: number;
  /** زمان صرف‌شده به دقیقه */
  spent: number;
  reminderAt?: ISO;
  completedAt?: ISO;
  order: number;
  createdAt: ISO;
  updatedAt: ISO;
}

/* --------------------------------- پروژه‌ها ------------------------------- */
export interface Project {
  id: ID;
  name: string;
  description?: string;
  color: string;
  icon: string;
  archived: boolean;
  dueDate?: ISO;
  createdAt: ISO;
  updatedAt: ISO;
}

/* ------------------------------- اهداف و OKR ------------------------------ */
export type GoalHorizon = 'short' | 'mid' | 'long';

export interface KeyResult {
  id: ID;
  title: string;
  target: number;
  current: number;
  unit?: string;
}

export interface Goal {
  id: ID;
  title: string;
  description?: string;
  horizon: GoalHorizon;
  category: string;
  color: string;
  targetDate?: ISO;
  /** پیشرفت دستی در صورتی که KR تعریف نشده باشد */
  progress: number;
  keyResults: KeyResult[];
  completed: boolean;
  createdAt: ISO;
  updatedAt: ISO;
}

/* ---------------------------------- عادت‌ها ------------------------------- */
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';
export type HabitKind = 'good' | 'bad';

export interface Habit {
  id: ID;
  name: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  /** روزهای هفته مورد نظر (۰=شنبه) برای عادت هفتگی */
  weekdays: number[];
  /** هدف تعداد در روز */
  target: number;
  unit?: string;
  kind: HabitKind;
  reminderTime?: string;
  createdAt: ISO;
  updatedAt: ISO;
}

export interface HabitLog {
  id: ID;
  habitId: ID;
  /** کلید روز به شکل YYYY-MM-DD */
  date: string;
  count: number;
  note?: string;
}

/* --------------------------------- رویدادها ------------------------------- */
export type EventType = 'event' | 'reminder' | 'meeting' | 'birthday' | 'exam';

export interface CalendarEvent {
  id: ID;
  title: string;
  description?: string;
  type: EventType;
  start: ISO;
  end?: ISO;
  allDay: boolean;
  location?: string;
  color: string;
  projectId?: ID;
  /** کد رنگ/شناسه رویداد گوگل در صورت همگام‌سازی */
  googleId?: string;
  createdAt: ISO;
  updatedAt: ISO;
}

/* -------------------------------- یادداشت‌ها ------------------------------- */
export interface Note {
  id: ID;
  title: string;
  /** محتوای HTML از ویرایشگر */
  content: string;
  folderId?: ID;
  tags: string[];
  pinned: boolean;
  color?: string;
  createdAt: ISO;
  updatedAt: ISO;
}

export interface Folder {
  id: ID;
  name: string;
  icon: string;
  color: string;
  createdAt: ISO;
}

/* ---------------------------------- ژورنال -------------------------------- */
export type Mood = 1 | 2 | 3 | 4 | 5;

export interface JournalEntry {
  id: ID;
  /** کلید روز YYYY-MM-DD — هر روز یک ورودی */
  date: string;
  title: string;
  content: string;
  mood: Mood;
  energy: number; // ۱ تا ۱۰
  gratitude: string[];
  lessons: string;
  highlights: string;
  photo?: string;
  weather?: string;
  createdAt: ISO;
  updatedAt: ISO;
}

/* ----------------------------------- مالی --------------------------------- */
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Account {
  id: ID;
  name: string;
  type: 'cash' | 'bank' | 'card' | 'crypto' | 'other';
  balance: number;
  currency: string;
  color: string;
  createdAt: ISO;
}

export interface Category {
  id: ID;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  createdAt: ISO;
}

export interface Transaction {
  id: ID;
  type: TransactionType;
  amount: number;
  currency: string;
  /** معادل ریالی برای گزارش‌های یکپارچه */
  amountBase: number;
  categoryId?: ID;
  accountId?: ID;
  toAccountId?: ID;
  title: string;
  note?: string;
  date: ISO;
  tags: string[];
  recurring: boolean;
  createdAt: ISO;
  updatedAt: ISO;
}

export interface Budget {
  id: ID;
  categoryId: ID;
  amount: number;
  /** ماه شمسی متنی مثل 1404-07 */
  month: string;
  createdAt: ISO;
}

/* ---------------------------------- سلامت --------------------------------- */
export interface HealthLog {
  id: ID;
  date: string; // YYYY-MM-DD
  weight?: number; // کیلوگرم
  height?: number; // سانتی‌متر
  sleepHours?: number;
  sleepQuality?: number; // ۱ تا ۵
  steps?: number;
  water?: number; // لیوان
  calories?: number;
  mood?: Mood;
  notes?: string;
  createdAt: ISO;
}

export interface WorkoutLog {
  id: ID;
  date: string;
  title: string;
  type: string;
  duration: number; // دقیقه
  calories?: number;
  intensity: 1 | 2 | 3;
  exercises: { name: string; sets?: number; reps?: number; weight?: number }[];
  createdAt: ISO;
}

export interface Medication {
  id: ID;
  name: string;
  dose: string;
  times: string[];
  startDate: string;
  endDate?: string;
  active: boolean;
  createdAt: ISO;
}

export interface FoodLog {
  id: ID;
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  createdAt: ISO;
}

/* --------------------------------- پومودورو -------------------------------- */
export interface FocusSession {
  id: ID;
  taskId?: ID;
  startedAt: ISO;
  minutes: number;
  mode: 'focus' | 'break';
  completed: boolean;
  label?: string;
}

/* --------------------------------- یادآورها ------------------------------- */
export type ReminderChannel = 'push' | 'telegram' | 'email' | 'in-app';

export interface Reminder {
  id: ID;
  title: string;
  at: ISO;
  channel: ReminderChannel;
  repeat: RepeatRule;
  relatedType?: 'task' | 'habit' | 'event' | 'custom';
  relatedId?: ID;
  done: boolean;
  createdAt: ISO;
}

/* -------------------------------- اعلان‌ها -------------------------------- */
export interface AppNotification {
  id: ID;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  href?: string;
  createdAt: ISO;
}

/* -------------------------------- تنظیمات --------------------------------- */
export interface Settings {
  theme: ThemeMode;
  /** شاخص رنگ لهجه */
  accent: string;
  currency: string;
  timezone: string;
  weekStart: number;
  language: 'fa' | 'en';
  notifications: {
    push: boolean;
    telegram: boolean;
    email: boolean;
    dailyDigest: boolean;
    habitReminder: boolean;
    taskReminder: boolean;
  };
  telegramChatId?: string;
  /** ساعت شروع روز برای برنامه‌ریزی */
  dayStart: string;
  /** هدف روزانه آب (لیوان) */
  waterGoal: number;
  /** هدف خواب شبانه */
  sleepGoal: number;
  /** فعال بودن افکت صوتی پومودورو */
  sounds: boolean;
  /** چیدمان کارت‌های داشبورد */
  dashboardLayout: string[];
  /** کلیدهای API رایگان (اختیاری — در مرورگر کاربر ذخیره می‌شود) */
  apiKeys: Record<string, string>;
  /** شهر برای آب‌وهوا */
  city: { name: string; latitude: number; longitude: number };
}

/* --------------------------------- جستجو ---------------------------------- */
export interface SearchResult {
  id: string;
  type: 'task' | 'note' | 'habit' | 'journal' | 'event' | 'transaction' | 'goal' | 'project';
  title: string;
  subtitle?: string;
  href: string;
  icon: string;
  date?: string;
}

/* ------------------------------- وضعیت گزارش ------------------------------- */
export interface ReportSummary {
  tasksCompleted: number;
  tasksCreated: number;
  completionRate: number;
  focusMinutes: number;
  habitRate: number;
  income: number;
  expense: number;
  sleepAvg: number;
  waterAvg: number;
  workoutMinutes: number;
  journalStreak: number;
}
