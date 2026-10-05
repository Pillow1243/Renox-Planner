/** /api/events/:id — مشاهده، ویرایش و حذف (مدل: calendarEvent) */
import { item } from '../../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = item('calendarEvent');
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
