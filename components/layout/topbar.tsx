'use client';

/** نوار بالای برنامه: جست‌وجوی سراسری، اعلان‌ها، تم و پروفایل */
import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { clockLabel, formatJalali, greeting } from '@/lib/jalali';
import { cn, toPersianDigits } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Avatar, Tooltip } from '@/components/ui/primitives';
import { useClickOutside, useNow } from '@/hooks/use-planner';
import { useQuickAdd } from '@/components/shared/quick-add-context';
import { useToast } from '@/components/ui/toast';

function ThemeToggle() {
  const theme = usePlanner((s) => s.settings.theme);
  const setTheme = usePlanner((s) => s.setTheme);
  const order = ['light', 'dark', 'system'] as const;
  const icons = { light: 'Sun', dark: 'Moon', system: 'Monitor' } as const;
  const labels = { light: 'روشن', dark: 'تاریک', system: 'سیستم' } as const;

  const next = () => setTheme(order[(order.indexOf(theme) + 1) % order.length]);

  return (
    <Tooltip label={`تم: ${labels[theme]} (کلیک برای تغییر)`}>
      <button onClick={next} className="btn btn-ghost h-10 w-10 rounded-xl p-0" aria-label="تغییر تم">
        <Icon name={icons[theme]} size={18} />
      </button>
    </Tooltip>
  );
}

function NotificationsMenu() {
  const [open, setOpen] = React.useState(false);
  const notifications = usePlanner((s) => s.notifications);
  const markRead = usePlanner((s) => s.markNotificationRead);
  const markAll = usePlanner((s) => s.markAllNotificationsRead);
  const clear = usePlanner((s) => s.clearNotifications);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const unread = notifications.filter((n) => !n.read).length;

  const typeIcon: Record<string, { icon: string; color: string }> = {
    info: { icon: 'Info', color: 'rgb(var(--info))' },
    success: { icon: 'CheckCircle2', color: 'rgb(var(--success))' },
    warning: { icon: 'AlertTriangle', color: 'rgb(var(--warning))' },
    error: { icon: 'AlertCircle', color: 'rgb(var(--danger))' },
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-ghost relative h-10 w-10 rounded-xl p-0"
        aria-label="اعلان‌ها"
        aria-expanded={open}
      >
        <Icon name="Bell" size={18} />
        {unread > 0 && (
          <span className="num absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[rgb(var(--danger))] px-1 text-[10px] font-bold text-white">
            {toPersianDigits(unread)}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="glass absolute left-0 z-50 mt-2 w-[340px] max-w-[86vw] overflow-hidden rounded-2xl shadow-lifted"
          >
            <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-4 py-3">
              <span className="text-sm font-bold">اعلان‌ها</span>
              <div className="flex gap-1">
                <button onClick={markAll} className="rounded-lg px-2 py-1 text-[11px] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--text)/0.06)]">
                  خواندن همه
                </button>
                <button onClick={clear} className="rounded-lg px-2 py-1 text-[11px] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--text)/0.06)]">
                  پاک‌سازی
                </button>
              </div>
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-[rgb(var(--text-subtle))]">اعلان جدیدی نداری ✨</p>
              ) : (
                notifications.slice(0, 20).map((n) => {
                  const st = typeIcon[n.type] ?? typeIcon.info;
                  const Body = (
                    <div
                      className={cn(
                        'flex gap-3 border-b border-[rgb(var(--border-soft))] px-4 py-3 transition-colors hover:bg-[rgb(var(--text)/0.03)]',
                        !n.read && 'bg-[rgb(var(--accent)/0.05)]'
                      )}
                    >
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${st.color}1F`, color: st.color }}>
                        <Icon name={st.icon} size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-[rgb(var(--text-subtle))]">{n.body}</p>
                        <p className="mt-1 text-[10px] text-[rgb(var(--text-subtle))]">{formatJalali(n.createdAt, 'DD MMMM — HH:mm')}</p>
                      </div>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--accent))]" />}
                    </div>
                  );
                  return n.href ? (
                    <Link key={n.id} href={n.href} onClick={() => markRead(n.id)}>
                      {Body}
                    </Link>
                  ) : (
                    <button key={n.id} onClick={() => markRead(n.id)} className="block w-full text-right">
                      {Body}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileMenu() {
  const [open, setOpen] = React.useState(false);
  const user = usePlanner((s) => s.user);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const toast = useToast();

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-[rgb(var(--text)/0.05)]" aria-expanded={open}>
        <Avatar name={user?.name ?? 'کاربر'} size={32} />
        <span className="hidden text-sm font-semibold sm:block">{user?.name?.split(' ')[0] ?? 'کاربر'}</span>
        <Icon name="ChevronDown" size={14} className="hidden text-[rgb(var(--text-subtle))] sm:block" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="glass absolute left-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl p-1.5 shadow-lifted"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-bold">{user?.name}</p>
              <p className="text-[11px] text-[rgb(var(--text-subtle))]">{user?.email}</p>
            </div>
            <div className="my-1 h-px bg-[rgb(var(--border))]" />
            {[
              { href: '/settings', label: 'تنظیمات و پروفایل', icon: 'Settings' },
              { href: '/reports', label: 'گزارش‌های من', icon: 'BarChart3' },
              { href: '/search', label: 'جست‌وجو', icon: 'Search' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--text)/0.06)] hover:text-[rgb(var(--text))]"
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-[rgb(var(--border))]" />
            <button
              onClick={() => {
                setOpen(false);
                toast.info('داده‌های شما فقط در همین مرورگر ذخیره شده‌اند', 'برای پشتیبان‌گیری به تنظیمات → داده‌ها بروید.');
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--text)/0.06)]"
            >
              <Icon name="Shield" size={16} />
              حریم خصوصی
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Topbar({ onOpenSearch, onOpenMenu }: { onOpenSearch: () => void; onOpenMenu: () => void }) {
  const user = usePlanner((s) => s.user);
  const now = useNow(30000);
  const { open } = useQuickAdd();

  return (
    <header className="no-print sticky top-0 z-40 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg)/0.82)] backdrop-blur-xl">
      <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6">
        {/* منوی موبایل */}
        <button onClick={onOpenMenu} className="btn btn-ghost h-10 w-10 rounded-xl p-0 lg:hidden" aria-label="منو">
          <Icon name="Menu" size={19} />
        </button>

        {/* پیام و تاریخ */}
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate text-[15px] font-extrabold">
            {greeting(now)}، {user?.name?.split(' ')[0] ?? 'دوست من'} 👋
          </p>
          <p className="num truncate text-[11px] text-[rgb(var(--text-subtle))]">
            {formatJalali(now, 'dddd، DD MMMM YYYY')} — ساعت {clockLabel(now)}
          </p>
        </div>

        {/* جست‌وجو */}
        <button
          onClick={onOpenSearch}
          className="group flex h-10 flex-1 items-center gap-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3.5 text-sm text-[rgb(var(--text-subtle))] transition-colors hover:border-[rgb(var(--accent)/0.4)] md:max-w-[320px] md:flex-none"
        >
          <Icon name="Search" size={17} />
          <span className="flex-1 text-right">جست‌وجو در همه‌چیز…</span>
          <kbd className="num hidden rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-1.5 py-0.5 text-[10px] font-bold md:block">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-1.5">
          <button onClick={() => open('task')} className="btn btn-primary hidden h-10 sm:inline-flex" aria-label="تسک جدید">
            <Icon name="Plus" size={17} />
            <span className="text-xs">تسک جدید</span>
          </button>
          <ThemeToggle />
          <NotificationsMenu />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

export default Topbar;
