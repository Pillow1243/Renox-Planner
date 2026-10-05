'use client';

/**
 * پروژه‌ها
 *  - کارت پروژه با پیشرفت خودکار بر اساس تسک‌ها
 *  - نمایش تسک‌های هر پروژه، آرشیو و حذف
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { useMounted } from '@/hooks/use-planner';
import { formatJalali } from '@/lib/jalali';
import { projectProgress } from '@/lib/selectors';
import { PRIORITY_COLOR, PRIORITY_LABEL } from '@/lib/constants';
import { cn, toPersianDigits } from '@/lib/utils';
import type { Project } from '@/lib/types';
import { Icon } from '@/components/ui/icon';
import { Badge, Button, Card, EmptyState, Progress, Skeleton } from '@/components/ui/primitives';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { ProjectDialog } from '@/components/shared/dialogs';
import { useQuickAdd } from '@/components/shared/quick-add-context';

export default function ProjectsPage() {
  const projects = usePlanner((s) => s.projects);
  const tasks = usePlanner((s) => s.tasks);
  const updateProject = usePlanner((s) => s.updateProject);
  const removeProject = usePlanner((s) => s.removeProject);
  const mounted = useMounted();
  const toast = useToast();
  const { open: openDialog } = useQuickAdd();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Project | null>(null);
  const [deleting, setDeleting] = React.useState<Project | null>(null);
  const [detail, setDetail] = React.useState<Project | null>(null);
  const [showArchived, setShowArchived] = React.useState(false);

  const visible = projects.filter((p) => showArchived || !p.archived);

  const stats = React.useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    return {
      count: projects.filter((p) => !p.archived).length,
      total,
      done,
      completion: total ? Math.round((done / total) * 100) : 0,
    };
  }, [projects, tasks]);

  const detailTasks = detail ? tasks.filter((t) => t.projectId === detail.id) : [];

  return (
    <div>
      <PageHeader
        title="پروژه‌ها"
        description="کارهای مرتبط را در یک پروژه جمع کن تا پیشرفت را شفاف ببینی"
        icon="FolderKanban"
        actions={
          <>
            <Button size="sm" variant="outline" icon="FolderOpen" onClick={() => setShowArchived((s) => !s)}>
              {showArchived ? 'پنهان‌کردن آرشیو' : 'نمایش آرشیو'}
            </Button>
            <Button
              size="sm"
              icon="Plus"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              پروژه جدید
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="پروژه‌های فعال" value={stats.count} icon="FolderKanban" color="#57886A" index={0} />
        <StatCard label="کل تسک‌ها" value={stats.total} icon="ListChecks" color="#6C7FA8" index={1} />
        <StatCard label="تسک‌های انجام‌شده" value={stats.done} icon="CheckCircle2" color="#AD9268" index={2} />
        <StatCard label="نرخ تکمیل" value={stats.completion} unit="٪" icon="TrendingUp" color="#BE7857" index={3} />
      </div>

      {!mounted ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-52" count={6} />
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon="FolderKanban"
            title="هنوز پروژه‌ای نساخته‌ای"
            description="پروژه‌ها به تو کمک می‌کنند تسک‌های مرتبط را کنار هم ببینی و پیشرفت را بسنجی."
            action={
              <Button
                icon="Plus"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                ساخت پروژه
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {visible.map((project) => {
              const progress = projectProgress(tasks, project.id);
              const upcoming = tasks
                .filter((t) => t.projectId === project.id && t.status !== 'done' && t.dueDate)
                .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))[0];

              return (
                <motion.div key={project.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                  <Card className={cn('relative flex h-full flex-col overflow-hidden p-5', project.archived && 'opacity-60')}>
                    <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: project.color }} />

                    <div className="flex items-start gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: `${project.color}1F`, color: project.color }}>
                        <Icon name={project.icon} size={22} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <button onClick={() => setDetail(project)} className="block w-full text-right">
                          <h3 className="truncate text-[15px] font-bold">{project.name}</h3>
                          {project.description && (
                            <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-6 text-[rgb(var(--text-subtle))]">{project.description}</p>
                          )}
                        </button>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => {
                            setEditing(project);
                            setDialogOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:bg-[rgb(var(--text)/0.06)]"
                          aria-label="ویرایش پروژه"
                        >
                          <Icon name="Pencil" size={14} />
                        </button>
                        <button
                          onClick={() => setDeleting(project)}
                          className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--danger))]"
                          aria-label="حذف پروژه"
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="text-[rgb(var(--text-muted))]">پیشرفت پروژه</span>
                        <span className="num font-bold" style={{ color: project.color }}>
                          {toPersianDigits(progress.done)} از {toPersianDigits(progress.total)} — {toPersianDigits(progress.percent)}٪
                        </span>
                      </div>
                      <Progress value={progress.percent} color={project.color} height={8} />
                    </div>

                    {project.dueDate && (
                      <p className="num mt-3 flex items-center gap-1.5 text-[11px] text-[rgb(var(--text-subtle))]">
                        <Icon name="Calendar" size={12} /> مهلت: {formatJalali(project.dueDate, 'DD MMMM YYYY')}
                      </p>
                    )}

                    {upcoming && (
                      <div className="mt-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-2.5">
                        <p className="text-[10px] font-bold text-[rgb(var(--text-subtle))]">نزدیک‌ترین تسک</p>
                        <p className="mt-0.5 truncate text-[12px] font-medium">{upcoming.title}</p>
                        <p className="num mt-0.5 text-[10px] text-[rgb(var(--text-subtle))]">{formatJalali(upcoming.dueDate!, 'DD MMMM')}</p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[rgb(var(--border))] pt-3.5">
                      <Button size="sm" variant="outline" icon="Plus" onClick={() => openDialog('task', { initial: { projectId: project.id } })}>
                        تسک جدید
                      </Button>
                      <Button size="sm" variant="ghost" icon={project.archived ? 'RotateCcw' : 'Save'} onClick={() => updateProject(project.id, { archived: !project.archived })}>
                        {project.archived ? 'بازگرداندن' : 'آرشیو'}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* جزئیات پروژه */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name}
        description={detail?.description}
        size="lg"
        footer={
          <>
            <Button variant="outline" icon="CheckSquare" onClick={() => openDialog('task', { initial: { projectId: detail?.id } })}>
              افزودن تسک
            </Button>
            <Button icon="Check" onClick={() => setDetail(null)}>
              بستن
            </Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3 text-center">
                <p className="num text-xl font-black">{toPersianDigits(detailTasks.length)}</p>
                <p className="text-[10.5px] text-[rgb(var(--text-subtle))]">کل تسک‌ها</p>
              </div>
              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3 text-center">
                <p className="num text-xl font-black">{toPersianDigits(detailTasks.filter((t) => t.status === 'done').length)}</p>
                <p className="text-[10.5px] text-[rgb(var(--text-subtle))]">انجام‌شده</p>
              </div>
              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3 text-center">
                <p className="num text-xl font-black">{toPersianDigits(projectProgress(tasks, detail.id).percent)}٪</p>
                <p className="text-[10.5px] text-[rgb(var(--text-subtle))]">پیشرفت</p>
              </div>
            </div>

            {detailTasks.length === 0 ? (
              <EmptyState icon="ListChecks" title="این پروژه تسکی ندارد" description="اولین تسک را اضافه کن تا پیشرفت محاسبه شود." />
            ) : (
              <ul className="space-y-2">
                {detailTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-3">
                    <button
                      onClick={() => usePlanner.getState().toggleTaskDone(t.id)}
                      className={cn(
                        'grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-colors',
                        t.status === 'done' ? 'border-transparent bg-[rgb(var(--accent))] text-white' : 'border-[rgb(var(--border))]'
                      )}
                      aria-label="تغییر وضعیت"
                    >
                      {t.status === 'done' && <Icon name="Check" size={13} />}
                    </button>
                    <span className={cn('min-w-0 flex-1 truncate text-[13px]', t.status === 'done' && 'line-through opacity-60')}>{t.title}</span>
                    <Badge color={PRIORITY_COLOR[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                    {t.dueDate && <span className="num shrink-0 text-[10.5px] text-[rgb(var(--text-subtle))]">{formatJalali(t.dueDate, 'DD MMMM')}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>

      <ProjectDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        project={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            removeProject(deleting.id);
            toast.success('پروژه حذف شد', 'تسک‌های آن بدون پروژه باقی ماندند.');
          }
        }}
        title="حذف پروژه"
        message={`پروژه «${deleting?.name}» حذف شود؟ تسک‌های آن حذف نمی‌شوند اما از پروژه جدا می‌شوند.`}
      />
    </div>
  );
}
