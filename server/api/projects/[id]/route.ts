/** /api/projects/:id — مشاهده، ویرایش و حذف (مدل: project) */
import { item } from '../../_lib/crud';
export const dynamic = 'force-dynamic';
const handlers = item('project');
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
