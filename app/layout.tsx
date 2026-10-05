import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/vazirmatn';
import './globals.css';
import { Providers } from './providers';
import { APP_DESCRIPTION, APP_NAME } from '@/lib/constants';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/* ══════════════ متادیتای Open Graph و Twitter Card ══════════════
 * نکته مهم: این متادیتا توسط Next.js در همان بیلد استاتیک داخل `<head>`
 * قرار می‌گیرد (Server-Rendered) — نه با جاوااسکریپت. ربات‌های پیش‌نمایش
 * شبکه‌های اجتماعی (مثل تلگرام، واتساپ، توییتر) جاوااسکریپت اجرا نمی‌کنند؛
 * پس این تگ‌ها باید پیش از بیلد و به‌صورت ثابت در HTML باشند.
 *
 * آدرس تصویر باید «مطلق و با https» باشد تا از ریشه دامنه خوانده شود؛
 * `NEXT_PUBLIC_SITE_URL` را می‌توان با .env بازنویسی کرد (مثلاً دامنه اختصاصی).
 * ══════════════════════════════════════════════════════════════ */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pillow1243.github.io/Renox-Planner').replace(/\/$/, '');
const OG_TITLE = 'Renox Planner | پلنر جامع زندگی';
const OG_DESCRIPTION = 'مدیریت تسک، عادت، هدف و مالی در یک مکان';
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const OG_IMAGE_ALT = 'پیش‌نمای Renox Planner — داشبورد پلنر جامع زندگی با تسک، عادت، تقویم شمسی و بودجه';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: OG_TITLE,
    template: `%s | ${APP_NAME}`,
  },
  description: OG_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: `${basePath}/manifest.json`,
  appleWebApp: { capable: true, statusBarStyle: 'default', title: APP_NAME },
  icons: {
    icon: `${basePath}/icons/icon.svg`,
    apple: `${basePath}/icons/icon-192.png`,
  },
  keywords: ['برنامه‌ریز', 'تسک', 'عادت', 'تقویم شمسی', 'پومودورو', 'ژورنال', 'مدیریت مالی', 'planner', 'RTL'],
  authors: [{ name: 'Renox' }],
  alternates: {
    canonical: SITE_URL,
  },
  /* ── Open Graph (تلگرام، واتساپ، فیسبوک، لینکدین) ── */
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: APP_NAME,
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: OG_IMAGE,           // آدرس مطلق با https (الزامی برای تلگرام)
        secureUrl: OG_IMAGE,
        width: 1280,
        height: 640,
        alt: OG_IMAGE_ALT,
        type: 'image/png',
      },
    ],
  },
  /* ── Twitter / X Card ── */
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1280, height: 640, alt: OG_IMAGE_ALT }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF7F2' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0B' },
  ],
};

/** اسکریپت ضد پرش تم — پیش از رندر اجرا می‌شود تا فلش سفید/تیره رخ ندهد */
const themeScript = `
(function(){
  try {
    var raw = localStorage.getItem('renox-planner::state::v1');
    var mode = 'system';
    if (raw) { 
      var parsed = JSON.parse(raw);
      mode = (parsed && parsed.state && parsed.state.settings && parsed.state.settings.theme) || 'system';
    }
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href={`${basePath}/manifest.json`} />
      </head>
      <body className="min-h-screen bg-[rgb(var(--bg))] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
