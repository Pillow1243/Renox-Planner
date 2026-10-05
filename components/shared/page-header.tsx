'use client';

/** سربرگ یکدست برای همه صفحات: عنوان، توضیح، آیکون و دکمه‌های اقدام */
import * as React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}
    >
      <div className="flex items-center gap-3.5">
        {icon && (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
            <Icon name={icon} size={22} />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 text-[13px] leading-6 text-[rgb(var(--text-subtle))]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  );
}

export default PageHeader;
