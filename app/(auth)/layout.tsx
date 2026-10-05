'use client';

/**
 * چیدمان صفحات احراز هویت
 * صفحه دوقسمتی: تصویرسازی/مزایا در یک سمت و فرم در سمت دیگر (موبایل: تک‌ستونه)
 */
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/icon';

const FEATURES = [
  { icon: 'CheckSquare', title: 'تسک و کانبان', desc: 'ماتریس آیزنهاور، زیرتسک، تکرار و Drag & Drop' },
  { icon: 'Flame', title: 'عادت با هیتمپ', desc: 'زنجیره روزانه، آمار و جشن کاغذرنگی' },
  { icon: 'CalendarDays', title: 'تقویم شمسی', desc: 'دقیق، با تعطیلات ایران و نمای ماه/هفته/روز' },
  { icon: 'Wallet', title: 'مالی و سلامت', desc: 'بودجه، نرخ ارز زنده، آب، خواب و BMI' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ستون تصویرسازی */}
      <div className="relative hidden overflow-hidden bg-[rgb(var(--surface-2))] lg:block">
        <div
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-[0.18] blur-3xl"
          style={{ background: 'radial-gradient(circle, rgb(var(--accent)), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full opacity-[0.14] blur-3xl"
          style={{ background: 'radial-gradient(circle, #BE7857, transparent 70%)' }}
        />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[rgb(var(--accent))] to-[#4F8A96] text-xl font-black text-white shadow-glow">
              R
            </span>
            <span className="text-lg font-extrabold">Renox Planner</span>
          </Link>

          <div className="space-y-8">
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-md text-4xl font-black leading-[1.35]"
            >
              زندگی‌ات را
              <span className="text-[rgb(var(--accent))]"> یک‌جا </span>
              برنامه‌ریزی کن
            </motion.h1>

            <ul className="space-y-4">
              {FEATURES.map((f, i) => (
                <motion.li
                  key={f.title}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-3.5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
                    <Icon name={f.icon} size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{f.title}</span>
                    <span className="block text-[11.5px] leading-6 text-[rgb(var(--text-subtle))]">{f.desc}</span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-[rgb(var(--text-subtle))]">
            داده‌های شما محلی و روی دستگاه خودتان می‌ماند • بدون هزینه، بدون تبلیغ
          </p>
        </div>
      </div>

      {/* ستون فرم */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
