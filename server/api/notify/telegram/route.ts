/**
 * /api/notify/telegram — ارسال پیام از طریق ربات تلگرام (رایگان)
 * POST { text, chatId? }  →  https://api.telegram.org/bot<TOKEN>/sendMessage
 * توکن ربات از @BotFather گرفته می‌شود و در TELEGRAM_BOT_TOKEN قرار می‌گیرد.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

  const { text, chatId, parseMode = 'HTML' } = (await req.json()) as {
    text: string;
    chatId?: string;
    parseMode?: 'HTML' | 'Markdown';
  };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const target = chatId ?? process.env.TELEGRAM_CHAT_ID;
  if (!token || !target) {
    return NextResponse.json(
      { error: 'توکن ربات یا شناسه گفتگو تنظیم نشده است', hint: 'TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID را در .env بگذارید.' },
      { status: 400 },
    );
  }
  if (!text?.trim()) return NextResponse.json({ error: 'متن پیام خالی است' }, { status: 400 });

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: target, text, parse_mode: parseMode, disable_web_page_preview: true }),
    cache: 'no-store',
  });

  const json = (await res.json()) as { ok?: boolean; description?: string };
  if (!res.ok || !json.ok) {
    return NextResponse.json({ error: 'ارسال ناموفق بود', detail: json.description ?? res.statusText }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
