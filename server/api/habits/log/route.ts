/**
 * /api/habits/log — ثبت/لغو انجام عادت در یک روز
 * POST { habitId, date, count? } → upsert روی (habitId, date)
 * DELETE /api/habits/log?habitId=..&date=.. → حذف ثبت
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '../../_lib/prisma';

export const dynamic = 'force-dynamic';

const startOfDay = (input: string) => {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

  const { habitId, date, count = 1, note } = (await req.json()) as {
    habitId: string;
    date: string;
    count?: number;
    note?: string;
  };
  if (!habitId || !date) return NextResponse.json({ error: 'habitId و date الزامی هستند' }, { status: 400 });

  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) return NextResponse.json({ error: 'عادت پیدا نشد' }, { status: 404 });

  const day = startOfDay(date);
  const log = await prisma.habitLog.upsert({
    where: { habitId_date: { habitId, date: day } },
    update: { count, note },
    create: { habitId, userId, date: day, count, note },
  });

  // زنجیره فعلی برای نمایش فوری در UI
  const recent = await prisma.habitLog.findMany({
    where: { habitId, userId },
    orderBy: { date: 'desc' },
    take: 365,
  });
  let streak = 0;
  for (let i = 0; i < recent.length; i += 1) {
    const expected = new Date();
    expected.setHours(0, 0, 0, 0);
    expected.setDate(expected.getDate() - i);
    if (recent[i].date.getTime() === expected.getTime()) streak += 1;
    else if (i === 0 && recent[i].date.getTime() < expected.getTime()) continue;
    else break;
  }

  return NextResponse.json({ log, streak });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const habitId = searchParams.get('habitId');
  const date = searchParams.get('date');
  if (!habitId || !date) return NextResponse.json({ error: 'habitId و date الزامی هستند' }, { status: 400 });

  await prisma.habitLog.deleteMany({ where: { habitId, userId, date: startOfDay(date) } });
  return NextResponse.json({ ok: true });
}
