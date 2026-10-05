'use client';

/**
 * پالت فرمان (Cmd/Ctrl + K)
 * جست‌وجوی سراسری در همه ماژول‌ها + فرمان‌های سریع ناوبری و ایجاد
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { NAV_ITEMS } from '@/lib/constants';
import { buildSearchIndex, groupSearchResults, searchIndex, type SearchableItem } from '@/lib/selectors';
import { formatJalali } from '@/lib/jalali';
import { cn, toPersianDigits } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { fireConfetti } from '@/components/ui/confetti';
import { useToast } from '@/components/ui/toast';
import { useQuickAdd, type QuickAddKind } from '@/components/shared/quick-add-context';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [cursor, setCursor] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { open: openDialog } = useQuickAdd();

  const state = usePlanner();

  /** نمایه جست‌وجو — با استفاده از useMemo تا هر تایپ دوباره ساخته نشود */
  const index = React.useMemo(
    () =>
      buildSearchIndex({
        tasks: state.tasks,
        notes: state.notes,
        habits: state.habits,
        journal: state.journal,
        events: state.events,
        transactions: state.transactions,
        goals: state.goals,
        projects: state.projects,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tasks, state.notes, state.habits, state.journal, state.events, state.transactions, state.goals, state.projects]
  );

  /** فرمان‌های ثابت */
  const commands: (SearchableItem & { run: () => void })[] = React.useMemo(
    () => [
      { id: 'cmd-task', type: 'task', title: 'ایجاد تسک جدید', subtitle: 'میانبر ⌘N', href: '', icon: 'Plus', run: () => openDialog('task') },
      { id: 'cmd-note', type: 'note', title: 'یادداشت جدید', subtitle: 'میانبر ⌘⇧N', href: '', icon: 'StickyNote', run: () => openDialog('note') },
      { id: 'cmd-expense', type: 'transaction', title: 'ثبت هزینه', subtitle: 'مالی', href: '', icon: 'Wallet', run: () => openDialog('transaction', { type: 'expense' }) },
      { id: 'cmd-income', type: 'transaction', title: 'ثبت درآمد', subtitle: 'مالی', href: '', icon: 'TrendingUp', run: () => openDialog('transaction', { type: 'income' }) },
      { id: 'cmd-habit', type: 'habit', title: 'عادت جدید', subtitle: 'عادت‌ها', href: '', icon: 'Flame', run: () => openDialog('habit') },
      { id: 'cmd-event', type: 'event', title: 'رویداد جدید', subtitle: 'تقویم', href: '', icon: 'CalendarDays', run: () => openDialog('event') },
      { id: 'cmd-goal', type: 'goal', title: 'هدف جدید', subtitle: 'اهداف و OKR', href: '', icon: 'Target', run: () => openDialog('goal') },
      { id: 'cmd-shortcuts', type: 'note', title: 'میانبرهای کیبورد', subtitle: 'راهنما', href: '', icon: 'Cpu', run: () => openDialog('shortcuts') },
      { id: 'cmd-theme', type: 'note', title: 'تغییر تم روشن/تاریک', subtitle: 'ظاهر', href: '', icon: 'Moon', run: () => state.setTheme(state.settings.theme === 'dark' ? 'light' : 'dark') },
      { id: 'cmd-export', type: 'note', title: 'پشتیبان‌گیری (JSON)', subtitle: 'داده‌ها', href: '', icon: 'Download', run: () => { router.push('/settings#data'); } },
      { id: 'cmd-demo', type: 'note', title: 'بارگذاری داده نمونه', subtitle: 'دمو', href: '', icon: 'Sparkles', run: () => { state.loadDemoData(); fireConfetti(24); toast.success('داده نمونه بارگذاری شد'); } },
      ...NAV_ITEMS.map((n) => ({
        id: `nav-${n.href}`,
        type: 'project' as const,
        title: n.label,
        subtitle: `رفتن به ${n.label}`,
        href: n.href,
        icon: n.icon,
        run: () => router.push(n.href),
      })),
    ],
    [openDialog, router, state, toast]
  );

  const results = React.useMemo(() => {
    if (!query.trim()) return [];
    const fromData = searchIndex(index, query, 14);
    const fromCommands = searchIndex(
      commands.map((c) => ({ ...c, haystack: toPersianDigits(c.title) + ' ' + c.title + ' ' + (c.subtitle ?? '') })) as never,
      query,
      6
    ) as unknown as typeof commands;
    return [...fromData, ...fromCommands];
  }, [query, index, commands]);

  const flat: (SearchableItem & { run?: () => void })[] = query.trim() ? results : commands.slice(0, 12);
  const groups = query.trim() ? groupSearchResults(results) : null;

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const run = (item: SearchableItem & { run?: () => void }) => {
    onClose();
    if (item.run) item.run();
    else if (item.href) router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flat[cursor];
      if (item) run(item);
    }
  };

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[10vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(20_16_10/0.45)] backdrop-blur-[3px] dark:bg-black/65"
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="glass relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl shadow-lifted"
            role="dialog"
            aria-label="جست‌وجوی سراسری"
          >
            <div className="flex items-center gap-3 border-b border-[rgb(var(--border))] px-4 py-3.5">
              <Icon name="Search" size={19} className="text-[rgb(var(--text-subtle))]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="جست‌وجو در تسک‌ها، یادداشت‌ها، ژورنال، مالی، رویدادها…"
                className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[rgb(var(--text-subtle))]"
                aria-label="متن جست‌وجو"
              />
              <kbd className="num rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-2 py-1 text-[10px] font-bold">Esc</kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {flat.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm font-semibold">نتیجه‌ای پیدا نشد</p>
                  <p className="mt-1 text-xs text-[rgb(var(--text-subtle))]">املای دیگری را امتحان کن یا از فرمان‌ها استفاده کن.</p>
                </div>
              ) : groups ? (
                groups.map((group) => (
                  <div key={group.type} className="mb-1">
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--text-subtle))]">{group.label}</p>
                    {group.items.map((item) => {
                      flatIndex += 1;
                      const active = flatIndex === cursor;
                      return (
                        <button
                          key={item.id}
                          onMouseEnter={() => setCursor(flatIndex)}
                          onClick={() => run(item)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-colors',
                            active ? 'bg-[rgb(var(--accent-soft))]' : 'hover:bg-[rgb(var(--text)/0.05)]'
                          )}
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]">
                            <Icon name={item.icon} size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{item.title}</span>
                            {item.subtitle && <span className="block truncate text-[11px] text-[rgb(var(--text-subtle))]">{item.subtitle}</span>}
                          </span>
                          {item.date && <span className="num shrink-0 text-[10px] text-[rgb(var(--text-subtle))]">{formatJalali(item.date, 'DD/MM')}</span>}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="space-y-0.5">
                  {commands.slice(0, 12).map((item, i) => {
                    const active = i === cursor;
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => run(item)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-colors',
                          active ? 'bg-[rgb(var(--accent-soft))]' : 'hover:bg-[rgb(var(--text)/0.05)]'
                        )}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]">
                          <Icon name={item.icon} size={15} />
                        </span>
                        <span className="flex-1 truncate text-sm font-medium">{item.title}</span>
                        {item.subtitle && <span className="text-[11px] text-[rgb(var(--text-subtle))]">{item.subtitle}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] px-4 py-2 text-[10px] text-[rgb(var(--text-subtle))]">
              <span className="flex items-center gap-3">
                <span>↑↓ حرکت</span>
                <span>↵ اجرا</span>
                <span>Esc بستن</span>
              </span>
              <span>Renox Planner</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default CommandPalette;
