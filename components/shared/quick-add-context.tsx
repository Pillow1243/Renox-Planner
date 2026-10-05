'use client';

/**
 * زمینه (Context) افزودن سریع
 * همه دیالوگ‌های «ایجاد» را در یک نقطه نگه می‌دارد تا هم FAB رادیال، هم
 * میانبرهای کیبورد و هم صفحات بتوانند آن‌ها را فراخوانی کنند.
 * استفاده: const { open, toast } = useQuickAdd(); open('task');
 */
import * as React from 'react';
import { useToast } from '@/components/ui/toast';

export type QuickAddKind =
  | 'task'
  | 'note'
  | 'transaction'
  | 'habit'
  | 'event'
  | 'goal'
  | 'project'
  | 'journal'
  | 'focus'
  | 'health'
  | 'workout'
  | 'meal'
  | 'medication'
  | 'budget'
  | 'account'
  | 'quick-journal'
  | 'shortcuts';

interface QuickAddContextValue {
  open: (kind: QuickAddKind, payload?: Record<string, unknown>) => void;
  close: () => void;
  active: QuickAddKind | null;
  payload: Record<string, unknown> | undefined;
  toast: ReturnType<typeof useToast>;
}

const QuickAddContext = React.createContext<QuickAddContextValue | null>(null);

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = React.useState<QuickAddKind | null>(null);
  const [payload, setPayload] = React.useState<Record<string, unknown> | undefined>();
  const toast = useToast();

  const value = React.useMemo<QuickAddContextValue>(
    () => ({
      active,
      payload,
      toast,
      open: (kind, p) => {
        setPayload(p);
        setActive(kind);
      },
      close: () => {
        setActive(null);
        setPayload(undefined);
      },
    }),
    [active, payload, toast]
  );

  return <QuickAddContext.Provider value={value}>{children}</QuickAddContext.Provider>;
}

export function useQuickAdd(): QuickAddContextValue {
  const ctx = React.useContext(QuickAddContext);
  if (!ctx) {
    // حالت امن: اگر Provider نبود، بدون خطا ادامه بده
    return {
      active: null,
      payload: undefined,
      open: () => undefined,
      close: () => undefined,
      toast: {
        success: () => undefined,
        error: () => undefined,
        info: () => undefined,
        warning: () => undefined,
        custom: () => '',
      } as unknown as ReturnType<typeof useToast>,
    };
  }
  return ctx;
}
