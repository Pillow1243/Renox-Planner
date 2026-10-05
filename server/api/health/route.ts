/** /api/health — لیست و ایجاد (مدل: healthLog) */
import { collection } from '../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = collection('healthLog', { orderBy: { createdAt: 'desc' } });
export const GET = handlers.GET;
export const POST = handlers.POST;
