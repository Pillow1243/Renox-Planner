'use client';

/**
 * لایه Provider های سراسری:
 *  - TanStack Query برای کش درخواست‌های APIهای رایگان
 *  - همگام‌سازی تم با تنظیمات کاربر
 *  - ثبت Service Worker برای PWA (فقط روی HTTPS)
 *  - سامانه اعلان Toast
 */
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlanner } from '@/stores/planner-store';
import { Toaster } from '@/components/ui/toast';

function ThemeSync() {
  const theme = usePlanner((s) => s.settings.theme);
  const accent = usePlanner((s) => s.settings.accent);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      root.classList.toggle('dark', dark);
      root.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  /** اعمال رنگ لهجه به‌صورت متغیر CSS */
  useEffect(() => {
    const hex = accent.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    document.documentElement.style.setProperty('--accent', `${r} ${g} ${b}`);
    return () => {
      document.documentElement.style.removeProperty('--accent');
    };
  }, [accent]);

  return null;
}

function ServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'https:') return; // SW فقط روی HTTPS معتبر است
    const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {
      /* ثبت ناموفق — برنامه بدون آفلاین هم کار می‌کند */
    });
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <ThemeSync />
      <ServiceWorker />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
