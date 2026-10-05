'use client';

/**
 * دکمه شناور رادیال (FAB)
 * با یک کلیک، پنج اقدام سریع به‌صورت شعاعی باز می‌شوند:
 * تسک، یادداشت، هزینه، عادت، رویداد
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@/components/ui/icon';
import { useQuickAdd, type QuickAddKind } from '@/components/shared/quick-add-context';
import { cn } from '@/lib/utils';

interface Action {
  kind: QuickAddKind;
  label: string;
  icon: string;
  color: string;
  payload?: Record<string, unknown>;
}

const ACTIONS: Action[] = [
  { kind: 'task', label: 'تسک', icon: 'CheckSquare', color: '#57886A' },
  { kind: 'note', label: 'یادداشت', icon: 'StickyNote', color: '#AD9268' },
  { kind: 'transaction', label: 'هزینه', icon: 'Wallet', color: '#BE7857', payload: { type: 'expense' } },
  { kind: 'habit', label: 'عادت', icon: 'Flame', color: '#8C6FA8' },
  { kind: 'event', label: 'رویداد', icon: 'CalendarDays', color: '#6C7FA8' },
];

export function RadialFab() {
  const [open, setOpen] = React.useState(false);
  const { open: openDialog } = useQuickAdd();

  // بستن با Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const radius = 108;

  return (
    <div className="no-print fixed bottom-20 left-4 z-[60] lg:bottom-8 lg:left-8">
      {/* پرده پشت‌زمینه هنگام باز بودن */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 -z-10 bg-[rgb(20_16_10/0.28)] backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {/* اقدام‌های شعاعی */}
      <AnimatePresence>
        {open &&
          ACTIONS.map((action, i) => {
            // چیدمان شعاعی در ربع بالا-راست (RTL: سمت راست دکمه)
            const angle = -10 - i * 19; // درجه
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            return (
              <motion.button
                key={action.kind}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                animate={{ opacity: 1, x, y, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28, delay: i * 0.035 }}
                onClick={() => {
                  setOpen(false);
                  openDialog(action.kind, action.payload);
                }}
                className="absolute bottom-1.5 right-1.5 flex h-12 items-center gap-2 rounded-2xl px-3.5 shadow-lifted"
                style={{ backgroundColor: action.color, color: 'white' }}
                aria-label={action.label}
              >
                <Icon name={action.icon} size={17} />
                <span className="text-xs font-bold">{action.label}</span>
              </motion.button>
            );
          })}
      </AnimatePresence>

      {/* دکمه اصلی */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'بستن منوی سریع' : 'افزودن سریع'}
        aria-expanded={open}
        className={cn(
          'relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[rgb(var(--accent))] to-[#4F8A96] text-white shadow-glow transition-transform duration-300 active:scale-95',
          open && 'rotate-45'
        )}
      >
        {!open && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-[rgb(var(--accent)/0.5)]" />}
        <Icon name="Plus" size={26} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export default RadialFab;
