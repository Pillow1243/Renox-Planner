/**
 * موتور تقویم شمسی (جلالی) — پیاده‌سازی سبک و بدون وابستگی خارجی
 * الگوریتم بر پایه محاسبات نجومی تقویم هجری شمسی (jalaali-js) است.
 * خروجی: تبدیل دقیق میلادی↔شمسی، نام ماه‌ها، روزهای هفته و شبکه تقویم.
 */
import { toPersianDigits } from './utils';

const div = (a: number, b: number) => ~~(a / b);
const mod = (a: number, b: number) => a - ~~(a / b) * b;

export type JalaliDate = { jy: number; jm: number; jd: number };

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

/** فصول شمسی */
export const JALALI_SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'] as const;

/** روزهای هفته با شروع از شنبه */
export const WEEKDAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'] as const;
export const WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

/** محاسبه اطلاعات سال جلالی (کبیسه و روز شروع سال) */
function jalCal(jy: number, withoutLeap = false) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
  ];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jm = 0;
  let jump = 0;
  let leap = 0;

  if (jy < jp || jy >= breaks[bl - 1]) throw new Error(`سال جلالی نامعتبر: ${jy}`);

  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (!withoutLeap) {
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
  }

  return { leap, gy, march };
}

/** آیا سال شمسی کبیسه است؟ */
export function isLeapJalaliYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

/** تعداد روزهای یک ماه شمسی */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

/** شماره روز مطلق میلادی (Gregorian Day Number) */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/** تبدیل روز مطلق به تاریخ میلادی */
function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

