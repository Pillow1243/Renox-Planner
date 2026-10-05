/**
 * فروشگاه مرکزی برنامه (Zustand + persist)
 * -------------------------------------------------------------
 * معماری «Local-First»: همه داده‌ها در مرورگر کاربر ذخیره می‌شوند (بدون هزینه،
 * بدون سرور) و ساختار آن‌ها دقیقاً آینه مدل Prisma است؛ بنابراین اگر روزی
 * Backend فعال شد، فقط لایه‌ی داده عوض می‌شود و کامپوننت‌ها دست‌نخورده می‌مانند.
 */
'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_CITIES, STORAGE_KEY } from '@/lib/constants';
import { dayKey, toJalali } from '@/lib/jalali';
import {
  createSeedAccounts,
  createSeedBudgets,
  createSeedCategories,
  createSeedEvents,
  createSeedFolders,
  createSeedFoods,
  createSeedGoals,
  createSeedHabitLogs,
  createSeedHabits,
  createSeedHealth,
  createSeedJournal,
  createSeedMedications,
  createSeedNotes,
  createSeedNotifications,
  createSeedProjects,
  createSeedReminders,
  createSeedSessions,
  createSeedTasks,
  createSeedTransactions,
  createSeedUser,
  createSeedWorkouts,
} from '@/lib/seed';
import type {
  Account,
  AppNotification,
  Attachment,
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
  KeyResult,
  Medication,
  Note,
  Project,
  Reminder,
  Settings,
  SubTask,
  Task,
  TaskStatus,
  ThemeMode,
  Transaction,
  UserProfile,
  WorkoutLog,
} from '@/lib/types';
import { nowISO, uid } from '@/lib/utils';

