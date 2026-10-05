'use client';

/**
 * سایدبار RTL با قابلیت جمع‌شدن
 * در حالت جمع‌شده فقط آیکون‌ها با Tooltip نمایش داده می‌شوند.
 */
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { NAV_GROUPS, NAV_ITEMS, APP_NAME, APP_VERSION } from '@/lib/constants';
import { cn, toPersianDigits } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Tooltip } from '@/components/ui/primitives';
import { usePlanner } from '@/stores/planner-store';
import { dayKey } from '@/lib/jalali';

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const tasks = usePlanner((s) => s.tasks);
  const habits = usePlanner((s) => s.habits);
  const habitLogs = usePlanner((s) => s.habitLogs);

  const today = dayKey(new Date());
  const openTasks = tasks.filter((t) => t.status !== 'done').length;
  const pendingHabits = habits.filter((h) => {
    const log = habitLogs.find((l) => l.habitId === h.id && l.date === today);
    return (log?.count ?? 0) < (h.target || 1);
  }).length;

  const badgeValue = (badge?: string) => {
    if (badge === 'tasks') return openTasks;
    if (badge === 'habits') return pendingHabits;
    return 0;
  };

  return (
    <aside
      className={cn(
        'no-print sticky top-0 hidden h-screen shrink-0 flex-col border-l border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.72)] backdrop-blur-xl transition-[width] duration-300 ease-natural lg:flex',
        collapsed ? 'w-[86px]' : 'w-[268px]'
      )}
    >
      {/* برند */}
      <div className="flex h-[72px] items-center gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[rgb(var(--accent))] to-[#4F8A96] text-lg font-black text-white shadow-glow">
            R
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-extrabold">{APP_NAME}</span>
              <span className="block text-[11px] text-[rgb(var(--text-subtle))]">نسخه {toPersianDigits(APP_VERSION)}</span>
            </span>
          )}
        </Link>
      </div>

      {/* ناوبری */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="mb-4">
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--text-subtle))]">
                  {group}
                </p>
              )}
              <ul className="space-y-1">
                {items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  const badge = badgeValue(item.badge);
                  return (
                    <li key={item.href}>
                      <Tooltip label={collapsed ? item.label : ''}>
                        <Link
                          href={item.href}
                          className={cn(
                            'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                            collapsed && 'justify-center px-0',
                            active
                              ? 'text-[rgb(var(--accent))]'
                              : 'text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--text)/0.05)] hover:text-[rgb(var(--text))]'
                          )}
                          aria-current={active ? 'page' : undefined}
                        >
                          {active && (
                            <motion.span
                              layoutId="sidebar-active"
                              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                              className="absolute inset-0 -z-10 rounded-xl bg-[rgb(var(--accent-soft))]"
                            />
                          )}
                          <Icon name={item.icon} size={19} className="shrink-0" />
                          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                          {!collapsed && badge > 0 && (
                            <span className="num rounded-full bg-[rgb(var(--accent)/0.16)] px-2 py-0.5 text-[10px] font-bold text-[rgb(var(--accent))]">
                              {toPersianDigits(badge)}
                            </span>
                          )}
                          {collapsed && badge > 0 && (
                            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[rgb(var(--accent))]" />
                          )}
                        </Link>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* دکمه جمع‌شدن */}
      <div className="border-t border-[rgb(var(--border))] p-3">
        <button
          onClick={onToggle}
          className="btn btn-ghost w-full justify-center"
          aria-label={collapsed ? 'باز کردن سایدبار' : 'جمع کردن سایدبار'}
        >
          <Icon name={collapsed ? 'ChevronLeft' : 'ChevronRight'} size={18} />
          {!collapsed && <span className="text-xs">جمع کردن</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
