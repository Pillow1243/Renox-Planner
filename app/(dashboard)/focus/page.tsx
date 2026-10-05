'use client';

/**
 * پومودورو و تمرکز
 *  - تایمر حلقه‌ای زیبا با حالت‌های تمرکز/استراحت کوتاه/استراحت بلند
 *  - انتخاب تسک مرتبط، حالت تمرکز تمام‌صفحه، صدای ملایم و اعلان پایان
 *  - آمار تمرکز روزانه و هفتگی
 */
import * as React from 'react';
import { motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { useMounted, useNow } from '@/hooks/use-planner';
import { dayKey, formatJalali, weekdayName } from '@/lib/jalali';
import { focusMinutesInRange, weeklyFocusSeries } from '@/lib/selectors';
import { cn, minutesLabel, toPersianDigits } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Button, Card, EmptyState, ProgressRing, SegmentedControl, Skeleton, Switch, Tooltip } from '@/components/ui/primitives';
import { AreaTrendChart } from '@/components/ui/charts';
import { fireConfetti, playChime } from '@/components/ui/confetti';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';

type Mode = 'focus' | 'short' | 'long';

const MODES: { id: Mode; label: string; minutes: number; color: string; icon: string }[] = [
  { id: 'focus', label: 'تمرکز', minutes: 25, color: '#57886A', icon: 'Brain' },
  { id: 'short', label: 'استراحت کوتاه', minutes: 5, color: '#6C7FA8', icon: 'Coffee' },
  { id: 'long', label: 'استراحت بلند', minutes: 15, color: '#AD9268', icon: 'Sunrise' },
];

