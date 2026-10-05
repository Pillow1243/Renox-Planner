'use client';

/**
 * گزارش‌ها
 *  - بازه‌های روزانه، هفتگی، ماهانه و سالانه
 *  - نرخ تکمیل، زمان صرف‌شده، عادت‌ها، مالی، سلامت و ژورنال
 *  - خروجی PDF (چاپ) و Excel/CSV
 */
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePlanner } from '@/stores/planner-store';
import { useMounted } from '@/hooks/use-planner';
import { addDays, dayKey, formatJalali, JALALI_MONTHS, startOfDay, toJalali, toGregorian, weekdayName } from '@/lib/jalali';
import { buildReportSummary, financeSummary, habitCompletionRate, healthSeries } from '@/lib/selectors';
import { cn, downloadFile, formatNumber, minutesLabel, toCSV, toPersianDigits } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Button, Card, EmptyState, Progress, ProgressRing, SegmentedControl, Skeleton } from '@/components/ui/primitives';
import { AreaTrendChart, BarsChart, DonutChart, IncomeExpenseChart } from '@/components/ui/charts';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { getExchangeRates } from '@/lib/external-apis';

type Period = 'day' | 'week' | 'month' | 'year';

const PERIOD_LABEL: Record<Period, string> = {
  day: 'امروز',
  week: 'این هفته',
  month: 'این ماه',
  year: 'امسال',
};

