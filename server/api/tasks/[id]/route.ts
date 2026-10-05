/** /api/tasks/:id — مشاهده، ویرایش و حذف تسک (+ زیرتسک‌ها) */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '../../_lib/prisma';
import { item } from '../../_lib/crud';

export const dynamic = 'force-dynamic';
const handlers = item('task');
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;

/** GET /api/tasks/:id?withSubtasks=true → تسک همراه زیرتسک و برچسب‌ها */
export async function OPTIONS(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  const id = new URL(req.url).pathname.split('/').pop() as string;
  const task = await prisma.task.findFirst({
    where: { id, userId },
    include: { subtasks: true, tags: true, project: true, goal: true },
  });
  if (!task) return NextResponse.json({ error: 'پیدا نشد' }, { status: 404 });
  return NextResponse.json({ item: task });
}
