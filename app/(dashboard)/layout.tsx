/**
 * چیدمان بخش داشبورد — شامل سایدبار، نوار بالا، FAB و پالت فرمان
 * (صفحات احراز هویت در گروه (auth) بدون این پوسته رندر می‌شوند)
 */
import { AppShell } from '@/components/layout/app-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
