/** /api/focus — لیست و ایجاد (مدل: focusSession) */
import { collection } from '../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = collection('focusSession', { orderBy: { createdAt: 'desc' } });
export const GET = handlers.GET;
export const POST = handlers.POST;
