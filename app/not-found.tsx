'use client';

/** صفحه ۴۰۴ سفارشی با لحن گرم و دلگرم‌کننده */
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse-ring rounded-full bg-[rgb(var(--accent)/0.2)]" />
        <div className="grid h-24 w-24 place-items-center rounded-full bg-[rgb(var(--accent-soft))] text-4xl">🧭</div>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold">این صفحه پیدا نشد</h1>
        <p className="max-w-md text-sm leading-7 text-[rgb(var(--text-muted))]">
          به نظر می‌رسد مسیر را گم کرده‌ای. نگران نباش — می‌توانی از داشبورد شروع کنی و از نو برنامه‌ریزی کنی.
        </p>
      </div>
      <Link href="/" className="btn btn-primary">
        بازگشت به داشبورد
      </Link>
    </div>
  );
}
