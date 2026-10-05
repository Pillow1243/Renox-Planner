/** /api/habits/:id — ویرایش/حذف عادت */
import { item } from '../../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = item('habit');
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
