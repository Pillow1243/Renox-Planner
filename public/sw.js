/* eslint-disable no-undef */
/**
 * Service Worker — Renox Planner (PWA)
 * ------------------------------------------------------------------
 * استراتژی:
 *  ۱) درخواست‌های ناوبری → Network-First با Fallback به کش (کار آفلاین)
 *  ۲) فایل‌های ثابت (‎/_next/static، فونت، آیکون) → Cache-First
 *  ۳) سرویس‌های بیرونی (APIهای رایگان) → Network-First با کش کوتاه‌مدت
 * نکته: چون برنامه روی GitHub Pages منتشر می‌شود، مسیرها نسبت به scope محاسبه می‌شوند.
 */

const VERSION = 'renox-v1.0.0';
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const PAGE_CACHE = `${VERSION}-pages`;

// فایل‌های ضروری برای شروع آفلاین (نسبی → سازگار با زیرمسیر GitHub Pages)
const PRECACHE = ['./', './index.html', './manifest.json', './icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      await Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

/** آیا درخواست از یک API رایگان بیرونی است؟ */
function isExternalApi(url) {
  return [
    'open-meteo.com',
    'quotable.io',
    'er-api.com',
    'frankfurter',
    'coingecko.com',
    'openfoodfacts.org',
    'dictionaryapi.dev',
    'openlibrary.org',
    'date.nager.at',
  ].some((host) => url.hostname.includes(host));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // ۱) ناوبری صفحات — Network-First
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          const cached = (await cache.match(request)) || (await cache.match('./index.html')) || (await cache.match('./'));
          if (cached) return cached;
          return new Response('<h1 dir="rtl">آفلاین هستید</h1><p>اتصال اینترنت را بررسی کنید.</p>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            status: 200,
          });
        }
      })()
    );
    return;
  }

  // ۲) فایل‌های ثابت خود برنامه — Cache-First
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) {
          // به‌روزرسانی در پس‌زمینه
          fetch(request)
            .then((res) => res.ok && cache.put(request, res.clone()))
            .catch(() => undefined);
          return cached;
        }
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return new Response('', { status: 504, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // ۳) APIهای بیرونی — Network-First با کش کوتاه‌مدت
  if (isExternalApi(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ offline: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      })()
    );
  }
});

// همگام‌سازی اعلان‌ها (در صورت پشتیبانی مرورگر)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
