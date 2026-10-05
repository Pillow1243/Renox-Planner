/** /api/goals/:id — مشاهده، ویرایش و حذف (مدل: goal) */
import { item } from '../../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = item('goal');
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
