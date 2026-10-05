/**
 * کارخانه‌ی ساخت Route Handler برای CRUD
 * ----------------------------------------------------------------------------
 * چون تمام مدل‌ها ساختار یکسان دارند (id / userId / createdAt / updatedAt)،
 * یک تابع داینامیک همه عملیات را می‌سازد و هر فایل route فقط مدل را معرفی می‌کند.
 * همه دسترسی‌ها به `userId` نشست محدود می‌شوند (چندمستأجری امن).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from './prisma';

type Delegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  create: (args: unknown) => Promise<unknown>;
  findFirst: (args: unknown) => Promise<unknown | null>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
  count?: (args?: unknown) => Promise<number>;
};

/** فیلدهای غیرقابل‌نوشتن که کاربر نمی‌تواند مستقیم تنظیم کند */
const READONLY = new Set(['id', 'userId', 'createdAt', 'updatedAt']);

function sanitize(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (READONLY.has(k)) continue;
    if (v === undefined) continue;
    // تاریخ‌ها را به Date تبدیل کن
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(v)) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        out[k] = d;
        continue;
      }
    }
    out[k] = v;
  }
  return out;
}

/** ساخت هندلرهای مجموعه (GET لیست + POST ایجاد) */
export function collection(model: string, options?: { orderBy?: Record<string, 'asc' | 'desc'>; searchFields?: string[] }) {
  const delegate = () => (prisma as unknown as Record<string, Delegate>)[model];

  return {
    /** GET /api/<model>?limit=&search=&filters... */
    async GET(req: NextRequest) {
      const session = await getServerSession(authOptions);
      const userId = session?.user?.id as string | undefined;
      if (!userId) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

      const { searchParams } = new URL(req.url);
      const limit = Math.min(Number(searchParams.get('limit') ?? 100) || 100, 500);
      const search = searchParams.get('search')?.trim();

      const where: Record<string, unknown> = { userId };
      for (const [key, value] of searchParams.entries()) {
        if (['limit', 'search', 'from', 'to'].includes(key)) continue;
        if (value === '' || value === 'all') continue;
        where[key] = value === 'true' ? true : value === 'false' ? false : value;
      }
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      if (from || to) {
        where.date = {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
        };
      }
      if (search && options?.searchFields?.length) {
        where.OR = options.searchFields.map((f) => ({ [f]: { contains: search, mode: 'insensitive' } }));
      }

      const items = await delegate().findMany({
        where,
        take: limit,
        orderBy: options?.orderBy ?? { createdAt: 'desc' },
      });
      return NextResponse.json({ items, count: items.length });
    },

    /** POST /api/<model> */
    async POST(req: NextRequest) {
      const session = await getServerSession(authOptions);
      const userId = session?.user?.id as string | undefined;
      if (!userId) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

      try {
        const body = (await req.json()) as Record<string, unknown>;
        const data = { ...sanitize(body), userId };
        const created = await delegate().create({ data });
        return NextResponse.json({ item: created }, { status: 201 });
      } catch (e) {
        return NextResponse.json({ error: 'ایجاد ناموفق بود', detail: String(e) }, { status: 400 });
      }
    },
  };
}

/** ساخت هندلرهای تک‌آیتم (GET / PATCH / DELETE) */
export function item(model: string) {
  const delegate = () => (prisma as unknown as Record<string, Delegate>)[model];

  const guard = async (id: string) => {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) return { error: NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 }) };
    const found = await delegate().findFirst({ where: { id, userId } });
    if (!found) return { error: NextResponse.json({ error: 'پیدا نشد' }, { status: 404 }) };
    return { userId, found };
  };

  return {
    async GET(_req: NextRequest, ctx: { params: { id: string } }) {
      const { error, found } = await guard(ctx.params.id);
      if (error) return error;
      return NextResponse.json({ item: found });
    },

    async PATCH(req: NextRequest, ctx: { params: { id: string } }) {
      const { error } = await guard(ctx.params.id);
      if (error) return error;
      try {
        const body = (await req.json()) as Record<string, unknown>;
        const updated = await delegate().update({ where: { id: ctx.params.id }, data: sanitize(body) });
        return NextResponse.json({ item: updated });
      } catch (e) {
        return NextResponse.json({ error: 'ویرایش ناموفق بود', detail: String(e) }, { status: 400 });
      }
    },

    async DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
      const { error } = await guard(ctx.params.id);
      if (error) return error;
      await delegate().delete({ where: { id: ctx.params.id } });
      return NextResponse.json({ ok: true });
    },
  };
}
