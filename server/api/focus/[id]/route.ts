/** /api/focus/:id — مشاهده، ویرایش و حذف (مدل: focusSession) */
import { item } from '../../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = item('focusSession');
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
