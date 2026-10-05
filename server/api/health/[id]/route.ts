/** /api/health/:id — مشاهده، ویرایش و حذف (مدل: healthLog) */
import { item } from '../../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = item('healthLog');
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
