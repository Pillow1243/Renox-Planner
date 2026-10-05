import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** ترکیب کلاس‌های Tailwind با حل تعارض */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** تولید شناسه یکتا (بدون وابستگی خارجی) */
export function uid(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

/** تاریخ و زمان فعلی به فرمت ISO */
export function nowISO(): string {
  return new Date().toISOString();
}

/** تبدیل عدد یا رشته به عدد امن */
export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** تبدیل ارقام لاتین به ارقام فارسی */
export function toPersianDigits(input: string | number): string {
  const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(input).replace(/\d/g, (d) => map[Number(d)]);
}

/** تبدیل ارقام فارسی/عربی به لاتین */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/** قالب‌بندی اعداد با جداکننده هزارگان و ارقام فارسی */
export function formatNumber(value: number, opts: { persian?: boolean; digits?: number } = {}): string {
  const { persian = true, digits = 0 } = opts;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
  return persian ? toPersianDigits(formatted) : formatted;
}

/** قالب‌بندی مبلغ (تومان/ریال/دلار) */
export function formatMoney(value: number, currency = 'IRR', persian = true): string {
  const symbols: Record<string, string> = {
    IRR: 'تومان',
    IRT: 'تومان',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'د.إ',
    BTC: '₿',
  };
  const symbol = symbols[currency] ?? currency;
  const num = formatNumber(Math.abs(value), { persian, digits: Number.isInteger(value) ? 0 : 2 });
  return currency === 'USD' || currency === 'EUR' || currency === 'GBP' ? `${symbol}${num}` : `${num} ${symbol}`;
}

/** درصد امن */
export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

/** میانگین یک آرایه */
export function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** خلاصه‌سازی متن طولانی */
export function truncate(text: string, length = 80): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
}

/** حذف تگ‌های HTML برای پیش‌نمایش */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** تأخیر */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** گروه‌بندی آرایه بر اساس کلید */
export function groupBy<T, K extends string | number>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/** مرتب‌سازی پایدار بر اساس کلید */
export function sortBy<T>(items: T[], keyFn: (item: T) => number | string, dir: 'asc' | 'desc' = 'asc'): T[] {
  const sorted = [...items].sort((a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    if (ka === kb) return 0;
    return ka > kb ? 1 : -1;
  });
  return dir === 'asc' ? sorted : sorted.reverse();
}

/** رنگ بر اساس شناسه (برای نمودارها و آواتارها) */
export function colorFromString(str: string): string {
  const palette = ['#57886A', '#BE7857', '#AD9268', '#7C8FA8', '#9A7CA8', '#C08D6A', '#6A9CA8', '#A8916A'];
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

/** درصد پیشرفت زیرتسک‌ها */
export function ratio(done: number, total: number): number {
  return total <= 0 ? 0 : done / total;
}

/** تبدیل دقیقه به متن خوانا */
export function minutesLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (!h) return `${toPersianDigits(rest)} دقیقه`;
  if (!rest) return `${toPersianDigits(h)} ساعت`;
  return `${toPersianDigits(h)} ساعت و ${toPersianDigits(rest)} دقیقه`;
}

/** دانلود فایل متنی/CSV در سمت کلاینت */
export function downloadFile(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob(['\uFEFF' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** ساخت CSV با پشتیبانی از فارسی */
export function toCSV(rows: (string | number)[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
}

/** یک‌بار اجرا (برای افکت‌های React) */
export function once<T extends (...args: never[]) => void>(fn: T): T {
  let called = false;
  return ((...args: never[]) => {
    if (called) return;
    called = true;
    fn(...args);
  }) as T;
}
