'use client';

/**
 * دیالوگ‌های ایجاد/ویرایش ماژول‌ها: عادت، مالی، یادداشت، رویداد، هدف، پروژه و سلامت
 * همه در یک فایل نگه داشته شده‌اند تا فرم‌های کوتاه، قابل مقایسه و یکدست بمانند.
 */
import * as React from 'react';
import { usePlanner } from '@/stores/planner-store';
import {
  ACCOUNT_TYPE_LABEL,
  ACCENT_COLORS,
  GOAL_CATEGORIES,
  HORIZON_LABEL,
  MEAL_LABEL,
  MOOD_LABEL,
  TRANSACTION_LABEL,
  WORKOUT_TYPES,
} from '@/lib/constants';
import { dayKey, toJalali } from '@/lib/jalali';
import type {
  Account,
  Budget,
  CalendarEvent,
  Category,
  EventType,
  FoodLog,
  Goal,
  Habit,
  HealthLog,
  JournalEntry,
  KeyResult,
  Medication,
  Mood,
  Note,
  Project,
  Transaction,
  TransactionType,
  WorkoutLog,
} from '@/lib/types';
import { toNumber, uid } from '@/lib/utils';
import { Button, ColorPicker, Field, IconPicker, Label, Progress, SegmentedControl, Select, Switch, TextArea } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { Icon } from '@/components/ui/icon';
import { JalaliDatePicker, JalaliTextInput } from './jalali-date-picker';
import { RichEditor } from './rich-editor';
import { useQuickAdd } from './quick-add-context';

const ICON_OPTIONS = [
  'Sprout','Dumbbell','BookOpen','Droplets','Moon','Flame','Brain','HeartPulse','Wallet','Briefcase','Home','GraduationCap',
  'Gamepad2','UtensilsCrossed','Bus','ShoppingBag','Receipt','Gift','Palette','Music','Footprints','Pill','Coffee','Sunrise',
  'Target','Trophy','Star','Sparkles','PenLine','Timer','Users','Baby','Laptop','Banknote','TrendingUp','StickyNote','Folder','Calendar',
];

const HABIT_ICONS = [
  'Droplets','BookOpen','Dumbbell','Flower2','Moon','PenLine','Footprints','Sunrise','HeartPulse','Brain','UtensilsCrossed','Coffee',
  'Music','Brush','Timer','Sprout','Bike','Sparkles','Flame','Pill','Leaf','Sun','Star','Target',
];