export default function ReportsPage() {
  const tasks = usePlanner((s) => s.tasks);
  const habits = usePlanner((s) => s.habits);
  const habitLogs = usePlanner((s) => s.habitLogs);
  const transactions = usePlanner((s) => s.transactions);
  const categories = usePlanner((s) => s.categories);
  const health = usePlanner((s) => s.health);
  const journal = usePlanner((s) => s.journal);
  const workouts = usePlanner((s) => s.workouts);
  const sessions = usePlanner((s) => s.sessions);
  const goals = usePlanner((s) => s.goals);
  const mounted = useMounted();
  const toast = useToast();

  const [period, setPeriod] = React.useState<Period>('week');
  const j = toJalali(new Date());

  /** بازه زمانی بر اساس دوره انتخاب‌شده */
  const range = React.useMemo(() => {
    const today = startOfDay(new Date());
    if (period === 'day') return { from: today, to: today };
    if (period === 'week') {
      const offset = (today.getDay() + 1) % 7;
      return { from: addDays(today, -offset), to: addDays(today, 6 - offset) };
    }
    if (period === 'month') return { from: toGregorian(j.jy, j.jm, 1), to: addDays(j.jm === 12 ? toGregorian(j.jy + 1, 1, 1) : toGregorian(j.jy, j.jm + 1, 1), -1) };
    return { from: toGregorian(j.jy, 1, 1), to: toGregorian(j.jy, 12, j.jm === 12 ? 29 : 30) };
  }, [period, j.jm, j.jy]);

  const summary = React.useMemo(
    () =>
      buildReportSummary({
        tasks,
        habits,
        habitLogs,
        transactions,
        health,
        journal,
        workouts,
        sessions,
        from: range.from,
        to: range.to,
      }),
    [tasks, habits, habitLogs, transactions, health, journal, workouts, sessions, range]
  );

  const finance = React.useMemo(() => financeSummary(transactions, categories, range.from, range.to), [transactions, categories, range]);

  /** روند روزانه در بازه */
  const dailyTrend = React.useMemo(() => {
    const days = Math.min(90, Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86400000) + 1));
    return Array.from({ length: days }, (_, i) => {
      const date = addDays(range.from, i);
      const key = dayKey(date);
      return {
        label: formatJalali(date, 'DD/MM'),
        تسک: tasks.filter((t) => t.completedAt && dayKey(t.completedAt) === key).length,
        عادت: habitLogs.filter((l) => l.date === key).length,
        تمرکز: sessions.filter((s) => dayKey(s.startedAt) === key).reduce((a, b) => a + b.minutes, 0),
      };
    });
  }, [range, tasks, habitLogs, sessions]);

  /** عملکرد به تفکیک عادت */
  const habitStats = React.useMemo(
    () =>
      habits.map((h) => ({
        id: h.id,
        name: h.name,
        color: h.color,
        rate: habitCompletionRate([h], habitLogs, Math.min(90, Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86400000))), range.to),
        count: habitLogs.filter((l) => l.habitId === h.id && new Date(l.date) >= startOfDay(range.from) && new Date(l.date) <= startOfDay(range.to)).length,
      })),
    [habits, habitLogs, range]
  );

  /** عملکرد پروژه‌ها */
  const projectStats = React.useMemo(() => {
    const projects = usePlanner.getState().projects;
    return projects
      .map((p) => {
        const list = tasks.filter((t) => t.projectId === p.id);
        const done = list.filter((t) => t.status === 'done').length;
        return { id: p.id, name: p.name, color: p.color, total: list.length, done, percent: list.length ? Math.round((done / list.length) * 100) : 0 };
      })
      .filter((p) => p.total > 0);
  }, [tasks]);

  const series = React.useMemo(() => healthSeries(health, 30), [health]);

  /** نرخ ارز برای معادل‌سازی (اختیاری) */
  const { data: rates } = useQuery({
    queryKey: ['rates', 'USD', 'report'],
    queryFn: () => getExchangeRates('USD'),
    staleTime: 60 * 60 * 1000,
  });

  /** جریان مالی ۱۴ روز اخیر برای نمودار مقایسه‌ای (به میلیون تومان) */
  const monthlyFlow = React.useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const date = addDays(range.to, -(13 - i));
        const key = dayKey(date);
        const inflow = transactions.filter((t) => dayKey(t.date) === key && t.type === 'income').reduce((a, b) => a + b.amountBase, 0);
        const outflow = transactions.filter((t) => dayKey(t.date) === key && t.type === 'expense').reduce((a, b) => a + b.amountBase, 0);
        return {
          label: formatJalali(date, 'DD/MM'),
          'درآمد': Number((inflow / 1_000_000).toFixed(2)),
          'هزینه': Number((outflow / 1_000_000).toFixed(2)),
        };
      }),
    [transactions, range.to]
  );

  const exportExcel = () => {
    const rows: (string | number)[][] = [
      ['گزارش Renox Planner'],
      ['بازه', `${formatJalali(range.from, 'YYYY/MM/DD', { persian: false })} تا ${formatJalali(range.to, 'YYYY/MM/DD', { persian: false })}`],
      [],
      ['شاخص', 'مقدار'],
      ['تسک‌های تکمیل‌شده', summary.tasksCompleted],
      ['تسک‌های ایجادشده', summary.tasksCreated],
      ['نرخ تکمیل (٪)', summary.completionRate],
      ['دقیقه تمرکز', summary.focusMinutes],
      ['نرخ پایبندی عادت (٪)', summary.habitRate],
      ['درآمد (تومان)', summary.income],
      ['هزینه (تومان)', summary.expense],
      ['میانگین خواب (ساعت)', summary.sleepAvg],
      ['میانگین آب (لیوان)', summary.waterAvg],
      ['دقیقه ورزش', summary.workoutMinutes],
      ['زنجیره ژورنال (روز)', summary.journalStreak],
      [],
      ['عملکرد عادت‌ها'],
      ['عادت', 'تعداد ثبت', 'نرخ پایبندی (٪)'],
      ...habitStats.map((h) => [h.name, h.count, h.rate]),
      [],
      ['عملکرد پروژه‌ها'],
      ['پروژه', 'کل تسک', 'انجام‌شده', 'درصد'],
      ...projectStats.map((p) => [p.name, p.total, p.done, p.percent]),
      [],
      ['تراکنش‌ها'],
      ['تاریخ', 'عنوان', 'نوع', 'مبلغ (تومان)'],
      ...transactions
        .filter((t) => new Date(t.date) >= startOfDay(range.from) && new Date(t.date) <= startOfDay(range.to))
        .map((t) => [formatJalali(t.date, 'YYYY/MM/DD', { persian: false }), t.title, t.type === 'income' ? 'درآمد' : t.type === 'expense' ? 'هزینه' : 'انتقال', t.amountBase]),
    ];
    downloadFile(`renox-report-${period}-${dayKey(new Date())}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    toast.success('گزارش Excel/CSV ساخته شد');
  };

  const exportPDF = () => {
    toast.info('پنجره چاپ باز می‌شود', 'گزینه «ذخیره به‌عنوان PDF» را انتخاب کن.');
    window.setTimeout(() => window.print(), 400);
  };

  return (
    <div>
      <PageHeader
        title="گزارش‌ها"
        description="داده‌ها را ببین تا تصمیم‌های بهتری بگیری"
        icon="BarChart3"
        actions={
          <>
            <Button size="sm" variant="outline" icon="Download" onClick={exportExcel}>
              Excel / CSV
            </Button>
            <Button size="sm" icon="Save" onClick={exportPDF}>
              خروجی PDF
            </Button>
          </>
        }
      />

      <Card className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 p-3.5">
        <SegmentedControl
          size="sm"
          options={[
            { value: 'day', label: 'روزانه', icon: 'Sun' },
            { value: 'week', label: 'هفتگی', icon: 'CalendarDays' },
            { value: 'month', label: 'ماهانه', icon: 'Calendar' },
            { value: 'year', label: 'سالانه', icon: 'Award' },
          ]}
          value={period}
          onChange={setPeriod}
        />
        <p className="num text-[11.5px] text-[rgb(var(--text-subtle))]">
          بازه: {formatJalali(range.from, 'DD MMMM YYYY')} تا {formatJalali(range.to, 'DD MMMM YYYY')}
        </p>
      </Card>

      {!mounted ? (
        <Skeleton className="h-80" />
      ) : (
        <div className="space-y-5">
          {/* خلاصه */}
          <div className="grid gap-3 lg:grid-cols-4">
            <StatCard label="تسک‌های تکمیل‌شده" value={summary.tasksCompleted} unit="تسک" icon="CheckCircle2" color="#57886A" index={0} hint={`${toPersianDigits(summary.tasksCreated)} تسک ساخته شده`} />
            <StatCard label="نرخ تکمیل" value={summary.completionRate} unit="٪" icon="TrendingUp" color="#6C7FA8" index={1} />
            <StatCard label="زمان تمرکز" value={summary.focusMinutes} unit="دقیقه" icon="Timer" color="#8C6FA8" index={2} hint={minutesLabel(summary.focusMinutes)} />
            <StatCard label="پایبندی عادت‌ها" value={summary.habitRate} unit="٪" icon="Flame" color="#BE7857" index={3} />
          </div>

          {/* حلقه‌های کلیدی */}
          <Card className="flex flex-wrap items-center justify-around gap-6 p-6">
            <div className="flex flex-col items-center gap-2">
              <ProgressRing value={summary.completionRate} size={120} stroke={10} label="تکمیل تسک" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <ProgressRing value={summary.habitRate} size={120} stroke={10} color="#BE7857" label="پایبندی عادت" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <ProgressRing
                value={Math.min(100, (summary.sleepAvg / 8) * 100)}
                size={120}
                stroke={10}
                color="#6C7FA8"
                label="کیفیت خواب"
              />
              <p className="num text-[11px] text-[rgb(var(--text-subtle))]">میانگین {toPersianDigits(summary.sleepAvg)} ساعت</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ProgressRing
                value={Math.min(100, (summary.waterAvg / 8) * 100)}
                size={120}
                stroke={10}
                color="#4F8A96"
                label="مصرف آب"
              />
              <p className="num text-[11px] text-[rgb(var(--text-subtle))]">میانگین {toPersianDigits(summary.waterAvg)} لیوان</p>
            </div>
          </Card>

          {/* روند */}
          <Card className="p-5">
            <h3 className="mb-1 text-sm font-bold">روند در بازه انتخاب‌شده</h3>
            <p className="mb-3 text-[11px] text-[rgb(var(--text-subtle))]">تعداد تسک، عادت و دقایق تمرکز در هر روز</p>
            <AreaTrendChart
              data={dailyTrend}
              series={[
                { key: 'تسک', name: 'تسک تکمیل‌شده', color: '#57886A' },
                { key: 'عادت', name: 'ثبت عادت', color: '#AD9268' },
                { key: 'تمرکز', name: 'دقیقه تمرکز', color: '#6C7FA8' },
              ]}
              height={280}
            />
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {/* مالی */}
            <Card className="p-5">
              <h3 className="mb-1 text-sm font-bold">خلاصه مالی بازه</h3>
              <p className="num mb-3 text-[11px] text-[rgb(var(--text-subtle))]">
                درآمد {formatNumber(summary.income)} — هزینه {formatNumber(summary.expense)} تومان
                {rates?.rates?.USD && summary.expense > 0 ? ` — معادل حدوداً ${formatNumber(Math.round(summary.expense / (rates.rates.IRR || 1) / 1), { persian: false })} دلار` : ''}
              </p>
              <IncomeExpenseChart data={monthlyFlow} height={250} />
            </Card>

            {/* دسته‌بندی هزینه */}
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold">ترکیب هزینه‌ها بر اساس دسته</h3>
              {finance.byCategory.length === 0 ? (
                <EmptyState icon="Wallet" title="هزینه‌ای در این بازه نیست" description="با ثبت هزینه، این نمودار پر می‌شود." />
              ) : (
                <DonutChart
                  data={finance.byCategory.slice(0, 7).map((c) => ({ name: c.name, value: Math.round(c.value / 1000), color: c.color }))}
                  height={280}
                  centerLabel="هزار تومان"
                  centerValue={formatNumber(Math.round(finance.expense / 1000))}
                />
              )}
            </Card>
          </div>

          {/* عادت‌ها و پروژه‌ها */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold">عملکرد عادت‌ها</h3>
              {habitStats.length === 0 ? (
                <EmptyState icon="Flame" title="عادتی ثبت نشده" />
              ) : (
                <ul className="space-y-3">
                  {habitStats.map((h) => (
                    <li key={h.id}>
                      <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                        <span className="font-medium">{h.name}</span>
                        <span className="num text-[11px] font-bold" style={{ color: h.color }}>
                          {toPersianDigits(h.count)} ثبت — {toPersianDigits(h.rate)}٪
                        </span>
                      </div>
                      <Progress value={h.rate} color={h.color} height={7} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold">عملکرد پروژه‌ها</h3>
              {projectStats.length === 0 ? (
                <EmptyState icon="FolderKanban" title="پروژه‌ای با تسک وجود ندارد" />
              ) : (
                <ul className="space-y-3">
                  {projectStats.map((p) => (
                    <li key={p.id}>
                      <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                        <span className="font-medium">{p.name}</span>
                        <span className="num text-[11px] text-[rgb(var(--text-subtle))]">
                          {toPersianDigits(p.done)}/{toPersianDigits(p.total)} — {toPersianDigits(p.percent)}٪
                        </span>
                      </div>
                      <Progress value={p.percent} color={p.color} height={7} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* سلامت */}
          <Card className="p-5">
            <h3 className="mb-1 text-sm font-bold">سلامت — ۳۰ روز اخیر</h3>
            <p className="mb-3 text-[11px] text-[rgb(var(--text-subtle))]">وزن، خواب، آب و قدم‌ها</p>
            <div className="grid gap-4 xl:grid-cols-2">
              <AreaTrendChart data={series} series={[{ key: 'وزن', name: 'وزن (kg)', color: '#57886A' }]} height={220} />
              <BarsChart data={series.slice(-14)} dataKey="قدم" height={220} color="#AD9268" unit="قدم" />
            </div>
          </Card>

          {/* اهداف */}
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-bold">وضعیت اهداف</h3>
            {goals.length === 0 ? (
              <EmptyState icon="Target" title="هدفی ثبت نشده" />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {goals.map((g) => {
                  const krDone = g.keyResults.filter((kr) => kr.current >= kr.target).length;
                  return (
                    <div key={g.id} className={cn('rounded-2xl border border-[rgb(var(--border))] p-4', g.completed && 'opacity-70')}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13px] font-bold">{g.title}</p>
                        {g.completed && <Icon name="CheckCircle2" size={16} className="text-[rgb(var(--success))]" />}
                      </div>
                      <p className="num mt-1 text-[11px] text-[rgb(var(--text-subtle))]">
                        {g.keyResults.length > 0 ? `${toPersianDigits(krDone)} از ${toPersianDigits(g.keyResults.length)} نتیجه کلیدی کامل` : 'پیشرفت دستی'}
                        {g.targetDate ? ` • مهلت ${formatJalali(g.targetDate, 'DD MMMM YYYY')}` : ''}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {g.keyResults.map((kr) => (
                          <span key={kr.id} className="chip bg-[rgb(var(--text)/0.06)] text-[10px]">
                            {kr.title}: {toPersianDigits(kr.current)}/{toPersianDigits(kr.target)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* جدول روزهای هفته */}
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-bold">الگوی هفتگی شما</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-center text-[12px]">
                <thead className="text-[rgb(var(--text-subtle))]">
                  <tr>
                    <th className="py-2 text-right font-semibold">روز</th>
                    <th className="py-2 font-semibold">تسک انجام‌شده</th>
                    <th className="py-2 font-semibold">عادت</th>
                    <th className="py-2 font-semibold">دقیقه تمرکز</th>
                    <th className="py-2 font-semibold">هزینه (هزار تومان)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = addDays(new Date(), -6 + i);
                    const key = dayKey(d);
                    return (
                      <tr key={key} className="border-t border-[rgb(var(--border))]">
                        <td className="py-2.5 text-right font-medium">{weekdayName(d)}</td>
                        <td className="num py-2.5">{toPersianDigits(tasks.filter((t) => t.completedAt && dayKey(t.completedAt) === key).length)}</td>
                        <td className="num py-2.5">{toPersianDigits(habitLogs.filter((l) => l.date === key).length)}</td>
                        <td className="num py-2.5">{toPersianDigits(sessions.filter((s) => dayKey(s.startedAt) === key).reduce((a, b) => a + b.minutes, 0))}</td>
                        <td className="num py-2.5">{formatNumber(Math.round(transactions.filter((t) => dayKey(t.date) === key && t.type === 'expense').reduce((a, b) => a + b.amountBase, 0) / 1000))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="pb-4 text-center text-[11px] text-[rgb(var(--text-subtle))]">
            گزارش‌ها کاملاً روی دستگاه شما محاسبه می‌شوند؛ هیچ داده‌ای به سرور ارسال نمی‌شود. (ماه جاری: {JALALI_MONTHS[j.jm - 1]} {toPersianDigits(j.jy)})
          </p>
        </div>
      )}
    </div>
  );
}
