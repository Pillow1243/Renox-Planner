/** /api/projects — لیست و ایجاد (مدل: project) */
import { collection } from '../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = collection('project', { orderBy: { createdAt: 'desc' } });
export const GET = handlers.GET;
export const POST = handlers.POST;
