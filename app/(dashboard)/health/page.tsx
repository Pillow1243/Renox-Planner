'use client';

/**
 * ماژول سلامت
 *  - وزن، قد و شاخص BMI با ناحیه‌بندی رنگی
 *  - آب (با انیمیشن)، خواب، قدم، کالری و حال روزانه
 *  - تمرین‌ها، داروها و وعده‌های غذایی + جست‌وجوی غذا در Open Food Facts
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { usePlanner } from '@/stores/planner-store';
import { useMounted } from '@/hooks/use-planner';
import { addDays, dayKey, formatJalali, relativeJalali } from '@/lib/jalali';
import { bmi, bmiZone, healthSeries } from '@/lib/selectors';
import { BMI_ZONES, MEAL_LABEL, MOOD_EMOJI, MOOD_LABEL } from '@/lib/constants';
import { cn, formatNumber, minutesLabel, toPersianDigits } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Badge, Button, Card, EmptyState, Field, Progress, ProgressRing, SegmentedControl, Skeleton } from '@/components/ui/primitives';
import { AreaTrendChart, BarsChart } from '@/components/ui/charts';
import { fireConfetti, playChime } from '@/components/ui/confetti';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { FoodDialog, HealthDialog, MedicationDialog, WorkoutDialog } from '@/components/shared/dialogs';
import { searchFoodWithFallback, type FoodProduct } from '@/lib/external-apis';

type Tab = 'body' | 'daily' | 'workout' | 'food' | 'meds';

export default function HealthPage() {
  const health = usePlanner((s) => s.health);
  const workouts = usePlanner((s) => s.workouts);
  const medications = usePlanner((s) => s.medications);
  const foods = usePlanner((s) => s.foods);
  const settings = usePlanner((s) => s.settings);
  const upsertHealth = usePlanner((s) => s.upsertHealth);
  const addWater = usePlanner((s) => s.addWater);
  const removeWorkout = usePlanner((s) => s.removeWorkout);
  const removeMedication = usePlanner((s) => s.removeMedication);
  const removeFood = usePlanner((s) => s.removeFood);
  const mounted = useMounted();
  const toast = useToast();

  const today = dayKey(new Date());
  const todayLog = health.find((h) => h.date === today);
  const [tab, setTab] = React.useState<Tab>('body');
  const [healthDialog, setHealthDialog] = React.useState(false);
  const [workoutDialog, setWorkoutDialog] = React.useState(false);
  const [foodDialog, setFoodDialog] = React.useState(false);
  const [medDialog, setMedDialog] = React.useState(false);
  const [foodQuery, setFoodQuery] = React.useState('');
  const [foodSearch, setFoodSearch] = React.useState('');

  const series = React.useMemo(() => healthSeries(health, 30), [health]);
  const sorted = React.useMemo(() => [...health].sort((a, b) => a.date.localeCompare(b.date)), [health]);
  const latest = sorted[sorted.length - 1];
  const height = latest?.height ?? 175;
  const weight = todayLog?.weight ?? latest?.weight ?? 0;
  const bmiValue = bmi(weight, height) ?? 0;
  const zone = bmiZone(bmiValue);

  const sleepAvg = React.useMemo(() => {
    const last7 = sorted.slice(-7).map((h) => h.sleepHours ?? 0).filter(Boolean);
    return last7.length ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;
  }, [sorted]);

  const water = todayLog?.water ?? 0;
  const waterGoal = settings.waterGoal;

  const weekWorkouts = workouts.filter((w) => new Date(w.date) >= addDays(new Date(), -6));
  const weekMinutes = weekWorkouts.reduce((a, b) => a + b.duration, 0);
  const weekCalories = weekWorkouts.reduce((a, b) => a + (b.calories ?? 0), 0);

  const todayFoods = foods.filter((f) => f.date === today);
  const todayCalories = todayFoods.reduce((a, b) => a + b.calories, 0);

  /** جست‌وجوی غذا در Open Food Facts (با Fallback محلی) */
  const { data: foodResults, isFetching: foodLoading } = useQuery<FoodProduct[]>({
    queryKey: ['food', foodSearch],
    queryFn: () => searchFoodWithFallback(foodSearch),
    enabled: foodSearch.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const setWater = (next: number) => {
    upsertHealth(today, { water: Math.max(0, next) });
    if (next >= waterGoal && water < waterGoal) {
      fireConfetti(36);
      if (settings.sounds) playChime('success');
      toast.success('هدف آب امروز کامل شد! 💧');
    }
  };

  return (
    <div>
      <PageHeader
        title="سلامت"
        description="بدن، خواب، تغذیه و تمرین — با نمودارهایی که انگیزه می‌سازند"
        icon="HeartPulse"
        actions={
          <>
            <Button size="sm" variant="outline" icon="Plus" onClick={() => setWorkoutDialog(true)}>
              ثبت تمرین
            </Button>
            <Button size="sm" icon="Activity" onClick={() => setHealthDialog(true)}>
              ثبت وضعیت امروز
            </Button>
          </>
        }
      />

      {/* آمار کلیدی */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="وزن" value={weight || 0} unit="کیلوگرم" icon="Scale" color="#57886A" index={0} hint={latest?.date ? `آخرین ثبت: ${relativeJalali(latest.date)}` : undefined} />
        <StatCard label="شاخص توده بدنی" value={bmiValue} icon="HeartPulse" color={zone.color} index={1} hint={zone.label} />
        <StatCard label="خواب میانگین هفته" value={Number(sleepAvg.toFixed(1))} unit="ساعت" icon="Moon" color="#6C7FA8" index={2} />
        <StatCard label="ورزش این هفته" value={weekMinutes} unit="دقیقه" icon="Dumbbell" color="#BE7857" index={3} />
      </div>

      <Card className="mb-5 flex flex-wrap items-center gap-3 p-3.5">
        <SegmentedControl
          size="sm"
          options={[
            { value: 'body', label: 'بدن و روند', icon: 'Activity' },
            { value: 'daily', label: 'روزانه', icon: 'CalendarCheck' },
            { value: 'workout', label: 'تمرین‌ها', icon: 'Dumbbell' },
            { value: 'food', label: 'تغذیه', icon: 'UtensilsCrossed' },
            { value: 'meds', label: 'داروها', icon: 'Pill' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Card>

      {!mounted ? (
        <Skeleton className="h-72" />
      ) : tab === 'body' ? (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          {/* کارت BMI */}
          <Card className="flex flex-col items-center gap-4 p-5">
            <ProgressRing value={Math.min(100, (bmiValue / 40) * 100)} size={170} stroke={13} color={zone.color} label="شاخص توده بدنی">
              <span className="num text-3xl font-black">{toPersianDigits(bmiValue || 0)}</span>
              <span className="block text-[11px] font-semibold" style={{ color: zone.color }}>
                {zone.label}
              </span>
            </ProgressRing>
            <div className="w-full space-y-2">
              {BMI_ZONES.map((z, i) => {
                const min = i === 0 ? 0 : BMI_ZONES[i - 1].max;
                const active = bmiValue > min && bmiValue <= z.max;
                return (
                  <div
                    key={z.label}
                    className={cn('flex items-center justify-between rounded-xl px-3 py-2 text-[11.5px]', active && 'font-bold')}
                    style={{ backgroundColor: active ? `${z.color}1F` : 'rgb(var(--text) / 0.04)', color: active ? z.color : undefined }}
                  >
                    <span>{z.label}</span>
                    <span className="num">
                      {min} – {z.max === 100 ? '∞' : z.max}
                    </span>
                  </div>
                );
              })}
            </div>
            <Button size="sm" variant="outline" className="w-full" icon="Pencil" onClick={() => setHealthDialog(true)}>
              ثبت وزن و قد امروز
            </Button>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="mb-1 text-sm font-bold">روند وزن — ۳۰ روز</h3>
              <p className="mb-3 text-[11px] text-[rgb(var(--text-subtle))]">کاهش یا افزایش، هر دو با شیب ملایم سالم‌تر است</p>
              <AreaTrendChart data={series} series={[{ key: 'وزن', name: 'وزن (kg)', color: '#57886A' }]} height={230} unit="kg" />
            </Card>

            <Card className="p-5">
              <h3 className="mb-1 text-sm font-bold">خواب و آب</h3>
              <p className="mb-3 text-[11px] text-[rgb(var(--text-subtle))]">ساعت خواب و تعداد لیوان آب در هر روز</p>
              <AreaTrendChart
                data={series}
                series={[
                  { key: 'خواب', name: 'خواب (ساعت)', color: '#6C7FA8' },
                  { key: 'آب', name: 'آب (لیوان)', color: '#4F8A96' },
                ]}
                height={230}
              />
            </Card>

            <Card className="p-5">
              <h3 className="mb-1 text-sm font-bold">قدم‌ها</h3>
              <p className="mb-3 text-[11px] text-[rgb(var(--text-subtle))]">۱۰٬۰۰۰ قدم هدف روزانه پیشنهادی سازمان جهانی بهداشت است</p>
              <BarsChart data={series.slice(-14)} dataKey="قدم" height={200} color="#AD9268" unit="قدم" />
            </Card>
          </div>
        </div>
      ) : tab === 'daily' ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-bold">وضعیت امروز — {formatJalali(today, 'dddd DD MMMM YYYY')}</h3>

            {/* آب */}
            <div className="mb-6">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--text-muted))]">
                  <Icon name="Droplets" size={14} className="text-[#4F8A96]" /> آب
                </p>
                <span className="num text-[11px] text-[rgb(var(--text-subtle))]">
                  {toPersianDigits(water)} از {toPersianDigits(waterGoal)} لیوان
                </span>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                {Array.from({ length: Math.max(waterGoal, water) }, (_, i) => {
                  const filled = i < water;
                  return (
                    <button
                      key={i}
                      onClick={() => setWater(filled && i === water - 1 ? water - 1 : i + 1)}
                      className={cn(
                        'relative h-14 w-9 overflow-hidden rounded-b-xl rounded-t-sm border-2 transition-all duration-300 active:scale-95',
                        filled ? 'border-[#4F8A96]' : 'border-[rgb(var(--border))] hover:border-[#4F8A96]/50'
                      )}
                      aria-label={`لیوان ${i + 1}`}
                    >
                      <motion.span
                        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#4F8A96] to-[#79B4BE]"
                        animate={{ height: filled ? '80%' : '0%' }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      />
                      {filled && (
                        <span className="absolute inset-x-0 bottom-1 text-center text-[10px]">
                          <Icon name="Droplets" size={12} className="mx-auto text-white/90" />
                        </span>
                      )}
                    </button>
                  );
                })}
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => addWater(today, 1)}>
                    +۱
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setWater(0)}>
                    بازنشانی
                  </Button>
                </div>
              </div>
              <Progress className="mt-3" value={(water / Math.max(1, waterGoal)) * 100} color="#4F8A96" height={7} showLabel />
            </div>

            {/* خواب */}
            <div className="mb-6">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--text-muted))]">
                  <Icon name="Moon" size={14} className="text-[#6C7FA8]" /> خواب
                </p>
                <span className="num text-[11px] text-[rgb(var(--text-subtle))]">
                  {todayLog?.sleepHours ? minutesLabel(todayLog.sleepHours * 60) : 'ثبت نشده'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={todayLog?.sleepHours ?? settings.sleepGoal}
                onChange={(e) => upsertHealth(today, { sleepHours: Number(e.target.value) })}
                className="w-full accent-[#6C7FA8]"
                aria-label="ساعت خواب"
              />
              <div className="mt-1 flex justify-between text-[10px] text-[rgb(var(--text-subtle))]">
                <span>۰</span>
                <span className="num">هدف: {toPersianDigits(settings.sleepGoal)} ساعت</span>
                <span>۱۲</span>
              </div>
            </div>

            {/* حال روز */}
            <div>
              <p className="mb-2.5 text-xs font-bold text-[rgb(var(--text-muted))]">حال کلی امروز</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((m) => (
                  <button
                    key={m}
                    onClick={() => upsertHealth(today, { mood: m as 1 })}
                    className={cn(
                      'grid h-12 w-12 place-items-center rounded-xl border text-xl transition-all active:scale-95',
                      todayLog?.mood === m ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))] scale-105' : 'border-[rgb(var(--border))]'
                    )}
                    title={MOOD_LABEL[m]}
                  >
                    {MOOD_EMOJI[m]}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold">هفت روز اخیر</h3>
              <ul className="space-y-2">
                {Array.from({ length: 7 }, (_, i) => addDays(new Date(), -i)).map((d) => {
                  const key = dayKey(d);
                  const log = health.find((h) => h.date === key);
                  return (
                    <li key={key} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-2.5">
                      <span className="num grid h-9 w-9 place-items-center rounded-lg bg-[rgb(var(--text)/0.05)] text-[11px] font-bold">
                        {toPersianDigits(formatJalali(d, 'DD'))}
                      </span>
                      <div className="flex flex-1 items-center gap-3 text-[11px]">
                        <span className="num flex items-center gap-1">
                          <Icon name="Droplets" size={12} className="text-[#4F8A96]" /> {toPersianDigits(log?.water ?? 0)}
                        </span>
                        <span className="num flex items-center gap-1">
                          <Icon name="Moon" size={12} className="text-[#6C7FA8]" /> {toPersianDigits(log?.sleepHours ?? 0)}
                        </span>
                        <span className="num flex items-center gap-1">
                          <Icon name="Footprints" size={12} className="text-[#AD9268]" /> {formatNumber(log?.steps ?? 0)}
                        </span>
                      </div>
                      <button
                        onClick={() => setHealthDialog(true)}
                        className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:bg-[rgb(var(--text)/0.06)]"
                        aria-label="ویرایش"
                      >
                        <Icon name="Pencil" size={13} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold">کالری امروز</h3>
              <div className="flex items-end justify-between">
                <p className="num text-3xl font-black">{formatNumber(todayCalories)}</p>
                <span className="text-xs text-[rgb(var(--text-subtle))]">کیلوکالری</span>
              </div>
              <Progress className="mt-3" value={Math.min(100, (todayCalories / 2200) * 100)} color="#BE7857" height={8} showLabel />
              <p className="mt-2 text-[11px] text-[rgb(var(--text-subtle))]">میانگین نیاز روزانه حدود ۲۰۰۰ تا ۲۵۰۰ کیلوکالری است.</p>
              <Button size="sm" variant="outline" className="mt-3 w-full" icon="Utensils" onClick={() => setTab('food')}>
                ثبت وعده غذایی
              </Button>
            </Card>
          </div>
        </div>
      ) : tab === 'workout' ? (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <StatCard label="تمرین این هفته" value={weekWorkouts.length} unit="جلسه" icon="Dumbbell" color="#57886A" index={0} />
            <StatCard label="دقیقه ورزش" value={weekMinutes} unit="دقیقه" icon="Timer" color="#6C7FA8" index={1} />
            <StatCard label="کالری سوخته" value={weekCalories} unit="کیلوکالری" icon="Flame" color="#BE7857" index={2} />
          </div>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">تمرین‌های ثبت‌شده</h3>
              <Button size="sm" icon="Plus" onClick={() => setWorkoutDialog(true)}>
                تمرین جدید
              </Button>
            </div>
            {workouts.length === 0 ? (
              <EmptyState icon="Dumbbell" title="هنوز تمرینی ثبت نکرده‌ای" description="یک پیاده‌روی ۲۰ دقیقه‌ای هم یک تمرین است!" />
            ) : (
              <ul className="space-y-2">
                <AnimatePresence>
                  {[...workouts]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((w) => (
                      <motion.li
                        key={w.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3.5 rounded-2xl border border-[rgb(var(--border))] p-3.5"
                      >
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[rgba(87,136,106,0.14)] text-[#57886A]">
                          <Icon name="Dumbbell" size={19} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-bold">{w.title}</p>
                          <p className="num text-[11px] text-[rgb(var(--text-subtle))]">
                            {formatJalali(w.date, 'DD MMMM YYYY')} — {w.type} — {minutesLabel(w.duration)}
                            {w.calories ? ` — ${toPersianDigits(w.calories)} کیلوکالری` : ''}
                          </p>
                          {w.exercises.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {w.exercises.slice(0, 4).map((ex, i) => (
                                <span key={i} className="chip bg-[rgb(var(--text)/0.06)] text-[10px]">
                                  {ex.name}
                                  {ex.sets ? ` — ${toPersianDigits(ex.sets)}×${toPersianDigits(ex.reps ?? 0)}` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge color={w.intensity === 3 ? '#C0554A' : w.intensity === 2 ? '#AD9268' : '#57886A'}>
                          {w.intensity === 3 ? 'سنگین' : w.intensity === 2 ? 'متوسط' : 'سبک'}
                        </Badge>
                        <button
                          onClick={() => removeWorkout(w.id)}
                          className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--danger))]"
                          aria-label="حذف تمرین"
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </motion.li>
                    ))}
                </AnimatePresence>
              </ul>
            )}
          </Card>
        </div>
      ) : tab === 'food' ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">وعده‌های امروز</h3>
                <p className="num text-[11px] text-[rgb(var(--text-subtle))]">
                  مجموع: {formatNumber(todayCalories)} کیلوکالری از {toPersianDigits(todayFoods.length)} وعده
                </p>
              </div>
              <Button size="sm" icon="Plus" onClick={() => setFoodDialog(true)}>
                افزودن وعده
              </Button>
            </div>

            {todayFoods.length === 0 ? (
              <EmptyState icon="UtensilsCrossed" title="امروز وعده‌ای ثبت نشده" description="ثبت غذا کمک می‌کند الگوهای تغذیه‌ات را ببینی." />
            ) : (
              <ul className="space-y-2">
                {todayFoods.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-3">
                    <span className="chip bg-[rgb(var(--text)/0.06)] shrink-0">{MEAL_LABEL[f.meal]}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{f.title}</span>
                    <span className="num shrink-0 text-[12px] font-bold">{toPersianDigits(f.calories)} kcal</span>
                    <button
                      onClick={() => removeFood(f.id)}
                      className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--danger))]"
                      aria-label="حذف"
                    >
                      <Icon name="Trash2" size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4">
              <h4 className="mb-1 text-[13px] font-bold">پایگاه اطلاعات غذایی</h4>
              <p className="mb-3 text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
                جست‌وجو در Open Food Facts (رایگان و بدون کلید). اگر سرویس در دسترس نبود، از پایگاه محلی غذاهای ایرانی استفاده می‌شود.
              </p>
              <div className="flex gap-2">
                <Field
                  placeholder="مثلاً: ماست، نان، برنج…"
                  value={foodQuery}
                  onChange={(e) => setFoodQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setFoodSearch(foodQuery)}
                />
                <Button variant="outline" icon="Search" loading={foodLoading} onClick={() => setFoodSearch(foodQuery)}>
                  جست‌وجو
                </Button>
              </div>

              {foodResults && foodResults.length > 0 && (
                <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pl-1">
                  {foodResults.map((p, i) => (
                    <li key={`${p.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold">{p.name}</p>
                        <p className="num text-[10.5px] text-[rgb(var(--text-subtle))]">
                          {p.brand ? `${p.brand} • ` : ''}
                          {toPersianDigits(p.calories)} کیلوکالری در ۱۰۰ گرم • پروتئین {toPersianDigits(p.protein)} گرم
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        icon="Plus"
                        onClick={() => {
                          usePlanner.getState().addFood({ title: p.name, calories: p.calories, meal: 'snack', date: today, protein: p.protein, carbs: p.carbs, fat: p.fat });
                          toast.success('به وعده‌های امروز اضافه شد');
                        }}
                      >
                        افزودن
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold">کالری ۱۴ روز اخیر</h3>
              <BarsChart
                data={series.slice(-14).map((s) => ({ label: s.label, کالری: s.کالری }))}
                dataKey="کالری"
                height={230}
                color="#BE7857"
                unit="kcal"
              />
            </Card>
            <Card className="p-5">
              <h3 className="mb-2 text-sm font-bold">تقسیم کالری امروز</h3>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => {
                const sum = todayFoods.filter((f) => f.meal === meal).reduce((a, b) => a + b.calories, 0);
                return (
                  <div key={meal} className="mb-2.5">
                    <div className="mb-1 flex items-center justify-between text-[11.5px]">
                      <span>{MEAL_LABEL[meal]}</span>
                      <span className="num font-bold">{toPersianDigits(sum)} kcal</span>
                    </div>
                    <Progress value={(sum / Math.max(1, todayCalories)) * 100} height={6} color="#AD9268" />
                  </div>
                );
              })}
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="flex items-center justify-between gap-3 p-4">
            <div>
              <h3 className="text-sm font-bold">داروها و مکمل‌ها</h3>
              <p className="text-[11px] text-[rgb(var(--text-subtle))]">یادآور مصرف را در ماژول یادآورها هم می‌توانی بسازی</p>
            </div>
            <Button size="sm" icon="Plus" onClick={() => setMedDialog(true)}>
              دارو جدید
            </Button>
          </Card>

          {medications.length === 0 ? (
            <Card>
              <EmptyState icon="Pill" title="دارویی ثبت نشده" description="اگر مکمل یا دارویی مصرف می‌کنی، اینجا ثبت کن تا یادت نرود." />
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {medications.map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[rgba(176,106,121,0.14)] text-[#B06A79]">
                        <Icon name="Pill" size={19} />
                      </span>
                      <div>
                        <p className="text-[13.5px] font-bold">{m.name}</p>
                        <p className="num text-[11px] text-[rgb(var(--text-subtle))]">{m.dose}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeMedication(m.id)}
                      className="rounded-lg p-1.5 text-[rgb(var(--text-subtle))] hover:text-[rgb(var(--danger))]"
                      aria-label="حذف دارو"
                    >
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.times.map((t) => (
                      <span key={t} className="chip num bg-[rgb(var(--text)/0.06)]">
                        <Icon name="Clock" size={11} /> {toPersianDigits(t)}
                      </span>
                    ))}
                    <Badge color={m.active ? '#57886A' : '#7E7E88'}>{m.active ? 'فعال' : 'غیرفعال'}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* دیالوگ‌ها */}
      <HealthDialog open={healthDialog} onClose={() => setHealthDialog(false)} date={today} log={todayLog} />
      <WorkoutDialog open={workoutDialog} onClose={() => setWorkoutDialog(false)} date={today} />
      <FoodDialog open={foodDialog} onClose={() => setFoodDialog(false)} date={today} />
      <MedicationDialog open={medDialog} onClose={() => setMedDialog(false)} />
    </div>
  );
}
