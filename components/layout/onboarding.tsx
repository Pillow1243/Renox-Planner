'use client';

/**
 * راهنمای شروع سه‌مرحله‌ای
 *  ۱) خوش‌آمد و نام  ۲) انتخاب اهداف  ۳) انتخاب عادت‌های اولیه
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { ACCENT_COLORS } from '@/lib/constants';
import { useMounted } from '@/hooks/use-planner';
import { cn, toPersianDigits } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Button, Field } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { fireConfetti } from '@/components/ui/confetti';

const GOAL_SUGGESTIONS = [
  'سلامت و تناسب اندام',
  'رشد شغلی و درآمد',
  'یادگیری مهارت جدید',
  'مدیریت بهتر مالی',
  'کاهش استرس و آرامش',
  'زمان بیشتر با خانواده',
  'تکمیل پروژه شخصی',
  'خواب منظم و باکیفیت',
];

const HABIT_SUGGESTIONS = [
  { name: 'ورزش روزانه', icon: 'Dumbbell', color: '#57886A' },
  { name: 'مطالعه ۲۰ دقیقه', icon: 'BookOpen', color: '#AD9268' },
  { name: 'نوشیدن ۸ لیوان آب', icon: 'Droplets', color: '#4F8A96' },
  { name: 'مدیتیشن', icon: 'Flower2', color: '#8C6FA8' },
  { name: 'نوشتن ژورنال', icon: 'PenLine', color: '#BE7857' },
  { name: 'خواب پیش از ۲۳', icon: 'Moon', color: '#6C7FA8' },
  { name: 'پیاده‌روی', icon: 'Footprints', color: '#7E8A4F' },
  { name: 'بدون شبکه اجتماعی', icon: 'Smartphone', color: '#B06A79' },
];

export function Onboarding() {
  const mounted = useMounted();
  const onboardingDone = usePlanner((s) => s.onboardingDone);
  const complete = usePlanner((s) => s.completeOnboarding);
  const user = usePlanner((s) => s.user);

  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState('');
  const [goals, setGoals] = React.useState<string[]>([]);
  const [habits, setHabits] = React.useState<{ name: string; icon: string; color: string }[]>([]);
  const [customGoal, setCustomGoal] = React.useState('');

  React.useEffect(() => {
    if (user?.name && !user.name.includes('کاربر')) setName(user.name);
  }, [user]);

  const open = mounted && !onboardingDone;

  const toggleGoal = (g: string) => setGoals((list) => (list.includes(g) ? list.filter((x) => x !== g) : [...list, g]));
  const toggleHabit = (h: { name: string; icon: string; color: string }) =>
    setHabits((list) => (list.some((x) => x.name === h.name) ? list.filter((x) => x.name !== h.name) : [...list, h]));

  const finish = () => {
    complete({ name: name.trim() || 'دوست من', goals, habits });
    fireConfetti(90);
  };

  return (
    <Modal open={open} onClose={() => undefined} size="lg" bare>
      <div className="px-6 pb-8 pt-6 sm:px-10">
        {/* نوار پیشرفت */}
        <div className="mb-6 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-500',
                i <= step ? 'bg-[rgb(var(--accent))]' : 'bg-[rgb(var(--text)/0.12)]'
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="space-y-2">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[rgb(var(--accent))] to-[#4F8A96] text-2xl text-white shadow-glow">
                  R
                </span>
                <h2 className="pt-2 text-2xl font-extrabold">به Renox Planner خوش آمدی ✨</h2>
                <p className="text-sm leading-7 text-[rgb(var(--text-muted))]">
                  یک فضای آرام برای همه‌چیز: تسک‌ها، عادت‌ها، تقویم شمسی، مالی، سلامت و ژورنال زندگی.
                  <br />
                  همه داده‌ها فقط روی دستگاه خودت ذخیره می‌شود — بدون حساب کاربری اجباری.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[rgb(var(--text-muted))]">اسمت را چه صدا کنم؟</label>
                <Field autoFocus value={name} placeholder="مثلاً: سارا" onChange={(e) => setName(e.target.value)} />
              </div>
              <Button size="lg" className="w-full" icon="ArrowLeft" onClick={() => setStep(1)}>
                ادامه
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold">این ماه چه چیزهایی برایت مهم است؟</h2>
                <p className="text-xs leading-6 text-[rgb(var(--text-subtle))]">چند مورد انتخاب کن — بعداً می‌توانی هدف دقیق‌تری بسازی.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {GOAL_SUGGESTIONS.map((g) => {
                  const active = goals.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => toggleGoal(g)}
                      className={cn(
                        'chip border transition-all duration-200',
                        active
                          ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]'
                          : 'border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--accent)/0.5)]'
                      )}
                    >
                      {active && <Icon name="Check" size={13} />}
                      {g}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Field
                  value={customGoal}
                  placeholder="هدف دلخواه خودت را بنویس…"
                  onChange={(e) => setCustomGoal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customGoal.trim()) {
                      toggleGoal(customGoal.trim());
                      setCustomGoal('');
                    }
                  }}
                />
                <Button
                  variant="outline"
                  icon="Plus"
                  onClick={() => {
                    if (customGoal.trim()) {
                      toggleGoal(customGoal.trim());
                      setCustomGoal('');
                    }
                  }}
                >
                  افزودن
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="lg" className="flex-1" onClick={() => setStep(0)}>
                  بازگشت
                </Button>
                <Button size="lg" className="flex-[2]" icon="ArrowLeft" onClick={() => setStep(2)}>
                  ادامه {goals.length > 0 && `(${toPersianDigits(goals.length)} هدف)`}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold">کدام عادت‌ها را می‌خواهی بسازی؟</h2>
                <p className="text-xs leading-6 text-[rgb(var(--text-subtle))]">
                  {habits.length > 0 ? `${toPersianDigits(habits.length)} عادت انتخاب شده` : 'پیشنهاد می‌کنیم با ۳ عادت شروع کنی.'}
                </p>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {HABIT_SUGGESTIONS.map((h) => {
                  const active = habits.some((x) => x.name === h.name);
                  return (
                    <button
                      key={h.name}
                      onClick={() => toggleHabit(h)}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border p-3.5 text-right transition-all duration-200',
                        active
                          ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))]'
                          : 'border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:border-[rgb(var(--accent)/0.45)]'
                      )}
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: `${h.color}1F`, color: h.color }}>
                        <Icon name={h.icon} size={18} />
                      </span>
                      <span className="flex-1 text-sm font-semibold">{h.name}</span>
                      <span
                        className={cn(
                          'grid h-6 w-6 place-items-center rounded-full border',
                          active ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-white' : 'border-[rgb(var(--border))]'
                        )}
                      >
                        {active && <Icon name="Check" size={13} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* انتخاب رنگ لهجه */}
              <div>
                <p className="mb-2 text-xs font-semibold text-[rgb(var(--text-muted))]">رنگ برنامه</p>
                <ColorRow />
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="lg" className="flex-1" onClick={() => setStep(1)}>
                  بازگشت
                </Button>
                <Button size="lg" className="flex-[2]" icon="Rocket" onClick={finish}>
                  شروع کنیم!
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}

function ColorRow() {
  const accent = usePlanner((s) => s.settings.accent);
  const updateSettings = usePlanner((s) => s.updateSettings);
  return (
    <div className="flex flex-wrap gap-2">
      {ACCENT_COLORS.map((c) => (
        <button
          key={c.value}
          onClick={() => updateSettings({ accent: c.value })}
          aria-label={c.name}
          className={cn(
            'h-9 w-9 rounded-full border-2 transition-transform hover:scale-110',
            accent === c.value ? 'border-[rgb(var(--text))]' : 'border-transparent'
          )}
          style={{ backgroundColor: c.value }}
        />
      ))}
    </div>
  );
}

export default Onboarding;
