'use client';

/** ثبت‌نام — ساخت پروفایل محلی و شروع سریع برنامه */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { Button, Field, Label, Switch } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { useToast } from '@/components/ui/toast';
import { fireConfetti } from '@/components/ui/confetti';

export default function RegisterPage() {
  const router = useRouter();
  const setUser = usePlanner((s) => s.setUser);
  const loadDemoData = usePlanner((s) => s.loadDemoData);
  const toast = useToast();

  const [form, setForm] = React.useState({ name: '', email: '', password: '', confirm: '' });
  const [withDemo, setWithDemo] = React.useState(false);
  const [accept, setAccept] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const strength = React.useMemo(() => {
    const p = form.password;
    let score = 0;
    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p) || /[آ-ی]/.test(p)) score += 1;
    if (/\d/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;
    return score;
  }, [form.password]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.warning('نام و ایمیل الزامی هستند');
      return;
    }
    if (form.password.length < 6) {
      toast.warning('رمز عبور حداقل ۶ کاراکتر باشد');
      return;
    }
    if (form.password !== form.confirm) {
      toast.error('رمزها یکسان نیستند');
      return;
    }
    if (!accept) {
      toast.warning('پذیرش شرایط استفاده الزامی است');
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      setUser({ name: form.name.trim(), email: form.email.trim() });
      if (withDemo) loadDemoData();
      setLoading(false);
      fireConfetti(60);
      toast.success('حساب محلی ساخته شد 🎉', 'حالا برنامه‌ریزی را شروع کن.');
      router.push('/');
    }, 700);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <h1 className="text-2xl font-extrabold">ساخت حساب</h1>
      <p className="mt-1.5 text-[12.5px] leading-6 text-[rgb(var(--text-subtle))]">
        در کمتر از یک دقیقه آماده می‌شوی. هیچ اطلاعاتی از دستگاهت خارج نمی‌شود.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label>نام و نام خانوادگی</Label>
          <Field placeholder="مثلاً: سارا احمدی" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </div>
        <div>
          <Label>ایمیل</Label>
          <Field type="email" dir="ltr" className="text-left" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>رمز عبور</Label>
            <Field type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <Label>تکرار رمز</Label>
            <Field type="password" placeholder="••••••••" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </div>
        </div>

        {/* قدرت رمز */}
        {form.password && (
          <div>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      i < strength ? ['#C0554A', '#AD9268', '#57886A', '#4F8A96'][strength - 1] : 'rgb(var(--text) / 0.12)',
                  }}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[10.5px] text-[rgb(var(--text-subtle))]">
              قدرت رمز: {['خیلی ضعیف', 'ضعیف', 'متوسط', 'قوی', 'بسیار قوی'][strength]}
            </p>
          </div>
        )}

        <label className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5">
          <span>
            <span className="block text-[12.5px] font-medium">بارگذاری داده نمونه</span>
            <span className="block text-[11px] text-[rgb(var(--text-subtle))]">برای کاویدن سریع قابلیت‌ها (بعداً قابل پاک‌سازی است)</span>
          </span>
          <Switch checked={withDemo} onChange={setWithDemo} label="داده نمونه" />
        </label>

        <label className="flex items-start gap-2.5 text-[12px] leading-6 text-[rgb(var(--text-muted))]">
          <Switch checked={accept} onChange={setAccept} label="پذیرش شرایط" />
          <span>
            با شرایط استفاده و سیاست حریم خصوصی موافقم؛ می‌دانم داده‌ها روی همین مرورگر ذخیره می‌شوند و پشتیبان‌گیری با خودم است.
          </span>
        </label>

        <Button type="submit" size="lg" className="w-full" loading={loading} icon="Sparkles">
          ساخت حساب و شروع
        </Button>

        <p className="pt-1 text-center text-[12px] text-[rgb(var(--text-subtle))]">
          قبلاً ثبت‌نام کرده‌ای؟{' '}
          <Link href="/login" className="font-bold text-[rgb(var(--accent))] hover:underline">
            ورود
          </Link>
        </p>
      </form>

      <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5">
        <Icon name="Lock" size={16} className="mt-0.5 shrink-0 text-[rgb(var(--accent))]" />
        <p className="text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
          رمز عبور در این نسخه فقط نقش «قفل صفحه» محلی را دارد و جایی ارسال نمی‌شود. در نسخه سروری (NextAuth + Prisma) احراز هویت واقعی با
          هش bcrypt انجام می‌شود.
        </p>
      </div>
    </motion.div>
  );
}
