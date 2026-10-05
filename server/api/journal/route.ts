/** /api/journal — لیست و ایجاد (مدل: journalEntry) */
import { collection } from '../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = collection('journalEntry', { orderBy: { createdAt: 'desc' } });
export const GET = handlers.GET;
export const POST = handlers.POST;
