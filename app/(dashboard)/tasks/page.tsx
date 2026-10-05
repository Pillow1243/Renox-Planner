'use client';

/**
 * ماژول تسک‌ها
 * چهار نما: فهرست، کانبان (Drag & Drop)، ماتریس آیزنهاور، تقویم شمسی
 * همراه با فیلتر پروژه/اولویت/برچسب، جست‌وجو، زیرتسک و جزئیات تسک
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePlanner } from '@/stores/planner-store';
import { useMounted } from '@/hooks/use-planner';
import { buildMonthGrid, dayKey, formatJalali, relativeJalali, toJalali } from '@/lib/jalali';
import { PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL } from '@/lib/constants';
import { eisenhowerQuadrants, overdueTasks } from '@/lib/selectors';
import { cn, toPersianDigits, truncate } from '@/lib/utils';
import type { Task, TaskStatus } from '@/lib/types';
import { Icon } from '@/components/ui/icon';
import { Badge, Button, Card, EmptyState, Field, Progress, SegmentedControl, Select, Skeleton } from '@/components/ui/primitives';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { TaskDialog } from '@/components/shared/task-dialog';
import { useQuickAdd } from '@/components/shared/quick-add-context';

type ViewMode = 'list' | 'kanban' | 'eisenhower' | 'calendar';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'todo', title: STATUS_LABEL.todo, color: STATUS_COLOR.todo },
  { id: 'in_progress', title: STATUS_LABEL.in_progress, color: STATUS_COLOR.in_progress },
  { id: 'review', title: STATUS_LABEL.review, color: STATUS_COLOR.review },
  { id: 'done', title: STATUS_LABEL.done, color: STATUS_COLOR.done },
];

/* ------------------------------ ردیف تسک ------------------------------- */
function TaskRow({
  task,
  onOpen,
  compact,
}: {
  task: Task;
  onOpen: (t: Task) => void;
  compact?: boolean;
}) {
  const projects = usePlanner((s) => s.projects);
  const toggleTaskDone = usePlanner((s) => s.toggleTaskDone);
  const toggleSubtask = usePlanner((s) => s.toggleSubtask);
  const project = projects.find((p) => p.id === task.projectId);
  const doneSubs = task.subtasks.filter((s) => s.done).length;
  const isDone = task.status === 'done';
  const overdue = !isDone && task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group flex items-start gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3.5 transition-all duration-200 hover:shadow-soft',
        isDone && 'opacity-65'
      )}
    >
      {/* چک‌باکس */}
      <button
        onClick={() => toggleTaskDone(task.id)}
        aria-label={isDone ? 'بازگرداندن تسک' : 'تکمیل تسک'}
        className={cn(
          'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-all duration-200 active:scale-90',
          isDone ? 'border-transparent bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]' : 'border-[rgb(var(--border))] hover:border-[rgb(var(--accent))]'
        )}
      >
        {isDone && <Icon name="Check" size={14} strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <button onClick={() => onOpen(task)} className="block w-full text-right">
          <p className={cn('text-sm font-semibold leading-6', isDone && 'line-through')}>{task.title}</p>
          {!compact && task.description && (
            <p className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-[rgb(var(--text-subtle))]">{truncate(task.description, 110)}</p>
          )}
        </button>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge color={PRIORITY_COLOR[task.priority]} dot>
            {PRIORITY_LABEL[task.priority]}
          </Badge>
          {project && (
            <Badge color={project.color}>
              <Icon name={project.icon} size={11} /> {project.name}
            </Badge>
          )}
          {task.dueDate && (
            <span className={cn('chip num', overdue ? 'bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))]' : 'bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]')}>
              <Icon name="Calendar" size={11} />
              {relativeJalali(task.dueDate)}
              {task.dueTime && ` — ${toPersianDigits(task.dueTime)}`}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span className="chip num bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-muted))]">
              <Icon name="ListChecks" size={11} /> {toPersianDigits(doneSubs)}/{toPersianDigits(task.subtasks.length)}
            </span>
          )}
          {task.repeat !== 'none' && (
            <span className="chip bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
              <Icon name="Repeat" size={11} /> تکرارشونده
            </span>
          )}
          {task.tags.slice(0, 2).map((t) => (
            <span key={t} className="chip bg-[rgb(var(--text)/0.06)] text-[rgb(var(--text-subtle))]">
              #{t}
            </span>
          ))}
        </div>

        {/* نوار پیشرفت زیرتسک‌ها */}
        {task.subtasks.length > 0 && !compact && (
          <Progress className="mt-2.5" value={(doneSubs / task.subtasks.length) * 100} height={4} />
        )}

        {/* زیرتسک‌های سریع */}
        {task.subtasks.length > 0 && compact && (
          <ul className="mt-2 space-y-1">
            {task.subtasks.slice(0, 3).map((st) => (
              <li key={st.id} className="flex items-center gap-2 text-[11px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSubtask(task.id, st.id);
                  }}
                  className="text-[rgb(var(--text-subtle))]"
                  aria-label="تغییر زیرتسک"
                >
                  <Icon name={st.done ? 'CheckCircle2' : 'Circle'} size={13} />
                </button>
                <span className={st.done ? 'line-through opacity-60' : ''}>{st.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => onOpen(task)}
        className="shrink-0 rounded-lg p-1.5 text-[rgb(var(--text-subtle))] opacity-0 transition-opacity hover:bg-[rgb(var(--text)/0.06)] group-hover:opacity-100"
        aria-label="جزئیات تسک"
      >
        <Icon name="ChevronLeft" size={17} />
      </button>
    </motion.li>
  );
}

/* ------------------------------- کارت کانبان ---------------------------- */
function KanbanCard({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const projects = usePlanner((s) => s.projects);
  const project = projects.find((p) => p.id === task.projectId);
  const doneSubs = task.subtasks.filter((s) => s.done).length;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-soft transition-shadow active:cursor-grabbing hover:shadow-lifted',
        isDragging && 'opacity-40'
      )}
    >
      <button onClick={() => onOpen(task)} className="block w-full text-right">
        <p className="text-[13px] font-semibold leading-6">{task.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLOR[task.priority] }} />
          <span className="text-[10.5px] text-[rgb(var(--text-subtle))]">{PRIORITY_LABEL[task.priority]}</span>
          {project && (
            <span className="chip !px-2 !py-0.5 text-[10px]" style={{ backgroundColor: `${project.color}1F`, color: project.color }}>
              {project.name}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10.5px] text-[rgb(var(--text-subtle))]">
          <span className="num">{task.dueDate ? relativeJalali(task.dueDate) : 'بدون سررسید'}</span>
          {task.subtasks.length > 0 && (
            <span className="num flex items-center gap-1">
              <Icon name="ListChecks" size={11} /> {toPersianDigits(doneSubs)}/{toPersianDigits(task.subtasks.length)}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  onOpen,
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  onOpen: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div className="flex min-w-[270px] flex-1 flex-col rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
          {column.title}
        </span>
        <span className="num rounded-full bg-[rgb(var(--text)/0.07)] px-2 py-0.5 text-[10px] font-bold">{toPersianDigits(tasks.length)}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[120px] flex-1 flex-col gap-2 rounded-xl p-1 transition-colors',
          isOver && 'bg-[rgb(var(--accent)/0.07)] ring-1 ring-[rgb(var(--accent)/0.3)]'
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </SortableContext>
        {tasks.length === 0 && <p className="py-6 text-center text-[11px] text-[rgb(var(--text-subtle))]">تسکی اینجا نیست</p>}
      </div>
    </div>
  );
}

/* ------------------------- چهارخانه ماتریس آیزنهاور ---------------------- */
function EisenhowerView({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const q = eisenhowerQuadrants(tasks);
  const boxes = [
    { key: 'do', title: 'انجام بده', subtitle: 'مهم و فوری', items: q.do, color: '#C0554A', icon: 'Zap' },
    { key: 'plan', title: 'برنامه‌ریزی کن', subtitle: 'مهم اما غیرفوری', items: q.plan, color: '#57886A', icon: 'CalendarCheck' },
    { key: 'delegate', title: 'واگذار کن', subtitle: 'فوری اما غیرمهم', items: q.delegate, color: '#AD9268', icon: 'Users' },
    { key: 'delete', title: 'حذف کن', subtitle: 'نه مهم نه فوری', items: q.delete, color: '#7E7E88', icon: 'Trash2' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {boxes.map((box) => (
        <Card key={box.key} className="p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: `${box.color}1F`, color: box.color }}>
              <Icon name={box.icon} size={16} />
            </span>
            <div>
              <p className="text-sm font-bold">{box.title}</p>
              <p className="text-[11px] text-[rgb(var(--text-subtle))]">
                {box.subtitle} — {toPersianDigits(box.items.length)} تسک
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {box.items.slice(0, 6).map((task) => (
              <li key={task.id}>
                <button
                  onClick={() => onOpen(task)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-[rgb(var(--border))] p-2.5 text-right transition-colors hover:bg-[rgb(var(--text)/0.03)]"
                >
                  <span className="h-8 w-1 rounded-full" style={{ backgroundColor: PRIORITY_COLOR[task.priority] }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{task.title}</span>
                    <span className="num block text-[10.5px] text-[rgb(var(--text-subtle))]">
                      {task.dueDate ? relativeJalali(task.dueDate) : 'بدون سررسید'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {box.items.length === 0 && <li className="py-5 text-center text-[11px] text-[rgb(var(--text-subtle))]">خالی</li>}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------- نمای تقویم ----------------------------- */
function CalendarView({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const [view, setView] = React.useState(() => {
    const j = toJalali(new Date());
    return { jy: j.jy, jm: j.jm };
  });
  const weeks = React.useMemo(() => buildMonthGrid(view.jy, view.jm), [view]);
  const byDay = React.useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const key = dayKey(t.dueDate);
      map.set(key, [...(map.get(key) ?? []), t]);
    });
    return map;
  }, [tasks]);

  const shift = (delta: number) => {
    setView((v) => {
      let jm = v.jm + delta;
      let jy = v.jy;
      while (jm > 12) {
        jm -= 12;
        jy += 1;
      }
      while (jm < 1) {
        jm += 12;
        jy -= 1;
      }
      return { jy, jm };
    });
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" icon="ChevronRight" onClick={() => shift(-1)}>
          ماه قبل
        </Button>
        <h3 className="num text-base font-bold">
          {['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'][view.jm - 1]}{' '}
          {toPersianDigits(view.jy)}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => shift(1)}>
          ماه بعد
          <Icon name="ChevronLeft" size={16} />
        </Button>
      </div>

      <div className="grid-calendar mb-1 gap-1">
        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((d) => (
          <span key={d} className="py-1 text-center text-[11px] font-bold text-[rgb(var(--text-subtle))]">
            {d}
          </span>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid-calendar gap-1">
            {week.map((cell) => {
              const list = byDay.get(cell.key) ?? [];
              return (
                <div
                  key={cell.key}
                  className={cn(
                    'min-h-[86px] rounded-xl border p-1.5 transition-colors',
                    cell.inMonth ? 'border-[rgb(var(--border))] bg-[rgb(var(--surface))]' : 'border-transparent bg-[rgb(var(--text)/0.03)] opacity-55',
                    cell.isToday && 'ring-2 ring-[rgb(var(--accent)/0.5)]'
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn('num text-[11px] font-bold', cell.isHoliday && 'text-[rgb(var(--danger))]')}>
                      {toPersianDigits(cell.jalali.jd)}
                    </span>
                    {list.length > 2 && <span className="num text-[9px] text-[rgb(var(--text-subtle))]">{toPersianDigits(list.length)}</span>}
                  </div>
                  <div className="space-y-0.5">
                    {list.slice(0, 2).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onOpen(t)}
                        className="block w-full truncate rounded-md px-1.5 py-0.5 text-right text-[10px] font-medium transition-colors hover:brightness-95"
                        style={{ backgroundColor: `${PRIORITY_COLOR[t.priority]}22`, color: PRIORITY_COLOR[t.priority] }}
                        title={t.title}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------------------- جزئیات تسک (شیت) -------------------------- */
function TaskDetail({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const projects = usePlanner((s) => s.projects);
  const updateTask = usePlanner((s) => s.updateTask);
  const removeTask = usePlanner((s) => s.removeTask);
  const toggleSubtask = usePlanner((s) => s.toggleSubtask);
  const addSubtask = usePlanner((s) => s.addSubtask);
  const { open: openDialog } = useQuickAdd();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [newSub, setNewSub] = React.useState('');
  const current = usePlanner((s) => s.tasks.find((t) => t.id === task?.id));

  if (!current) return null;
  const project = projects.find((p) => p.id === current.projectId);
  const doneSubs = current.subtasks.filter((s) => s.done).length;

  return (
    <>
      <Modal
        open={Boolean(task)}
        onClose={onClose}
        title={current.title}
        description={project ? `پروژه: ${project.name}` : 'بدون پروژه'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" icon="Trash2" onClick={() => setConfirmDelete(true)}>
              حذف
            </Button>
            <Button variant="outline" icon="Pencil" onClick={() => { onClose(); openDialog('task', { initial: current }); }}>
              ویرایش کامل
            </Button>
            <Button
              icon={current.status === 'done' ? 'RotateCcw' : 'Check'}
              onClick={() => {
                updateTask(current.id, {
                  status: current.status === 'done' ? 'todo' : 'done',
                  completedAt: current.status === 'done' ? undefined : new Date().toISOString(),
                });
                toast.success(current.status === 'done' ? 'تسک بازگردانده شد' : 'تسک تکمیل شد 🎉');
                onClose();
              }}
            >
              {current.status === 'done' ? 'بازگرداندن' : 'تکمیل کن'}
            </Button>
          </>
        }
      >
        <div className="space-y-5 pt-1">
          {current.description && <p className="whitespace-pre-wrap text-sm leading-7 text-[rgb(var(--text-muted))]">{current.description}</p>}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'وضعیت', value: STATUS_LABEL[current.status], icon: 'CircleDot' },
              { label: 'اولویت', value: PRIORITY_LABEL[current.priority], icon: 'Flame' },
              { label: 'سررسید', value: current.dueDate ? formatJalali(current.dueDate, 'dddd DD MMMM YYYY') : '—', icon: 'Calendar' },
              { label: 'ساعت', value: current.dueTime ? toPersianDigits(current.dueTime) : '—', icon: 'Clock' },
              { label: 'تخمین', value: current.estimate ? `${toPersianDigits(current.estimate)} دقیقه` : '—', icon: 'Timer' },
              { label: 'زمان صرف‌شده', value: current.spent ? `${toPersianDigits(current.spent)} دقیقه` : '—', icon: 'Stopwatch' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3">
                <p className="flex items-center gap-1.5 text-[10.5px] text-[rgb(var(--text-subtle))]">
                  <Icon name={item.icon} size={12} /> {item.label}
                </p>
                <p className="num mt-1 text-[13px] font-bold">{item.value}</p>
              </div>
            ))}
          </div>

          {/* ماتریس */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateTask(current.id, { important: !current.important })}
              className={cn('chip border', current.important ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]' : 'border-[rgb(var(--border))]')}
            >
              <Icon name={current.important ? 'CheckCircle2' : 'Circle'} size={13} /> مهم
            </button>
            <button
              onClick={() => updateTask(current.id, { urgent: !current.urgent })}
              className={cn('chip border', current.urgent ? 'border-[rgb(var(--danger))] bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))]' : 'border-[rgb(var(--border))]')}
            >
              <Icon name={current.urgent ? 'CheckCircle2' : 'Circle'} size={13} /> فوری
            </button>
          </div>

          {/* زیرتسک‌ها */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-[rgb(var(--text-muted))]">زیرتسک‌ها</p>
              {current.subtasks.length > 0 && (
                <span className="num text-[11px] text-[rgb(var(--text-subtle))]">
                  {toPersianDigits(doneSubs)} از {toPersianDigits(current.subtasks.length)}
                </span>
              )}
            </div>
            {current.subtasks.length > 0 && <Progress className="mb-3" value={(doneSubs / current.subtasks.length) * 100} height={5} />}
            <ul className="space-y-1.5">
              <AnimatePresence>
                {current.subtasks.map((st) => (
                  <motion.li
                    key={st.id}
                    layout
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="flex items-center gap-2.5 rounded-xl border border-[rgb(var(--border))] p-2.5"
                  >
                    <button onClick={() => toggleSubtask(current.id, st.id)} className="text-[rgb(var(--text-subtle))]" aria-label="تغییر زیرتسک">
                      <Icon name={st.done ? 'CheckCircle2' : 'Circle'} size={17} />
                    </button>
                    <span className={cn('flex-1 text-[13px]', st.done && 'line-through opacity-60')}>{st.title}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <div className="mt-2 flex gap-2">
              <Field
                value={newSub}
                placeholder="زیرتسک جدید…"
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSub.trim()) {
                    addSubtask(current.id, newSub.trim());
                    setNewSub('');
                  }
                }}
              />
              <Button
                variant="outline"
                icon="Plus"
                onClick={() => {
                  if (newSub.trim()) {
                    addSubtask(current.id, newSub.trim());
                    setNewSub('');
                  }
                }}
              >
                افزودن
              </Button>
            </div>
          </div>

          {/* تغییر سریع وضعیت */}
          <div>
            <p className="mb-2 text-xs font-bold text-[rgb(var(--text-muted))]">تغییر وضعیت</p>
            <SegmentedControl
              options={COLUMNS.map((c) => ({ value: c.id, label: c.title }))}
              value={current.status}
              onChange={(v) => updateTask(current.id, { status: v, completedAt: v === 'done' ? new Date().toISOString() : undefined })}
              size="sm"
              className="flex-wrap"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          removeTask(current.id);
          onClose();
          toast.success('تسک حذف شد');
        }}
        title="حذف تسک"
        message={`تسک «${current.title}» حذف شود؟`}
      />
    </>
  );
}

/* ============================== صفحه تسک‌ها ============================== */
export default function TasksPage() {
  const tasks = usePlanner((s) => s.tasks);
  const projects = usePlanner((s) => s.projects);
  const moveTask = usePlanner((s) => s.moveTask);
  const toggleTaskDone = usePlanner((s) => s.toggleTaskDone);
  const mounted = useMounted();
  const { open: openDialog } = useQuickAdd();

  const [view, setView] = React.useState<ViewMode>('list');
  const [query, setQuery] = React.useState('');
  const [projectFilter, setProjectFilter] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [sort, setSort] = React.useState<'order' | 'due' | 'priority'>('order');
  const [selected, setSelected] = React.useState<Task | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tasks.filter((t) => {
      if (q && !`${t.title} ${t.description ?? ''} ${t.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      if (projectFilter && t.projectId !== projectFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      return true;
    });
    if (sort === 'due') list = [...list].sort((a, b) => (a.dueDate ?? 'z').localeCompare(b.dueDate ?? 'z'));
    if (sort === 'priority') {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      list = [...list].sort((a, b) => order[a.priority] - order[b.priority]);
    }
    return list;
  }, [tasks, query, projectFilter, priorityFilter, statusFilter, sort]);

  const overdue = overdueTasks(tasks);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const taskId = String(active.id);
    const overId = String(over.id);

    // رها شدن روی یک ستون
    if (COLUMNS.some((c) => c.id === overId)) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== overId) {
        moveTask(taskId, overId as TaskStatus);
      }
      return;
    }
    // رها شدن روی یک کارت دیگر
    const overTask = tasks.find((t) => t.id === overId);
    const activeTask = tasks.find((t) => t.id === taskId);
    if (overTask && activeTask && overTask.status !== activeTask.status) {
      moveTask(taskId, overTask.status);
    }
  };

  const activeTask = tasks.find((t) => t.id === activeId) ?? null;

  return (
    <div>
      <PageHeader
        title="تسک‌ها"
        description="همه کارهایت در یک مکان — با زیرتسک، تکرار، ماتریس آیزنهاور و کانبان."
        icon="CheckSquare"
        actions={
          <>
            <Button variant="outline" size="sm" icon="Sparkles" onClick={() => openDialog('task', { initial: { important: true, urgent: true, priority: 'urgent' } })}>
              کار فوری
            </Button>
            <Button size="sm" icon="Plus" onClick={() => openDialog('task')}>
              تسک جدید
            </Button>
          </>
        }
      />

      {/* نوار ابزار */}
      <Card className="mb-5 flex flex-wrap items-center gap-3 p-3.5">
        <div className="relative min-w-[200px] flex-1">
          <Icon name="Search" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-subtle))]" />
          <Field className="pr-9" placeholder="جست‌وجو در تسک‌ها…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <Select className="!w-auto min-w-[130px]" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="">همه پروژه‌ها</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>

        <Select className="!w-auto min-w-[110px]" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">همه اولویت‌ها</option>
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>

        <Select className="!w-auto min-w-[120px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>

        <Select className="!w-auto min-w-[120px]" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="order">جدیدترین</option>
          <option value="due">نزدیک‌ترین سررسید</option>
          <option value="priority">بالاترین اولویت</option>
        </Select>

        <SegmentedControl
          size="sm"
          options={[
            { value: 'list', label: 'فهرست', icon: 'ListChecks' },
            { value: 'kanban', label: 'کانبان', icon: 'Columns3' },
            { value: 'eisenhower', label: 'آیزنهاور', icon: 'Grid2x2' },
            { value: 'calendar', label: 'تقویم', icon: 'CalendarDays' },
          ]}
          value={view}
          onChange={setView}
        />
      </Card>

      {/* هشدار عقب‌افتاده */}
      {overdue.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[rgb(var(--danger)/0.3)] bg-[rgb(var(--danger)/0.07)] p-3.5">
          <Icon name="AlertTriangle" size={18} className="text-[rgb(var(--danger))]" />
          <p className="flex-1 text-[13px]">
            <span className="num font-bold">{toPersianDigits(overdue.length)}</span> تسک از موعد گذشته — بهتر است امروز به آن‌ها رسیدگی کنی.
          </p>
          <Button
            size="sm"
            variant="outline"
            icon="Calendar"
            onClick={() =>
              overdue.forEach((t) => {
                const d = new Date();
                d.setHours(18, 0, 0, 0);
                usePlanner.getState().updateTask(t.id, { dueDate: d.toISOString() });
              })
            }
          >
            انتقال به امروز
          </Button>
        </div>
      )}

      {!mounted ? (
        <div className="space-y-2">
          <Skeleton className="h-20" count={5} />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="CheckSquare"
            title={query || projectFilter || priorityFilter ? 'تسکی با این فیلترها پیدا نشد' : 'هنوز تسکی نداری'}
            description="اولین تسک را بساز و امروز را با یک برد کوچک شروع کن."
            action={
              <Button icon="Plus" onClick={() => openDialog('task')}>
                تسک جدید
              </Button>
            }
          />
        </Card>
      ) : view === 'list' ? (
        <ul className="space-y-2">
          <AnimatePresence>
            {filtered.map((task) => (
              <TaskRow key={task.id} task={task} onOpen={setSelected} />
            ))}
          </AnimatePresence>
        </ul>
      ) : view === 'kanban' ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-3">
            {COLUMNS.map((column) => (
              <KanbanColumn key={column.id} column={column} tasks={filtered.filter((t) => t.status === column.id)} onOpen={setSelected} />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="w-[250px] rotate-2 rounded-2xl border border-[rgb(var(--accent))] bg-[rgb(var(--surface))] p-3 shadow-lifted">
                <p className="text-[13px] font-semibold">{activeTask.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : view === 'eisenhower' ? (
        <EisenhowerView tasks={filtered} onOpen={setSelected} />
      ) : (
        <CalendarView tasks={filtered} onOpen={setSelected} />
      )}

      {/* دکمه‌های سریع پایین در موبایل */}
      {filtered.some((t) => t.status !== 'done') && (
        <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5">
          <p className="w-full text-xs font-bold text-[rgb(var(--text-muted))]">اقدام سریع روی تسک‌های امروز</p>
          {filtered
            .filter((t) => t.status !== 'done' && t.dueDate && dayKey(t.dueDate) === dayKey(new Date()))
            .slice(0, 4)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  toggleTaskDone(t.id);
                  usePlanner.getState().notify({ title: 'تسک انجام شد', body: t.title, type: 'success', href: '/tasks' });
                }}
                className="chip border border-[rgb(var(--border))] bg-[rgb(var(--surface))] transition-colors hover:border-[rgb(var(--accent))]"
              >
                <Icon name="Check" size={13} /> {truncate(t.title, 26)}
              </button>
            ))}
          {filtered.filter((t) => t.dueDate && dayKey(t.dueDate) === dayKey(new Date()) && t.status !== 'done').length === 0 && (
            <p className="text-[11px] text-[rgb(var(--text-subtle))]">تسکی برای امروز باقی نمانده ✨</p>
          )}
        </div>
      )}

      <TaskDetail task={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