/* --------------------------------- وضعیت --------------------------------- */
export interface PlannerState {
  /** نسخه داده برای مهاجرت‌های آینده */
  schemaVersion: number;
  hydrated: boolean;
  user: UserProfile | null;
  onboardingDone: boolean;
  settings: Settings;

  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  habits: Habit[];
  habitLogs: HabitLog[];
  events: CalendarEvent[];
  notes: Note[];
  folders: Folder[];
  journal: JournalEntry[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  health: HealthLog[];
  workouts: WorkoutLog[];
  medications: Medication[];
  foods: FoodLog[];
  sessions: FocusSession[];
  reminders: Reminder[];
  notifications: AppNotification[];
}

export interface PlannerActions {
  setHydrated: (v: boolean) => void;
  /* کاربر و تنظیمات */
  setUser: (patch: Partial<UserProfile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setTheme: (theme: ThemeMode) => void;
  setApiKey: (provider: string, key: string) => void;
  completeOnboarding: (payload: {
    name: string;
    goals: string[];
    habits: { name: string; icon: string; color: string }[];
  }) => void;
  /* تسک‌ها */
  addTask: (task: Partial<Task>) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;
  moveTask: (id: string, status: TaskStatus, order?: number) => void;
  reorderTasks: (ids: string[]) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;
  addAttachment: (taskId: string, file: Attachment) => void;
  removeAttachment: (taskId: string, attachmentId: string) => void;
  /* پروژه‌ها */
  addProject: (project: Partial<Project>) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  removeProject: (id: string) => void;
  /* اهداف */
  addGoal: (goal: Partial<Goal>) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  addKeyResult: (goalId: string, kr: Partial<KeyResult>) => void;
  updateKeyResult: (goalId: string, krId: string, patch: Partial<KeyResult>) => void;
  removeKeyResult: (goalId: string, krId: string) => void;
  /* عادت‌ها */
  addHabit: (habit: Partial<Habit>) => Habit;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  removeHabit: (id: string) => void;
  setHabitCount: (habitId: string, date: string, count: number) => void;
  toggleHabit: (habitId: string, date?: string) => void;
  /* تقویم */
  addEvent: (event: Partial<CalendarEvent>) => CalendarEvent;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
  /* یادداشت */
  addNote: (note: Partial<Note>) => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  removeNote: (id: string) => void;
  addFolder: (folder: Partial<Folder>) => Folder;
  removeFolder: (id: string) => void;
  /* ژورنال */
  upsertJournal: (date: string, patch: Partial<JournalEntry>) => void;
  removeJournal: (id: string) => void;
  /* مالی */
  addTransaction: (txn: Partial<Transaction>) => Transaction;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  addAccount: (account: Partial<Account>) => Account;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  addCategory: (category: Partial<Category>) => Category;
  removeCategory: (id: string) => void;
  addBudget: (budget: Partial<Budget>) => Budget;
  updateBudget: (id: string, patch: Partial<Budget>) => void;
  removeBudget: (id: string) => void;
  /* سلامت */
  upsertHealth: (date: string, patch: Partial<HealthLog>) => void;
  addWater: (date: string, delta?: number) => void;
  addWorkout: (workout: Partial<WorkoutLog>) => WorkoutLog;
  removeWorkout: (id: string) => void;
  addMedication: (med: Partial<Medication>) => Medication;
  updateMedication: (id: string, patch: Partial<Medication>) => void;
  removeMedication: (id: string) => void;
  addFood: (food: Partial<FoodLog>) => FoodLog;
  removeFood: (id: string) => void;
  /* تمرکز */
  addSession: (session: Partial<FocusSession>) => void;
  removeSession: (id: string) => void;
  /* یادآور و اعلان */
  addReminder: (reminder: Partial<Reminder>) => Reminder;
  updateReminder: (id: string, patch: Partial<Reminder>) => void;
  removeReminder: (id: string) => void;
  notify: (n: Partial<AppNotification>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  /* داده */
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
  loadDemoData: () => void;
}

export type PlannerStore = PlannerState & PlannerActions;

/* ------------------------------ تنظیمات پیش‌فرض --------------------------- */
export function defaultSettings(): Settings {
  return {
    theme: 'system',
    accent: '#57886A',
    currency: 'IRR',
    timezone: 'Asia/Tehran',
    weekStart: 0,
    language: 'fa',
    notifications: {
      push: true,
      telegram: false,
      email: false,
      dailyDigest: true,
      habitReminder: true,
      taskReminder: true,
    },
    dayStart: '08:00',
    waterGoal: 8,
    sleepGoal: 8,
    sounds: true,
    dashboardLayout: ['today', 'stats', 'week-chart', 'habits', 'goals', 'quote', 'weather', 'upcoming'],
    apiKeys: {},
    city: DEFAULT_CITIES[0],
  };
}

/** ساخت داده نمونه کامل */
function buildDemoData() {
  const categories = createSeedCategories();
  const habits = createSeedHabits();
  return {
    user: createSeedUser(),
    tasks: createSeedTasks(),
    projects: createSeedProjects(),
    goals: createSeedGoals(),
    habits,
    habitLogs: createSeedHabitLogs(habits),
    events: createSeedEvents(),
    notes: createSeedNotes(),
    folders: createSeedFolders(),
    journal: createSeedJournal(),
    accounts: createSeedAccounts(),
    categories,
    transactions: createSeedTransactions(categories),
    budgets: createSeedBudgets(categories),
    health: createSeedHealth(),
    workouts: createSeedWorkouts(),
    medications: createSeedMedications(),
    foods: createSeedFoods(),
    sessions: createSeedSessions(),
    reminders: createSeedReminders(),
    notifications: createSeedNotifications(),
  };
}

const EMPTY_DATA = {
  user: null as UserProfile | null,
  tasks: [] as Task[],
  projects: [] as Project[],
  goals: [] as Goal[],
  habits: [] as Habit[],
  habitLogs: [] as HabitLog[],
  events: [] as CalendarEvent[],
  notes: [] as Note[],
  folders: [] as Folder[],
  journal: [] as JournalEntry[],
  accounts: [] as Account[],
  categories: [] as Category[],
  transactions: [] as Transaction[],
  budgets: [] as Budget[],
  health: [] as HealthLog[],
  workouts: [] as WorkoutLog[],
  medications: [] as Medication[],
  foods: [] as FoodLog[],
  sessions: [] as FocusSession[],
  reminders: [] as Reminder[],
  notifications: [] as AppNotification[],
};

/** به‌روزرسانی یک آیتم در آرایه بر اساس شناسه */
function patchList<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export const usePlanner = create<PlannerStore>()(
  persist(
    (set, get) => ({
      schemaVersion: 1,
      hydrated: false,
      onboardingDone: false,
      settings: defaultSettings(),
      ...buildDemoData(),

      setHydrated: (v) => set({ hydrated: v }),

      /* ---------------------------- کاربر و تنظیمات --------------------------- */
      setUser: (patch) =>
        set((s) => ({
          user: s.user ? { ...s.user, ...patch } : { ...createSeedUser(), ...patch },
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),

      setApiKey: (provider, key) =>
        set((s) => ({ settings: { ...s.settings, apiKeys: { ...s.settings.apiKeys, [provider]: key } } })),

      completeOnboarding: ({ name, goals, habits }) =>
        set((s) => {
          const icons = ['Sprout', 'Dumbbell', 'BookOpen', 'Wallet', 'HeartPulse', 'Moon', 'Brain', 'Flame'];
          const newHabits: Habit[] = habits.map((h, i) => ({
            id: uid('hbt'),
            name: h.name,
            icon: h.icon || icons[i % icons.length],
            color: h.color,
            frequency: 'daily',
            weekdays: [0, 1, 2, 3, 4, 5, 6],
            target: 1,
            kind: 'good',
            createdAt: nowISO(),
            updatedAt: nowISO(),
          }));
          const newGoals: Goal[] = goals.map((title, i) => ({
            id: uid('gol'),
            title,
            horizon: i % 3 === 0 ? 'short' : i % 3 === 1 ? 'mid' : 'long',
            category: 'شخصی',
            color: ['#57886A', '#6C7FA8', '#AD9268', '#BE7857'][i % 4],
            progress: 0,
            keyResults: [],
            completed: false,
            createdAt: nowISO(),
            updatedAt: nowISO(),
          }));
          return {
            onboardingDone: true,
            user: s.user ? { ...s.user, name } : { ...createSeedUser(), name },
            habits: newHabits.length ? [...newHabits, ...s.habits] : s.habits,
            goals: newGoals.length ? [...newGoals, ...s.goals] : s.goals,
            notifications: [
              {
                id: uid('ntf'),
                title: 'رنوکس آماده است 🚀',
                body: 'اهداف و عادت‌های شما ثبت شد. از داشبورد شروع کنید.',
                type: 'success',
                read: false,
                href: '/',
                createdAt: nowISO(),
              },
              ...s.notifications,
            ],
          };
        }),

      /* -------------------------------- تسک‌ها -------------------------------- */
      addTask: (task) => {
        const created: Task = {
          id: uid('tsk'),
          title: task.title?.trim() || 'تسک بدون عنوان',
          description: task.description,
          status: task.status ?? 'todo',
          priority: task.priority ?? 'medium',
          important: task.important ?? true,
          urgent: task.urgent ?? false,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          projectId: task.projectId,
          goalId: task.goalId,
          tags: task.tags ?? [],
          subtasks: task.subtasks ?? [],
          attachments: task.attachments ?? [],
          repeat: task.repeat ?? 'none',
          estimate: task.estimate,
          spent: task.spent ?? 0,
          reminderAt: task.reminderAt,
          order: -Date.now(),
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        set((s) => ({ tasks: [created, ...s.tasks] }));
        return created;
      },

      updateTask: (id, patch) =>
        set((s) => ({ tasks: patchList(s.tasks, id, { ...patch, updatedAt: nowISO() }) })),

      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      toggleTaskDone: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: t.status === 'done' ? 'todo' : 'done',
                  completedAt: t.status === 'done' ? undefined : nowISO(),
                  updatedAt: nowISO(),
                }
              : t
          ),
        })),

      moveTask: (id, status, order) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  order: order ?? t.order,
                  completedAt: status === 'done' ? nowISO() : undefined,
                  updatedAt: nowISO(),
                }
              : t
          ),
        })),

      reorderTasks: (ids) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (ids.includes(t.id) ? { ...t, order: ids.indexOf(t.id) } : t)),
        })),

      toggleSubtask: (taskId, subtaskId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: t.subtasks.map((st) => (st.id === subtaskId ? { ...st, done: !st.done } : st)),
                  updatedAt: nowISO(),
                }
              : t
          ),
        })),

      addSubtask: (taskId, title) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: [...t.subtasks, { id: uid('st'), title, done: false }], updatedAt: nowISO() }
              : t
          ),
        })),

      removeSubtask: (taskId, subtaskId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, subtasks: t.subtasks.filter((st) => st.id !== subtaskId) } : t
          ),
        })),

      addAttachment: (taskId, file) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, attachments: [...t.attachments, file] } : t)),
        })),

      removeAttachment: (taskId, attachmentId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, attachments: t.attachments.filter((a) => a.id !== attachmentId) } : t
          ),
        })),

      /* ------------------------------- پروژه‌ها ------------------------------- */
      addProject: (project) => {
        const created: Project = {
          id: uid('prj'),
          name: project.name?.trim() || 'پروژه بی‌نام',
          description: project.description,
          color: project.color ?? '#57886A',
          icon: project.icon ?? 'Folder',
          archived: false,
          dueDate: project.dueDate,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        set((s) => ({ projects: [created, ...s.projects] }));
        return created;
      },
      updateProject: (id, patch) =>
        set((s) => ({ projects: patchList(s.projects, id, { ...patch, updatedAt: nowISO() }) })),
      removeProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t)),
        })),

      /* --------------------------------- اهداف -------------------------------- */
      addGoal: (goal) => {
        const created: Goal = {
          id: uid('gol'),
          title: goal.title?.trim() || 'هدف بی‌نام',
          description: goal.description,
          horizon: goal.horizon ?? 'short',
          category: goal.category ?? 'شخصی',
          color: goal.color ?? '#57886A',
          targetDate: goal.targetDate,
          progress: goal.progress ?? 0,
          keyResults: goal.keyResults ?? [],
          completed: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        set((s) => ({ goals: [created, ...s.goals] }));
        return created;
      },
      updateGoal: (id, patch) => set((s) => ({ goals: patchList(s.goals, id, { ...patch, updatedAt: nowISO() }) })),
      removeGoal: (id) =>
        set((s) => ({
          goals: s.goals.filter((g) => g.id !== id),
          tasks: s.tasks.map((t) => (t.goalId === id ? { ...t, goalId: undefined } : t)),
        })),
      addKeyResult: (goalId, kr) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  keyResults: [
                    ...g.keyResults,
                    { id: uid('kr'), title: kr.title ?? 'نتیجه کلیدی', target: kr.target ?? 100, current: kr.current ?? 0, unit: kr.unit },
                  ],
                }
              : g
          ),
        })),
      updateKeyResult: (goalId, krId, patch) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, keyResults: g.keyResults.map((kr) => (kr.id === krId ? { ...kr, ...patch } : kr)) }
              : g
          ),
        })),
      removeKeyResult: (goalId, krId) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId ? { ...g, keyResults: g.keyResults.filter((kr) => kr.id !== krId) } : g
          ),
        })),

      /* -------------------------------- عادت‌ها ------------------------------- */
      addHabit: (habit) => {
        const created: Habit = {
          id: uid('hbt'),
          name: habit.name?.trim() || 'عادت جدید',
          icon: habit.icon ?? 'Check',
          color: habit.color ?? '#57886A',
          frequency: habit.frequency ?? 'daily',
          weekdays: habit.weekdays ?? [0, 1, 2, 3, 4, 5, 6],
          target: habit.target ?? 1,
          unit: habit.unit,
          kind: habit.kind ?? 'good',
          reminderTime: habit.reminderTime,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        set((s) => ({ habits: [created, ...s.habits] }));
        return created;
      },
      updateHabit: (id, patch) => set((s) => ({ habits: patchList(s.habits, id, { ...patch, updatedAt: nowISO() }) })),
      removeHabit: (id) =>
        set((s) => ({
          habits: s.habits.filter((h) => h.id !== id),
          habitLogs: s.habitLogs.filter((l) => l.habitId !== id),
        })),

      setHabitCount: (habitId, date, count) =>
        set((s) => {
          const existing = s.habitLogs.find((l) => l.habitId === habitId && l.date === date);
          if (count <= 0) {
            return { habitLogs: s.habitLogs.filter((l) => !(l.habitId === habitId && l.date === date)) };
          }
          if (existing) {
            return { habitLogs: s.habitLogs.map((l) => (l.id === existing.id ? { ...l, count } : l)) };
          }
          return { habitLogs: [...s.habitLogs, { id: uid('hlog'), habitId, date, count }] };
        }),

      toggleHabit: (habitId, date = dayKey(new Date())) => {
        const habit = get().habits.find((h) => h.id === habitId);
        const existing = get().habitLogs.find((l) => l.habitId === habitId && l.date === date);
        const target = habit?.target ?? 1;
        if (!existing) get().setHabitCount(habitId, date, target);
        else if (target > 1 && existing.count < target) get().setHabitCount(habitId, date, target);
        else get().setHabitCount(habitId, date, 0);
      },

      /* -------------------------------- تقویم --------------------------------- */
      addEvent: (event) => {
        const created: CalendarEvent = {
          id: uid('evt'),
          title: event.title?.trim() || 'رویداد جدید',
          description: event.description,
          type: event.type ?? 'event',
          start: event.start ?? nowISO(),
          end: event.end,
          allDay: event.allDay ?? false,
          location: event.location,
          color: event.color ?? '#57886A',
          projectId: event.projectId,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        set((s) => ({ events: [created, ...s.events] }));
        return created;
      },
      updateEvent: (id, patch) => set((s) => ({ events: patchList(s.events, id, { ...patch, updatedAt: nowISO() }) })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      /* ------------------------------ یادداشت‌ها ------------------------------ */
      addNote: (note) => {
        const created: Note = {
          id: uid('not'),
          title: note.title?.trim() || 'یادداشت بدون عنوان',
          content: note.content ?? '',
          folderId: note.folderId,
          tags: note.tags ?? [],
          pinned: note.pinned ?? false,
          color: note.color,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        set((s) => ({ notes: [created, ...s.notes] }));
        return created;
      },
      updateNote: (id, patch) => set((s) => ({ notes: patchList(s.notes, id, { ...patch, updatedAt: nowISO() }) })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      addFolder: (folder) => {
        const created: Folder = {
          id: uid('fld'),
          name: folder.name?.trim() || 'پوشه جدید',
          icon: folder.icon ?? 'Folder',
          color: folder.color ?? '#AD9268',
          createdAt: nowISO(),
        };
        set((s) => ({ folders: [...s.folders, created] }));
        return created;
      },
      removeFolder: (id) =>
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== id),
          notes: s.notes.map((n) => (n.folderId === id ? { ...n, folderId: undefined } : n)),
        })),

      /* --------------------------------- ژورنال ------------------------------- */
      upsertJournal: (date, patch) =>
        set((s) => {
          const existing = s.journal.find((j) => j.date === date);
          if (existing) {
            return { journal: patchList(s.journal, existing.id, { ...patch, updatedAt: nowISO() }) };
          }
          const created: JournalEntry = {
            id: uid('jnl'),
            date,
            title: patch.title ?? '',
            content: patch.content ?? '',
            mood: patch.mood ?? 3,
            energy: patch.energy ?? 5,
            gratitude: patch.gratitude ?? [],
            lessons: patch.lessons ?? '',
            highlights: patch.highlights ?? '',
            photo: patch.photo,
            weather: patch.weather,
            createdAt: nowISO(),
            updatedAt: nowISO(),
          };
          return { journal: [created, ...s.journal] };
        }),
      removeJournal: (id) => set((s) => ({ journal: s.journal.filter((j) => j.id !== id) })),

      /* ---------------------------------- مالی --------------------------------- */
      addTransaction: (txn) => {
        const amount = txn.amount ?? 0;
        const created: Transaction = {
          id: uid('txn'),
          type: txn.type ?? 'expense',
          amount,
          currency: txn.currency ?? 'IRR',
          amountBase: txn.amountBase ?? amount,
          categoryId: txn.categoryId,
          accountId: txn.accountId,
          toAccountId: txn.toAccountId,
          title: txn.title?.trim() || 'تراکنش',
          note: txn.note,
          date: txn.date ?? nowISO(),
          tags: txn.tags ?? [],
          recurring: txn.recurring ?? false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        set((s) => {
          // به‌روزرسانی موجودی کیف پول
          const accounts = s.accounts.map((a) => {
            if (a.id === created.accountId) {
              const delta = created.type === 'expense' ? -created.amountBase : created.type === 'income' ? created.amountBase : 0;
              return { ...a, balance: a.balance + delta };
            }
            if (a.id === created.toAccountId && created.type === 'transfer') {
              return { ...a, balance: a.balance + created.amountBase };
            }
            return a;
          });
          return { transactions: [created, ...s.transactions], accounts };
        });
        return created;
      },
      updateTransaction: (id, patch) =>
        set((s) => ({ transactions: patchList(s.transactions, id, { ...patch, updatedAt: nowISO() }) })),
      removeTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
      addAccount: (account) => {
        const created: Account = {
          id: uid('acc'),
          name: account.name?.trim() || 'کیف پول',
          type: account.type ?? 'cash',
          balance: account.balance ?? 0,
          currency: account.currency ?? 'IRR',
          color: account.color ?? '#57886A',
          createdAt: nowISO(),
        };
        set((s) => ({ accounts: [...s.accounts, created] }));
        return created;
      },
      updateAccount: (id, patch) => set((s) => ({ accounts: patchList(s.accounts, id, patch) })),
      removeAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),
      addCategory: (category) => {
        const created: Category = {
          id: uid('cat'),
          name: category.name?.trim() || 'دسته جدید',
          icon: category.icon ?? 'Tag',
          color: category.color ?? '#AD9268',
          type: category.type ?? 'expense',
          createdAt: nowISO(),
        };
        set((s) => ({ categories: [...s.categories, created] }));
        return created;
      },
      removeCategory: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
      addBudget: (budget) => {
        const created: Budget = {
          id: uid('bdg'),
          categoryId: budget.categoryId ?? '',
          amount: budget.amount ?? 0,
          month: budget.month ?? `${toJalali(new Date()).jy}-${String(toJalali(new Date()).jm).padStart(2, '0')}`,
          createdAt: nowISO(),
        };
        set((s) => ({ budgets: [...s.budgets, created] }));
        return created;
      },
      updateBudget: (id, patch) => set((s) => ({ budgets: patchList(s.budgets, id, patch) })),
      removeBudget: (id) => set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),

      /* --------------------------------- سلامت -------------------------------- */
      upsertHealth: (date, patch) =>
        set((s) => {
          const existing = s.health.find((h) => h.date === date);
          if (existing) return { health: patchList(s.health, existing.id, patch) };
          const created: HealthLog = { id: uid('hlt'), date, createdAt: nowISO(), ...patch };
          return { health: [created, ...s.health] };
        }),

      addWater: (date, delta = 1) =>
        set((s) => {
          const existing = s.health.find((h) => h.date === date);
          if (existing) {
            return {
              health: patchList(s.health, existing.id, { water: Math.max(0, (existing.water ?? 0) + delta) }),
            };
          }
          return { health: [{ id: uid('hlt'), date, water: Math.max(0, delta), createdAt: nowISO() }, ...s.health] };
        }),

      addWorkout: (workout) => {
        const created: WorkoutLog = {
          id: uid('wkt'),
          date: workout.date ?? dayKey(new Date()),
          title: workout.title?.trim() || 'تمرین',
          type: workout.type ?? 'هوازی',
          duration: workout.duration ?? 30,
          calories: workout.calories,
          intensity: workout.intensity ?? 2,
          exercises: workout.exercises ?? [],
          createdAt: nowISO(),
        };
        set((s) => ({ workouts: [created, ...s.workouts] }));
        return created;
      },
      removeWorkout: (id) => set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),
      addMedication: (med) => {
        const created: Medication = {
          id: uid('med'),
          name: med.name?.trim() || 'دارو',
          dose: med.dose ?? '',
          times: med.times ?? ['09:00'],
          startDate: med.startDate ?? dayKey(new Date()),
          endDate: med.endDate,
          active: med.active ?? true,
          createdAt: nowISO(),
        };
        set((s) => ({ medications: [...s.medications, created] }));
        return created;
      },
      updateMedication: (id, patch) => set((s) => ({ medications: patchList(s.medications, id, patch) })),
      removeMedication: (id) => set((s) => ({ medications: s.medications.filter((m) => m.id !== id) })),
      addFood: (food) => {
        const created: FoodLog = {
          id: uid('food'),
          date: food.date ?? dayKey(new Date()),
          meal: food.meal ?? 'lunch',
          title: food.title?.trim() || 'وعده غذایی',
          calories: food.calories ?? 0,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          createdAt: nowISO(),
        };
        set((s) => ({ foods: [created, ...s.foods] }));
        return created;
      },
      removeFood: (id) => set((s) => ({ foods: s.foods.filter((f) => f.id !== id) })),

      /* -------------------------------- تمرکز -------------------------------- */
      addSession: (session) =>
        set((s) => ({
          sessions: [
            {
              id: uid('foc'),
              startedAt: session.startedAt ?? nowISO(),
              minutes: session.minutes ?? 25,
              mode: session.mode ?? 'focus',
              completed: session.completed ?? true,
              taskId: session.taskId,
              label: session.label,
            },
            ...s.sessions,
          ],
        })),
      removeSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),

      /* ----------------------------- یادآور و اعلان --------------------------- */
      addReminder: (reminder) => {
        const created: Reminder = {
          id: uid('rmd'),
          title: reminder.title?.trim() || 'یادآور',
          at: reminder.at ?? nowISO(),
          channel: reminder.channel ?? 'in-app',
          repeat: reminder.repeat ?? 'none',
          relatedType: reminder.relatedType,
          relatedId: reminder.relatedId,
          done: false,
          createdAt: nowISO(),
        };
        set((s) => ({ reminders: [created, ...s.reminders] }));
        return created;
      },
      updateReminder: (id, patch) => set((s) => ({ reminders: patchList(s.reminders, id, patch) })),
      removeReminder: (id) => set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),
      notify: (n) =>
        set((s) => ({
          notifications: [
            {
              id: uid('ntf'),
              title: n.title ?? 'اعلان',
              body: n.body ?? '',
              type: n.type ?? 'info',
              read: false,
              href: n.href,
              createdAt: nowISO(),
            },
            ...s.notifications,
          ].slice(0, 100),
        })),
      markNotificationRead: (id) => set((s) => ({ notifications: patchList(s.notifications, id, { read: true }) })),
      markAllNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      clearNotifications: () => set({ notifications: [] }),

      /* ---------------------------------- داده --------------------------------- */
      exportJSON: () => {
        const s = get();
        const payload = {
          app: 'Renox Planner',
          version: 1,
          exportedAt: nowISO(),
          data: {
            user: s.user,
            onboardingDone: s.onboardingDone,
            settings: s.settings,
            tasks: s.tasks,
            projects: s.projects,
            goals: s.goals,
            habits: s.habits,
            habitLogs: s.habitLogs,
            events: s.events,
            notes: s.notes,
            folders: s.folders,
            journal: s.journal,
            accounts: s.accounts,
            categories: s.categories,
            transactions: s.transactions,
            budgets: s.budgets,
            health: s.health,
            workouts: s.workouts,
            medications: s.medications,
            foods: s.foods,
            sessions: s.sessions,
            reminders: s.reminders,
            notifications: s.notifications,
          },
        };
        return JSON.stringify(payload, null, 2);
      },

      importJSON: (json) => {
        try {
          const parsed = JSON.parse(json);
          const data = parsed.data ?? parsed;
          set({ ...EMPTY_DATA, ...data, hydrated: true });
          return true;
        } catch {
          return false;
        }
      },

      resetAll: () => set({ ...EMPTY_DATA, onboardingDone: false, settings: defaultSettings() }),

      loadDemoData: () => set({ ...buildDemoData(), onboardingDone: true }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const { hydrated: _hydrated, ...rest } = state;
        const persisted: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rest)) {
          if (typeof value !== 'function') persisted[key] = value;
        }
        return persisted as unknown as PlannerStore;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PlannerState>;
        return {
          ...current,
          ...p,
          settings: { ...defaultSettings(), ...(p.settings ?? {}), notifications: { ...defaultSettings().notifications, ...(p.settings?.notifications ?? {}) } },
          hydrated: true,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

/** دسترسی مستقیم به وضعیت خارج از کامپوننت (برای گزارش‌ها و صادرسازی) */
export const plannerState = () => usePlanner.getState();
