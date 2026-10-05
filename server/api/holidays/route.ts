/**
 * /api/holidays — پروکسی تعطیلات رسمی (رفع محدودیت CORS)
 *   • ایران: از بسته داخلی برنامه سمت کلاینت استفاده می‌شود (بدون نیاز به API)
 *   • سایر کشورها: Nager.Date (رایگان، بدون کلید، اما CORS ندارد → پروکسی سروری)
 * GET /api/holidays?year=2026&country=NL
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // یک روز کش

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') ?? String(new Date().getFullYear());
  const country = (searchParams.get('country') ?? '').toUpperCase();
  if (!country) {
    return NextResponse.json({ error: 'پارامتر country لازم است (مثل NL یا DE)' }, { status: 400 });
  }

  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    return NextResponse.json({ error: 'دریافت تعطیلات ناموفق بود', status: res.status }, { status: 502 });
  }
  const json = (await res.json()) as unknown[];
  return NextResponse.json({ country, year, count: json.length, holidays: json });
}
