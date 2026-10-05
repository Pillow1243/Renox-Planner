/** /api/journal/:id — مشاهده، ویرایش و حذف (مدل: journalEntry) */
import { item } from '../../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = item('journalEntry');
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
