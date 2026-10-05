'use client';

/**
 * اهداف و OKR
 *  - سه افق: کوتاه‌مدت، میان‌مدت، بلندمدت
 *  - نتایج کلیدی (Key Results) با پیشرفت خودکار
 *  - اتصال تسک‌ها به اهداف و جشن تکمیل هدف
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { useMounted } from '@/hooks/use-planner';
import { dayKey, formatJalali, relativeJalali } from '@/lib/jalali';
import { goalProgress } from '@/lib/selectors';
import { HORIZON_LABEL } from '@/lib/constants';
import { cn, pct, toPersianDigits } from '@/lib/utils';
import type { Goal, GoalHorizon } from '@/lib/types';
import { Icon } from '@/components/ui/icon';
import { Badge, Button, Card, EmptyState, Progress, ProgressRing, SegmentedControl, Skeleton } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/modal';
import { fireConfetti } from '@/components/ui/confetti';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { GoalDialog } from '@/components/shared/dialogs';

export default function GoalsPage() {
  const goals = usePlanner((s) => s.goals);
  const tasks = usePlanner((s) => s.tasks);
  const updateGoal = usePlanner((s) => s.updateGoal);
  const removeGoal = usePlanner((s) => s.removeGoal);
  const updateKeyResult = usePlanner((s) => s.updateKeyResult);
  const mounted = useMounted();
  const toast = useToast();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Goal | null>(null);
  const [deleting, setDeleting] = React.useState<Goal | null>(null);
  const [filter, setFilter] = React.useState<'all' | GoalHorizon>('all');
  const [showCompleted, setShowCompleted] = React.useState(false);

  const filtered = goals.filter((g) => (filter === 'all' || g.horizon === filter) && (showCompleted || !g.completed));

  const stats = React.useMemo(() => {
    const active = goals.filter((g) => !g.completed);
    const avgProgress = active.length ? active.reduce((a, g) => a + goalProgress(g), 0) / active.length : 0;
    const krCount = goals.reduce((a, g) => a + g.keyResults.length, 0);
    const krDone = goals.reduce((a, g) => a + g.keyResults.filter((kr) => kr.current >= kr.target).length, 0);
    return { active: active.length, completed: goals.filter((g) => g.completed).length, avgProgress, krCount, krDone };
  }, [goals]);

  const onKeyResultChange = (goal: Goal, krId: string, current: number) => {
    updateKeyResult(goal.id, krId, { current });
    const kr = goal.keyResults.find((k) => k.id === krId);
    if (kr && current >= kr.target) {
      const allDone = goal.keyResults.every((k) => (k.id === krId ? current >= k.target : k.current >= k.target));
      if (allDone) {
        fireConfetti(80);
        toast.success(`هدف «${goal.title}» به همه نتایج کلیدی رسید! 🎉`, 'می‌توانی هدف را تکمیل‌شده علامت بزنی.');
      }
    }
  };

  return (
    <div>
      <PageHeader
        title="اهداف و OKR"
        description="هدف بدون معیار، آرزوست — برای هر هدف نتیجه کلیدی قابل اندازه‌گیری بساز"
        icon="Target"
        actions={
          <Button
            size="sm"
            icon="Plus"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            هدف جدید
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="اهداف فعال" value={stats.active} icon="Target" color="#57886A" index={0} />
        <StatCard label="میانگین پیشرفت" value={Math.round(stats.avgProgress)} unit="٪" icon="TrendingUp" color="#6C7FA8" index={1} />
        <StatCard label="نتایج کلیدی" value={stats.krCount} icon="Milestone" color="#AD9268" index={2} hint={`${toPersianDigits(stats.krDone)} مورد کامل شده`} />
        <StatCard label="اهداف تکمیل‌شده" value={stats.completed} icon="Trophy" color="#BE7857" index={3} />
      </div>

      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3.5">
        <SegmentedControl
          size="sm"
          options={[
            { value: 'all', label: 'همه', icon: 'LayoutGrid' },
            ...(Object.entries(HORIZON_LABEL).map(([k, v]) => ({ value: k as GoalHorizon, label: v })) as {
              value: GoalHorizon;
              label: string;
            }[]),
          ]}
          value={filter}
          onChange={setFilter}
        />
        <Button size="sm" variant={showCompleted ? 'primary' : 'outline'} icon="Trophy" onClick={() => setShowCompleted((s) => !s)}>
          {showCompleted ? 'پنهان‌کردن تکمیل‌شده‌ها' : 'نمایش تکمیل‌شده‌ها'}
        </Button>
      </Card>

      {!mounted ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" count={4} />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="Target"
            title="هدفی در این دسته نداری"
            description="یک هدف انتخاب کن و آن را به نتایج کلیدی قابل اندازه‌گیری بشکن."
            action={
              <Button
                icon="Plus"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                ساخت هدف
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence>
            {filtered.map((goal) => {
              const progress = goalProgress(goal);
              const linkedTasks = tasks.filter((t) => t.goalId === goal.id);
              const doneTasks = linkedTasks.filter((t) => t.status === 'done').length;
              const daysLeft = goal.targetDate ? Math.round((new Date(goal.targetDate).getTime() - Date.now()) / 86400000) : null;

              return (
                <motion.div key={goal.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                  <Card className={cn('flex h-full flex-col p-5', goal.completed && 'opacity-70')}>
                    <div className="flex items-start gap-4">
                      <ProgressRing value={progress} size={78} stroke={7} color={goal.color}>
                        <span className="num text-base font-black">{toPersianDigits(progress)}٪</span>
                      </ProgressRing>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className={cn('text-[15px] font-bold leading-6', goal.completed && 'line-through')}>{goal.title}</h3>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <Badge color={goal.color}>{HORIZON_LABEL[goal.horizon]}</Badge>
                              <Badge>{goal.category}</Badge>
                              {daysLeft !== null && (
                                <Badge color={daysLeft < 0 ? '#C0554A' : daysLeft < 14 ? '#AD9268' : '#57886A'}>
                                  {daysLeft < 0 ? `${toPersianDigits(Math.abs(daysLeft))} روز گذشته` : `${toPersianDigits(daysLeft)} روز مانده`}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              onClick={() => {
                                setEditing(goal);
                                setDialogOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:bg-[rgb(var(--text)/0.06)]"
                              aria-label="ویرایش هدف"
                            >
                              <Icon name="Pencil" size={14} />
                            </button>
                            <button
                              onClick={() => setDeleting(goal)}
                              className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--danger))]"
                              aria-label="حذف هدف"
                            >
                              <Icon name="Trash2" size={14} />
                            </button>
                          </div>
                        </div>

                        {goal.description && <p className="mt-2 text-[11.5px] leading-6 text-[rgb(var(--text-subtle))]">{goal.description}</p>}
                      </div>
                    </div>

                    {/* نتایج کلیدی */}
                    {goal.keyResults.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[rgb(var(--text-subtle))]">نتایج کلیدی</p>
                        {goal.keyResults.map((kr) => {
                          const krProgress = pct(kr.current, kr.target);
                          return (
                            <div key={kr.id}>
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className="truncate text-[12.5px] font-medium">{kr.title}</span>
                                <span className="num shrink-0 text-[11px] font-bold" style={{ color: goal.color }}>
                                  {toPersianDigits(kr.current)} / {toPersianDigits(kr.target)} {kr.unit ?? ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={0}
                                  max={kr.target}
                                  value={kr.current}
                                  onChange={(e) => onKeyResultChange(goal, kr.id, Number(e.target.value))}
                                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[rgb(var(--text)/0.12)] accent-[rgb(var(--accent))]"
                                  style={{ accentColor: goal.color }}
                                  aria-label={`پیشرفت ${kr.title}`}
                                />
                                <span className="num w-10 text-left text-[11px] font-bold">{toPersianDigits(krProgress)}٪</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {goal.keyResults.length === 0 && (
                      <div className="mt-4">
                        <Progress value={progress} color={goal.color} showLabel />
                        <p className="mt-2 text-[10.5px] text-[rgb(var(--text-subtle))]">پیشرفت دستی — برای دقت بیشتر نتیجه کلیدی اضافه کن.</p>
                      </div>
                    )}

                    {/* تسک‌های مرتبط */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[rgb(var(--border))] pt-3.5">
                      {linkedTasks.length > 0 ? (
                        <span className="num chip bg-[rgb(var(--text)/0.06)] text-[11px]">
                          <Icon name="CheckSquare" size={12} /> {toPersianDigits(doneTasks)} از {toPersianDigits(linkedTasks.length)} تسک مرتبط
                        </span>
                      ) : (
                        <span className="text-[11px] text-[rgb(var(--text-subtle))]">تسکی به این هدف وصل نیست</span>
                      )}
                      <span className="flex-1" />
                      <Button
                        size="sm"
                        variant={goal.completed ? 'soft' : 'primary'}
                        icon={goal.completed ? 'RotateCcw' : 'Check'}
                        onClick={() => {
                          updateGoal(goal.id, { completed: !goal.completed });
                          if (!goal.completed) {
                            fireConfetti(90);
                            toast.success('هدف تکمیل شد! 🎉', 'زمان جشن گرفتن و انتخاب هدف بعدی است.');
                          }
                        }}
                      >
                        {goal.completed ? 'بازگرداندن' : 'تکمیل هدف'}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* بخش «قریب‌الوقوع» */}
      {goals.some((g) => g.targetDate && !g.completed) && (
        <Card className="mt-5 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Icon name="Clock" size={16} className="text-[rgb(var(--accent))]" />
            مهلت‌های نزدیک
          </h3>
          <ul className="space-y-2">
            {goals
              .filter((g) => g.targetDate && !g.completed)
              .sort((a, b) => (a.targetDate ?? '').localeCompare(b.targetDate ?? ''))
              .slice(0, 5)
              .map((g) => (
                <li key={g.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-3">
                  <span className="h-9 w-1 rounded-full" style={{ backgroundColor: g.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{g.title}</p>
                    <p className="num text-[10.5px] text-[rgb(var(--text-subtle))]">
                      {formatJalali(g.targetDate!, 'dddd DD MMMM YYYY')} — {relativeJalali(g.targetDate!)}
                    </p>
                  </div>
                  <Progress value={goalProgress(g)} className="w-24" color={g.color} height={6} showLabel />
                </li>
              ))}
          </ul>
        </Card>
      )}

      <GoalDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        goal={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            removeGoal(deleting.id);
            toast.success('هدف حذف شد');
          }
        }}
        title="حذف هدف"
        message={`هدف «${deleting?.title}» حذف شود؟ تسک‌های مرتبط باقی می‌مانند اما ارتباطشان قطع می‌شود.`}
      />

      <p className="mt-5 text-center text-[11px] text-[rgb(var(--text-subtle))]">
        نکته حرفه‌ای: برای هر هدف ۲ تا ۴ نتیجه کلیدی کافی است؛ بیشتر از آن تمرکز را می‌شکند. (تاریخ امروز: {formatJalali(dayKey(new Date()), 'DD MMMM YYYY')})
      </p>
    </div>
  );
}
