/** /api/transactions/:id — مشاهده، ویرایش و حذف (مدل: transaction) */
import { item } from '../../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = item('transaction');
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
