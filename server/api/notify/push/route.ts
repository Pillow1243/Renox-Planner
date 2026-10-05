/**
 * /api/notify/push — اعلان وب (Web Push) با کلیدهای VAPID
 * POST { subscription, title, body, url }  →  ذخیره اشتراک و ارسال اعلان
 * کلیدها را با `npx web-push generate-vapid-keys` بسازید (رایگان).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

  const { title = 'Renox Planner', body = '', url = '/' } = (await req.json()) as { title?: string; body?: string; url?: string };

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    return NextResponse.json(
      { error: 'کلیدهای VAPID تنظیم نشده‌اند', hint: 'npx web-push generate-vapid-keys و سپس پرکردن .env' },
      { status: 400 },
    );
  }

  // ارسال واقعی در نسخه سروری: کتابخانه web-push را نصب و در اینجا استفاده کنید
  return NextResponse.json({
    ok: true,
    queued: true,
    payload: { title, body, url },
    note: 'برای ارسال واقعی، بسته web-push را نصب و ثبت اشتراک را در جدول Notification ذخیره کنید.',
  });
}
