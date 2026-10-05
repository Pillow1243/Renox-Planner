/**
 * Seed سروری (حالت Full-Stack)
 * اجرا:  npm run db:seed   (پس از فعال‌سازی حالت سروری)
 * این فایل ساختار داده را با نسخه Local-First یکسان نگه می‌دارد تا کاربر
 * بتواند داده‌های پشتیبان JSON خود را به پایگاه‌داده منتقل کند.
 */
/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DAY = 86400000;
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
};

async function main() {
  console.log('🌱 شروع بارگذاری داده نمونه سروری…');

  const passwordHash = await hash('renox1234', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@renox.app' },
    update: {},
    create: {
      email: 'demo@renox.app',
      name: 'کاربر نمونه',
      passwordHash,
      bio: 'در حال ساختن نسخهٔ بهتری از خودم.',
      settings: {
        create: {
          theme: 'system',
          accent: '#57886A',
          watermark: undefined as never,
        } as never,
      },
    },
  });

  // پروژه‌ها
  const [personal, work] = await Promise.all([
    prisma.project.create({
      data: { userId: user.id, name: 'رشد شخصی', description: 'عادت‌ها، مطالعه و یادگیری', color: '#57886A', icon: 'Sprout' },
    }),
    prisma.project.create({
      data: { userId: user.id, name: 'کار و حرفه', description: 'پروژه‌های شغلی و درآمد', color: '#6C7FA8', icon: 'Briefcase' },
    }),
  ]);

  // هدف و نتایج کلیدی
  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: 'رسیدن به وزن سالم و آمادگی جسمانی',
      horizon: 'mid',
      category: 'سلامت',
      color: '#57886A',
      targetDate: day(90),
      keyResults: {
        create: [
          { title: 'ورزش در هفته', target: 4, current: 3, unit: 'جلسه' },
          { title: 'نوشیدن آب روزانه', target: 8, current: 6, unit: 'لیوان' },
        ],
      },
    },
  });

  // تسک‌ها
  await prisma.task.createMany({
    data: [
      {
        userId: user.id,
        title: 'مرور اهداف هفتگی و تنظیم اولویت‌ها',
        status: 'in_progress',
        priority: 'high',
        urgent: true,
        important: true,
        dueDate: day(0),
        dueTime: '09:30',
        projectId: personal.id,
        repeatRule: 'weekly',
        estimate: 30,
      },
      {
        userId: user.id,
        title: 'طراحی صفحه فرود پروژه جدید',
        priority: 'urgent',
        urgent: true,
        dueDate: day(1),
        projectId: work.id,
        estimate: 180,
      },
      {
        userId: user.id,
        title: 'مطالعه ۳۰ صفحه کتاب',
        priority: 'medium',
        dueDate: day(0),
        goalId: goal.id,
        repeatRule: 'daily',
        estimate: 45,
      },
      { userId: user.id, title: 'ورزش صبحگاهی', priority: 'high', dueDate: day(0), status: 'done', completedAt: new Date(), spent: 35 },
    ],
  });

  // عادت‌ها + تاریخچه
  const habitSeeds = [
    { name: 'نوشیدن ۸ لیوان آب', icon: 'Droplets', color: '#4F8A96', target: 8, unit: 'لیوان' },
    { name: 'مطالعه', icon: 'BookOpen', color: '#AD9268', target: 1 },
    { name: 'ورزش', icon: 'Dumbbell', color: '#57886A', target: 1, frequency: 'weekly', weekdays: [0, 2, 4] },
  ];

  for (const h of habitSeeds) {
    const habit = await prisma.habit.create({ data: { ...h, userId: user.id } });
    const logs = Array.from({ length: 30 }, (_, i) => i).filter((i) => (i * 7) % 10 > 2);
    await prisma.habitLog.createMany({
      data: logs.map((i) => ({ habitId: habit.id, userId: user.id, date: day(-i), count: h.target })),
      skipDuplicates: true,
    });
  }

  // رویدادها
  await prisma.calendarEvent.createMany({
    data: [
      { userId: user.id, title: 'باشگاه ورزشی', start: day(0), type: 'event', color: '#57886A' },
      { userId: user.id, title: 'جلسه بررسی پروژه', start: day(1), type: 'meeting', color: '#6C7FA8' },
      { userId: user.id, title: 'شام خانوادگی', start: day(3), type: 'event', color: '#BE7857' },
    ],
  });

  // پوشه و یادداشت
  const folder = await prisma.folder.create({ data: { userId: user.id, name: 'ایده‌ها', icon: 'Lightbulb', color: '#AD9268' } });
  await prisma.note.create({
    data: {
      userId: user.id,
      title: 'ایده‌های بهبود بهره‌وری',
      content: '<p>۱. شروع روز با سه اولویت مشخص<br>۲. بلوک‌بندی زمان کار عمیق</p>',
      folderId: folder.id,
      pinned: true,
    },
  });

  // ژورنال
  await prisma.journalEntry.createMany({
    data: Array.from({ length: 7 }, (_, i) => ({
      userId: user.id,
      date: day(-i),
      title: i === 0 ? 'امروز، روزی برای شروع دوباره' : `یادداشت ${i}`,
      content: '<p>روز خوبی بود؛ توانستم کارهای مهم را پیش ببرم.</p>',
      mood: (4 - (i % 2)) as number,
      energy: 7,
      gratitude: ['سلامتی', 'خانواده', 'فرصت یادگیری'],
      lessons: 'شروع روز با سخت‌ترین کار، کل روز را سبک می‌کند.',
    })),
    skipDuplicates: true,
  });

  // مالی
  const wallet = await prisma.wallet.create({
    data: { userId: user.id, name: 'حساب بانکی', type: 'bank', balance: 42_800_000, color: '#6C7FA8' },
  });
  const salary = await prisma.category.create({ data: { userId: user.id, name: 'حقوق', icon: 'Banknote', color: '#57886A', type: 'income' } });
  const food = await prisma.category.create({ data: { userId: user.id, name: 'خوراک', icon: 'UtensilsCrossed', color: '#BE7857', type: 'expense' } });

  await prisma.transaction.createMany({
    data: [
      { userId: user.id, type: 'income', title: 'حقوق ماه', amount: 48_000_000, amountBase: 48_000_000, categoryId: salary.id, walletId: wallet.id, date: day(-5) },
      { userId: user.id, type: 'expense', title: 'خرید هفتگی', amount: 2_350_000, amountBase: 2_350_000, categoryId: food.id, walletId: wallet.id, date: day(-1) },
    ],
  });

  await prisma.budget.create({
    data: { userId: user.id, categoryId: food.id, amount: 8_000_000, month: `${new Date().getFullYear()}` },
  });

  // سلامت
  await prisma.healthLog.createMany({
    data: Array.from({ length: 14 }, (_, i) => ({
      userId: user.id,
      date: day(-i),
      weight: 79.4 - i * 0.05,
      height: 178,
      sleepHours: 7.2,
      sleepQuality: 4,
      steps: 7000 + i * 120,
      water: 6,
      calories: 1900,
    })),
    skipDuplicates: true,
  });

  await prisma.workoutLog.create({
    data: { userId: user.id, date: day(0), title: 'تمرین قدرتی بالاتنه', type: 'قدرتی', duration: 50, calories: 380, intensity: 2 },
  });

  await prisma.focusSession.createMany({
    data: Array.from({ length: 6 }, (_, i) => ({
      userId: user.id,
      startedAt: new Date(Date.now() - i * DAY),
      minutes: 25 * (1 + (i % 3)),
      mode: 'focus',
      completed: true,
      label: 'کار عمیق',
    })),
  });

  await prisma.reminder.create({
    data: { userId: user.id, title: 'بررسی تسک‌های امروز', at: new Date(new Date().setHours(8, 0, 0, 0)), channel: 'push', repeatRule: 'daily' },
  });

  console.log('✅ داده نمونه سروری با موفقیت ایجاد شد.');
  console.log('   ورود آزمایشی: demo@renox.app / renox1234');
}

main()
  .catch((e) => {
    console.error('❌ خطا در seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
