import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/vazirmatn';
import './globals.css';
import { Providers } from './providers';
import { APP_DESCRIPTION, APP_NAME } from '@/lib/constants';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — برنامه‌ریز جامع زندگی`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: `${basePath}/manifest.json`,
  appleWebApp: { capable: true, statusBarStyle: 'default', title: APP_NAME },
  icons: {
    icon: `${basePath}/icons/icon.svg`,
    apple: `${basePath}/icons/icon-192.png`,
  },
  keywords: ['برنامه‌ریز', 'تسک', 'عادت', 'تقویم شمسی', 'پومودورو', 'ژورنال', 'مدیریت مالی', 'planner', 'RTL'],
  authors: [{ name: 'Renox' }],
  openGraph: {
    title: `${APP_NAME} — برنامه‌ریز جامع زندگی`,
    description: APP_DESCRIPTION,
    type: 'website',
    locale: 'fa_IR',
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