export default function FocusPage() {
  const tasks = usePlanner((s) => s.tasks);
  const sessions = usePlanner((s) => s.sessions);
  const settings = usePlanner((s) => s.settings);
  const addSession = usePlanner((s) => s.addSession);
  const updateSettings = usePlanner((s) => s.updateSettings);
  const notify = usePlanner((s) => s.notify);
  const mounted = useMounted();
  const toast = useToast();

  const [mode, setMode] = React.useState<Mode>('focus');
  const [duration, setDuration] = React.useState(25);
  const [remaining, setRemaining] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(false);
  const [taskId, setTaskId] = React.useState<string>('');
  const [completedCount, setCompletedCount] = React.useState(0);
  const [zen, setZen] = React.useState(false);

  const modeMeta = MODES.find((m) => m.id === mode)!;

  // همگام‌سازی زمان با حالت انتخابی
  React.useEffect(() => {
    if (running) return;
    setDuration(modeMeta.minutes);
    setRemaining(modeMeta.minutes * 60);
  }, [mode, modeMeta.minutes, running]);

  // تیک تایمر
  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // پایان جلسه
  React.useEffect(() => {
    if (remaining !== 0 || !running) return;
    setRunning(false);

    if (mode === 'focus') {
      addSession({
        minutes: duration,
        mode: 'focus',
        completed: true,
        startedAt: new Date(Date.now() - duration * 60000).toISOString(),
        taskId: taskId || undefined,
        label: tasks.find((t) => t.id === taskId)?.title,
      });
      setCompletedCount((c) => c + 1);
      // پس از هر ۴ جلسه، استراحت بلند پیشنهاد می‌شود
      const next: Mode = (completedCount + 1) % 4 === 0 ? 'long' : 'short';
      setMode(next);
      fireConfetti(50);
      if (settings.sounds) playChime('success');
      toast.success(
        `جلسه تمرکز ${toPersianDigits(duration)} دقیقه‌ای کامل شد! 🎉`,
        next === 'long' ? 'وقت استراحت بلند است.' : 'یک استراحت کوتاه بگیر.'
      );
      notify({ title: 'تمرکز کامل شد', body: `${toPersianDigits(duration)} دقیقه کار عمیق ثبت شد`, type: 'success', href: '/focus' });
    } else {
      setMode('focus');
      if (settings.sounds) playChime('start');
      toast.info('استراحت تمام شد', 'آماده‌ای برای جلسه بعدی؟');
    }
  }, [remaining, running, mode, duration, taskId, completedCount, addSession, notify, settings.sounds, toast, tasks]);

  // اعلان مرورگر در پایان جلسه (در صورت اجازه کاربر)
  React.useEffect(() => {
    if (remaining === 0 && typeof Notification !== 'undefined' && Notification.permission === 'granted' && settings.notifications.push) {
      new Notification('Renox Planner', { body: mode === 'focus' ? 'جلسه تمرکز تمام شد ✅' : 'وقت تمرکز است 🧠' });
    }
  }, [remaining, mode, settings.notifications.push]);

  const totalSeconds = duration * 60;
  const progress = ((totalSeconds - remaining) / totalSeconds) * 100;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  const today = dayKey(new Date());
  const todayMinutes = focusMinutesInRange(sessions, new Date(), new Date());
  const weekMinutes = focusMinutesInRange(sessions, new Date(Date.now() - 6 * 86400000), new Date());
  const focusSessionsToday = sessions.filter((s) => dayKey(s.startedAt) === today && s.mode === 'focus').length;

  const weekSeries = React.useMemo(
    () =>
      weeklyFocusSeries(sessions).map((d) => ({ label: d.label, دقیقه: d.دقیقه })),
    [sessions]
  );

  const last14 = React.useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date(Date.now() - (13 - i) * 86400000);
        const key = dayKey(d);
        return {
          label: toPersianDigits(formatJalali(d, 'DD')),
          دقیقه: sessions.filter((s) => dayKey(s.startedAt) === key && s.mode === 'focus').reduce((a, b) => a + b.minutes, 0),
        };
      }),
    [sessions]
  );

  const openTasks = tasks.filter((t) => t.status !== 'done');

  const start = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    setRunning(true);
    if (settings.sounds) playChime('start');
  };

  return (
    <div className={cn(zen && 'fixed inset-0 z-[75] overflow-y-auto bg-[rgb(var(--bg))] p-6')}>
      {!zen && (
        <PageHeader
          title="تمرکز و پومودورو"
          description="کار عمیق، در بازه‌های کوتاه و بدون حواس‌پرتی"
          icon="Timer"
          actions={
            <Button size="sm" variant="outline" icon="Maximize2" onClick={() => setZen(true)}>
              حالت تمرکز
            </Button>
          }
        />
      )}

      {zen && (
        <div className="mx-auto flex max-w-3xl items-center justify-between pb-4">
          <span className="text-sm font-bold">حالت تمرکز — بدون حواس‌پرتی</span>
          <Button size="sm" variant="outline" icon="Minimize2" onClick={() => setZen(false)}>
            خروج
          </Button>
        </div>
      )}

      {/* آمار */}
      {!zen && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="تمرکز امروز" value={todayMinutes} unit="دقیقه" icon="Timer" color="#6C7FA8" index={0} />
          <StatCard label="جلسات امروز" value={focusSessionsToday} unit="جلسه" icon="Brain" color="#57886A" index={1} />
          <StatCard label="تمرکز این هفته" value={weekMinutes} unit="دقیقه" icon="TrendingUp" color="#AD9268" index={2} />
          <StatCard label="مجموع جلسات" value={sessions.filter((s) => s.mode === 'focus').length} unit="جلسه" icon="Trophy" color="#BE7857" index={3} />
        </div>
      )}

      <div className={cn('grid gap-4', !zen && 'xl:grid-cols-[1fr_380px]')}>
        {/* تایمر */}
        <Card className="relative overflow-hidden p-6">
          <div
            className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 w-64 rounded-full opacity-20 blur-3xl"
            style={{ background: `radial-gradient(circle, ${modeMeta.color}, transparent 70%)` }}
          />

          <div className="relative flex flex-col items-center gap-6">
            {/* حالت‌ها */}
            <SegmentedControl
              options={MODES.map((m) => ({ value: m.id, label: m.label, icon: m.icon }))}
              value={mode}
              onChange={(v) => {
                setRunning(false);
                setMode(v);
              }}
            />

            {/* حلقه تایمر */}
            <div className="relative">
              <ProgressRing
                value={progress}
                size={zen ? 320 : 280}
                stroke={zen ? 16 : 14}
                color={modeMeta.color}
              >
                <div className="text-center">
                  <p className="num text-5xl font-black tabular-nums" style={{ letterSpacing: '0.02em' }}>
                    {toPersianDigits(`${mm}:${ss}`)}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold text-[rgb(var(--text-subtle))]">
                    {mode === 'focus' ? 'در حال تمرکز' : 'زمان استراحت'}
                  </p>
                  {completedCount > 0 && (
                    <p className="num mt-1 text-[11px] text-[rgb(var(--text-subtle))]">
                      {toPersianDigits(completedCount)} جلسه در این نشست
                    </p>
                  )}
                </div>
              </ProgressRing>
              {running && (
                <span
                  className="absolute inset-0 -z-10 animate-pulse-ring rounded-full"
                  style={{ backgroundColor: `${modeMeta.color}22` }}
                />
              )}
            </div>

            {/* کنترل‌ها */}
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Button
                size="lg"
                variant={running ? 'outline' : 'primary'}
                icon={running ? 'Pause' : 'Play'}
                onClick={() => setRunning((r) => !r)}
                className="min-w-[140px]"
              >
                {running ? 'توقف' : remaining === totalSeconds ? 'شروع' : 'ادامه'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                icon="RotateCcw"
                onClick={() => {
                  setRunning(false);
                  setRemaining(duration * 60);
                }}
              >
                بازنشانی
              </Button>
              <Button
                size="lg"
                variant="ghost"
                icon="SkipForward"
                onClick={() => {
                  setRunning(false);
                  setMode(mode === 'focus' ? 'short' : 'focus');
                }}
              >
                بعدی
              </Button>
            </div>

            {/* تنظیم مدت */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] text-[rgb(var(--text-subtle))]">مدت (دقیقه):</span>
              {[15, 25, 45, 60, 90].map((m) => (
                <button
                  key={m}
                  disabled={running}
                  onClick={() => {
                    setDuration(m);
                    setRemaining(m * 60);
                  }}
                  className={cn(
                    'num h-8 w-11 rounded-lg border text-xs font-bold transition-colors disabled:opacity-40',
                    duration === m && !running
                      ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]'
                      : 'border-[rgb(var(--border))] hover:border-[rgb(var(--accent)/0.4)]'
                  )}
                >
                  {toPersianDigits(m)}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* پنل کنار */}
        {!zen && (
          <div className="space-y-4">
            {/* انتخاب تسک */}
            <Card className="p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Icon name="Target" size={16} className="text-[rgb(var(--accent))]" />
                روی چه چیزی تمرکز می‌کنی؟
              </h3>
              {openTasks.length === 0 ? (
                <EmptyState icon="CheckSquare" title="تسک بازی نداری" description="برای تمرکز بهتر است یک کار مشخص انتخاب کنی." />
              ) : (
                <ul className="max-h-[260px] space-y-1.5 overflow-y-auto pl-1">
                  {openTasks.slice(0, 10).map((task) => (
                    <li key={task.id}>
                      <button
                        onClick={() => setTaskId(taskId === task.id ? '' : task.id)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-right transition-colors',
                          taskId === task.id
                            ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))]'
                            : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--text)/0.04)]'
                        )}
                      >
                        <Icon name={taskId === task.id ? 'CheckCircle2' : 'Circle'} size={16} className={taskId === task.id ? 'text-[rgb(var(--accent))]' : 'text-[rgb(var(--text-subtle))]'} />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{task.title}</span>
                        {task.estimate && <span className="num shrink-0 text-[10px] text-[rgb(var(--text-subtle))]">{toPersianDigits(task.estimate)}′</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* تنظیمات تمرکز */}
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold">تنظیمات</h3>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] p-3">
                <span className="text-[13px]">صدای پایان جلسه</span>
                <Switch checked={settings.sounds} onChange={(v) => updateSettings({ sounds: v })} label="صدا" />
              </label>
              <label className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] p-3">
                <span className="text-[13px]">اعلان مرورگر</span>
                <Switch
                  checked={settings.notifications.push}
                  onChange={(v) => {
                    updateSettings({ notifications: { ...settings.notifications, push: v } });
                    if (v && typeof Notification !== 'undefined') void Notification.requestPermission();
                  }}
                  label="اعلان"
                />
              </label>
              <p className="mt-3 text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
                هر ۴ جلسه تمرکز، یک استراحت بلند پیشنهاد می‌شود. زمان تمرکز در گزارش‌ها و داشبورد هم محاسبه می‌شود.
              </p>
            </Card>

            {/* جلسات اخیر */}
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold">جلسات اخیر</h3>
              {sessions.filter((s) => s.mode === 'focus').length === 0 ? (
                <p className="py-6 text-center text-[11px] text-[rgb(var(--text-subtle))]">هنوز جلسه‌ای ثبت نشده</p>
              ) : (
                <ul className="space-y-1.5">
                  {sessions
                    .filter((s) => s.mode === 'focus')
                    .slice(0, 6)
                    .map((s) => (
                      <li key={s.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[rgba(108,127,168,0.12)] text-[#6C7FA8]">
                          <Icon name="Brain" size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-medium">{s.label ?? 'جلسه تمرکز'}</p>
                          <p className="num text-[10.5px] text-[rgb(var(--text-subtle))]">
                            {formatJalali(s.startedAt, 'DD MMMM')} — {minutesLabel(s.minutes)}
                          </p>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* نمودار تمرکز */}
      {!zen && (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-1 text-sm font-bold">تمرکز هفته جاری</h3>
            <p className="mb-3 text-[11px] text-[rgb(var(--text-subtle))]">مجموع دقایق تمرکز در هر روز</p>
            <AreaTrendChart data={weekSeries} series={[{ key: 'دقیقه', name: 'دقیقه تمرکز', color: '#6C7FA8' }]} height={220} unit="دقیقه" />
          </Card>
          <Card className="p-5">
            <h3 className="mb-1 text-sm font-bold">۱۴ روز اخیر</h3>
            <p className="mb-3 text-[11px] text-[rgb(var(--text-subtle))]">روند تمرکز شما</p>
            <AreaTrendChart data={last14} series={[{ key: 'دقیقه', name: 'دقیقه تمرکز', color: '#57886A' }]} height={220} unit="دقیقه" />
          </Card>
        </div>
      )}

      {mounted && !zen && (
        <p className="mt-4 text-center text-[11px] text-[rgb(var(--text-subtle))]">
          میان‌بر: <kbd className="rounded border border-[rgb(var(--border))] px-1.5 py-0.5 font-bold">⌘P</kbd> برای بازگشت سریع به این صفحه
        </p>
      )}
    </div>
  );
}
