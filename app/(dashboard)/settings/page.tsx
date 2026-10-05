'use client';

/**
 * تنظیمات
 *  - پروفایل، ظاهر (تم/رنگ)، منطقه زمانی و واحد پول
 *  - شهر آب‌وهوا، اهداف آب و خواب، اعلان‌ها
 *  - کلیدهای API سرویس‌های اختیاری (رایگان)
 *  - داده‌ها: پشتیبان‌گیری JSON، بازگردانی، داده نمونه، حذف کامل
 *  - راهنمای فعال‌سازی حالت سروری (NextAuth + Prisma) برای استقرار Full-Stack
 */
import * as React from 'react';
import { usePlanner } from '@/stores/planner-store';
import { useMounted } from '@/hooks/use-planner';
import { ACCENT_COLORS, API_BASE, APP_NAME, APP_VERSION, DEFAULT_CITIES, STORAGE_KEY } from '@/lib/constants';
import { toJalali } from '@/lib/jalali';
import { cn, downloadFile, toPersianDigits } from '@/lib/utils';
import type { ThemeMode } from '@/lib/types';
import { Icon } from '@/components/ui/icon';
import { Button, Card, ColorPicker, Field, Label, SegmentedControl, Select, Skeleton, Switch } from '@/components/ui/primitives';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { searchCity } from '@/lib/external-apis';

const SECTIONS = [
  { id: 'profile', label: 'پروفایل', icon: 'User' },
  { id: 'appearance', label: 'ظاهر', icon: 'Palette' },
  { id: 'life', label: 'زندگی و اهداف', icon: 'Target' },
  { id: 'notifications', label: 'اعلان‌ها', icon: 'Bell' },
  { id: 'api', label: 'کلیدهای API', icon: 'KeyRound' },
  { id: 'data', label: 'داده‌ها', icon: 'Shield' },
  { id: 'server', label: 'حالت سروری', icon: 'Cpu' },
  { id: 'about', label: 'درباره', icon: 'Info' },
];

