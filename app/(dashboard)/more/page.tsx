'use client';

/**
 * صفحه «بیشتر» — هاب موبایل
 * همه بخش‌هایی که در نوار پایین جا نشده‌اند، به‌همراه میان‌برهای تند و اطلاعات برنامه.
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { NAV_ITEMS, APP_NAME, APP_VERSION } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardHeader, Badge, Button, Avatar, Divider, Progress } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { useQuickAdd } from '@/components/shared/quick-add-context';
import { useToast } from '@/components/ui/toast';
import { habitCompletionRate, projectProgress } from '@/lib/selectors';
import { useMounted } from '@/hooks/use-planner';
import { SkeletonCard } from '@/components/ui/primitives';

const QUICK_LINKS = [
  { href: '/tasks', label: 'تسک‌ها', desc: 'کانبان، آیزنهاور و تکرار', icon: 'CheckSquare', tone: '#57886A' },
  { href: '/projects', label: 'پروژه‌ها', desc: 'پیشرفت و تسک‌های پروژه', icon: 'FolderKanban', tone: '#6C7FA8' },
  { href: '/goals', label: 'اهداف و OKR', desc: 'نتیجه‌های کلیدی و افق', icon: 'Target', tone: '#BE7857' },
  { href: '/focus', label: 'تمرکز', desc: 'پومودورو و آمار کار عمیق', icon: 'Timer', tone: '#4F8A96' },
  { href: '/notes', label: 'یادداشت‌ها', desc: 'ویرایشگر غنی و پوشه‌ها', icon: 'StickyNote', tone: '#AD9268' },
  { href: '/journal', label: 'ژورنال', desc: 'روزنوشت با حال‌وهوا', icon: 'BookHeart', tone: '#8C6A9B' },
  { href: '/finance', label: 'مالی', desc: 'درآمد، هزینه و بودجه', icon: 'Wallet', tone: '#57886A' },
  { href: '/health', label: 'سلامت', desc: 'وزن، خواب، آب و ورزش', icon: 'HeartPulse', tone: '#C0554A' },
  { href: '/reports', label: 'گزارش‌ها', desc: 'نمودار، CSV و PDF', icon: 'BarChart3', tone: '#6C7FA8' },
  { href: '/search', label: 'جست‌وجوی سراسری', desc: 'در همه داده‌ها', icon: 'Search', tone: '#4F8A96' },
  { href: '/settings', label: 'تنظیمات', desc: 'تم، اعلان‌ها و پشتیبان', icon: 'Settings', tone: '#AD9268' },
];

export default function MorePage() {
  const mounted = useMounted();
  const router = useRouter();
  const toast = useToast();
  const quickAdd = useQuickAdd();

  const user = usePlanner((s) => s.user);
  const settings = usePlanner((s) => s.settings);
  const tasks = usePlanner((s) => s.tasks);
  const projects = usePlanner((s) => s.projects);
  const habits = usePlanner((s) => s.habits);
  const habitLogs = usePlanner((s) => s.habitLogs);
  const notes = usePlanner((s) => s.notes);
  const transactions = usePlanner((s) => s.transactions);
  const setTheme = usePlanner((s) => s.setTheme);

  const pending = tasks.filter((t) => t.status !== 'done').length;
  const doneToday = tasks.filter((t) => t.status === 'done' && t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()).length;
  const habitRate = habitCompletionRate(habits, habitLogs, 30);

  const themeOptions = [
    { value: 'light' as const, label: 'روشن', icon: 'Sun' },
    { value: 'dark' as const, label: 'تیره', icon: 'Moon' },
    { value: 'system' as const, label: 'سیستم', icon: 'Monitor' },
  ];

  if (!mounted) {
    return (
      <div className="space-y-5">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      <PageHeader title="بیشتر" description="همه بخش‌ها، میان‌برها و اطلاعات حساب" icon="Grid2x2" />

      {/* کارت کاربر */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name ?? 'کاربر مهمان'} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold">{user?.name ?? 'کاربر مهمان'}</p>
            <p dir="ltr" className="truncate text-right text-[11.5px] text-[rgb(var(--text-subtle))]">
              {user?.email ?? 'بدون ایمیل — حالت محلی'}
            </p>
          </div>
          <Link href="/settings" className="btn btn-ghost h-9 px-3 text-[12px]">
            <Icon name="Pencil" size={14} /> ویرایش
          </Link>
        </div>

        <Divider className="my-4" />

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="num text-lg font-extrabold">{pending}</p>
            <p className="text-[11px] text-[rgb(var(--text-subtle))]">تسک باز</p>
          </div>
          <div>
            <p className="num text-lg font-extrabold">{doneToday}</p>
            <p className="text-[11px] text-[rgb(var(--text-subtle))]">انجام‌شده امروز</p>
          </div>
          <div>
            <p className="num text-lg font-extrabold">{projects.filter((p) => !p.archived).length}</p>
            <p className="text-[11px] text-[rgb(var(--text-subtle))]">پروژه فعال</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
            <span className="text-[rgb(var(--text-subtle))]">پایبندی عادت‌ها (۳۰ روز)</span>
            <span className="num font-bold">{habitRate}٪</span>
          </div>
          <Progress value={habitRate} height={7} />
        </div>
      </Card>

      {/* تغییر تم سریع */}
      <Card className="p-5">
        <CardHeader title="ظاهر برنامه" subtitle="حالت رنگی را همان‌جا عوض کن" icon="Palette" />
        <div className="grid grid-cols-3 gap-2.5">
          {themeOptions.map((opt) => {
            const active = settings.theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-[12px] font-bold transition-all ${
                  active
                    ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]'
                    : 'border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--accent)/0.4)]'
                }`}
              >
                <Icon name={opt.icon} size={18} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* میان‌برهای افزودن سریع */}
      <Card className="p-5">
        <CardHeader title="افزودن سریع" subtitle="بدون رفتن به صفحه‌های دیگر" icon="Plus" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {(
            [
              ['task', 'تسک', 'CheckSquare'],
              ['note', 'یادداشت', 'StickyNote'],
              ['transaction', 'هزینه', 'Wallet'],
              ['habit', 'عادت', 'Flame'],
              ['event', 'رویداد', 'CalendarPlus'],
              ['goal', 'هدف', 'Target'],
            ] as const
          ).map(([kind, label, icon]) => (
            <button
              key={kind}
              onClick={() => quickAdd.open(kind)}
              className="flex items-center gap-2.5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3 text-[12.5px] font-bold transition-colors hover:bg-[rgb(var(--surface-3))]"
            >
              <Icon name={icon} size={16} className="text-[rgb(var(--accent))]" />
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* شبکه بخش‌ها */}
      <Card className="p-5">
        <CardHeader title="همه بخش‌ها" subtitle="۱۴ صفحه برنامه‌ریزی" icon="LayoutGrid" />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {QUICK_LINKS.map((link, i) => (
            <motion.div key={link.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.25 }}>
              <Link
                href={link.href}
                className="flex items-center gap-3.5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5 transition-all hover:border-[rgb(var(--accent)/0.45)] hover:shadow-soft"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${link.tone}1F`, color: link.tone }}>
                  <Icon name={link.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold">{link.label}</span>
                  <span className="block truncate text-[11px] text-[rgb(var(--text-subtle))]">{link.desc}</span>
                </span>
                <Icon name="ChevronLeft" size={16} className="text-[rgb(var(--text-subtle))]" />
              </Link>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* داده‌ها و اطلاعات */}
      <Card className="p-5">
        <CardHeader title="داده‌های من" subtitle="خلاصه‌ای از حجم اطلاعات ذخیره‌شده" icon="Database" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'تسک', value: tasks.length, icon: 'CheckSquare' },
            { label: 'یادداشت', value: notes.length, icon: 'StickyNote' },
            { label: 'تراکنش', value: transactions.length, icon: 'Wallet' },
            { label: 'عادت', value: habits.length, icon: 'Flame' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5 text-center">
              <Icon name={s.icon} size={16} className="mx-auto text-[rgb(var(--accent))]" />
              <p className="num mt-1.5 text-lg font-extrabold">{s.value}</p>
              <p className="text-[11px] text-[rgb(var(--text-subtle))]">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            icon="Download"
            onClick={() => {
              router.push('/settings');
              toast.info('پشتیبان‌گیری', 'از بخش «داده‌ها» فایل JSON پشتیبان را دانلود کن.');
            }}
          >
            پشتیبان‌گیری
          </Button>
          <Button
            variant="ghost"
            icon="Keyboard"
            onClick={() => quickAdd.open('shortcuts')}
          >
            میان‌برهای کیبورد
          </Button>
        </div>
      </Card>

      {/* درباره */}
      <Card className="p-5 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[rgb(var(--accent))] to-[#4F8A96] text-2xl font-black text-white">
          R
        </span>
        <p className="mt-3 text-sm font-extrabold">{APP_NAME}</p>
        <p className="num mt-1 text-[11.5px] text-[rgb(var(--text-subtle))]">نسخه {APP_VERSION}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Badge color="#57886A" dot>Local-First</Badge>
          <Badge color="#4F8A96" dot>PWA</Badge>
          <Badge>بدون هزینه اجرا</Badge>
        </div>
        <p className="mt-4 text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
          ساخته‌شده با Next.js، Tailwind و عشق به زبان فارسی. داده‌ها روی همین دستگاه ذخیره می‌شوند؛ برای چنددستگاهی، حالت سروری را در
          تنظیمات فعال کن.
        </p>
      </Card>

      {/* فهرست کامل مسیرها (فقط دسکتاپ برای دسترسی سریع) */}
      <nav aria-label="ناوبری کامل" className="hidden flex-wrap gap-2 lg:flex">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="chip">
            <Icon name={item.icon} size={13} /> {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
