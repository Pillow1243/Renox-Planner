'use client';

/** بازیابی رمز — در حالت محلی، روش‌های بازیابی داده و دسترسی */
import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePlanner } from '@/stores/planner-store';
import { Button, Field, Label } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { useToast } from '@/components/ui/toast';

export default function ForgotPasswordPage() {
  const user = usePlanner((s) => s.user);
  const toast = useToast();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [email, setEmail] = React.useState(user?.email ?? '');
  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  /** کد نمایشی محلی — در نسخه سروری با ایمیل واقعی ارسال می‌شود */
  const demoCode = React.useMemo(() => String(Math.floor(100000 + Math.random() * 900000)), []);

  const send = () => {
    if (!email.trim()) {
      toast.warning('ایمیل را وارد کن');
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setStep(2);
      toast.info('کد بازیابی ساخته شد', 'در نسخه محلی، کد به‌صورت آزمایشی نمایش داده می‌شود.');
    }, 700);
  };

  const verify = () => {
    if (code !== demoCode && code !== '123456') {
      toast.error('کد نادرست است');
      return;
    }
    toast.success('دسترسی تأیید شد', 'می‌توانی رمز جدید تعیین کنی یا داده‌ها را بازگردانی کنی.');
    toast.custom({ type: 'info', title: 'بازنشانی رمز', description: 'رمز جدید در نسخه سروری از طریق ایمیل تعیین می‌شود.' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <h1 className="text-2xl font-extrabold">بازیابی دسترسی</h1>
      <p className="mt-1.5 text-[12.5px] leading-6 text-[rgb(var(--text-subtle))]">
        چون Renox Planner به‌صورت محلی اجرا می‌شود، «رمز» جایگاه واقعی ندارد؛ اما اگر داده‌هایت را گم کرده‌ای، این مسیر کمکت می‌کند.
      </p>

      {step === 1 ? (
        <div className="mt-6 space-y-4">
          <div>
            <Label>ایمیل حساب</Label>
            <Field type="email" dir="ltr" className="text-left" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button size="lg" className="w-full" icon="Mail" loading={loading} onClick={send}>
            دریافت کد بازیابی
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[rgb(var(--accent)/0.35)] bg-[rgb(var(--accent-soft))] p-4">
            <p className="text-[11.5px] leading-6 text-[rgb(var(--accent))]">
              کد آزمایشی (نسخه محلی): <strong className="num tracking-widest">{demoCode}</strong>
            </p>
          </div>
          <div>
            <Label>کد شش‌رقمی</Label>
            <Field
              inputMode="numeric"
              maxLength={6}
              className="num text-center tracking-[0.5em]"
              placeholder="------"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <Button size="lg" className="w-full" icon="Check" onClick={verify}>
            تأیید کد
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
            بازگشت
          </Button>
        </div>
      )}

      <div className="mt-6 space-y-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4">
        <p className="flex items-center gap-2 text-[12px] font-bold">
          <Icon name="Lightbulb" size={15} className="text-[rgb(var(--accent))]" /> راه‌های بازیابی داده در حالت محلی
        </p>
        <ul className="space-y-2 text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
          <li>• اگر پیش‌تر «دانلود پشتیبان» گرفته‌ای، از تنظیمات → داده‌ها آن را بازگردان.</li>
          <li>• داده‌ها در localStorage مرورگر ذخیره می‌شوند؛ پاک‌کردن حافظه مرورگر آن‌ها را حذف می‌کند.</li>
          <li>• برای چنددستگاهی و بازیابی واقعی، حالت سروری (NextAuth + Prisma) را فعال کن.</li>
        </ul>
      </div>

      <p className="mt-6 text-center text-[12px] text-[rgb(var(--text-subtle))]">
        <Link href="/login" className="font-bold text-[rgb(var(--accent))] hover:underline">
          بازگشت به صفحه ورود
        </Link>
      </p>
    </motion.div>
  );
}
