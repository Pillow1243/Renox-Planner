'use client';

/**
 * سامانه اعلان Toast — با رنگ بر اساس نوع پیام و انیمیشن نرم
 * استفاده: const toast = useToast(); toast.success('ذخیره شد')
 */
import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { cn, uid } from '@/lib/utils';
import { Icon } from './icon';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration: number;
}

interface ToastStore {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: ({ duration = 4200, ...rest }) => {
    const id = uid('toast');
    set((s) => ({ items: [...s.items.slice(-3), { id, duration, ...rest }] }));
    if (typeof window !== 'undefined') {
      window.setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), duration);
    }
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

/** هوک استفاده در کامپوننت‌ها */
export function useToast() {
  const push = useToastStore((s) => s.push);
  return {
    success: (title: string, description?: string) => push({ type: 'success', title, description }),
    error: (title: string, description?: string) => push({ type: 'error', title, description }),
    info: (title: string, description?: string) => push({ type: 'info', title, description }),
    warning: (title: string, description?: string) => push({ type: 'warning', title, description }),
    custom: push,
  };
}

const styleMap: Record<ToastType, { icon: string; color: string; bg: string }> = {
  success: { icon: 'CheckCircle2', color: 'rgb(var(--success))', bg: 'rgb(var(--success) / 0.12)' },
  error: { icon: 'AlertCircle', color: 'rgb(var(--danger))', bg: 'rgb(var(--danger) / 0.12)' },
  warning: { icon: 'AlertTriangle', color: 'rgb(var(--warning))', bg: 'rgb(var(--warning) / 0.14)' },
  info: { icon: 'Info', color: 'rgb(var(--info))', bg: 'rgb(var(--info) / 0.12)' },
};

export function Toaster() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[95] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-start"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const st = styleMap[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl p-3.5 shadow-lifted"
              role="status"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: st.bg, color: st.color }}>
                <Icon name={st.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-6">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-subtle))]">{t.description}</p>}
                {t.action && (
                  <button
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                    className={cn('mt-2 text-xs font-bold', 'text-[rgb(var(--accent))] hover:underline')}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="بستن اعلان"
                className="rounded-lg p-1 text-[rgb(var(--text-subtle))] transition-colors hover:bg-[rgb(var(--text)/0.06)]"
              >
                <Icon name="X" size={15} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
