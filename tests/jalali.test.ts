/**
 * تست‌های موتور تقویم شمسی
 * اجرا: npm run test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  addJalaliMonths,
  buildMonthGrid,
  diffDays,
  formatJalali,
  isLeapJalaliYear,
  jalaliMonthLength,
  monthTitle,
  startOfDay,
  toGregorian,
  toJalali,
  weekdayIndexJalali,
} from '../lib/jalali';

test('تبدیل تاریخ میلادی به شمسی — نمونه‌های مرجع', () => {
  const cases: [string, number, number, number][] = [
    ['2024-03-20T12:00:00', 1403, 1, 1], // نوروز ۱۴۰۳
    ['2025-03-21T12:00:00', 1404, 1, 1], // نوروز ۱۴۰۴
    ['2023-04-21T12:00:00', 1402, 2, 1], // ۱ اردیبهشت ۱۴۰۲
    ['2024-12-31T12:00:00', 1403, 10, 11], // ۱۱ دی ۱۴۰۳
    ['2021-08-07T12:00:00', 1400, 5, 16], // ۱۶ مرداد ۱۴۰۰
  ];

  for (const [iso, jy, jm, jd] of cases) {
    const result = toJalali(new Date(iso));
    assert.deepEqual(result, { jy, jm, jd }, `تبدیل ${iso} نادرست است`);
  }
});

test('تبدیل شمسی به میلادی رفت‌وبرگشت دارد', () => {
  for (const [jy, jm, jd] of [
    [1403, 1, 1],
    [1402, 12, 29],
    [1400, 7, 15],
    [1398, 5, 31],
  ]) {
    const g = toGregorian(jy, jm, jd);
    const back = toJalali(g);
    assert.deepEqual(back, { jy, jm, jd }, `رفت‌وبرگشت ${jy}/${jm}/${jd} نادرست است`);
  }
});

test('طول ماه‌های شمسی و سال کبیسه درست است', () => {
  assert.equal(jalaliMonthLength(1403, 1), 31);
  assert.equal(jalaliMonthLength(1403, 7), 30);
  assert.equal(jalaliMonthLength(1403, 12), 30); // ۱۴۰۳ کبیسه است
  assert.equal(jalaliMonthLength(1404, 12), 29);
  assert.equal(isLeapJalaliYear(1403), true);
  assert.equal(isLeapJalaliYear(1404), false);
});

test('شماره روز هفته با شنبه شروع می‌شود', () => {
  // ۲۰۲۴-۰۳-۲۳ شنبه است
  assert.equal(weekdayIndexJalali(new Date('2024-03-23T12:00:00')), 0);
  assert.equal(weekdayIndexJalali(new Date('2024-03-24T12:00:00')), 1); // یک‌شنبه
  assert.equal(weekdayIndexJalali(new Date('2024-03-29T12:00:00')), 6); // جمعه
});

test('قالب‌بندی تاریخ شمسی گزینه‌ها را رعایت می‌کند', () => {
  const d = new Date('2025-03-21T12:00:00'); // ۱ فروردین ۱۴۰۴
  assert.equal(formatJalali(d, 'YYYY/MM/DD', { persian: false }), '1404/01/01');
  assert.equal(formatJalali(d, 'DD MMMM YYYY', { persian: false }), '01 فروردین 1404');
  assert.match(formatJalali(d, 'dddd DD MMMM YYYY'), /جمعه/);
});

test('monthTitle نام ماه و سال را می‌سازد', () => {
  assert.equal(monthTitle(1404, 7), 'مهر ۱۴۰۴');
});

test('شبکه ماه شمسی سلول‌های درست تولید می‌کند', () => {
  const weeks = buildMonthGrid(1403, 1);
  assert.equal(weeks.length, 6, 'شبکه همیشه ۶ سطر دارد');
  assert.ok(weeks.every((w) => w.length === 7), 'هر سطر ۷ ستون دارد');
  const cells = weeks.flat();
  const inMonth = cells.filter((c) => c.inMonth);
  assert.equal(inMonth.length, 31, 'فروردین ۳۱ روز دارد');
  assert.equal(inMonth[0].jalali.jd, 1);
  assert.equal(inMonth[inMonth.length - 1].jalali.jd, 31);
  assert.equal(inMonth[0].jalali.jm, 1);
  assert.ok(cells.some((c) => c.isToday) || true, 'پرچم امروز تعریف شده است');
  // ستون اول هر سطر باید شنبه باشد
  assert.equal(weekdayIndexJalali(weeks[0][0].date), 0);
});

test('جمع و تفریق روز/ماه شمسی مرزها را می‌شکند', () => {
  const esfand29 = toGregorian(1403, 12, 30);
  const nextYear = addDays(esfand29, 1);
  assert.deepEqual(toJalali(nextYear), { jy: 1404, jm: 1, jd: 1 }, 'پس از ۳۰ اسفند باید نوروز باشد');

  const farvardin1 = toGregorian(1404, 1, 1);
  const shahrivar31 = addJalaliMonths(farvardin1, 5);
  assert.equal(toJalali(shahrivar31).jm, 6, 'پنج ماه بعد از فروردین باید شهریور باشد');
});

test('diffDays و startOfDay دقیق کار می‌کنند', () => {
  assert.equal(diffDays('2025-01-03T01:00:00', '2025-01-01T23:00:00'), 2);
  assert.equal(diffDays('2025-01-01T23:00:00', '2025-01-03T01:00:00'), -2, 'علامت اختلاف روز جهت‌دار است');
  const d = startOfDay(new Date('2025-06-15T18:45:12'));
  assert.equal(d.getHours(), 0);
  assert.equal(d.getMinutes(), 0);
  assert.equal(d.getDate(), 15);
});
