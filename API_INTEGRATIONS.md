# 🔌 یکپارچه‌سازی API — Renox Planner

> **قاعده طلایی پروژه: هرگز از API پولی استفاده نمی‌شود.**
> اولویت انتخاب همیشه این ترتیب است:
> **۱) بدون احراز هویت (Auth: No) → ۲) کلید رایگان (`apiKey` رایگان) → ۳) هرگز OAuth پولی.**

## ۱. فرایند بررسی مخزن public-apis

پیش از نوشتن حتی یک خط کد، کل مخزن
[public-apis/public-apis](https://github.com/public-apis/public-apis)
مرور و پارس شد (`README.md`، بخش `### <Category>`، جدول‌های `API | Description | Auth | HTTPS | CORS`).

**نتیجه آماری بررسی:**

| شاخص | مقدار |
| --- | --- |
| تعداد دسته‌بندی‌ها | **۵۲** |
| تعداد APIها | **۲۰۳۶** |
| `Auth: No` | ۹۶۸ |
| `Auth: apiKey` | ۸۹۹ |
| `Auth: OAuth` | ۱۵۳ |
| `CORS: Yes` | ۷۷۶ |
| `CORS: Unknown` | ۱۰۱۶ |
| `CORS: No` | ۲۲۷ |

دسته‌های بررسی‌شده: Animal, Anime, Anti-Malware, Art & Design, Authentication, Blockchain, Books, Business,
Calendar, Cloud Storage & File Sharing, Continuous Integration, Cryptocurrency, Currency Exchange, Data Validation,
Development, Dictionaries, Documents & Productivity, Email, Entertainment, Environment, Events, Finance,
Food & Drink, Games & Comics, Geocoding, Government, Health, Jobs, Machine Learning, Music, News, Open Data,
Open Source Projects, Patent, Personality, Phone, Photography, Programming, Science & Math, Security,
Shopping, Social, Sports & Fitness, Test Data, Text Analysis, Tracking, Transportation, URL Shorteners, Vehicle,
Video, Weather, **و ۴۲ زیردسته دیگر**.

از میان آن‌ها، **۲۵ سرویس** برای Renox Planner انتخاب شد؛ همه در جدول زیر مستند شده‌اند.

---

## ۲. سرویس‌های فعال در برنامه

| # | نام API | دسته در public-apis | لینک مخزن / مستندات | Auth | محدودیت نرخ (رایگان) | ماژول برنامه | حالت جایگزین (Fallback) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ۱ | **Open-Meteo** | Environment / Weather | [open-meteo.com](https://open-meteo.com/) | **No** | ~۱۰٬۰۰۰ درخواست/روز (غیرتجاری) | `lib/external-apis.ts → getWeather()`، `getWeatherForecast()` | دادهٔ محلی ۲۲° با متن «داده آزمایشی» + منبع `fallback` |
| ۲ | **Open-Meteo Geocoding** | Geocoding | [open-meteo.com/en/docs/geocoding-api](https://open-meteo.com/en/docs/geocoding-api) | **No** | همان سهمیه | `searchCity()` | فهرست `DEFAULT_CITIES` در `lib/constants.ts` |
| ۳ | **Quotable** | Development / Personality | [github.com/lukePeavey/quotable](https://github.com/lukePeavey/quotable) | **No** | ۱۸۰ درخواست/دقیقه | `getRandomQuote()` (کارت نقل‌قول داشبورد) | `FALLBACK_QUOTES` فارسی داخل کد |
| ۴ | **Nager.Date** | Calendar | [date.nager.at](https://date.nager.at) | **No** | نامحدود عملی | `getPublicHolidays()` + `server/api/holidays` (پروکسی CORS) | دیتاست محلی تعطیلات ایران (`IRAN_FIXED_HOLIDAYS`) |
| ۵ | **open.er-api.com** | Currency Exchange | [exchange rate api](https://www.exchangerate-api.com/docs/free) | **No** | ۱۰۰۰ درخواست/ماه (نقطه پایانی باز) | `getExchangeRates()` در صفحه مالی | **Frankfurter** به‌عنوان منبع دوم و سپس نرخ ثابت ذخیره‌شده |
| ۶ | **Frankfurter** | Currency Exchange | [frankfurter.app](https://www.frankfurter.app/) | **No** | بدون کلید، اروپایی | `getExchangeRates()` (Fallback اول) | نرخ‌های آخرین موفق ذخیره‌شده در `cached()` |
| ۷ | **CoinGecko** | Cryptocurrency | [coingecko.com/api](https://www.coingecko.com/en/api) | **No** | ۱۰–۳۰ درخواست/دقیقه | `getCryptoPrices()` در داشبورد مالی | **CoinCap**؛ در نهایت فهرست با قیمت صفر (UI اسکلتون) |
| ۸ | **The Color API** | Art & Design | [thecolorapi.com](https://www.thecolorapi.com) | **No** | سخاوتمندانه | ابزار انتخاب رنگ پوسته/هویت (`ColorPicker` هوشمند) | محاسبه محلی HSL→HEX در `lib/utils.ts → colorFromString()` |
| ۹ | **QR Server (goQR)** | Development | [goqr.me/api](https://goqr.me/api/) | **No** | نامحدود عملی | اشتراک‌گذاری تسک/رویداد با QR در گزارش‌ها | تولید SVG مربعی محلی بدون سرویس بیرونی |
| ۱۰ | **CleanURI** | URL Shorteners | [cleanuri.com/docs](https://cleanuri.com/docs) | **No** | ۲ درخواست/دقیقه (کافی برای کاربر تک) | کوتاه‌سازی لینک اشتراک‌گذاری گزارش | نمایش لینک کامل اصلی |
| ۱۱ | **WorldTimeAPI** | Development | [worldtimeapi.org](https://worldtimeapi.org/) | **No** | نامحدود عملی | ساعت جهانی در تنظیمات/گزارش | ساعت سیستم + ناحیه زمانی `Settings.timezone` |
| ۱۲ | **Open Library** | Books | [openlibrary.org/developers/api](https://openlibrary.org/developers/api) | **No** (CORS: No) | ۱۰۰ درخواست/۵ دقیقه | جست‌وجوی کتاب در ماژول مطالعه | **Google Books** و سپس کتاب‌های واردشده دستی |
| ۱۳ | **Google Books** | Books | [developers.google.com/books](https://developers.google.com/books/) | رایگان با کلید (OAuth لازم نیست) | ۱۰۰۰ درخواست/روز | جست‌وجوی کتاب | Open Library → ورود دستی |
| ۱۴ | **Free Dictionary API** | Dictionaries | [dictionaryapi.dev](https://dictionaryapi.dev/) | **No** | نامحدود عملی | جست‌وجوی واژه در یادداشت‌ها/مطالعه | پیام «یافت نشد» با طراحی خالی (Empty State) |
| ۱۵ | **LibreTranslate** | Text Analysis | [libretranslate.com/docs](https://libretranslate.com/docs) | **No** | ۵ درخواست/دقیقه (عمومی) | ترجمه عنوان تسک/یادداشت | **MyMemory** |
| ۱۶ | **MyMemory** | Text Analysis | [mymemory.translated.net](https://mymemory.translated.net/doc/spec.php) | **No** | ۵۰۰۰ کاراکتر/روز بدون کلید | ترجمه (Fallback) | پیام محلی: «ترجمه در دسترس نیست» |
| ۱۷ | **LanguageTool** | Text Analysis | [languagetool.org/api](https://dev.languagetool.org/public-http-api) | **No** | ۲۰ درخواست/دقیقه | غلط‌یاب ویرایشگر یادداشت و ژورنال | بررسی محلی نویسه‌های عربی/فارسی (ي→ی، ك→ک) |
| ۱۸ | **Open Food Facts** | Food & Drink | [world.openfoodfacts.org/data](https://world.openfoodfacts.org/data) | **No** | ۱۰۰ درخواست/دقیقه | `searchFoodWithFallback()` در ماژول سلامت | `LOCAL_FOOD_DB` (۱۴ غذای رایج ایرانی با کالری) |
| ۱۹ | **Wger** | Sports & Fitness | [wger.de/en/software/api](https://wger.de/en/software/api) | `apiKey` رایگان | ۱۰۰۰ درخواست/روز (ثبت‌نام رایگان) | `searchExercises()` در ثبت تمرین | فهرست تمرین‌های پیش‌فرض داخلی |
| ۲۰ | **Alpha Vantage** | Finance | [alphavantage.co](https://www.alphavantage.co/documentation/) | `apiKey` رایگان | ۲۵ درخواست/روز | `getStockQuote()` در مالی → تب سرمایه‌گذاری | **CoinGecko** برای دارایی دیجیتال، در غیر این صورت «بدون داده زنده» |
| ۲۱ | **Groq** | Machine Learning | [console.groq.com/docs](https://console.groq.com/docs/quickstart) | `apiKey` رایگان | سخاوتمندانه در سطح توسعه | خلاصه‌سازی هوشمند ژورنال و پیشنهاد اولویت | قواعد محلی «سه اولویت مهم امروز» |
| ۲۲ | **Hugging Face Inference** | Machine Learning | [huggingface.co](https://huggingface.co/docs/api-inference/index) | `apiKey` رایگان | محدود اما رایگان | تحلیل احساسات ژورنال، دسته‌بندی خودکار هزینه | تحلیل کلمه‌ای محلی (فهرست احساسات فارسی) |
| ۲۳ | **Currents API** | News | [currentsapi.services](https://currentsapi.services/en) | `apiKey` رایگان | ۶۰۰ درخواست/روز | کارت خبر داشبورد (اختیاری) | حذف کارت؛ بدون خطا و بدون جای خالی |
| ۲۴ | **Lorem Picsum** | Photography | [picsum.photos](https://picsum.photos/) | **No** | نامحدود عملی | تصاویر پس‌زمینه کارت‌های خالی/کاور ژورنال | گرادینت CSS محلی (بدون تصویر) |
| ۲۵ | **TMDb** | Video | [themoviedb.org/documentation/api](https://www.themoviedb.org/documentation/api) | `apiKey` رایگان | ۵۰ درخواست/ثانیه | فهرست تماشا در یادداشت‌ها (اختیاری) | **OMDb** و سپس ورود دستی عنوان |

### سرویس‌هایی که بررسی و **رد** شدند (با دلیل)

| API | دلیل رد |
| --- | --- |
| Weatherstack / OpenWeatherMap | نسخه رایگان محدود و نیازمند کلید؛ Open-Meteo بدون کلید و دقیق‌تر است |
| exchangerate.host | در ۲۰۲۴ به APILayer منتقل شد و کلید اجباری شده است |
| Hirak Exchange Rates | نیازمند `apiKey` و بدون مزیت نسبت به er-api |
| UUID Generator (uuidtools) | CORS: No با HTTPS تأییدنشده → تولید UUID با `crypto.randomUUID()` در `lib/utils.ts → uid()` |
| Google Books (نسخه OAuth) | فقط برای کتابخانه شخصی؛ جست‌وجوی عمومی با کلید رایگان انجام می‌شود |
| هر API با `Auth: OAuth` پولی | مغایر با قانون «هزینه صفر» پروژه |

---

## ۳. معماری کلاینت API (`lib/external-apis.ts`)

```ts
// ساختار یکپارچه همه فراخوانی‌ها
export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T>
export const queue = new RequestQueue();          // صف درخواست → احترام به محدودیت نرخ
export async function cached<T>(key, ttlMs, loader) // کش TTL روی localStorage + حافظه
```

- **صف درخواست (`RequestQueue`)**: حداکثر ۵ درخواست همزمان، فاصله حداقلی بین درخواست‌ها → هرگز به سقف نرخ نمی‌خوریم.
- **کش چندلایه**: حافظه (سریع) + `localStorage` با کلید `renox-api-cache-v1` و TTL اختصاصی هر سرویس
  (آب‌وهوا ۱۰ دقیقه، نرخ ارز ۱۵ دقیقه، رمزارز ۳ دقیقه، نقل‌قول ۵ دقیقه).
- **همه توابع خطا نمی‌دهند**: هر تابع مقدار جایگزین «قابل نمایش» برمی‌گرداند تا UI هرگز نشکند.
- **TanStack Query** روی همین لایه نشسته است: `staleTime` برابر TTL سرویس، `retry: 1`، و
  `placeholderData` برای نمایش فوری داده قدیمی هنگام نوسان شبکه.

## ۴. اعلان‌ها (رایگان)

| کانال | سرویس | هزینه | پیاده‌سازی |
| --- | --- | --- | --- |
| اعلان مرورگر | Notifications API + `public/sw.js` | ۰ | `Notification.requestPermission()` + Service Worker |
| Web Push | Web Push با VAPID | ۰ | `server/api/notify/push/route.ts` (کلید رایگان با `npx web-push generate-vapid-keys`) |
| تلگرام | Bot API | ۰ | `server/api/notify/telegram/route.ts` — توکن رایگان از `@BotFather` |
| ایمیل | SMTP شخصی / Resend رایگان | ۰ (سهمیه رایگان) | همان مسیر سروری (نمونه در `server/README.md`) |

## ۵. متغیرهای محیطی مربوط به APIها

همه اختیاری‌اند؛ برنامه **بدون هیچ کلیدی** هم کامل کار می‌کند (Local-First).
جدول کامل در [`.env.example`](.env.example) آمده است.

```env
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_GROQ_API_KEY=
NEXT_PUBLIC_HF_API_KEY=
NEXT_PUBLIC_ALPHA_VANTAGE_KEY=
NEXT_PUBLIC_TMDB_API_KEY=
NEXT_PUBLIC_CURRENTS_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

> کلیدها فقط اگر در «تنظیمات → کلیدهای API» یا فایل `.env` وارد شوند استفاده می‌شوند
> و هیچ‌گاه به سرور شخص ثالثی جز خود همان سرویس ارسال نمی‌گردند.