/* ================================ عادت ================================== */
export function HabitDialog({ open, onClose, habit }: { open: boolean; onClose: () => void; habit?: Habit | null }) {
  const addHabit = usePlanner((s) => s.addHabit);
  const updateHabit = usePlanner((s) => s.updateHabit);
  const { toast } = useQuickAdd();
  const [form, setForm] = React.useState<Partial<Habit>>({});

  React.useEffect(() => {
    if (!open) return;
    setForm(
      habit ?? {
        name: '',
        icon: 'Check',
        color: '#57886A',
        frequency: 'daily',
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        target: 1,
        kind: 'good',
      }
    );
  }, [open, habit]);

  const patch = (p: Partial<Habit>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.name?.trim()) {
      toast.warning('نام عادت را وارد کن');
      return;
    }
    if (habit) updateHabit(habit.id, form);
    else addHabit(form);
    toast.success(habit ? 'عادت به‌روزرسانی شد' : 'عادت جدید ساخته شد 🌱');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? 'ویرایش عادت' : 'عادت جدید'}
      description="کوچک شروع کن؛ تکرار مهم‌تر از شدت است."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button icon="Check" onClick={save}>
            ذخیره
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-1">
        <div>
          <Label>نام عادت</Label>
          <Field value={form.name ?? ''} placeholder="مثلاً: ۳۰ دقیقه مطالعه" onChange={(e) => patch({ name: e.target.value })} autoFocus />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>دوره تکرار</Label>
            <Select value={form.frequency ?? 'daily'} onChange={(e) => patch({ frequency: e.target.value as Habit['frequency'] })}>
              <option value="daily">روزانه</option>
              <option value="weekly">هفتگی (روزهای مشخص)</option>
              <option value="monthly">ماهانه</option>
            </Select>
          </div>
          <div>
            <Label hint="مثلاً ۸ بار در روز">هدف روزانه</Label>
            <Field type="number" min={1} value={form.target ?? 1} onChange={(e) => patch({ target: toNumber(e.target.value, 1) })} />
          </div>
          <div>
            <Label hint="اختیاری">واحد</Label>
            <Field value={form.unit ?? ''} placeholder="لیوان، صفحه، دقیقه…" onChange={(e) => patch({ unit: e.target.value })} />
          </div>
          <div>
            <Label hint="اختیاری">ساعت یادآوری</Label>
            <Field type="time" value={form.reminderTime ?? ''} onChange={(e) => patch({ reminderTime: e.target.value })} />
          </div>
        </div>

        {form.frequency === 'weekly' && (
          <div>
            <Label>روزهای هفته</Label>
            <div className="flex flex-wrap gap-1.5">
              {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((label, idx) => {
                const active = (form.weekdays ?? []).includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      patch({
                        weekdays: active ? (form.weekdays ?? []).filter((d) => d !== idx) : [...(form.weekdays ?? []), idx],
                      })
                    }
                    className={`h-9 w-9 rounded-xl text-sm font-bold transition-colors ${
                      active ? 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]' : 'bg-[rgb(var(--text)/0.07)] text-[rgb(var(--text-muted))]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <Label>رنگ</Label>
          <ColorPicker value={form.color ?? '#57886A'} onChange={(c) => patch({ color: c })} colors={ACCENT_COLORS.map((c) => c.value)} />
        </div>

        <div>
          <Label>آیکون</Label>
          <IconPicker value={form.icon ?? 'Check'} onChange={(i) => patch({ icon: i })} options={HABIT_ICONS} />
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5">
          <Switch checked={form.kind === 'bad'} onChange={(v) => patch({ kind: v ? 'bad' : 'good' })} label="عادت منفی" />
          <span className="text-sm">این یک عادت منفی است (می‌خواهم ترکش کنم)</span>
        </div>
      </div>
    </Modal>
  );
}

/* ================================= مالی ================================= */
export function TransactionDialog({
  open,
  onClose,
  transaction,
  initialType = 'expense',
}: {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  initialType?: TransactionType;
}) {
  const accounts = usePlanner((s) => s.accounts);
  const categories = usePlanner((s) => s.categories);
  const addTransaction = usePlanner((s) => s.addTransaction);
  const updateTransaction = usePlanner((s) => s.updateTransaction);
  const { toast } = useQuickAdd();
  const [form, setForm] = React.useState<Partial<Transaction>>({});
  const [newCategory, setNewCategory] = React.useState('');
  const addCategory = usePlanner((s) => s.addCategory);

  React.useEffect(() => {
    if (!open) return;
    setForm(
      transaction ?? {
        type: initialType,
        date: new Date().toISOString(),
        currency: 'IRR',
        accountId: accounts[0]?.id,
        amount: 0,
      }
    );
    setNewCategory('');
  }, [open, transaction, initialType, accounts]);

  const patch = (p: Partial<Transaction>) => setForm((f) => ({ ...f, ...p }));
  const filteredCats = categories.filter((c) => c.type === form.type || c.type === 'transfer');

  const save = () => {
    if (!toNumber(form.amount)) {
      toast.warning('مبلغ را وارد کن');
      return;
    }
    const payload = { ...form, amountBase: toNumber(form.amount), amount: toNumber(form.amount) };
    if (transaction) updateTransaction(transaction.id, payload);
    else addTransaction(payload);
    toast.success(transaction ? 'تراکنش به‌روزرسانی شد' : 'تراکنش ثبت شد');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={transaction ? 'ویرایش تراکنش' : 'تراکنش جدید'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button icon="Check" onClick={save}>
            ذخیره
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-1">
        <SegmentedControl
          className="w-full"
          options={[
            { value: 'expense', label: TRANSACTION_LABEL.expense, icon: 'TrendingDown' },
            { value: 'income', label: TRANSACTION_LABEL.income, icon: 'TrendingUp' },
            { value: 'transfer', label: TRANSACTION_LABEL.transfer, icon: 'Repeat' },
          ]}
          value={(form.type ?? 'expense') as TransactionType}
          onChange={(v) => patch({ type: v })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label hint="تومان">مبلغ</Label>
            <Field
              inputMode="numeric"
              className="num"
              value={form.amount ?? ''}
              placeholder="۰"
              onChange={(e) => patch({ amount: toNumber(e.target.value.replace(/[^\d]/g, '')) })}
            />
          </div>
          <div>
            <Label>تاریخ (شمسی)</Label>
            <JalaliDatePicker value={form.date ?? new Date()} onChange={(d) => patch({ date: d?.toISOString() })} />
          </div>
        </div>

        <div>
          <Label>عنوان</Label>
          <Field value={form.title ?? ''} placeholder="مثلاً: خرید هفتگی" onChange={(e) => patch({ title: e.target.value })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>دسته‌بندی</Label>
            <Select value={form.categoryId ?? ''} onChange={(e) => patch({ categoryId: e.target.value || undefined })}>
              <option value="">— انتخاب دسته —</option>
              {filteredCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>کیف پول</Label>
            <Select value={form.accountId ?? ''} onChange={(e) => patch({ accountId: e.target.value || undefined })}>
              <option value="">— انتخاب —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {form.type === 'transfer' && (
          <div>
            <Label>به کیف پول</Label>
            <Select value={form.toAccountId ?? ''} onChange={(e) => patch({ toAccountId: e.target.value || undefined })}>
              <option value="">— انتخاب —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* افزودن دسته سریع */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label hint="اگر دسته‌بندی مناسب نیست">دسته جدید</Label>
            <Field value={newCategory} placeholder="نام دسته جدید" onChange={(e) => setNewCategory(e.target.value)} />
          </div>
          <Button
            variant="outline"
            icon="Plus"
            onClick={() => {
              if (!newCategory.trim()) return;
              const created = addCategory({ name: newCategory.trim(), type: (form.type ?? 'expense') as TransactionType });
              patch({ categoryId: created.id });
              setNewCategory('');
              toast.success('دسته‌بندی افزوده شد');
            }}
          >
            افزودن
          </Button>
        </div>

        <div>
          <Label hint="اختیاری">یادداشت</Label>
          <TextArea rows={2} value={form.note ?? ''} onChange={(e) => patch({ note: e.target.value })} />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5 text-sm">
          <Switch checked={Boolean(form.recurring)} onChange={(v) => patch({ recurring: v })} label="تراکنش تکرارشونده" />
          این تراکنش ماهانه تکرار می‌شود
        </label>
      </div>
    </Modal>
  );
}

/* =============================== یادداشت ================================ */
export function NoteDialog({ open, onClose, note }: { open: boolean; onClose: () => void; note?: Note | null }) {
  const folders = usePlanner((s) => s.folders);
  const addNote = usePlanner((s) => s.addNote);
  const updateNote = usePlanner((s) => s.updateNote);
  const { toast } = useQuickAdd();
  const [form, setForm] = React.useState<Partial<Note>>({});
  const [tagInput, setTagInput] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setForm(note ?? { title: '', content: '', tags: [], pinned: false });
    setTagInput('');
  }, [open, note]);

  const patch = (p: Partial<Note>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.title?.trim() && !form.content) {
      toast.warning('عنوان یا متن یادداشت را وارد کن');
      return;
    }
    if (note) updateNote(note.id, form);
    else addNote(form);
    toast.success(note ? 'یادداشت ذخیره شد' : 'یادداشت جدید ساخته شد');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={note ? 'ویرایش یادداشت' : 'یادداشت جدید'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button icon="Save" onClick={save}>
            ذخیره
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-1">
        <Field
          autoFocus
          className="!text-lg !font-bold"
          value={form.title ?? ''}
          placeholder="عنوان یادداشت"
          onChange={(e) => patch({ title: e.target.value })}
        />
        <RichEditor value={form.content ?? ''} onChange={(html) => patch({ content: html })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>پوشه</Label>
            <Select value={form.folderId ?? ''} onChange={(e) => patch({ folderId: e.target.value || undefined })}>
              <option value="">— بدون پوشه —</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>برچسب‌ها</Label>
            <div className="flex gap-2">
              <Field
                value={tagInput}
                placeholder="برچسب و Enter"
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault();
                    patch({ tags: [...(form.tags ?? []), tagInput.trim()] });
                    setTagInput('');
                  }
                }}
              />
              <Button
                variant="outline"
                icon="Tag"
                onClick={() => {
                  if (tagInput.trim()) {
                    patch({ tags: [...(form.tags ?? []), tagInput.trim()] });
                    setTagInput('');
                  }
                }}
              >
                +
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(form.tags ?? []).map((t) => (
                <span key={t} className="chip bg-[rgb(var(--text)/0.07)]">
                  {t}
                  <button onClick={() => patch({ tags: (form.tags ?? []).filter((x) => x !== t) })} aria-label="حذف">
                    <Icon name="X" size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={Boolean(form.pinned)} onChange={(v) => patch({ pinned: v })} label="سنجاق" />
          سنجاق به بالای فهرست
        </label>
      </div>
    </Modal>
  );
}

/* ================================ رویداد ================================= */
export function EventDialog({ open, onClose, event, initialDate }: { open: boolean; onClose: () => void; event?: CalendarEvent | null; initialDate?: Date }) {
  const addEvent = usePlanner((s) => s.addEvent);
  const updateEvent = usePlanner((s) => s.updateEvent);
  const { toast } = useQuickAdd();
  const [form, setForm] = React.useState<Partial<CalendarEvent>>({});

  React.useEffect(() => {
    if (!open) return;
    const base = event ?? {
      type: 'event' as EventType,
      start: (initialDate ?? new Date()).toISOString(),
      allDay: false,
      color: '#57886A',
    };
    setForm(base);
  }, [open, event, initialDate]);

  const patch = (p: Partial<CalendarEvent>) => setForm((f) => ({ ...f, ...p }));

  /** ترکیب تاریخ و ساعت انتخابی در یک ISO */
  const setDateTime = (date: Date | null, time?: string) => {
    const d = date ? new Date(date) : new Date();
    if (time) {
      const [h, m] = time.split(':').map(Number);
      d.setHours(h || 0, m || 0, 0, 0);
    }
    patch({ start: d.toISOString() });
  };

  const save = () => {
    if (!form.title?.trim()) {
      toast.warning('عنوان رویداد را وارد کن');
      return;
    }
    if (event) updateEvent(event.id, form);
    else addEvent(form);
    toast.success(event ? 'رویداد به‌روزرسانی شد' : 'رویداد ثبت شد');
    onClose();
  };

  const startDate = form.start ? new Date(form.start) : new Date();
  const startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'ویرایش رویداد' : 'رویداد جدید'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button icon="Check" onClick={save}>
            ذخیره
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-1">
        <div>
          <Label>عنوان</Label>
          <Field autoFocus value={form.title ?? ''} placeholder="مثلاً: جلسه با تیم" onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>نوع</Label>
            <Select value={form.type ?? 'event'} onChange={(e) => patch({ type: e.target.value as EventType })}>
              <option value="event">رویداد</option>
              <option value="meeting">جلسه</option>
              <option value="reminder">یادآور</option>
              <option value="birthday">تولد</option>
              <option value="exam">آزمون</option>
            </Select>
          </div>
          <div>
            <Label>تاریخ (شمسی)</Label>
            <JalaliDatePicker value={form.start} onChange={(d) => setDateTime(d, startTime)} />
          </div>
          <div>
            <Label>ساعت شروع</Label>
            <Field type="time" value={startTime} onChange={(e) => setDateTime(startDate, e.target.value)} />
          </div>
          <div>
            <Label hint="اختیاری">ساعت پایان</Label>
            <Field
              type="time"
              value={form.end ? `${String(new Date(form.end).getHours()).padStart(2, '0')}:${String(new Date(form.end).getMinutes()).padStart(2, '0')}` : ''}
              onChange={(e) => {
                if (!e.target.value) return patch({ end: undefined });
                const d = new Date(startDate);
                const [h, m] = e.target.value.split(':').map(Number);
                d.setHours(h, m, 0, 0);
                patch({ end: d.toISOString() });
              }}
            />
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <Switch checked={Boolean(form.allDay)} onChange={(v) => patch({ allDay: v })} label="تمام روز" />
          رویداد تمام‌روز
        </label>

        <div>
          <Label hint="اختیاری">مکان</Label>
          <Field value={form.location ?? ''} placeholder="آدرس یا لینک جلسه" onChange={(e) => patch({ location: e.target.value })} />
        </div>

        <div>
          <Label>رنگ</Label>
          <ColorPicker value={form.color ?? '#57886A'} onChange={(c) => patch({ color: c })} colors={ACCENT_COLORS.map((c) => c.value)} />
        </div>

        <div>
          <Label hint="اختیاری">توضیحات</Label>
          <TextArea rows={3} value={form.description ?? ''} onChange={(e) => patch({ description: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

/* ================================= هدف ================================== */
export function GoalDialog({ open, onClose, goal }: { open: boolean; onClose: () => void; goal?: Goal | null }) {
  const addGoal = usePlanner((s) => s.addGoal);
  const updateGoal = usePlanner((s) => s.updateGoal);
  const { toast } = useQuickAdd();
  const [form, setForm] = React.useState<Partial<Goal>>({});
  const [kr, setKr] = React.useState({ title: '', target: 100, unit: '' });

  React.useEffect(() => {
    if (!open) return;
    setForm(goal ?? { horizon: 'short', category: 'شخصی', color: '#57886A', progress: 0, keyResults: [] });
    setKr({ title: '', target: 100, unit: '' });
  }, [open, goal]);

  const patch = (p: Partial<Goal>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.title?.trim()) {
      toast.warning('عنوان هدف را وارد کن');
      return;
    }
    if (goal) updateGoal(goal.id, form);
    else addGoal(form);
    toast.success(goal ? 'هدف به‌روزرسانی شد' : 'هدف جدید ثبت شد 🎯');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? 'ویرایش هدف' : 'هدف جدید'}
      description="هدف روشن + نتیجه کلیدی قابل اندازه‌گیری = رسیدن سریع‌تر."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button icon="Target" onClick={save}>
            ذخیره
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-1">
        <div>
          <Label>عنوان هدف</Label>
          <Field autoFocus value={form.title ?? ''} placeholder="مثلاً: یادگیری عمیق ری‌اکت" onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div>
          <Label hint="اختیاری">توضیحات</Label>
          <TextArea rows={2} value={form.description ?? ''} onChange={(e) => patch({ description: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>بازه زمانی</Label>
            <Select value={form.horizon ?? 'short'} onChange={(e) => patch({ horizon: e.target.value as Goal['horizon'] })}>
              {Object.entries(HORIZON_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>دسته</Label>
            <Select value={form.category ?? 'شخصی'} onChange={(e) => patch({ category: e.target.value })}>
              {GOAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label hint="اختیاری">تاریخ هدف (شمسی)</Label>
            <JalaliDatePicker value={form.targetDate ?? null} onChange={(d) => patch({ targetDate: d ? d.toISOString() : undefined })} />
          </div>
          <div>
            <Label hint="اگر نتیجه کلیدی ندارید">پیشرفت دستی (٪)</Label>
            <Field
              type="number"
              min={0}
              max={100}
              value={form.keyResults?.length ? 0 : form.progress ?? 0}
              disabled={Boolean(form.keyResults?.length)}
              onChange={(e) => patch({ progress: toNumber(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <Label>رنگ</Label>
          <ColorPicker value={form.color ?? '#57886A'} onChange={(c) => patch({ color: c })} colors={ACCENT_COLORS.map((c) => c.value)} />
        </div>

        {/* نتایج کلیدی */}
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5">
          <p className="mb-2.5 text-xs font-bold text-[rgb(var(--text-muted))]">نتایج کلیدی (OKR)</p>
          <div className="mb-2 space-y-2">
            {(form.keyResults ?? []).map((k) => (
              <div key={k.id} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2.5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{k.title}</span>
                  <button
                    onClick={() => patch({ keyResults: (form.keyResults ?? []).filter((x) => x.id !== k.id) })}
                    className="text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--danger))]"
                    aria-label="حذف نتیجه کلیدی"
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Field
                    type="number"
                    className="num !w-20 !py-1.5 text-center"
                    value={k.current}
                    onChange={(e) =>
                      patch({
                        keyResults: (form.keyResults ?? []).map((x) => (x.id === k.id ? { ...x, current: toNumber(e.target.value) } : x)),
                      })
                    }
                  />
                  <span className="text-xs text-[rgb(var(--text-subtle))]">از</span>
                  <span className="num text-sm font-bold">
                    {k.target} {k.unit}
                  </span>
                  <Progress value={(k.current / (k.target || 1)) * 100} className="flex-1" height={6} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Field
              className="flex-1"
              placeholder="عنوان نتیجه کلیدی"
              value={kr.title}
              onChange={(e) => setKr((s) => ({ ...s, title: e.target.value }))}
            />
            <Field
              type="number"
              className="num !w-24"
              placeholder="هدف"
              value={kr.target}
              onChange={(e) => setKr((s) => ({ ...s, target: toNumber(e.target.value) }))}
            />
            <Field className="!w-24" placeholder="واحد" value={kr.unit} onChange={(e) => setKr((s) => ({ ...s, unit: e.target.value }))} />
            <Button
              variant="outline"
              icon="Plus"
              onClick={() => {
                if (!kr.title.trim()) return;
                const item: KeyResult = { id: uid('kr'), title: kr.title.trim(), target: kr.target, current: 0, unit: kr.unit };
                patch({ keyResults: [...(form.keyResults ?? []), item] });
                setKr({ title: '', target: 100, unit: '' });
              }}
            >
              افزودن
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ================================ پروژه ================================= */
export function ProjectDialog({ open, onClose, project }: { open: boolean; onClose: () => void; project?: Project | null }) {
  const addProject = usePlanner((s) => s.addProject);
  const updateProject = usePlanner((s) => s.updateProject);
  const { toast } = useQuickAdd();
  const [form, setForm] = React.useState<Partial<Project>>({});

  React.useEffect(() => {
    if (!open) return;
    setForm(project ?? { name: '', color: '#57886A', icon: 'Folder' });
  }, [open, project]);

  const patch = (p: Partial<Project>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.name?.trim()) {
      toast.warning('نام پروژه را وارد کن');
      return;
    }
    if (project) updateProject(project.id, form);
    else addProject(form);
    toast.success(project ? 'پروژه به‌روزرسانی شد' : 'پروژه جدید ساخته شد');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? 'ویرایش پروژه' : 'پروژه جدید'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button icon="FolderKanban" onClick={save}>
            ذخیره
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-1">
        <div>
          <Label>نام پروژه</Label>
          <Field autoFocus value={form.name ?? ''} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div>
          <Label hint="اختیاری">توضیحات</Label>
          <TextArea rows={2} value={form.description ?? ''} onChange={(e) => patch({ description: e.target.value })} />
        </div>
        <div>
          <Label hint="اختیاری">مهلت پروژه (شمسی)</Label>
          <JalaliDatePicker value={form.dueDate ?? null} onChange={(d) => patch({ dueDate: d ? d.toISOString() : undefined })} />
        </div>
        <div>
          <Label>رنگ</Label>
          <ColorPicker value={form.color ?? '#57886A'} onChange={(c) => patch({ color: c })} colors={ACCENT_COLORS.map((c) => c.value)} />
        </div>
        <div>
          <Label>آیکون</Label>
          <IconPicker value={form.icon ?? 'Folder'} onChange={(i) => patch({ icon: i })} options={ICON_OPTIONS} />
        </div>
      </div>
    </Modal>
  );
}

/* ================================ سلامت ================================= */
export function HealthDialog({
  open,
  onClose,
  date,
  log,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  log?: HealthLog | null;
}) {
  const upsertHealth = usePlanner((s) => s.upsertHealth);
  const { toast } = useQuickAdd();
  const [form, setForm] = React.useState<Partial<HealthLog>>({});

  React.useEffect(() => {
    if (!open) return;
    setForm(log ?? { date });
  }, [open, log, date]);

  const patch = (p: Partial<HealthLog>) => setForm((f) => ({ ...f, ...p }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ثبت وضعیت سلامت"
      description="هر روز چند عدد ثبت کن؛ نمودارهای گزارش از همین‌جا ساخته می‌شوند."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button
            icon="Check"
            onClick={() => {
              upsertHealth(date, form);
              toast.success('وضعیت سلامت ثبت شد');
              onClose();
            }}
          >
            ذخیره
          </Button>
        </>
      }
    >
      <div className="grid gap-4 pt-1 sm:grid-cols-2">
        <div>
          <Label hint="کیلوگرم">وزن</Label>
          <Field type="number" step="0.1" className="num" value={form.weight ?? ''} onChange={(e) => patch({ weight: toNumber(e.target.value) })} />
        </div>
        <div>
          <Label hint="سانتی‌متر">قد</Label>
          <Field type="number" className="num" value={form.height ?? ''} onChange={(e) => patch({ height: toNumber(e.target.value) })} />
        </div>
        <div>
          <Label hint="ساعت">خواب</Label>
          <Field type="number" step="0.5" className="num" value={form.sleepHours ?? ''} onChange={(e) => patch({ sleepHours: toNumber(e.target.value) })} />
        </div>
        <div>
          <Label>کیفیت خواب</Label>
          <Select value={form.sleepQuality ?? 3} onChange={(e) => patch({ sleepQuality: toNumber(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {MOOD_LABEL[n]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="لیوان">آب</Label>
          <Field type="number" className="num" value={form.water ?? ''} onChange={(e) => patch({ water: toNumber(e.target.value) })} />
        </div>
        <div>
          <Label>قدم</Label>
          <Field type="number" className="num" value={form.steps ?? ''} onChange={(e) => patch({ steps: toNumber(e.target.value) })} />
        </div>
        <div>
          <Label hint="کیلوکالری">کالری دریافتی</Label>
          <Field type="number" className="num" value={form.calories ?? ''} onChange={(e) => patch({ calories: toNumber(e.target.value) })} />
        </div>
        <div>
          <Label>حال کلی</Label>
          <Select value={form.mood ?? 3} onChange={(e) => patch({ mood: toNumber(e.target.value) as Mood })}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {MOOD_LABEL[n]}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label hint="اختیاری">یادداشت</Label>
          <TextArea rows={2} value={form.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

/* ============================= ورزش / دارو / غذا ========================= */
export function WorkoutDialog({ open, onClose, date }: { open: boolean; onClose: () => void; date?: string }) {
  const addWorkout = usePlanner((s) => s.addWorkout);
  const { toast } = useQuickAdd();
  const [form, setForm] = React.useState<Partial<WorkoutLog>>({});
  React.useEffect(() => {
    if (open) setForm({ date: date ?? dayKey(new Date()), type: 'هوازی', duration: 30, intensity: 2 });
  }, [open, date]);
  const patch = (p: Partial<WorkoutLog>) => setForm((f) => ({ ...f, ...p }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ثبت تمرین"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button
            icon="Dumbbell"
            onClick={() => {
              if (!form.title) return toast.warning('عنوان تمرین را وارد کن');
              addWorkout(form);
              toast.success('تمرین ثبت شد 💪');
              onClose();
            }}
          >
            ذخیره
          </Button>
        </>
      }
    >
      <div className="grid gap-4 pt-1 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>عنوان تمرین</Label>
          <Field value={form.title ?? ''} placeholder="مثلاً: تمرین قدرتی بالاتنه" onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div>
          <Label>نوع</Label>
          <Select value={form.type ?? 'هوازی'} onChange={(e) => patch({ type: e.target.value })}>
            {WORKOUT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="دقیقه">مدت</Label>
          <Field type="number" className="num" value={form.duration ?? 30} onChange={(e) => patch({ duration: toNumber(e.target.value) })} />
        </div>
        <div>
          <Label hint="کیلوکالری">کالری سوخته</Label>
          <Field type="number" className="num" value={form.calories ?? ''} onChange={(e) => patch({ calories: toNumber(e.target.value) })} />
        </div>
        <div>
          <Label>شدت</Label>
          <SegmentedControl
            options={[
              { value: '1', label: 'سبک' },
              { value: '2', label: 'متوسط' },
              { value: '3', label: 'سنگین' },
            ]}
            value={String(form.intensity ?? 2)}
            onChange={(v) => patch({ intensity: Number(v) as 1 | 2 | 3 })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>تاریخ (شمسی)</Label>
          <JalaliTextInput value={form.date ?? null} onChange={(iso) => patch({ date: iso ? dayKey(iso) : dayKey(new Date()) })} />
        </div>
      </div>
    </Modal>
  );
}

export function MedicationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addMedication = usePlanner((s) => s.addMedication);
  const { toast } = useQuickAdd();
  const [form, setForm] = React.useState<Partial<Medication>>({});
  React.useEffect(() => {
    if (open) setForm({ name: '', dose: '', times: ['09:00'], active: true, startDate: dayKey(new Date()) });
  }, [open]);
  const patch = (p: Partial<Medication>) => setForm((f) => ({ ...f, ...p }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="دارو یا مکمل جدید"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button
            icon="Pill"
            onClick={() => {
              if (!form.name) return toast.warning('نام دارو را وارد کن');
              addMedication(form);
              toast.success('دارو ثبت شد');
              onClose();
            }}
          >
            ذخیره
          </Button>
        </>
      }
    >
      <div className="grid gap-4 pt-1 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>نام دارو</Label>
          <Field value={form.name ?? ''} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div>
          <Label>دوز</Label>
          <Field value={form.dose ?? ''} placeholder="۱ قرص / ۱۰cc" onChange={(e) => patch({ dose: e.target.value })} />
        </div>
        <div>
          <Label hint="با کاما جدا کن">ساعت‌های مصرف</Label>
          <Field
            value={(form.times ?? []).join('، ')}
            placeholder="09:00، 21:00"
            onChange={(e) => patch({ times: e.target.value.split(/[،,]/).map((t) => t.trim()).filter(Boolean) })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>تاریخ شروع (شمسی)</Label>
          <JalaliTextInput value={form.startDate ?? null} onChange={(iso) => patch({ startDate: iso ? dayKey(iso) : dayKey(new Date()) })} />
        </div>
      </div>
    </Modal>
  );
}

export function FoodDialog({ open, onClose, date }: { open: boolean; onClose: () => void; date?: string }) {
  const addFood = usePlanner((s) => s.addFood);
  const { toast } = useQuickAdd();
  const [form, setForm] = React.useState<Partial<FoodLog>>({});
  React.useEffect(() => {
    if (open) setForm({ date: date ?? dayKey(new Date()), meal: 'lunch', calories: 0 });
  }, [open, date]);
  const patch = (p: Partial<FoodLog>) => setForm((f) => ({ ...f, ...p }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ثبت وعده غذایی"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button
            icon="Utensils"
            onClick={() => {
              if (!form.title) return toast.warning('نام غذا را وارد کن');
              addFood(form);
              toast.success('وعده ثبت شد');
              onClose();
            }}
          >
            ذخیره
          </Button>
        </>
      }
    >
      <div className="grid gap-4 pt-1 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>نام غذا</Label>
          <Field value={form.title ?? ''} placeholder="مثلاً: مرغ و برنج" onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div>
          <Label>وعده</Label>
          <Select value={form.meal ?? 'lunch'} onChange={(e) => patch({ meal: e.target.value as FoodLog['meal'] })}>
            {Object.entries(MEAL_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="کیلوکالری">کالری</Label>
          <Field type="number" className="num" value={form.calories ?? ''} onChange={(e) => patch({ calories: toNumber(e.target.value) })} />
        </div>
      </div>
    </Modal>
  );
}

/* ================================ بودجه ================================= */
export function BudgetDialog({ open, onClose, budget }: { open: boolean; onClose: () => void; budget?: Budget | null }) {
  const categories = usePlanner((s) => s.categories);
  const addBudget = usePlanner((s) => s.addBudget);
  const updateBudget = usePlanner((s) => s.updateBudget);
  const { toast } = useQuickAdd();
  const j = toJalali(new Date());
  const [form, setForm] = React.useState<Partial<Budget>>({});

  React.useEffect(() => {
    if (!open) return;
    setForm(budget ?? { categoryId: categories.find((c) => c.type === 'expense')?.id ?? '', amount: 0, month: `${j.jy}-${String(j.jm).padStart(2, '0')}` });
  }, [open, budget, categories, j.jm, j.jy]);

  const patch = (p: Partial<Budget>) => setForm((f) => ({ ...f, ...p }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={budget ? 'ویرایش بودجه' : 'بودجه ماهانه'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button
            icon="Wallet"
            onClick={() => {
              if (!form.categoryId) return toast.warning('دسته‌بندی را انتخاب کن');
              if (budget) updateBudget(budget.id, form);
              else addBudget(form);
              toast.success('بودجه ذخیره شد');
              onClose();
            }}
          >
            ذخیره
          </Button>
        </>
      }
    >
      <div className="grid gap-4 pt-1 sm:grid-cols-2">
        <div>
          <Label>دسته‌بندی</Label>
          <Select value={form.categoryId ?? ''} onChange={(e) => patch({ categoryId: e.target.value })}>
            {categories.filter((c) => c.type === 'expense').map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="تومان">سقف بودجه</Label>
          <Field
            inputMode="numeric"
            className="num"
            value={form.amount ?? ''}
            onChange={(e) => patch({ amount: toNumber(e.target.value.replace(/[^\d]/g, '')) })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label hint="ساختار: ۱۴۰۴-۰۷">ماه شمسی</Label>
          <Field className="num" value={form.month ?? ''} onChange={(e) => patch({ month: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

/* ================================ کیف پول =============================== */
export function AccountDialog({ open, onClose, account }: { open: boolean; onClose: () => void; account?: Account | null }) {
  const addAccount = usePlanner((s) => s.addAccount);
  const updateAccount = usePlanner((s) => s.updateAccount);
  const { toast } = useQuickAdd();
  const [form, setForm] = React.useState<Partial<Account>>({});

  React.useEffect(() => {
    if (!open) return;
    setForm(account ?? { name: '', type: 'bank', balance: 0, currency: 'IRR', color: '#57886A' });
  }, [open, account]);

  const patch = (p: Partial<Account>) => setForm((f) => ({ ...f, ...p }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account ? 'ویرایش کیف پول' : 'کیف پول جدید'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button
            icon="Wallet"
            onClick={() => {
              if (!form.name) return toast.warning('نام کیف پول را وارد کن');
              if (account) updateAccount(account.id, form);
              else addAccount(form);
              toast.success('کیف پول ذخیره شد');
              onClose();
            }}
          >
            ذخیره
          </Button>
        </>
      }
    >
      <div className="grid gap-4 pt-1 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>نام</Label>
          <Field value={form.name ?? ''} placeholder="مثلاً: حساب بانکی" onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div>
          <Label>نوع</Label>
          <Select value={form.type ?? 'bank'} onChange={(e) => patch({ type: e.target.value as Account['type'] })}>
            {Object.entries(ACCOUNT_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="تومان">موجودی</Label>
          <Field
            inputMode="numeric"
            className="num"
            value={form.balance ?? ''}
            onChange={(e) => patch({ balance: toNumber(e.target.value.replace(/[^\d]/g, '')) })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>رنگ</Label>
          <ColorPicker value={form.color ?? '#57886A'} onChange={(c) => patch({ color: c })} colors={ACCENT_COLORS.map((c) => c.value)} />
        </div>
      </div>
    </Modal>
  );
}

/* ============================== ژورنال سریع ============================= */
export function QuickJournalDialog({ open, onClose, entry, date }: { open: boolean; onClose: () => void; entry?: JournalEntry | null; date: string }) {
  const upsertJournal = usePlanner((s) => s.upsertJournal);
  const { toast } = useQuickAdd();
  const [form, setForm] = React.useState<Partial<JournalEntry>>({});

  React.useEffect(() => {
    if (!open) return;
    setForm(entry ?? { date, mood: 3, energy: 5, gratitude: ['', '', ''] });
  }, [open, entry, date]);

  const patch = (p: Partial<JournalEntry>) => setForm((f) => ({ ...f, ...p }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="یادداشت امروز"
      description="سه خط کافی است؛ پیوستگی مهم‌تر از کامل بودن است."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button
            icon="BookHeart"
            onClick={() => {
              upsertJournal(form.date ?? date, form);
              toast.success('ژورنال ذخیره شد ✨');
              onClose();
            }}
          >
            ذخیره
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-1">
        <Field value={form.title ?? ''} placeholder="عنوان امروز" onChange={(e) => patch({ title: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>حال امروز</Label>
            <Select value={form.mood ?? 3} onChange={(e) => patch({ mood: toNumber(e.target.value) as Mood })}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {MOOD_LABEL[n]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label hint="۱ تا ۱۰">انرژی</Label>
            <Field type="number" min={1} max={10} className="num" value={form.energy ?? 5} onChange={(e) => patch({ energy: toNumber(e.target.value, 5) })} />
          </div>
        </div>
        <RichEditor minHeight={180} value={form.content ?? ''} onChange={(html) => patch({ content: html })} />
        <div>
          <Label hint="سه مورد">شکرگزاری</Label>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Field
                key={i}
                value={form.gratitude?.[i] ?? ''}
                placeholder={`مورد ${i + 1}`}
                onChange={(e) => {
                  const g = [...(form.gratitude ?? ['', '', ''])];
                  g[i] = e.target.value;
                  patch({ gratitude: g });
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
