'use client';

/**
 * پوسته اصلی برنامه (App Shell)
 *  - سایدبار راست‌چین با جمع‌شدن (دسکتاپ)
 *  - نوار بالا + نوار پایین موبایل + کشوی منوی موبایل
 *  - FAB رادیال، پالت فرمان، اعلان Toast، راهنمای شروع
 *  - میانبرهای کیبورد سراسری
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { NAV_GROUPS, NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { MobileTabBar } from './mobile-tabbar';
import { RadialFab } from './radial-fab';
import { CommandPalette } from './command-palette';
import { Onboarding } from './onboarding';
import { QuickAddProvider, useQuickAdd } from '@/components/shared/quick-add-context';
import { QuickAddHost } from '@/components/shared/quick-add-host';
import { useHotkeys, useMounted } from '@/hooks/use-planner';

/** کشوی منوی موبایل (منوی «بیشتر») */
function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(20_16_10/0.42)] backdrop-blur-[3px] dark:bg-black/65"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="glass absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col overflow-y-auto p-4 shadow-lifted"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[rgb(var(--accent))] to-[#4F8A96] font-black text-white">
                  R
                </span>
                <span className="text-base font-extrabold">Renox Planner</span>
              </span>
              <button onClick={onClose} className="btn btn-ghost h-9 w-9 rounded-xl p-0" aria-label="بستن منو">
                <Icon name="X" size={18} />
              </button>
            </div>

            {NAV_GROUPS.map((group) => (
              <div key={group} className="mb-4">
                <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--text-subtle))]">{group}</p>
                <ul className="space-y-1">
                  {NAV_ITEMS.filter((i) => i.group === group).map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[rgb(var(--text-muted))] transition-colors hover:bg-[rgb(var(--text)/0.06)] hover:text-[rgb(var(--text))]"
                      >
                        <Icon name={item.icon} size={18} />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const router = useRouter();
  const { open } = useQuickAdd();
  const mounted = useMounted();

  /** بازیابی وضعیت سایدبار از localStorage */
  React.useEffect(() => {
    const saved = localStorage.getItem('renox-planner::sidebar');
    if (saved === 'collapsed') setCollapsed(true);
  }, []);
  const toggleSidebar = () => {
    setCollapsed((c) => {
      localStorage.setItem('renox-planner::sidebar', c ? 'expanded' : 'collapsed');
      return !c;
    });
  };

  /** میانبرهای کیبورد سراسری */
  useHotkeys(
    React.useMemo(
      () => ({
        'mod+k': (e) => {
          e.preventDefault();
          setPaletteOpen((o) => !o);
        },
        'mod+n': (e) => {
          e.preventDefault();
          if (e.shiftKey) open('note');
          else open('task');
        },
        'mod+j': (e) => {
          e.preventDefault();
          open('quick-journal');
        },
        'mod+/': (e) => {
          e.preventDefault();
          open('shortcuts');
        },
        'mod+p': (e) => {
          e.preventDefault();
          router.push('/focus');
        },
        'g d': () => router.push('/'),
        'g t': () => router.push('/tasks'),
        'g c': () => router.push('/calendar'),
        'g h': () => router.push('/habits'),
        'g f': () => router.push('/finance'),
      }),
      [open, router]
    ),
    mounted
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSearch={() => setPaletteOpen(true)} onOpenMenu={() => setDrawerOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-12">{children}</main>
      </div>

      <MobileTabBar onOpenMore={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <RadialFab />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Onboarding />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <QuickAddProvider>
      <ShellInner>{children}</ShellInner>
      <QuickAddHost />
    </QuickAddProvider>
  );
}

export default AppShell;

/* کلاس کمکی برای مخفی‌کردن در چاپ */
export const noPrintClass = cn('no-print');
