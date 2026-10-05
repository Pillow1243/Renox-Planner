/** /api/events — لیست و ایجاد (مدل: calendarEvent) */
import { collection } from '../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = collection('calendarEvent', { orderBy: { createdAt: 'desc' } });
export const GET = handlers.GET;
export const POST = handlers.POST;
