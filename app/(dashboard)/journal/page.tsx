'use client';

/**
 * ژورنال زندگی
 *  - نوشتن روزانه روی کاغذ بافت‌دار با ویرایشگر غنی
 *  - حال (Mood)، انرژی، شکرگزاری و درس‌های روز
 *  - تقویم ژورنال، زنجیره نوشتن و نمودار حال/انرژی
 */
import * as React from 'react';
import { motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { useMounted } from '@/hooks/use-planner';
import { addDays, dayKey, formatJalali, toJalali, WEEKDAYS_SHORT } from '@/lib/jalali';
import { journalStreak, moodSeries } from '@/lib/selectors';
import { MOOD_EMOJI, MOOD_LABEL } from '@/lib/constants';
import { cn, toPersianDigits } from '@/lib/utils';
import type { Mood } from '@/lib/types';
import { Icon } from '@/components/ui/icon';
import { Button, Card, EmptyState, Field, ProgressRing, Skeleton, TextArea } from '@/components/ui/primitives';
import { AreaTrendChart } from '@/components/ui/charts';
import { fireConfetti } from '@/components/ui/confetti';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { RichEditor, countWords } from '@/components/shared/rich-editor';
import { randomImage } from '@/lib/external-apis';

export default function JournalPage() {
  const journal = usePlanner((s) => s.journal);
  const upsertJournal = usePlanner((s) => s.upsertJournal);
  const removeJournal = usePlanner((s) => s.removeJournal);
  const mounted = useMounted();
  const toast = useToast();

  const [selected, setSelected] = React.useState(dayKey(new Date()));
  /** ماه نمایش‌داده‌شده در تقویم کنار (فقط ماه/سال مهم است) */
  const [monthCursor, setMonthCursor] = React.useState<{ jy: number; jm: number }>(() => {
    const j = toJalali(new Date());
    return { jy: j.jy, jm: j.jm };
  });
  const [gratitude, setGratitude] = React.useState<string[]>(['', '', '']);
  const [saved, setSaved] = React.useState(false);

  const entry = journal.find((j) => j.date === selected);
  const streak = journalStreak(journal);
  const avgMood = journal.length ? journal.slice(0, 30).reduce((a, b) => a + b.mood, 0) / Math.min(30, journal.length) : 0;

  // مقداردهی اولیه فرم با تغییر تاریخ
  React.useEffect(() => {
    setGratitude([entry?.gratitude?.[0] ?? '', entry?.gratitude?.[1] ?? '', entry?.gratitude?.[2] ?? '']);
    setSaved(false);
  }, [selected, entry]);

  const patch = (p: Parameters<typeof upsertJournal>[1]) => {
    upsertJournal(selected, p);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  /** شبکه تقویم ژورنال برای ماه جاری */
  const monthDays = React.useMemo(() => {
    const first = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    void first;
    const days: { key: string; hasEntry: boolean; mood?: Mood; isToday: boolean }[] = [];
    const todayKey = dayKey(new Date());
    for (let i = 34; i >= 0; i -= 1) {
      const d = addDays(new Date(), -i);
      const key = dayKey(d);
      const e = journal.find((j) => j.date === key);
      days.push({ key, hasEntry: Boolean(e), mood: e?.mood, isToday: key === todayKey });
    }
    return days;
  }, [journal]);

  const moodData = React.useMemo(() => moodSeries(journal, 30), [journal]);
  const wordsToday = entry ? countWords(entry.content) : 0;

  return (
    <div>
      <PageHeader
        title="ژورنال زندگی"
        description="هر روز چند خط بنویس — بعداً می‌بینی چقدر رشد کرده‌ای"
        icon="BookHeart"
        actions={
          <>
            <Button size="sm" variant="outline" icon="ChevronRight" onClick={() => setSelected(dayKey(addDays(new Date(selected), -1)))}>
              روز قبل
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(dayKey(addDays(new Date(selected), 1)))}>
              روز بعد
              <Icon name="ChevronLeft" size={15} />
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="زنجیره نوشتن" value={streak} unit="روز" icon="Flame" color="#BE7857" index={0} />
        <StatCard label="تعداد ورودی‌ها" value={journal.length} unit="یادداشت" icon="BookHeart" color="#57886A" index={1} />
        <StatCard label="میانگین حال" value={Number(avgMood.toFixed(1))} unit="از ۵" icon="Heart" color="#B06A79" index={2} />
        <StatCard label="کلمات امروز" value={wordsToday} unit="کلمه" icon="PenLine" color="#6C7FA8" index={3} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* ویرایشگر روز */}
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold">{formatJalali(selected, 'dddd DD MMMM YYYY')}</h2>
              <p className="text-[11px] text-[rgb(var(--text-subtle))]">
                {entry ? `آخرین ذخیره: ${formatJalali(entry.updatedAt, 'HH:mm')}` : 'ورودی جدید برای این روز'}
                {saved && <span className="mr-2 font-bold text-[rgb(var(--accent))]">✓ ذخیره شد</span>}
              </p>
            </div>
            {entry && (
              <Button
                size="sm"
                variant="ghost"
                icon="Trash2"
                onClick={() => {
                  removeJournal(entry.id);
                  toast.success('ورودی روز حذف شد');
                }}
              >
                حذف ورودی
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <Field
              className="!text-lg !font-bold"
              placeholder="عنوان امروز…"
              value={entry?.title ?? ''}
              onChange={(e) => patch({ title: e.target.value })}
            />

            {/* حال و انرژی */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold text-[rgb(var(--text-muted))]">حال امروز</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((m) => (
                    <button
                      key={m}
                      onClick={() => patch({ mood: m as Mood })}
                      title={MOOD_LABEL[m]}
                      className={cn(
                        'grid h-11 w-11 place-items-center rounded-xl border text-xl transition-all duration-200 active:scale-95',
                        entry?.mood === m
                          ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))] scale-105'
                          : 'border-[rgb(var(--border))] hover:border-[rgb(var(--accent)/0.5)]'
                      )}
                    >
                      {MOOD_EMOJI[m]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 num text-xs font-bold text-[rgb(var(--text-muted))]">
                  انرژی: {toPersianDigits(entry?.energy ?? 5)} از ۱۰
                </p>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={entry?.energy ?? 5}
                  onChange={(e) => patch({ energy: Number(e.target.value) })}
                  className="mt-3 w-full accent-[rgb(var(--accent))]"
                  aria-label="سطح انرژی"
                />
                <div className="mt-1 flex justify-between text-[10px] text-[rgb(var(--text-subtle))]">
                  <span>خسته</span>
                  <span>پر انرژی</span>
                </div>
              </div>
            </div>

            {/* متن اصلی */}
            <div>
              <p className="mb-2 text-xs font-bold text-[rgb(var(--text-muted))]">امروز چه گذشت؟</p>
              <RichEditor
                value={entry?.content ?? ''}
                onChange={(html) => patch({ content: html })}
                placeholder="بنویس… بدون سانسور، بدون قضاوت."
                paper
                minHeight={280}
              />
            </div>

            {/* شکرگزاری */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--text-muted))]">
                <Icon name="Sparkles" size={13} className="text-[rgb(var(--accent))]" />
                سه چیز که امروز شکرگزارش هستم
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Field
                    key={i}
                    value={gratitude[i] ?? ''}
                    placeholder={`مورد ${toPersianDigits(i + 1)}`}
                    onChange={(e) => {
                      const next = [...gratitude];
                      next[i] = e.target.value;
                      setGratitude(next);
                      patch({ gratitude: next });
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold text-[rgb(var(--text-muted))]">درس امروز</p>
                <TextArea
                  rows={3}
                  placeholder="اگر امروز را دوباره زندگی می‌کردم، چه کاری متفاوت می‌کردم؟"
                  value={entry?.lessons ?? ''}
                  onChange={(e) => patch({ lessons: e.target.value })}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold text-[rgb(var(--text-muted))]">بهترین لحظه امروز</p>
                <TextArea
                  rows={3}
                  placeholder="لحظه‌ای که لبخند زدی…"
                  value={entry?.highlights ?? ''}
                  onChange={(e) => patch({ highlights: e.target.value })}
                />
              </div>
            </div>

            {/* عکس روز */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-[rgb(var(--text-muted))]">تصویر روز (اختیاری)</p>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="ImageIcon"
                  onClick={() => patch({ photo: randomImage(selected, 800, 500) })}
                >
                  انتخاب تصویر تصادفی
                </Button>
              </div>
              {entry?.photo ? (
                <div className="relative overflow-hidden rounded-2xl border border-[rgb(var(--border))]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.photo} alt="تصویر روز" className="h-52 w-full object-cover" loading="lazy" />
                  <button
                    onClick={() => patch({ photo: undefined })}
                    className="absolute left-2 top-2 rounded-lg bg-black/50 p-1.5 text-white backdrop-blur"
                    aria-label="حذف تصویر"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-[rgb(var(--border))] px-3 py-6 text-center text-[11px] text-[rgb(var(--text-subtle))]">
                  تصویری برای این روز ثبت نشده — می‌توانی تصویر تصادفی انتخاب کنی یا آدرس تصویر خودت را جای‌گذاری کنی.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[rgb(var(--border))] pt-4">
              <Button
                icon="Check"
                onClick={() => {
                  upsertJournal(selected, {
                    title: entry?.title || formatJalali(selected, 'dddd DD MMMM YYYY'),
                    content: entry?.content ?? '',
                    mood: entry?.mood ?? 3,
                    energy: entry?.energy ?? 5,
                    gratitude,
                    lessons: entry?.lessons ?? '',
                    highlights: entry?.highlights ?? '',
                  });
                  fireConfetti(40);
                  toast.success('ژورنال امروز ثبت شد ✨', streak > 0 ? `زنجیره: ${toPersianDigits(streak + 1)} روز` : undefined);
                }}
              >
                ثبت نهایی روز
              </Button>
              <span className="num text-[11px] text-[rgb(var(--text-subtle))]">
                پیشرفت خودکار ذخیره می‌شود • {toPersianDigits(wordsToday)} کلمه
              </span>
            </div>
          </div>
        </Card>

        {/* ستون کنار: تقویم و نمودار */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">تقویم ژورنال</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setMonthCursor((c) => (c.jm === 1 ? { jy: c.jy - 1, jm: 12 } : { ...c, jm: c.jm - 1 }))}
                  className="rounded-lg p-1.5 hover:bg-[rgb(var(--text)/0.06)]"
                  aria-label="ماه قبل"
                >
                  <Icon name="ChevronRight" size={15} />
                </button>
                <button
                  onClick={() => setMonthCursor((c) => (c.jm === 12 ? { jy: c.jy + 1, jm: 1 } : { ...c, jm: c.jm + 1 }))}
                  className="rounded-lg p-1.5 hover:bg-[rgb(var(--text)/0.06)]"
                  aria-label="ماه بعد"
                >
                  <Icon name="ChevronLeft" size={15} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS_SHORT.map((d) => (
                <span key={d} className="py-1 text-center text-[10px] font-bold text-[rgb(var(--text-subtle))]">
                  {d}
                </span>
              ))}
              {monthDays.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setSelected(d.key)}
                  title={formatJalali(d.key, 'DD MMMM YYYY')}
                  className={cn(
                    'grid h-9 place-items-center rounded-lg text-[11px] transition-all duration-200',
                    d.key === selected
                      ? 'bg-[rgb(var(--accent))] font-bold text-[rgb(var(--accent-contrast))]'
                      : d.hasEntry
                      ? 'bg-[rgb(var(--accent-soft))] font-semibold text-[rgb(var(--accent))]'
                      : 'hover:bg-[rgb(var(--text)/0.06)]',
                    d.isToday && d.key !== selected && 'ring-1 ring-[rgb(var(--accent)/0.6)]'
                  )}
                >
                  {d.mood ? MOOD_EMOJI[d.mood] : toPersianDigits(toJalali(new Date(d.key)).jd)}
                </button>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col items-center gap-3 p-5">
            <ProgressRing value={Math.min(100, (streak / 30) * 100)} size={130} stroke={11} label="زنجیره ۳۰ روز">
              <span className="num text-3xl font-black">{toPersianDigits(streak)}</span>
              <span className="block text-[10px] text-[rgb(var(--text-subtle))]">روز پیوسته</span>
            </ProgressRing>
            <p className="text-center text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
              {streak >= 30
                ? 'یک ماه پیوسته نوشتن! این عادت ماندگار شده است 🌟'
                : `${toPersianDigits(Math.max(0, 30 - streak))} روز تا یک ماه پیوسته نوشتن`}
            </p>
          </Card>

          <Card className="p-5">
            <h3 className="mb-1 text-sm font-bold">حال و انرژی — ۳۰ روز</h3>
            <p className="mb-3 text-[11px] text-[rgb(var(--text-subtle))]">روند احساسی خودت را ببین</p>
            <AreaTrendChart
              data={moodData}
              series={[
                { key: 'حال', name: 'حال (۱-۵)', color: '#B06A79' },
                { key: 'انرژی', name: 'انرژی (۱-۱۰)', color: '#6C7FA8' },
              ]}
              height={200}
            />
          </Card>

          {/* ورودی‌های اخیر */}
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-bold">آخرین ورودی‌ها</h3>
            {journal.length === 0 ? (
              <EmptyState icon="BookHeart" title="هنوز چیزی ننوشته‌ای" description="یک خط هم شروع خوبی است." />
            ) : (
              <ul className="space-y-1.5">
                {journal.slice(0, 6).map((j) => (
                  <li key={j.id}>
                    <button
                      onClick={() => setSelected(j.date)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border p-2.5 text-right transition-colors',
                        j.date === selected ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))]' : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--text)/0.04)]'
                      )}
                    >
                      <span className="text-lg">{MOOD_EMOJI[j.mood]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold">{j.title || formatJalali(j.date, 'DD MMMM YYYY')}</span>
                        <span className="num block text-[10px] text-[rgb(var(--text-subtle))]">{formatJalali(j.date, 'DD MMMM YYYY')}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {!mounted && <Skeleton className="mt-4 h-40" />}
      {mounted && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-5 text-center text-[11px] text-[rgb(var(--text-subtle))]"
        >
          پیشنهاد: هر شب پیش از خواب، سه خط بنویس — همین کافی است تا عادت شکل بگیرد.
        </motion.p>
      )}
    </div>
  );
}
