'use client';

/** فرم ایجاد/ویرایش تسک — با پشتیبانی از زیرتسک، برچسب، تکرار و ماتریس آیزنهاور */
import * as React from 'react';
import { usePlanner } from '@/stores/planner-store';
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/constants';
import { dayKey } from '@/lib/jalali';
import type { Priority, RepeatRule, Task, TaskStatus } from '@/lib/types';
import { uid } from '@/lib/utils';
import { Button, Field, Label, SegmentedControl, Select, Switch, TextArea } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { Icon } from '@/components/ui/icon';
import { JalaliDatePicker } from './jalali-date-picker';
import { useQuickAdd } from './quick-add-context';

export interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  /** برای ویرایش: تسک موجود. برای ایجاد: مقادیر اولیه */
  task?: Task | null;
  initial?: Partial<Task>;
}

export function TaskDialog({ open, onClose, task, initial }: TaskDialogProps) {
  const projects = usePlanner((s) => s.projects);
  const goals = usePlanner((s) => s.goals);
  const addTask = usePlanner((s) => s.addTask);
  const updateTask = usePlanner((s) => s.updateTask);
  const notify = usePlanner((s) => s.notify);
  const { toast } = useQuickAdd();

  const [form, setForm] = React.useState<Partial<Task>>({});
  const [subtaskInput, setSubtaskInput] = React.useState('');
  const [tagInput, setTagInput] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setForm(task ? { ...task } : { priority: 'medium', status: 'todo', important: true, urgent: false, repeat: 'none', ...initial });
    setSubtaskInput('');
    setTagInput('');
  }, [open, task, initial]);

  const patch = (p: Partial<Task>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.title?.trim()) {
      toast.warning('عنوان تسک الزامی است');
      return;
    }
    if (task) {
      updateTask(task.id, form);
      toast.success('تسک به‌روزرسانی شد');
    } else {
      addTask(form);
      toast.success('تسک ایجاد شد', form.dueDate ? 'در تاریخ انتخابی نمایش داده می‌شود.' : undefined);
      notify({ title: 'تسک جدید ایجاد شد', body: form.title ?? '', type: 'info', href: '/tasks' });
    }
    onClose();
  };

  const addSubtask = () => {
    if (!subtaskInput.trim()) return;
    patch({ subtasks: [...(form.subtasks ?? []), { id: uid('st'), title: subtaskInput.trim(), done: false }] });
    setSubtaskInput('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'ویرایش تسک' : 'تسک جدید'}
      description="جزئیات را کامل کن تا بعداً راحت‌تر تمرکز کنی."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button icon="Check" onClick={save}>
            {task ? 'ذخیره تغییرات' : 'ایجاد تسک'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-1">
        <div>
          <Label>عنوان تسک</Label>
          <Field
            autoFocus
            value={form.title ?? ''}
            placeholder="مثلاً: نوشتن گزارش هفتگی"
            onChange={(e) => patch({ title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
            }}
          />
        </div>

        <div>
          <Label hint="اختیاری">توضیحات</Label>
          <TextArea
            value={form.description ?? ''}
            placeholder="جزئیات، لینک‌ها یا یادداشت‌های مرتبط…"
            onChange={(e) => patch({ description: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>وضعیت</Label>
            <Select value={form.status ?? 'todo'} onChange={(e) => patch({ status: e.target.value as TaskStatus })}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>اولویت</Label>
            <Select value={form.priority ?? 'medium'} onChange={(e) => patch({ priority: e.target.value as Priority })}>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>پروژه</Label>
            <Select value={form.projectId ?? ''} onChange={(e) => patch({ projectId: e.target.value || undefined })}>
              <option value="">— بدون پروژه —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>هدف مرتبط</Label>
            <Select value={form.goalId ?? ''} onChange={(e) => patch({ goalId: e.target.value || undefined })}>
              <option value="">— بدون هدف —</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>سررسید (شمسی)</Label>
            <JalaliDatePicker value={form.dueDate ?? null} onChange={(d) => patch({ dueDate: d ? d.toISOString() : undefined })} />
          </div>
          <div>
            <Label>ساعت</Label>
            <Field
              type="time"
              value={form.dueTime ?? ''}
              onChange={(e) => patch({ dueTime: e.target.value })}
            />
          </div>

          <div>
            <Label>تکرار</Label>
            <Select value={form.repeat ?? 'none'} onChange={(e) => patch({ repeat: e.target.value as RepeatRule })}>
              <option value="none">بدون تکرار</option>
              <option value="daily">روزانه</option>
              <option value="weekdays">روزهای کاری</option>
              <option value="weekly">هفتگی</option>
              <option value="monthly">ماهانه</option>
              <option value="yearly">سالانه</option>
            </Select>
          </div>
          <div>
            <Label hint="دقیقه">زمان تخمینی</Label>
            <Field
              type="number"
              min={0}
              step={5}
              value={form.estimate ?? ''}
              onChange={(e) => patch({ estimate: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>

        {/* ماتریس آیزنهاور */}
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5">
          <p className="mb-2.5 text-xs font-bold text-[rgb(var(--text-muted))]">ماتریس آیزنهاور</p>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2.5 text-sm">
              <Switch checked={Boolean(form.important)} onChange={(v) => patch({ important: v })} label="مهم" />
              مهم
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <Switch checked={Boolean(form.urgent)} onChange={(v) => patch({ urgent: v })} label="فوری" />
              فوری
            </label>
            <span className="chip bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
              {form.important && form.urgent
                ? 'انجام بده (فوری و مهم)'
                : form.important
                ? 'برنامه‌ریزی کن'
                : form.urgent
                ? 'واگذار کن'
                : 'حذف کن'}
            </span>
          </div>
        </div>

        {/* زیرتسک‌ها */}
        <div>
          <Label>زیرتسک‌ها</Label>
          <div className="mb-2 space-y-1.5">
            {(form.subtasks ?? []).map((st) => (
              <div key={st.id} className="flex items-center gap-2 rounded-lg border border-[rgb(var(--border))] px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={() =>
                    patch({ subtasks: (form.subtasks ?? []).map((x) => (x.id === st.id ? { ...x, done: !x.done } : x)) })
                  }
                  className="text-[rgb(var(--text-subtle))]"
                  aria-label="تغییر وضعیت زیرتسک"
                >
                  <Icon name={st.done ? 'CheckCircle2' : 'Circle'} size={16} />
                </button>
                <span className={st.done ? 'flex-1 text-sm line-through opacity-60' : 'flex-1 text-sm'}>{st.title}</span>
                <button
                  type="button"
                  onClick={() => patch({ subtasks: (form.subtasks ?? []).filter((x) => x.id !== st.id) })}
                  className="text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--danger))]"
                  aria-label="حذف زیرتسک"
                >
                  <Icon name="X" size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Field
              value={subtaskInput}
              placeholder="افزودن زیرتسک و Enter"
              onChange={(e) => setSubtaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSubtask();
                }
              }}
            />
            <Button variant="outline" size="md" icon="Plus" onClick={addSubtask} type="button">
              افزودن
            </Button>
          </div>
        </div>

        {/* برچسب‌ها */}
        <div>
          <Label>برچسب‌ها</Label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {(form.tags ?? []).map((tag) => (
              <span key={tag} className="chip bg-[rgb(var(--text)/0.07)]">
                {tag}
                <button type="button" onClick={() => patch({ tags: (form.tags ?? []).filter((t) => t !== tag) })} aria-label="حذف برچسب">
                  <Icon name="X" size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Field
              value={tagInput}
              placeholder="برچسب جدید"
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (tagInput.trim()) {
                    patch({ tags: [...(form.tags ?? []), tagInput.trim()] });
                    setTagInput('');
                  }
                }
              }}
            />
            <Button
              variant="outline"
              icon="Tag"
              type="button"
              onClick={() => {
                if (tagInput.trim()) {
                  patch({ tags: [...(form.tags ?? []), tagInput.trim()] });
                  setTagInput('');
                }
              }}
            >
              افزودن
            </Button>
          </div>
        </div>

        {/* یادآور */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label hint="اختیاری">یادآور در تاریخ</Label>
            <JalaliDatePicker
              value={form.reminderAt ?? form.dueDate ?? null}
              onChange={(d) => patch({ reminderAt: d ? `${dayKey(d)}T08:00:00.000Z` : undefined })}
            />
          </div>
          <div className="flex items-end pb-1">
            <SegmentedControl
              options={[
                { value: 'low', label: 'کم' },
                { value: 'medium', label: 'متوسط' },
                { value: 'high', label: 'زیاد' },
              ]}
              value={(form.estimate ?? 0) > 120 ? 'high' : (form.estimate ?? 0) > 45 ? 'medium' : 'low'}
              onChange={(v) => patch({ estimate: v === 'high' ? 180 : v === 'medium' ? 60 : 25 })}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default TaskDialog;
