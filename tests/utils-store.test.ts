/**
 * تست‌های ابزارهای عمومی و منطق فروشگاه Zustand
 * توجه: تست‌ها در محیط Node اجرا می‌شوند؛ برای localStorage یک شبیه‌ساز سبک می‌سازیم.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { dayKey } from '../lib/jalali';
import { colorFromString, formatMoney, formatNumber, minutesLabel, pct, stripHtml, toCSV, toLatinDigits, toPersianDigits, truncate, uid } from '../lib/utils';
import { plannerState } from '../stores/planner-store';
import { clearApiCache, getIranHolidaysForMonth, wmoToPersian } from '../lib/external-apis';

test('شناسه‌ها یکتا هستند', () => {
  const ids = new Set(Array.from({ length: 500 }, () => uid('t')));
  assert.equal(ids.size, 500);
  assert.ok([...ids][0].startsWith('t_'));
});

test('تبدیل رقم‌ها به فارسی و برگشت', () => {
  assert.equal(toPersianDigits('1404-07-15'), '۱۴۰۴-۰۷-۱۵');
  assert.equal(toLatinDigits('۱۴۰۴/۰۷/۱۵'), '1404/07/15');
  assert.equal(toPersianDigits(1234), '۱۲۳۴');
});

test('قالب‌بندی عدد و پول با جداکننده فارسی', () => {
  assert.equal(formatNumber(1234567, { persian: false }), '1,234,567');
  assert.match(formatMoney(25_000_000, 'IRR'), /تومان|ریال/);
});

test('درصد و میانگین و برچسب دقیقه', () => {
  assert.equal(pct(1, 4), 25);
  assert.equal(pct(0, 0), 0, 'تقسیم بر صفر باید صفر برگرداند');
  assert.equal(minutesLabel(45), '۴۵ دقیقه');
  assert.equal(minutesLabel(90), '۱ ساعت و ۳۰ دقیقه');
});

test('حذف تگ‌های HTML و کوتاه‌سازی متن', () => {
  assert.equal(stripHtml('<p>سلام <strong>دنیا</strong></p>'), 'سلام دنیا');
  assert.equal(truncate('این یک متن بسیار طولانی برای آزمایش است', 10).length <= 13, true);
});

test('تولید CSV با فرار دادن کاراکترها', () => {
  const csv = toCSV([
    ['عنوان', 'مقدار'],
    ['خرید "خانه"', 1200],
  ]);
  assert.ok(csv.includes('عنوان'));
  assert.ok(csv.includes('""خانه""'), 'دابل‌کوتیشن باید فرار داده شود');
  assert.equal(csv.split('\r\n').length, 2, 'سطرها با CRLF جدا می‌شوند');
  assert.ok(csv.startsWith('"'), 'هر خانه در گیومه قرار می‌گیرد');
});

test('رنگ پایدار از رشته ساخته می‌شود', () => {
  assert.equal(colorFromString('سلام'), colorFromString('سلام'));
  assert.match(colorFromString('تست'), /^#[0-9A-Fa-f]{6}$/);
});

test('تعطیلات رسمی ایران برای هر ماه شمسی تولید می‌شوند', () => {
  const farvardin = getIranHolidaysForMonth(1404, 1);
  const keys = Object.keys(farvardin);
  assert.ok(keys.length >= 4, 'فروردین باید نوروز و روزهای تعطیل داشته باشد');
  assert.equal(keys.length, new Set(keys).size, 'کلیدها یکتا هستند');

  const bahman = getIranHolidaysForMonth(1404, 11);
  assert.ok(Object.values(bahman).some((t) => t.includes('انقلاب') || t.includes('۲۲')), '۲۲ بهمن باید باشد');
});

test('تبدیل کد هوای WMO به متن فارسی', () => {
  assert.ok(wmoToPersian(0).text.length > 0);
  assert.ok(wmoToPersian(61).text.includes('بار') || wmoToPersian(61).text.includes('باران'));
  assert.notEqual(wmoToPersian(95).icon, wmoToPersian(0).icon);
});

test('فروشگاه: افزودن تسک، تغییر وضعیت و حذف', () => {
  const s = () => plannerState();
  s().resetAll();

  const countBefore = s().tasks.length;
  s().addTask({ title: 'تست افزودن', priority: 'high', status: 'todo', tags: [] } as never);
  assert.equal(s().tasks.length, countBefore + 1);

  const created = s().tasks.find((t) => t.title === 'تست افزودن');
  assert.ok(created, 'تسک ساخته شد');

  s().toggleTaskDone(created!.id);
  assert.equal(s().tasks.find((t) => t.id === created!.id)?.status, 'done');
  assert.ok(s().tasks.find((t) => t.id === created!.id)?.completedAt, 'زمان انجام ثبت می‌شود');

  s().toggleTaskDone(created!.id);
  assert.notEqual(s().tasks.find((t) => t.id === created!.id)?.status, 'done');

  s().removeTask(created!.id);
  assert.equal(s().tasks.find((t) => t.id === created!.id), undefined);
});

test('فروشگاه: داده نمونه بارگذاری می‌شود و ثبت عادت کار می‌کند', () => {
  const s = () => plannerState();
  s().resetAll();
  s().loadDemoData();

  assert.ok(s().habits.length > 0, 'داده نمونه عادت دارد');
  assert.ok(s().tasks.length > 0, 'داده نمونه تسک دارد');
  assert.ok(s().projects.length > 0, 'داده نمونه پروژه دارد');

  const habit = s().habits[0];
  const today = dayKey(new Date());
  const before = s().habitLogs.filter((l) => l.habitId === habit.id).length;

  s().toggleHabit(habit.id, today);
  assert.equal(s().habitLogs.filter((l) => l.habitId === habit.id).length, before + 1, 'ثبت عادت انجام شد');

  s().toggleHabit(habit.id, today);
  assert.equal(s().habitLogs.filter((l) => l.habitId === habit.id).length, before, 'ثبت تکراری ایجاد نمی‌شود');
});

test('فروشگاه: پشتیبان‌گیری و بازگردانی JSON', () => {
  const s = () => plannerState();
  s().resetAll();
  s().addTask({ title: 'تسک پشتیبان', tags: [] } as never);

  const json = s().exportJSON();
  assert.ok(json.includes('تسک پشتیبان'), 'خروجی JSON داده‌ها را دارد');

  s().resetAll();
  assert.equal(s().tasks.some((t) => t.title === 'تسک پشتیبان'), false);

  const ok = s().importJSON(json);
  assert.equal(ok, true, 'بازگردانی موفق است');
  assert.ok(s().tasks.some((t) => t.title === 'تسک پشتیبان'), 'تسک پس از بازگردانی هست');
  assert.equal(s().importJSON('{ invalid json'), false, 'ورودی نامعتبر رد می‌شود');
});

test('فروشگاه: تنظیمات و تم ذخیره می‌شوند', () => {
  const s = () => plannerState();
  s().setTheme('dark');
  assert.equal(s().settings.theme, 'dark');
  s().updateSettings({ waterGoal: 10 });
  assert.equal(s().settings.waterGoal, 10);
  s().setTheme('system');
});

test('کش API پاک‌سازی می‌شود (بدون خطا)', () => {
  assert.doesNotThrow(() => clearApiCache());
});