export default function SettingsPage() {
  const state = usePlanner();
  const mounted = useMounted();
  const toast = useToast();
  const [section, setSection] = React.useState('profile');
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [cityQuery, setCityQuery] = React.useState('');
  const [cityResults, setCityResults] = React.useState<{ name: string; latitude: number; longitude: number; country?: string }[]>([]);
  const [cityLoading, setCityLoading] = React.useState(false);
  const [keyDraft, setKeyDraft] = React.useState<Record<string, string>>({});

  const { user, settings } = state;

  const storageSize = React.useMemo(() => {
    if (!mounted) return 0;
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? '';
      return new Blob([raw]).size;
    } catch {
      return 0;
    }
  }, [mounted]);

  const doSearchCity = async () => {
    setCityLoading(true);
    const res = await searchCity(cityQuery);
    setCityResults(res);
    setCityLoading(false);
  };

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="تنظیمات"
        description="برنامه را کاملاً مطابق سلیقه و نیاز خودت تنظیم کن"
        icon="Settings"
      />

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* فهرست بخش‌ها */}
        <Card className="h-max p-2.5">
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSection(s.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-[13px] transition-colors',
                    section === s.id ? 'bg-[rgb(var(--accent-soft))] font-semibold text-[rgb(var(--accent))]' : 'text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--text)/0.05)]'
                  )}
                >
                  <Icon name={s.icon} size={16} />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          {/* پروفایل */}
          {section === 'profile' && (
            <Card className="space-y-4 p-5">
              <h3 className="text-sm font-bold">اطلاعات شخصی</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>نام</Label>
                  <Field value={user?.name ?? ''} onChange={(e) => state.setUser({ name: e.target.value })} />
                </div>
                <div>
                  <Label>ایمیل</Label>
                  <Field type="email" value={user?.email ?? ''} onChange={(e) => state.setUser({ email: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label hint="اختیاری">درباره من</Label>
                  <Field value={user?.bio ?? ''} placeholder="یک جمله از خودت…" onChange={(e) => state.setUser({ bio: e.target.value })} />
                </div>
                <div>
                  <Label>واحد پول پیش‌فرض</Label>
                  <Select value={settings.currency} onChange={(e) => state.updateSettings({ currency: e.target.value })}>
                    <option value="IRR">تومان ایران</option>
                    <option value="USD">دلار آمریکا</option>
                    <option value="EUR">یورو</option>
                    <option value="AED">درهم امارات</option>
                    <option value="GBP">پوند</option>
                  </Select>
                </div>
                <div>
                  <Label>منطقه زمانی</Label>
                  <Select value={settings.timezone} onChange={(e) => state.updateSettings({ timezone: e.target.value })}>
                    <option value="Asia/Tehran">تهران (UTC+3:30)</option>
                    <option value="Asia/Dubai">دبی (UTC+4)</option>
                    <option value="Europe/Amsterdam">آمستردام (UTC+1/+2)</option>
                    <option value="Europe/Istanbul">استانبول (UTC+3)</option>
                    <option value="America/New_York">نیویورک</option>
                    <option value="UTC">UTC</option>
                  </Select>
                </div>
                <div>
                  <Label>زبان</Label>
                  <SegmentedControl
                    options={[
                      { value: 'fa', label: 'فارسی' },
                      { value: 'en', label: 'English (به‌زودی)' },
                    ]}
                    value={settings.language}
                    onChange={(v) => state.updateSettings({ language: v })}
                  />
                </div>
                <div>
                  <Label hint="برای هشدارهای امروز">ساعت شروع روز</Label>
                  <Field type="time" value={settings.dayStart} onChange={(e) => state.updateSettings({ dayStart: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button icon="Check" onClick={() => toast.success('پروفایل ذخیره شد')}>
                  ذخیره
                </Button>
              </div>
            </Card>
          )}

          {/* ظاهر */}
          {section === 'appearance' && (
            <Card className="space-y-5 p-5">
              <h3 className="text-sm font-bold">ظاهر برنامه</h3>
              <div>
                <Label>حالت نمایش</Label>
                <SegmentedControl
                  options={[
                    { value: 'light', label: 'روشن', icon: 'Sun' },
                    { value: 'dark', label: 'تاریک', icon: 'Moon' },
                    { value: 'system', label: 'سیستم', icon: 'Monitor' },
                  ]}
                  value={settings.theme}
                  onChange={(v) => state.setTheme(v as ThemeMode)}
                />
              </div>
              <div>
                <Label>رنگ لهجه</Label>
                <ColorPicker value={settings.accent} onChange={(c) => state.updateSettings({ accent: c })} colors={ACCENT_COLORS.map((c) => c.value)} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => state.updateSettings({ accent: c.value })}
                      className={cn(
                        'chip border text-[11px]',
                        settings.accent === c.value ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))]' : 'border-[rgb(var(--border))]'
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] p-3.5">
                <div>
                  <p className="text-[13px] font-medium">صدای رابط کاربری</p>
                  <p className="text-[11px] text-[rgb(var(--text-subtle))]">صدای ملایم پایان پومودورو و ثبت عادت</p>
                </div>
                <Switch checked={settings.sounds} onChange={(v) => state.updateSettings({ sounds: v })} label="صدا" />
              </div>
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4">
                <p className="mb-2 text-[11px] font-bold text-[rgb(var(--text-muted))]">پیش‌نمایش</p>
                <div className="flex flex-wrap gap-3">
                  <button className="btn btn-primary">دکمه اصلی</button>
                  <button className="btn btn-outline">دکمه ثانویه</button>
                  <span className="chip bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">نشان</span>
                  <span className="chip bg-[rgb(var(--success)/0.14)] text-[rgb(var(--success))]">موفق</span>
                  <span className="chip bg-[rgb(var(--danger)/0.14)] text-[rgb(var(--danger))]">خطا</span>
                </div>
              </div>
            </Card>
          )}

          {/* زندگی و اهداف */}
          {section === 'life' && (
            <div className="space-y-4">
              <Card className="space-y-4 p-5">
                <h3 className="text-sm font-bold">اهداف روزانه</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label hint="لیوان">هدف روزانه آب</Label>
                    <Field
                      type="number"
                      min={1}
                      max={20}
                      className="num"
                      value={settings.waterGoal}
                      onChange={(e) => state.updateSettings({ waterGoal: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label hint="ساعت">هدف خواب شبانه</Label>
                    <Field
                      type="number"
                      min={4}
                      max={12}
                      step={0.5}
                      className="num"
                      value={settings.sleepGoal}
                      onChange={(e) => state.updateSettings({ sleepGoal: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>شهر برای نمایش آب‌وهوا</Label>
                  <div className="flex gap-2">
                    <Field
                      value={cityQuery}
                      placeholder="نام شهر را بنویس…"
                      onChange={(e) => setCityQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void doSearchCity()}
                    />
                    <Button variant="outline" icon="Search" loading={cityLoading} onClick={() => void doSearchCity()}>
                      جست‌وجو
                    </Button>
                  </div>
                  {cityResults.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cityResults.map((c) => (
                        <button
                          key={`${c.name}-${c.latitude}`}
                          onClick={() => {
                            state.updateSettings({ city: { name: c.name, latitude: c.latitude, longitude: c.longitude } });
                            setCityResults([]);
                            toast.success(`شهر به ${c.name} تغییر کرد`);
                          }}
                          className="chip border border-[rgb(var(--border))] hover:border-[rgb(var(--accent))]"
                        >
                          {c.name} {c.country ? `— ${c.country}` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {DEFAULT_CITIES.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => state.updateSettings({ city: c })}
                        className={cn(
                          'chip border text-[11px]',
                          settings.city.name === c.name ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))]' : 'border-[rgb(var(--border))]'
                        )}
                      >
                        {settings.city.name === c.name && <Icon name="Check" size={11} />}
                        {c.name}
                      </button>
                    ))}
                  </div>
                  <p className="num mt-2 text-[11px] text-[rgb(var(--text-subtle))]">
                    شهر فعلی: {settings.city.name} ({settings.city.latitude.toFixed(2)}، {settings.city.longitude.toFixed(2)}) — منبع: Open-Meteo Geocoding (بدون کلید)
                  </p>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-bold">چیدمان داشبورد</h3>
                <p className="mb-3 text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
                  در داشبورد دکمه «چیدمان» را بزن و کارت‌ها را با Drag & Drop جابه‌جا کن. چیدمان فعلی:
                </p>
                <div className="flex flex-wrap gap-2">
                  {settings.dashboardLayout.map((id, i) => (
                    <span key={id} className="chip num bg-[rgb(var(--text)/0.06)]">
                      {toPersianDigits(i + 1)}. {id}
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  icon="RotateCcw"
                  onClick={() =>
                    state.updateSettings({ dashboardLayout: ['today', 'stats', 'week-chart', 'habits', 'goals', 'quote', 'weather', 'upcoming'] })
                  }
                >
                  بازگرداندن چیدمان پیش‌فرض
                </Button>
              </Card>
            </div>
          )}

          {/* اعلان‌ها */}
          {section === 'notifications' && (
            <div className="space-y-4">
              <Card className="space-y-3 p-5">
                <h3 className="text-sm font-bold">اعلان‌ها</h3>
                {[
                  { key: 'push', label: 'اعلان مرورگر (Web Push)', hint: 'نیازمند اجازه مرورگر است' },
                  { key: 'inApp', label: 'اعلان درون‌برنامه‌ای', hint: 'زنگ بالای صفحه' },
                  { key: 'dailyDigest', label: 'خلاصه روزانه', hint: 'هر صبح خلاصه امروز' },
                  { key: 'habitReminder', label: 'یادآور عادت‌ها', hint: 'بر اساس ساعت هر عادت' },
                  { key: 'taskReminder', label: 'یادآور تسک‌ها', hint: 'پیش از سررسید' },
                ].map((item) => {
                  const checked =
                    item.key === 'inApp'
                      ? true
                      : (settings.notifications as unknown as Record<string, boolean>)[item.key] ?? false;
                  return (
                    <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] p-3.5">
                      <div>
                        <p className="text-[13px] font-medium">{item.label}</p>
                        <p className="text-[11px] text-[rgb(var(--text-subtle))]">{item.hint}</p>
                      </div>
                      <Switch
                        checked={checked}
                        label={item.label}
                        onChange={(v) => {
                          if (item.key === 'inApp') return;
                          if (item.key === 'push' && v && typeof Notification !== 'undefined') void Notification.requestPermission();
                          state.updateSettings({
                            notifications: { ...settings.notifications, [item.key]: v },
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </Card>

              <Card className="space-y-4 p-5">
                <h3 className="text-sm font-bold">تلگرام</h3>
                <p className="text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
                  برای دریافت یادآور در تلگرام، توکن ربات خودت را وارد کن (ساخت ربات رایگان است). این مقدار فقط در مرورگر خودت ذخیره می‌شود.
                  برای فعال‌سازی کامل لازم است حالت سروری روشن باشد.
                </p>
                <div>
                  <Label>توکن ربات تلگرام (اختیاری)</Label>
                  <Field
                    type="password"
                    placeholder="123456:ABC-DEF…"
                    value={settings.apiKeys.telegramBotToken ?? ''}
                    onChange={(e) => state.setApiKey('telegramBotToken', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Chat ID (اختیاری)</Label>
                  <Field
                    placeholder="123456789"
                    value={settings.telegramChatId ?? ''}
                    onChange={(e) => state.updateSettings({ telegramChatId: e.target.value })}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* کلیدهای API */}
          {section === 'api' && (
            <Card className="space-y-4 p-5">
              <div>
                <h3 className="text-sm font-bold">کلیدهای API اختیاری</h3>
                <p className="mt-1 text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
                  همه سرویس‌های پایه این برنامه رایگان و بدون کلید کار می‌کنند. این کلیدها فقط برای قابلیت‌های اضافه‌اند (اخبار، سهام، فیلم) و در
                  مرورگر خودت ذخیره می‌شوند — هرگز جایی ارسال نمی‌شوند.
                </p>
              </div>

              {[
                { key: 'newsApiKey', label: 'NewsAPI (اخبار)', hint: 'newsapi.org — پلن رایگان توسعه‌دهنده', link: 'https://newsapi.org' },
                { key: 'alphaVantageKey', label: 'Alpha Vantage (سهام)', hint: 'alphavantage.co — ۲۵ درخواست در روز رایگان', link: 'https://www.alphavantage.co/support/#api-key' },
                { key: 'omdbKey', label: 'OMDb (فیلم)', hint: 'omdbapi.com — ۱۰۰۰ درخواست در روز رایگان', link: 'https://www.omdbapi.com/apikey.aspx' },
                { key: 'tmdbKey', label: 'TMDB (فیلم و سریال)', hint: 'themoviedb.org — رایگان', link: 'https://www.themoviedb.org/settings/api' },
                { key: 'huggingFaceKey', label: 'Hugging Face (هوش مصنوعی)', hint: 'huggingface.co — پلن رایگان', link: 'https://huggingface.co/settings/tokens' },
                { key: 'groqKey', label: 'Groq (استنتاج سریع LLM)', hint: 'console.groq.com — پلن رایگان', link: 'https://console.groq.com/keys' },
              ].map((item) => (
                <div key={item.key}>
                  <Label hint={item.hint}>{item.label}</Label>
                  <div className="flex gap-2">
                    <Field
                      type="password"
                      placeholder="— وارد نشده —"
                      value={keyDraft[item.key] ?? settings.apiKeys[item.key] ?? ''}
                      onChange={(e) => setKeyDraft((d) => ({ ...d, [item.key]: e.target.value }))}
                    />
                    <Button
                      variant="outline"
                      icon="Save"
                      onClick={() => {
                        state.setApiKey(item.key, keyDraft[item.key] ?? '');
                        toast.success('کلید ذخیره شد', 'فقط روی همین دستگاه نگه‌داری می‌شود.');
                      }}
                    >
                      ذخیره
                    </Button>
                    <Button variant="ghost" icon="Trash2" onClick={() => {
                      state.setApiKey(item.key, '');
                      setKeyDraft((d) => ({ ...d, [item.key]: '' }));
                    }}>
                      حذف
                    </Button>
                  </div>
                  <a href={item.link} target="_blank" rel="noreferrer noopener" className="mt-1 inline-block text-[10.5px] text-[rgb(var(--accent))] hover:underline">
                    دریافت کلید رایگان ↗
                  </a>
                </div>
              ))}

              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4">
                <p className="mb-2 text-[11.5px] font-bold">سرویس‌های رایگان بدون کلید که همین حالا فعال‌اند</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ['آب‌وهوا', API_BASE.openMeteo],
                    ['نرخ ارز', API_BASE.rates],
                    ['رمزارز', API_BASE.coingecko],
                    ['دیکشنری', API_BASE.dictionary],
                    ['کتاب', API_BASE.openLibrary],
                    ['ترجمه', 'libretranslate'],
                    ['QR', API_BASE.goqr],
                    ['رنگ', API_BASE.colorApi],
                  ].map(([name]) => (
                    <span key={name} className="chip bg-[rgb(var(--accent-soft))] text-[10.5px] text-[rgb(var(--accent))]">
                      <Icon name="CheckCircle2" size={11} /> {name}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* داده‌ها */}
          {section === 'data' && (
            <div className="space-y-4" id="data">
              <Card className="space-y-4 p-5">
                <h3 className="text-sm font-bold">پشتیبان‌گیری و بازیابی</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[rgb(var(--border))] p-3.5">
                    <p className="num text-xl font-black">{toPersianDigits(state.tasks.length + state.notes.length + state.transactions.length + state.journal.length)}</p>
                    <p className="text-[10.5px] text-[rgb(var(--text-subtle))]">رکورد اصلی</p>
                  </div>
                  <div className="rounded-2xl border border-[rgb(var(--border))] p-3.5">
                    <p className="num text-xl font-black">{toPersianDigits((storageSize / 1024).toFixed(1))}</p>
                    <p className="text-[10.5px] text-[rgb(var(--text-subtle))]">کیلوبایت فضای مصرفی</p>
                  </div>
                  <div className="rounded-2xl border border-[rgb(var(--border))] p-3.5">
                    <p className="num text-xl font-black">{toPersianDigits(state.habitLogs.length)}</p>
                    <p className="text-[10.5px] text-[rgb(var(--text-subtle))]">ثبت عادت</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    icon="Download"
                    onClick={() => {
                      downloadFile(`renox-backup-${new Date().toISOString().slice(0, 10)}.json`, state.exportJSON(), 'application/json');
                      toast.success('پشتیبان‌گیری انجام شد');
                    }}
                  >
                    دانلود پشتیبان (JSON)
                  </Button>
                  <Button variant="outline" icon="Upload" onClick={() => setImportOpen(true)}>
                    بازگردانی از فایل
                  </Button>
                  <Button
                    variant="outline"
                    icon="Sparkles"
                    onClick={() => {
                      state.loadDemoData();
                      toast.success('داده نمونه بارگذاری شد', 'برای شروع سریع یا تست قابلیت‌ها.');
                    }}
                  >
                    بارگذاری داده نمونه
                  </Button>
                  <Button variant="danger" icon="Trash2" onClick={() => setConfirmReset(true)}>
                    حذف همه داده‌ها
                  </Button>
                </div>

                <p className="text-[11px] leading-6 text-[rgb(var(--text-subtle))]">
                  تمام داده‌ها در <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">{STORAGE_KEY}</code> داخل مرورگر شما ذخیره می‌شود
                  (localStorage). با پشتیبان‌گیری منظم می‌توانی داده‌ها را به دستگاه دیگری منتقل کنی.
                </p>
              </Card>

              <Card className="p-5">
                <h3 className="mb-2 text-sm font-bold">امنیت و حریم خصوصی</h3>
                <ul className="space-y-2 text-[12px] leading-7 text-[rgb(var(--text-muted))]">
                  <li className="flex gap-2">
                    <Icon name="Shield" size={15} className="mt-1.5 shrink-0 text-[rgb(var(--accent))]" />
                    هیچ داده‌ای به سرور ما ارسال نمی‌شود؛ برنامه کاملاً محلی اجرا می‌شود.
                  </li>
                  <li className="flex gap-2">
                    <Icon name="Shield" size={15} className="mt-1.5 shrink-0 text-[rgb(var(--accent))]" />
                    تنها درخواست‌های بیرونی، سرویس‌های رایگان عمومی هستند (آب‌وهوا، نرخ ارز، دیکشنری…).
                  </li>
                  <li className="flex gap-2">
                    <Icon name="Shield" size={15} className="mt-1.5 shrink-0 text-[rgb(var(--accent))]" />
                    کلیدهای API اختیاری فقط در مرورگر ذخیره می‌شوند و در پشتیبان JSON هم می‌آیند — در اشتراک‌گذاری فایل دقت کن.
                  </li>
                  <li className="flex gap-2">
                    <Icon name="Shield" size={15} className="mt-1.5 shrink-0 text-[rgb(var(--accent))]" />
                    برای استفاده چنددستگاهی، حالت سروری (بخش بعدی) را با NextAuth و پایگاه داده فعال کن.
                  </li>
                </ul>
              </Card>
            </div>
          )}

          {/* حالت سروری */}
          {section === 'server' && (
            <Card className="space-y-4 p-5">
              <h3 className="text-sm font-bold">فعال‌سازی حالت Full-Stack (اختیاری)</h3>
              <p className="text-[12px] leading-7 text-[rgb(var(--text-muted))]">
                این نسخه به‌صورت Local-First ساخته شده و روی GitHub Pages رایگان اجرا می‌شود. اگر می‌خواهی داده‌ها روی سرور ذخیره شوند و
                ورود با گوگل/ایمیل فعال شود، کدهای آماده Prisma + NextAuth در پوشه <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">server/</code> پروژه
                قرار دارند:
              </p>
              <ol className="list-decimal space-y-2 pr-5 text-[12px] leading-7 text-[rgb(var(--text-muted))]">
                <li>
                  فایل <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">server/prisma/schema.prisma</code> را به{' '}
                  <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">prisma/schema.prisma</code> منتقل کن (۲۱ مدل آماده است).
                </li>
                <li>
                  دستور <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">npm run server:enable</code> را اجرا کن تا پوشه API Routes و تنظیمات
                  NextAuth فعال شوند.
                </li>
                <li>
                  متغیرهای محیطی <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">DATABASE_URL</code>، <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">NEXTAUTH_SECRET</code> و
                  کلیدهای گوگل را در <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">.env</code> بگذار (نمونه در <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">.env.example</code>).
                </li>
                <li>
                  <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">npm run db:push &amp;&amp; npm run db:seed &amp;&amp; npm run dev</code>
                </li>
                <li>
                  در نهایت <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">next.config.mjs</code> را از حالت <code className="rounded bg-[rgb(var(--text)/0.06)] px-1">output: &apos;export&apos;</code> خارج کن.
                </li>
              </ol>
              <div className="rounded-2xl border border-[rgb(var(--warning)/0.3)] bg-[rgb(var(--warning)/0.08)] p-4 text-[11.5px] leading-7">
                <strong>چرا این‌طور؟</strong> GitHub Pages فقط فایل استاتیک سرو می‌کند و API Route یا پایگاه داده اجرا نمی‌کند. برای همین معماری
                پیش‌فرض «Local-First» انتخاب شد (رایگان، سریع، آفلاین) و کد سروری به‌صورت آماده اما غیرفعال نگه داشته شده است.
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="https://github.com/Pillow1243/Renox-Planner" target="_blank" rel="noreferrer noopener" className="btn btn-outline">
                  <Icon name="LinkIcon" size={15} /> مخزن پروژه
                </a>
                <a href="./API_INTEGRATIONS.md" target="_blank" rel="noreferrer noopener" className="btn btn-outline">
                  <Icon name="BookOpen" size={15} /> مستند APIها
                </a>
              </div>
            </Card>
          )}

          {/* درباره */}
          {section === 'about' && (
            <Card className="space-y-4 p-5">
              <div className="flex items-center gap-4">
                <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-[rgb(var(--accent))] to-[#4F8A96] text-2xl font-black text-white shadow-glow">
                  R
                </span>
                <div>
                  <h3 className="text-lg font-extrabold">{APP_NAME}</h3>
                  <p className="num text-[12px] text-[rgb(var(--text-subtle))]">
                    نسخه {toPersianDigits(APP_VERSION)} — ساخته‌شده با Next.js، TypeScript و Tailwind
                  </p>
                </div>
              </div>
              <p className="text-[12.5px] leading-7 text-[rgb(var(--text-muted))]">
                {APP_NAME} یک برنامه‌ریز جامع زندگی است: تسک، پروژه، هدف و OKR، عادت با هیتمپ، تقویم شمسی، پومودورو، یادداشت، ژورنال، مالی،
                سلامت و گزارش — همه در یک رابط فارسی، راست‌چین و نصب‌شدنی (PWA).
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                  <p className="mb-2 text-[11.5px] font-bold">آمار محتوا</p>
                  <ul className="num space-y-1 text-[11.5px] text-[rgb(var(--text-muted))]">
                    <li>تسک: {toPersianDigits(state.tasks.length)}</li>
                    <li>پروژه: {toPersianDigits(state.projects.length)}</li>
                    <li>هدف: {toPersianDigits(state.goals.length)}</li>
                    <li>عادت: {toPersianDigits(state.habits.length)}</li>
                    <li>یادداشت: {toPersianDigits(state.notes.length)}</li>
                    <li>ورودی ژورنال: {toPersianDigits(state.journal.length)}</li>
                    <li>تراکنش: {toPersianDigits(state.transactions.length)}</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                  <p className="mb-2 text-[11.5px] font-bold">امروز</p>
                  <ul className="num space-y-1 text-[11.5px] text-[rgb(var(--text-muted))]">
                    <li>تاریخ میلادی: {new Date().toISOString().slice(0, 10)}</li>
                    <li>
                      تاریخ شمسی:{' '}
                      {(() => {
                        const j = toJalali(new Date());
                        return `${toPersianDigits(j.jy)}/${toPersianDigits(String(j.jm).padStart(2, '0'))}/${toPersianDigits(String(j.jd).padStart(2, '0'))}`;
                      })()}
                    </li>
                    <li>منطقه زمانی: {settings.timezone}</li>
                    <li>واحد پول: {settings.currency}</li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  icon="Share2"
                  onClick={() => {
                    void navigator.clipboard?.writeText(window.location.origin);
                    toast.success('آدرس برنامه کپی شد');
                  }}
                >
                  کپی آدرس برنامه
                </Button>
                <Button
                  variant="outline"
                  icon="RotateCcw"
                  onClick={() => {
                    state.completeOnboarding({ name: state.user?.name ?? 'دوست من', goals: [], habits: [] });
                    state.resetAll();
                    toast.info('برنامه بازنشانی شد', 'راهنمای شروع دوباره نمایش داده می‌شود.');
                  }}
                >
                  اجرای دوباره راهنمای شروع
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* دیالوگ‌ها */}
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          state.resetAll();
          toast.success('همه داده‌ها پاک شد');
        }}
        title="حذف همه داده‌ها"
        message="تمام تسک‌ها، عادت‌ها، یادداشت‌ها و تراکنش‌ها برای همیشه حذف می‌شوند. پیش از ادامه پشتیبان بگیر."
        confirmLabel="همه را پاک کن"
      />

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="بازگردانی از پشتیبان"
        description="محتوای فایل JSON پشتیبان را اینجا جای‌گذاری کن."
        footer={
          <>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              انصراف
            </Button>
            <Button
              icon="Upload"
              onClick={() => {
                const ok = state.importJSON(importText);
                if (ok) {
                  toast.success('بازگردانی انجام شد');
                  setImportOpen(false);
                  setImportText('');
                } else {
                  toast.error('فایل نامعتبر است', 'ساختار JSON را بررسی کن.');
                }
              }}
            >
              بازگردانی
            </Button>
          </>
        }
      >
        <textarea
          className="field h-52 font-mono text-[11px]"
          placeholder='{"app":"Renox Planner","data":{...}}'
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <label className="mt-2 block cursor-pointer text-[11.5px] text-[rgb(var(--accent))] hover:underline">
          یا فایل را انتخاب کن
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImportText(await file.text());
            }}
          />
        </label>
      </Modal>
    </div>
  );
}
