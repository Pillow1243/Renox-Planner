/** /api/tasks — لیست و ایجاد تسک */
import { collection } from '../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = collection('task', { orderBy: { order: 'asc' }, searchFields: ['title', 'description'] });
export const GET = handlers.GET;
export const POST = handlers.POST;
