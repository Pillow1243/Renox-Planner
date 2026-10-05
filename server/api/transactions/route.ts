/** /api/transactions — لیست و ایجاد (مدل: transaction) */
import { collection } from '../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = collection('transaction', { orderBy: { createdAt: 'desc' } });
export const GET = handlers.GET;
export const POST = handlers.POST;
