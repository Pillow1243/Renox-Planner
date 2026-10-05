'use client';

/**
 * ورود به برنامه
 * در حالت Local-First، ورود به‌صورت «پروفایل محلی روی همین دستگاه» انجام می‌شود
 * (بدون سرور و بدون هزینه). نسخه سروری با NextAuth در پوشه server/ آماده است.
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { Button, Field, Label } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { Switch } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { fireConfetti } from '@/components/ui/confetti';

export default function LoginPage() {
  const router = useRouter();
  const user = usePlanner((s) => s.user);
  const setUser = usePlanner((s) => s.setUser);
  const toast = useToast();

  const [email, setEmail] = React.useState(user?.email ?? '');
  const [name, setName] = React.useState(user?.name ?? '');
  const [pin, setPin] = React.useState('');
  const [remember, setRemember] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.warning('ایمیل را وارد کن');
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      setUser({ email: email.trim(), name: name.trim() || email.split('@')[0] });
      setLoading(false);
      fireConfetti(30);
      toast.success('خوش آمدی 👋', 'پروفایل محلی روی این دستگاه فعال شد.');
      router.push('/');
    }, 650);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <div className="mb-7 lg:hidden">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[rgb(var(--accent))] to-[#4F8A96] text-xl font-black text-white">
          R
        </span>
      </div>

      <h1 className="text-2xl font-extrabold">ورود به Renox Planner</h1>
      <p className="mt-1.5 text-[12.5px] leading-6 text-[rgb(var(--text-subtle))]">
        با پروفایل محلی وارد شو — داده‌هایت روی همین دستگاه می‌ماند و به هیچ سروری ارسال نمی‌شود.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label>ایمیل</Label>
          <Field type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-left" />
        </div>

        <div>
          <Label hint="اختیاری">نام نمایشی</Label>
          <Field placeholder="مثلاً: سارا" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <Label hint="فقط برای قفل صفحه روی همین دستگاه">پین چهاررقمی (اختیاری)</Label>
          <Field
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            className="num text-center tracking-[0.6em]"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 text-[12.5px] text-[rgb(var(--text-muted))]">
            <Switch checked={remember} onChange={setRemember} label="به‌خاطر سپردن" />
            مرا به‌خاطر بسپار
          </label>
          <Link href="/forgot-password" className="text-[12px] font-bold text-[rgb(var(--accent))] hover:underline">
            رمز را فراموش کردی؟
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={loading} icon="LogOut">
          ورود به برنامه
        </Button>

        <div className="relative my-2 text-center">
          <span className="relative z-10 bg-[rgb(var(--bg))] px-3 text-[11px] text-[rgb(var(--text-subtle))]">یا</span>
          <span className="absolute inset-x-0 top-1/2 h-px bg-[rgb(var(--border))]" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          icon="Google"
          onClick={() =>
            toast.info('ورود با گوگل در نسخه سروری فعال می‌شود', 'راهنمای فعال‌سازی در تنظیمات → حالت سروری آمده است.')
          }
        >
          ادامه با گوگل
        </Button>

        <p className="pt-2 text-center text-[12px] text-[rgb(var(--text-subtle))]">
          حساب نداری؟{' '}
          <Link href="/register" className="font-bold text-[rgb(var(--accent))] hover:underline">
            ساخت حساب
          </Link>
        </p>
      </form>

      <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5">
        <Icon name="Shield" size={16} className="mt-0.5 shrink-0 text-[rgb(var(--accent))]" />
        <p className="text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
          چرا ثبت‌نام اجباری نیست؟ چون Renox Planner کاملاً محلی اجرا می‌شود و همین باعث می‌شود سریع، رایگان و آفلاین‌پذیر باشد. اگر
          معماری سروری با ورود گوگل و پایگاه داده می‌خواهی، پوشه <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">server/</code> را فعال کن.
        </p>
      </div>
    </motion.div>
  );
}
