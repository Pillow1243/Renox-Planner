'use client';

/** نوار پایین موبایل با ۵ تب اصلی و دسترسی سریع به منوی بیشتر */
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from '@/lib/constants';
import { cn, toPersianDigits } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { usePlanner } from '@/stores/planner-store';
import { dayKey } from '@/lib/jalali';

const TAB_HREFS = ['/', '/tasks', '/calendar', '/habits', '/more'] as const;

export function MobileTabBar({ onOpenMore }: { onOpenMore: () => void }) {
  const pathname = usePathname();
  const tasks = usePlanner((s) => s.tasks);
  const habits = usePlanner((s) => s.habits);
  const habitLogs = usePlanner((s) => s.habitLogs);
  const today = dayKey(new Date());

  const counts: Record<string, number> = {
    '/tasks': tasks.filter((t) => t.status !== 'done').length,
    '/habits': habits.filter((h) => (habitLogs.find((l) => l.habitId === h.id && l.date === today)?.count ?? 0) < (h.target || 1)).length,
  };

  return (
    <nav
      className="no-print safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-[rgb(var(--border))] bg-[rgb(var(--bg)/0.9)] backdrop-blur-xl lg:hidden"
      aria-label="ناوبری اصلی"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 py-1.5">
        {TAB_HREFS.map((href) => {
          const item = navItemFor(href);
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          const count = counts[href] ?? 0;
          const content = (
            <>
              <span className="relative">
                <Icon name={item.icon} size={21} />
                {count > 0 && (
                  <span className="num absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[rgb(var(--accent))] px-1 text-[9px] font-bold text-[rgb(var(--accent-contrast))]">
                    {toPersianDigits(count > 9 ? '۹+' : count)}
                  </span>
                )}
              </span>
              <span className="text-[10.5px] font-semibold">{item.label}</span>
              {active && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute -top-[7px] h-[3px] w-8 rounded-full bg-[rgb(var(--accent))]"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
            </>
          );

          return (
            <li key={href} className="flex-1">
              {href === '/more' ? (
                <button
                  onClick={onOpenMore}
                  className="relative flex w-full flex-col items-center gap-1 rounded-xl py-2 text-[rgb(var(--text-subtle))] transition-colors active:scale-95"
                >
                  {content}
                </button>
              ) : (
                <Link
                  href={href}
                  className={cn(
                    'relative flex w-full flex-col items-center gap-1 rounded-xl py-2 transition-colors active:scale-95',
                    active ? 'text-[rgb(var(--accent))]' : 'text-[rgb(var(--text-subtle))]'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function navItemFor(href: string) {
  if (href === '/more') return { icon: 'Grid2x2', label: 'بیشتر' };
  return NAV_ITEMS.find((i) => i.href === href) ?? { icon: 'Circle', label: '' };
}

export default MobileTabBar;
