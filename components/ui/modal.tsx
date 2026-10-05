'use client';

/**
 * مودال واکنش‌گرا: روی موبایل از پایین اسلاید می‌شود (Bottom Sheet) و
 * روی دسکتاپ به‌صورت مرکز صفحه با انیمیشن نرم ظاهر می‌شود.
 * دسترس‌پذیری: focus trap ساده، بستن با Escape و قفل اسکرول پس‌زمینه.
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Icon } from './icon';
import { Button } from './primitives';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** حذف پدینگ داخلی (برای ویرایشگر تمام‌صفحه) */
  bare?: boolean;
}

const sizeClass = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
  full: 'sm:max-w-[96vw] sm:h-[92vh]',
};

export function Modal({ open, onClose, title, description, children, footer, size = 'md', bare }: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  // بستن با کلید Escape + قفل اسکرول
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // تمرکز اولیه برای دسترس‌پذیری
    const t = setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input,textarea,select,button,[tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, 120);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          {/* پرده پس‌زمینه */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(20_16_10/0.45)] backdrop-blur-[3px] dark:bg-black/65"
          />

          <motion.div
            ref={panelRef}
            initial={{ y: '100%', opacity: 0.7, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className={cn(
              'glass relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl shadow-lifted sm:rounded-3xl',
              sizeClass[size]
            )}
          >
            {/* دستگیره موبایل */}
            <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-[rgb(var(--text)/0.18)] sm:hidden" />

            {(title || description) && (
              <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-4 sm:px-6">
                <div className="space-y-0.5">
                  {title && <h2 className="text-lg font-extrabold">{title}</h2>}
                  {description && <p className="text-xs leading-6 text-[rgb(var(--text-subtle))]">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="بستن"
                  className="btn btn-ghost h-9 w-9 shrink-0 rounded-xl p-0"
                >
                  <Icon name="X" size={18} />
                </button>
              </header>
            )}

            <div className={cn('flex-1 overflow-y-auto', bare ? '' : 'px-5 pb-4 sm:px-6')}>{children}</div>

            {footer && (
              <footer className="flex items-center justify-end gap-2 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.6)] px-5 py-3.5 sm:px-6">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** دیالوگ تأیید (برای حذف‌ها) */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'حذف مورد',
  message = 'آیا از حذف این مورد مطمئن هستید؟ این عمل بازگشت‌پذیر نیست.',
  confirmLabel = 'حذف کن',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button
            variant="danger"
            icon="Trash2"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-7 text-[rgb(var(--text-muted))]">{message}</p>
    </Modal>
  );
}