/** میلادی → شمسی */
export function toJalali(date: Date): JalaliDate {
  return d2j(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy, false);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

/** شمسی → میلادی (Date) */
export function toGregorian(jy: number, jm: number, jd: number): Date {
  const r = jalCal(jy, true);
  const jdn = j2d(jy, jm, jd);
  const g = d2g(jdn);
  void r;
  return new Date(g.gy, g.gm - 1, g.gd);
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy, true);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

/**
 * تبدیل ورودی تاریخ به Date محلی
 * رشته‌های «YYYY-MM-DD» (کلید روز) به‌صورت UTC تفسیر می‌شوند و در مناطق زمانی
 * منفی یک روز جابه‌جا می‌شوند؛ این تابع آن‌ها را به تاریخ محلی تبدیل می‌کند.
 */
export function toLocalDate(input: Date | string): Date {
  if (input instanceof Date) return new Date(input);
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(input);
}

/** شروع روز (نیمه‌شب محلی) */
export function startOfDay(date: Date | string): Date {
  const d = toLocalDate(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** کلید یکتای روز به شکل YYYY-MM-DD (میلادی) برای ذخیره‌سازی */
export function dayKey(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** افزودن روز به تاریخ */
export function addDays(date: Date | string, days: number): Date {
  const d = toLocalDate(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** افزودن ماه شمسی */
export function addJalaliMonths(date: Date, months: number): Date {
  const { jy, jm, jd } = toJalali(date);
  let njy = jy;
  let njm = jm + months;
  while (njm > 12) {
    njm -= 12;
    njy += 1;
  }
  while (njm < 1) {
    njm += 12;
    njy -= 1;
  }
  const maxDay = jalaliMonthLength(njy, njm);
  return toGregorian(njy, njm, Math.min(jd, maxDay));
}

/** ایندکس روز هفته با شروع شنبه (۰=شنبه … ۶=جمعه) */
export function weekdayIndexJalali(date: Date): number {
  return (date.getDay() + 1) % 7;
}

/** نام روز هفته */
export function weekdayName(date: Date, short = false): string {
  const idx = weekdayIndexJalali(date);
  return short ? WEEKDAYS_SHORT[idx] : WEEKDAYS[idx];
}

/** فرمت‌دهی تاریخ شمسی با الگوهای ساده */
export function formatJalali(
  date: Date | string,
  pattern = 'YYYY/MM/DD',
  opts: { persian?: boolean } = {}
): string {
  const d = toLocalDate(date);
  const { jy, jm, jd } = toJalali(d);
  const persian = opts.persian ?? true;
  const pad = (n: number) => String(n).padStart(2, '0');
  let out = pattern
    .replace(/YYYY/g, String(jy))
    .replace(/MMMM/g, JALALI_MONTHS[jm - 1])
    .replace(/MM/g, pad(jm))
    .replace(/DD/g, pad(jd))
    .replace(/dddd/g, weekdayName(d))
    .replace(/dd/g, weekdayName(d, true));

  if (/HH|mm/.test(pattern)) {
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    out = out.replace(/HH/g, hh).replace(/mm/g, mm);
  }
  return persian ? toPersianDigits(out) : out;
}

/** تاریخ شمسی نسبی: «امروز»، «دیروز»، «۳ روز آینده» */
export function relativeJalali(date: Date | string): string {
  const d = startOfDay(date);
  const today = startOfDay(new Date());
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'امروز';
  if (diff === 1) return 'فردا';
  if (diff === -1) return 'دیروز';
  if (diff > 1 && diff <= 7) return `${toPersianDigits(diff)} روز آینده`;
  if (diff < -1 && diff >= -7) return `${toPersianDigits(Math.abs(diff))} روز پیش`;
  return formatJalali(d, 'DD MMMM YYYY');
}

export type CalendarCell = {
  date: Date;
  key: string;
  jalali: JalaliDate;
  inMonth: boolean;
  isToday: boolean;
  isHoliday: boolean; // جمعه یا تعطیل رسمی
  holidayTitle?: string;
};

/**
 * ساخت شبکه تقویم ماهانه (۶ سطر × ۷ ستون) با شروع هفته از شنبه
 * @param holidays نقشه تعطیلات رسمی به شکل { 'YYYY-MM-DD': 'عنوان' }
 */
export function buildMonthGrid(
  jy: number,
  jm: number,
  holidays: Record<string, string> = {}
): CalendarCell[][] {
  const first = toGregorian(jy, jm, 1);
  const startOffset = weekdayIndexJalali(first);
  const gridStart = addDays(first, -startOffset);
  const todayKey = dayKey(new Date());
  const weeks: CalendarCell[][] = [];

  for (let w = 0; w < 6; w += 1) {
    const week: CalendarCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(gridStart, w * 7 + d);
      const key = dayKey(date);
      const j = toJalali(date);
      const isFriday = weekdayIndexJalali(date) === 6;
      week.push({
        date,
        key,
        jalali: j,
        inMonth: j.jm === jm && j.jy === jy,
        isToday: key === todayKey,
        isHoliday: isFriday || Boolean(holidays[key]),
        holidayTitle: holidays[key],
      });
    }
    weeks.push(week);
  }
  return weeks;
}

/** برچسب ماه/سال برای عنوان تقویم */
export function monthTitle(jy: number, jm: number): string {
  return `${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

/** بازه هفته جاری (شنبه تا جمعه) */
export function currentWeekRange(reference: Date = new Date()): { start: Date; end: Date; days: Date[] } {
  const offset = weekdayIndexJalali(reference);
  const start = addDays(startOfDay(reference), -offset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { start, days, end: days[6] };
}

/** اختلاف روز بین دو تاریخ */
export function diffDays(a: Date | string, b: Date | string): number {
  const d1 = startOfDay(a).getTime();
  const d2 = startOfDay(b).getTime();
  return Math.round((d1 - d2) / 86400000);
}

/** ساعت فعلی به شکل «۱۴:۳۰» */
export function clockLabel(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return toPersianDigits(`${hh}:${mm}`);
}

/** سلام مناسب ساعت روز */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'شب بخیر';
  if (h < 12) return 'صبح بخیر';
  if (h < 17) return 'وقت بخیر';
  if (h < 21) return 'عصر بخیر';
  return 'شب بخیر';
}
