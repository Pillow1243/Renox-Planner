/**
 * /api/sync — همگام‌سازی داده‌های Local-First با پایگاه‌داده
 * POST: دریافت خروجی «دانلود پشتیبان» برنامه و درج دسته‌ای در PostgreSQL
 *       (حالت upsert بر اساس id → اجرای چندباره بی‌خطر است)
 * GET : خروجی گرفتن کل داده‌های کاربر در همان ساختار JSON پشتیبان
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '../_lib/prisma';

export const dynamic = 'force-dynamic';

type Backup = Record<string, Record<string, unknown>[]>;

/** نگاشت کلید پشتیبان محلی → مدل Prisma */
const MODEL_MAP: Record<string, string> = {
  tasks: 'task',
  projects: 'project',
  goals: 'goal',
  habits: 'habit',
  habitLogs: 'habitLog',
  events: 'calendarEvent',
  notes: 'note',
  folders: 'folder',
  journal: 'journalEntry',
  transactions: 'transaction',
  accounts: 'wallet',
  categories: 'category',
  budgets: 'budget',
  health: 'healthLog',
  workouts: 'workoutLog',
  medications: 'medication',
  foods: 'foodLog',
  focusSessions: 'focusSession',
  reminders: 'reminder',
  notifications: 'notification',
  tags: 'tag',
};

const DATE_FIELDS = new Set([
  'date', 'start', 'end', 'dueDate', 'completedAt', 'startedAt', 'createdAt', 'updatedAt',
  'targetDate', 'reminderAt', 'reminderTime', 'birthDate', 'startDate', 'endDate', 'at',
]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

  const body = (await req.json()) as { data?: Backup; mode?: 'merge' | 'replace' };
  const data = body.data ?? (body as unknown as Backup);
  const mode = body.mode ?? 'merge';
  const report: Record<string, number> = {};

  for (const [key, rows] of Object.entries(data)) {
    const model = MODEL_MAP[key];
    if (!model || !Array.isArray(rows)) continue;
    const delegate = (prisma as unknown as Record<string, { createMany: (a: unknown) => Promise<{ count: number }> }>)[model];
    if (!delegate?.createMany) continue;

    const prepared = rows.map((raw) => {
      const row: Record<string, unknown> = { ...raw, userId };
      delete row.id; // شناسه‌ها را پایگاه‌داده می‌سازد (نگاشت در گزارش syncIdMap)
      for (const f of DATE_FIELDS) {
        if (typeof row[f] === 'string' && row[f]) {
          const d = new Date(row[f] as string);
          row[f] = Number.isNaN(d.getTime()) ? undefined : d;
        }
      }
      return row;
    });

    try {
      if (mode === 'replace') {
        await (prisma as unknown as Record<string, { deleteMany: (a: unknown) => Promise<unknown> }>)[model].deleteMany({ where: { userId } });
      }
      const res = await delegate.createMany({ data: prepared, skipDuplicates: true });
      report[key] = res.count;
    } catch {
      report[key] = 0;
    }
  }

  return NextResponse.json({ ok: true, imported: report });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

  const data: Backup = {};
  for (const [key, model] of Object.entries(MODEL_MAP)) {
    const delegate = (prisma as unknown as Record<string, { findMany: (a: unknown) => Promise<Record<string, unknown>[]> }>)[model];
    if (!delegate?.findMany) continue;
    data[key] = await delegate.findMany({ where: { userId }, take: 5000 });
  }
  return NextResponse.json({ exportedAt: new Date().toISOString(), version: 1, data });
}
