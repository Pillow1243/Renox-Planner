/**
 * /api/report — گزارش تجمیعی سمت سرور
 * GET /api/report?from=2026-01-01&to=2026-01-31
 * تجمیع‌ها در پایگاه‌داده انجام می‌شود تا حجم انتقال داده کم شود.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '../_lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to') ? new Date(`${searchParams.get('to')}T23:59:59.999Z`) : new Date();
  const from = searchParams.get('from') ? new Date(searchParams.get('from')) : new Date(to.getTime() - 30 * 86400000);

  const [tasks, doneTasks, sessions_, habits, habitLogs, tx, health] = await Promise.all([
    prisma.task.count({ where: { userId, createdAt: { gte: from, lte: to } } }),
    prisma.task.count({ where: { userId, completedAt: { gte: from, lte: to } } }),
    prisma.focusSession.aggregate({ where: { userId, startedAt: { gte: from, lte: to }, mode: 'focus' }, _sum: { minutes: true } }),
    prisma.habit.count({ where: { userId, archived: false } }),
    prisma.habitLog.count({ where: { userId, date: { gte: from, lte: to } } }),
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: from, lte: to } },
      _sum: { amountBase: true },
    }),
    prisma.healthLog.aggregate({
      where: { userId, date: { gte: from, lte: to } },
      _avg: { sleepHours: true, water: true, steps: true },
    }),
  ]);

  const income = Number(tx.find((t) => t.type === 'income')?._sum.amountBase ?? 0);
  const expense = Number(tx.find((t) => t.type === 'expense')?._sum.amountBase ?? 0);

  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    tasks: { created: tasks, completed: doneTasks, completionRate: tasks ? Math.round((doneTasks / tasks) * 100) : 0 },
    focusMinutes: sessions_._sum.minutes ?? 0,
    habits: { count: habits, logs: habitLogs, rate: habits ? Math.min(100, Math.round((habitLogs / (habits * 30)) * 100)) : 0 },
    finance: { income, expense, balance: income - expense, savingsRate: income ? Math.round(((income - expense) / income) * 100) : 0 },
    health: {
      sleepAvg: Number((health._avg.sleepHours ?? 0).toFixed(1)),
      waterAvg: Number((health._avg.water ?? 0).toFixed(1)),
      stepsAvg: Math.round(health._avg.steps ?? 0),
    },
  });
}
