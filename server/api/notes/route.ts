/** /api/notes — لیست و ایجاد (مدل: note) */
import { collection } from '../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = collection('note', { orderBy: { createdAt: 'desc' } });
export const GET = handlers.GET;
export const POST = handlers.POST;
