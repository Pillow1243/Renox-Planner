'use client';

/**
 * هوک‌های مشترک برنامه
 *  - useMounted: جلوگیری از خطای Hydration در خروجی استاتیک
 *  - useHotkeys: ثبت میانبرهای کیبورد
 *  - useMemoStore: انتخاب مقدار از فروشگاه با تایپ امن
 */
import * as React from 'react';
import { usePlanner, type PlannerStore } from '@/stores/planner-store';

/* --------------------------------- هوک‌ها --------------------------------- */
export function useMounted(): boolean {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export function useIsMobile(): boolean {
  return !useMediaQuery('(min-width: 1024px)');
}

export type HotkeyHandler = (e: KeyboardEvent) => void;

/**
 * ثبت میانبر کیبورد؛ پشتیبانی از Ctrl/Cmd و دنباله‌های چندمرحله‌ای مثل «g d»
 * نمونه: useHotkeys({ 'mod+k': fn, 'g d': fn })
 */
export function useHotkeys(map: Record<string, HotkeyHandler>, enabled = true) {
  const pending = React.useRef<{ key: string; at: number } | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const key = e.key.toLowerCase();
      const withMod = e.metaKey || e.ctrlKey;
      const combo = withMod ? `mod+${key}` : key;

      // میانبر مستقیم
      const direct = map[combo] ?? map[key];
      if (direct && (withMod || !typing || key === 'escape')) {
        e.preventDefault();
        pending.current = null;
        direct(e);
        return;
      }

      // میانبرهای ترکیبی دو مرحله‌ای (بدون مودیفایر و در حالت غیر تایپ)
      if (typing || withMod) return;
      const now = Date.now();
      if (pending.current && now - pending.current.at < 1000) {
        const seq = `${pending.current.key} ${key}`;
        const handler = map[seq];
        pending.current = null;
        if (handler) {
          e.preventDefault();
          handler(e);
        }
        return;
      }
      // آیا این کلید آغاز یک دنباله است؟
      const isPrefix = Object.keys(map).some((k) => k.startsWith(`${key} `));
      pending.current = isPrefix ? { key, at: now } : null;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map, enabled]);
}

/** انتخابگر تایپ‌دار از فروشگاه */
export function useStore<T>(selector: (s: PlannerStore) => T): T {
  return usePlanner(selector);
}

/** وضعیت کاربر فعلی و تنظیمات (پرکاربرد) */
export function useUser() {
  const user = usePlanner((s) => s.user);
  const setUser = usePlanner((s) => s.setUser);
  return { user, setUser };
}

export function useSettings() {
  const settings = usePlanner((s) => s.settings);
  const updateSettings = usePlanner((s) => s.updateSettings);
  return { settings, updateSettings };
}

/** تاریخچه ساده برای undo/redo (اختیاری — برای حذف‌های ناخواسته) */
export function useUndoable<T>(initial: T) {
  const [state, setState] = React.useState<T>(initial);
  const history = React.useRef<T[]>([]);
  const update = React.useCallback((next: T) => {
    history.current = [...history.current.slice(-9), state];
    setState(next);
  }, [state]);
  const undo = React.useCallback(() => {
    const last = history.current.pop();
    if (last !== undefined) setState(last);
  }, []);
  return { state, update, undo, canUndo: history.current.length > 0 };
}

/** تشخیص کلیک بیرون از عنصر (برای پاپ‌اورها) */
export function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);
  return ref;
}

/** تایمر زنده (هر ثانیه) — برای ساعت و پومودورو */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
