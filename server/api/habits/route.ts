/** /api/habits — لیست و ایجاد عادت */
import { collection } from '../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = collection('habit', { orderBy: { createdAt: 'asc' }, searchFields: ['name'] });
export const GET = handlers.GET;
export const POST = handlers.POST;
