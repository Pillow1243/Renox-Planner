/** /api/goals — لیست و ایجاد (مدل: goal) */
import { collection } from '../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = collection('goal', { orderBy: { createdAt: 'desc' } });
export const GET = handlers.GET;
export const POST = handlers.POST;
