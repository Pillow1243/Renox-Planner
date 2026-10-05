'use client';

/**
 * میزبان دیالوگ‌های «افزودن سریع»
 * با فراخوانی open('task') از هر نقطه برنامه، این کامپوننت دیالوگ مناسب را باز می‌کند.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { dayKey } from '@/lib/jalali';
import { useQuickAdd } from './quick-add-context';
import { TaskDialog } from './task-dialog';
import {
  AccountDialog,
  BudgetDialog,
  EventDialog,
  FoodDialog,
  GoalDialog,
  HabitDialog,
  HealthDialog,
  MedicationDialog,
  NoteDialog,
  ProjectDialog,
  QuickJournalDialog,
  TransactionDialog,
  WorkoutDialog,
} from './dialogs';
import { Modal } from '@/components/ui/modal';

export function QuickAddHost() {
  const { active, payload, close } = useQuickAdd();
  const router = useRouter();

  // برای ژورنال و تمرکز، به صفحه مربوطه هدایت می‌کنیم
  React.useEffect(() => {
    if (active === 'journal') {
      close();
      router.push('/journal');
    }
    if (active === 'focus') {
      close();
      router.push('/focus');
    }
  }, [active, close, router]);

  const date = (payload?.date as string) ?? dayKey(new Date());

  return (
    <>
      <TaskDialog open={active === 'task'} onClose={close} initial={payload?.initial as never} />
      <NoteDialog open={active === 'note'} onClose={close} />
      <TransactionDialog open={active === 'transaction'} onClose={close} initialType={(payload?.type as 'income' | 'expense') ?? 'expense'} />
      <HabitDialog open={active === 'habit'} onClose={close} />
      <EventDialog open={active === 'event'} onClose={close} />
      <GoalDialog open={active === 'goal'} onClose={close} />
      <ProjectDialog open={active === 'project'} onClose={close} />
      <HealthDialog open={active === 'health'} onClose={close} date={date} />
      <WorkoutDialog open={active === 'workout'} onClose={close} date={date} />
      <FoodDialog open={active === 'meal'} onClose={close} date={date} />
      <MedicationDialog open={active === 'medication'} onClose={close} />
      <BudgetDialog open={active === 'budget'} onClose={close} />
      <AccountDialog open={active === 'account'} onClose={close} />
      <QuickJournalDialog open={active === 'quick-journal'} onClose={close} date={date} />

      {/* راهنمای میانبرها */}
      <ShortcutsHelp open={active === 'shortcuts'} onClose={close} />
    </>
  );
}

/** پنجره راهنمای میانبرهای کیبورد */
export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rows = [
    { keys: ['⌘', 'K'], label: 'جست‌وجوی سراسری / پالت فرمان' },
    { keys: ['⌘', 'N'], label: 'تسک جدید' },
    { keys: ['⌘', 'J'], label: 'ژورنال امروز' },
    { keys: ['⌘', '⇧', 'N'], label: 'یادداشت جدید' },
    { keys: ['⌘', '/'], label: 'همین راهنما' },
    { keys: ['Esc'], label: 'بستن پنجره‌ها' },
    { keys: ['G', 'D'], label: 'رفتن به داشبورد' },
    { keys: ['G', 'T'], label: 'رفتن به تسک‌ها' },
  ];
  return (
    <Modal open={open} onClose={onClose} title="میانبرهای کیبورد" description="با سرعت بیشتری حرکت کن." size="sm">
      <ul className="space-y-2 pb-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] px-3 py-2.5">
            <span className="text-sm">{r.label}</span>
            <span className="flex gap-1">
              {r.keys.map((k) => (
                <kbd
                  key={k}
                  className="num rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-2 py-1 text-[11px] font-bold"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
