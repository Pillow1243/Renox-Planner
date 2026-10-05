/** /api/notes/:id — مشاهده، ویرایش و حذف (مدل: note) */
import { item } from '../../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = item('note');
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
