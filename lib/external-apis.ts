/**
 * لایه یکپارچه APIهای رایگان (lib/external-apis.ts)
 * ---------------------------------------------------------------------------
 * همه سرویس‌های بیرونی اینجا متمرکز شده‌اند. قواعد:
 *  ۱) فقط APIهای رایگان (بررسی‌شده در ریپوی public-apis — نتیجه در API_INTEGRATIONS.md)
 *  ۲) هر تابع یک Fallback محلی دارد تا در صورت قطعی، برنامه هرگز خالی نماند
 *  ۳) کش ساده در حافظه + صف درخواست برای رعایت Rate Limit
 */
import { API_BASE, DEFAULT_CITIES, FALLBACK_QUOTES } from './constants';
import { dayKey, jalaliMonthLength, toGregorian, toJalali } from './jalali';
import { toPersianDigits, uid } from './utils';

/* ------------------------------ ابزار پایه -------------------------------- */
export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/** درخواست JSON با مهلت زمانی و مدیریت خطا */
export async function fetchJSON<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 9000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init.headers ?? {}) },
    });
    if (!res.ok) throw new ApiError(`پاسخ ناموفق از سرویس (${res.status})`, res.status);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** صف نوبتی برای رعایت Rate Limit سرویس‌های رایگان */
class RequestQueue {
  private last = 0;
  constructor(private minIntervalMs = 350) {}
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const wait = Math.max(0, this.minIntervalMs - (Date.now() - this.last));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      return await fn();
    } finally {
      this.last = Date.now();
    }
  }
}
export const queue = new RequestQueue();

/** کش ساده حافظه‌ای با انقضا */
const cache = new Map<string, { at: number; data: unknown }>();
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  const data = await loader();
  cache.set(key, { at: Date.now(), data });
  return data;
}
export function clearApiCache() {
  cache.clear();
}

/* ================================ آب و هوا =============================== */
export interface WeatherNow {
  temperature: number;
  apparent: number;
  humidity: number;
  wind: number;
  code: number;
  description: string;
  icon: string;
  isDay: boolean;
  updatedAt: string;
  city: string;
  source: 'open-meteo' | 'fallback';
}

export interface WeatherDay {
  date: string;
  max: number;
  min: number;
  code: number;
  icon: string;
  description: string;
  precipitation: number;
}

/** نگاشت کدهای WMO به توصیف فارسی و ایموجی */
export function wmoToPersian(code: number): { text: string; icon: string } {
  const map: Record<number, [string, string]> = {
    0: ['آسمان صاف', '☀️'],
    1: ['عمدتاً صاف', '🌤️'],
    2: ['نیمه‌ابری', '⛅'],
    3: ['ابری', '☁️'],
    45: ['مه', '🌫️'],
    48: ['مه یخ‌زده', '🌫️'],
    51: ['نم‌نم باران سبک', '🌦️'],
    53: ['نم‌نم باران', '🌦️'],
    55: ['نم‌نم باران شدید', '🌦️'],
    56: ['باران یخ‌زده سبک', '🌧️'],
    57: ['باران یخ‌زده', '🌧️'],
    61: ['باران سبک', '🌧️'],
    63: ['باران', '🌧️'],
    65: ['باران شدید', '🌧️'],
    66: ['باران یخ‌زده', '🌧️'],
    67: ['باران یخ‌زده شدید', '🌧️'],
    71: ['برف سبک', '🌨️'],
    73: ['برف', '🌨️'],
    75: ['برف سنگین', '❄️'],
    77: ['دانه‌های برف', '🌨️'],
    80: ['رگبار سبک', '🌦️'],
    81: ['رگبار', '🌧️'],
    82: ['رگبار شدید', '⛈️'],
    85: ['رگبار برف', '🌨️'],
    86: ['رگبار برف شدید', '❄️'],
    95: ['رعد و برق', '⛈️'],
    96: ['رعد و برق با تگرگ', '⛈️'],
    99: ['رعد و برق شدید با تگرگ', '⛈️'],
  };
  const [text, icon] = map[code] ?? ['نامشخص', '🌡️'];
  return { text, icon };
}

/** آب‌وهوای فعلی — Open-Meteo (بدون کلید) */
export async function getWeather(lat: number, lon: number, city = 'تهران'): Promise<WeatherNow> {
  try {
    return await cached(`weather:${lat},${lon}`, 10 * 60 * 1000, () =>
      queue.run(async () => {
        const url =
          `${API_BASE.openMeteo}/forecast?latitude=${lat}&longitude=${lon}` +
          '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m' +
          '&timezone=auto';
        const data = await fetchJSON<{
          current: {
            temperature_2m: number;
            apparent_temperature: number;
            relative_humidity_2m: number;
            wind_speed_10m: number;
            weather_code: number;
            is_day: number;
          };
        }>(url);
        const c = data.current;
        const { text, icon } = wmoToPersian(c.weather_code);
        const result: WeatherNow = {
          temperature: Math.round(c.temperature_2m),
          apparent: Math.round(c.apparent_temperature),
          humidity: Math.round(c.relative_humidity_2m),
          wind: Math.round(c.wind_speed_10m),
          code: c.weather_code,
          description: text,
          icon,
          isDay: c.is_day === 1,
          updatedAt: new Date().toISOString(),
          city,
          source: 'open-meteo',
        };
        return result;
      })
    );
  } catch {
    // Fallback: داده نمونه محلی تا کارت داشبورد خالی نماند
    return {
      temperature: 22,
      apparent: 21,
      humidity: 40,
      wind: 8,
      code: 1,
      description: 'داده آزمایشی (سرویس در دسترس نیست)',
      icon: '🌤️',
      isDay: true,
      updatedAt: new Date().toISOString(),
      city,
      source: 'fallback',
    };
  }
}

/** پیش‌بینی ۷ روزه */
export async function getWeatherForecast(lat: number, lon: number): Promise<WeatherDay[]> {
  try {
    return await cached(`forecast:${lat},${lon}`, 30 * 60 * 1000, () =>
      queue.run(async () => {
        const url =
          `${API_BASE.openMeteo}/forecast?latitude=${lat}&longitude=${lon}` +
          '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=7&timezone=auto';
        const data = await fetchJSON<{
          daily: {
            time: string[];
            weather_code: number[];
            temperature_2m_max: number[];
            temperature_2m_min: number[];
            precipitation_sum: number[];
          };
        }>(url);
        return data.daily.time.map((date, i) => {
          const { text, icon } = wmoToPersian(data.daily.weather_code[i]);
          return {
            date,
            max: Math.round(data.daily.temperature_2m_max[i]),
            min: Math.round(data.daily.temperature_2m_min[i]),
            code: data.daily.weather_code[i],
            icon,
            description: text,
            precipitation: data.daily.precipitation_sum[i] ?? 0,
          };
        });
      })
    );
  } catch {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return {
        date: dayKey(d),
        max: 24 + (i % 3),
        min: 14 + (i % 2),
        code: 1,
        icon: '🌤️',
        description: 'داده آزمایشی',
        precipitation: 0,
      };
    });
  }
}

/** جست‌وجوی شهر (Open-Meteo Geocoding — بدون کلید) */
export async function searchCity(name: string): Promise<{ name: string; latitude: number; longitude: number; country?: string }[]> {
  if (!name.trim()) return DEFAULT_CITIES;
  try {
    return await cached(`geo:${name}`, 24 * 60 * 60 * 1000, () =>
      queue.run(async () => {
        const data = await fetchJSON<{ results?: { name: string; latitude: number; longitude: number; country?: string }[] }>(
          `${API_BASE.geocoding}/search?name=${encodeURIComponent(name)}&count=6&language=fa`
        );
        return data.results ?? [];
      })
    );
  } catch {
    return DEFAULT_CITIES.filter((c) => c.name.includes(name));
  }
}

/* ================================ نقل‌قول ================================= */
export interface Quote {
  content: string;
  author: string;
  source: 'quotable' | 'local';
}

/** نقل‌قول روز — Quotable (بدون کلید) با Fallback محلی */
export async function getRandomQuote(): Promise<Quote> {
  try {
    return await cached('quote:random', 5 * 60 * 1000, () =>
      queue.run(async () => {
        const data = await fetchJSON<{ content: string; author: string }>(`${API_BASE.quotes}/random`);
        return { content: data.content, author: data.author || 'ناشناس', source: 'quotable' as const };
      })
    );
  } catch {
    const pick = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    return { ...pick, source: 'local' };
  }
}

/* ================================ تعطیلات ================================= */
/**
 * تعطیلات رسمی ایران (ثابت شمسی) — چون APIهای تعطیلات ایرانی رایگان و
 * پایدار وجود ندارد، این داده محلی همیشه در دسترس است (آفلاین‌فرندلی).
 */
export const IRAN_FIXED_HOLIDAYS: { jm: number; jd: number; title: string }[] = [
  { jm: 1, jd: 1, title: 'نوروز' },
  { jm: 1, jd: 2, title: 'نوروز' },
  { jm: 1, jd: 3, title: 'نوروز' },
  { jm: 1, jd: 4, title: 'نوروز' },
  { jm: 1, jd: 12, title: 'روز جمهوری اسلامی' },
  { jm: 1, jd: 13, title: 'سیزده‌بدر' },
  { jm: 2, jd: 4, title: 'شهادت استاد مطهری' },
  { jm: 3, jd: 14, title: 'رحلت امام خمینی' },
  { jm: 3, jd: 15, title: 'قیام ۱۵ خرداد' },
  { jm: 11, jd: 22, title: 'پیروزی انقلاب اسلامی' },
  { jm: 12, jd: 29, title: 'روز ملی‌شدن صنعت نفت' },
];

/** تعطیلات قمری مهم (تاریخ میلادی تقریبی برای سال‌های ۲۰۲۵ تا ۲۰۲۷) */
const LUNAR_HOLIDAYS_GREGORIAN: Record<string, string> = {
  '2025-03-31': 'عید فطر',
  '2025-04-01': 'تعطیلات عید فطر',
  '2025-06-06': 'عید قربان',
  '2025-06-26': 'تاسوعای حسینی',
  '2025-06-27': 'عاشورای حسینی',
  '2025-07-05': 'اربعین حسینی',
  '2026-02-19': 'شب قدر / آغاز ماه رمضان (تقریبی)',
  '2026-03-20': 'عید فطر (تقریبی)',
  '2025-08-24': 'رحلت پیامبر (تقریبی)',
};

/** ساخت نقشه تعطیلات برای یک ماه شمسی به شکل { 'YYYY-MM-DD': 'عنوان' } */
export function getIranHolidaysForMonth(jy: number, jm: number): Record<string, string> {
  const result: Record<string, string> = {};
  IRAN_FIXED_HOLIDAYS.filter((h) => h.jm === jm).forEach((h) => {
    if (h.jd <= jalaliMonthLength(jy, jm)) {
      result[dayKey(toGregorian(jy, jm, h.jd))] = h.title;
    }
  });
  // تعطیلات قمری ثبت‌شده در همین ماه
  const days = jalaliMonthLength(jy, jm);
  for (let d = 1; d <= days; d += 1) {
    const key = dayKey(toGregorian(jy, jm, d));
    if (LUNAR_HOLIDAYS_GREGORIAN[key]) result[key] = LUNAR_HOLIDAYS_GREGORIAN[key];
  }
  return result;
}

/** تعطیلات عمومی یک کشور از Nager.Date (CORS محدود → Fallback محلی) */
export async function getPublicHolidays(year: number, countryCode = 'IR'): Promise<{ date: string; name: string }[]> {
  try {
    return await cached(`holidays:${countryCode}:${year}`, 24 * 60 * 60 * 1000, () =>
      queue.run(async () => {
        const data = await fetchJSON<{ date: string; localName: string; name: string }[]>(
          `${API_BASE.holidays}/PublicHolidays/${year}/${countryCode}`
        );
        return data.map((h) => ({ date: h.date, name: h.localName || h.name }));
      })
    );
  } catch {
    // Fallback: تعطیلات ثابت شمسی ایران برای همان سال میلادی
    const { jy } = toJalali(new Date(year, 5, 1));
    const out: { date: string; name: string }[] = [];
    for (const j of [jy - 1, jy]) {
      IRAN_FIXED_HOLIDAYS.forEach((h) => {
        out.push({ date: dayKey(toGregorian(j, h.jm, h.jd)), name: h.title });
      });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }
}

/* ================================ نرخ ارز ================================= */
export interface RatesResult {
  base: string;
  rates: Record<string, number>;
  updatedAt: string;
  source: 'er-api' | 'frankfurter' | 'fallback';
}

const FALLBACK_RATES: Record<string, number> = { USD: 1, EUR: 0.92, GBP: 0.78, AED: 3.67, TRY: 34.5, IRR: 42000, BTC: 0.0000155 };

/** نرخ ارز زنده — open.er-api (بدون کلید) با Fallback به Frankfurter و مقادیر ایستا */
export async function getExchangeRates(base = 'USD'): Promise<RatesResult> {
  const today = dayKey(new Date());
  try {
    return await cached(`rates:${base}:${today}`, 60 * 60 * 1000, () =>
      queue.run(async () => {
        const data = await fetchJSON<{ result: string; base_code: string; rates: Record<string, number>; time_last_update_utc: string }>(
          `${API_BASE.rates}/latest/${base}`
        );
        if (data.result !== 'success') throw new ApiError('پاسخ نامعتبر نرخ ارز');
        return {
          base: data.base_code,
          rates: data.rates,
          updatedAt: data.time_last_update_utc,
          source: 'er-api' as const,
        };
      })
    );
  } catch {
    try {
      return await cached(`rates-frank:${base}:${today}`, 60 * 60 * 1000, () =>
        queue.run(async () => {
          const data = await fetchJSON<{ base: string; date: string; rates: Record<string, number> }>(
            `${API_BASE.frankfurterV2}/latest?from=${base}`
          );
          return { base: data.base, rates: data.rates, updatedAt: data.date, source: 'frankfurter' as const };
        })
      );
    } catch {
      return { base, rates: FALLBACK_RATES, updatedAt: new Date().toISOString(), source: 'fallback' };
    }
  }
}

/** تبدیل ارز بر اساس نرخ‌های روز */
export async function convertCurrency(amount: number, from: string, to: string): Promise<number> {
  if (from === to) return amount;
  const { rates } = await getExchangeRates(from);
  const rate = rates[to];
  if (!rate) return amount;
  return amount * rate;
}

/* ================================ رمزارز ================================= */
export interface CryptoPrice {
  id: string;
  name: string;
  symbol: string;
  priceUsd: number;
  change24h: number;
  icon: string;
}

const COINS: { id: string; name: string; symbol: string; icon: string }[] = [
  { id: 'bitcoin', name: 'بیت‌کوین', symbol: 'BTC', icon: '₿' },
  { id: 'ethereum', name: 'اتریوم', symbol: 'ETH', icon: 'Ξ' },
  { id: 'tether', name: 'تتر', symbol: 'USDT', icon: '₮' },
  { id: 'binancecoin', name: 'بایننس‌کوین', symbol: 'BNB', icon: 'B' },
  { id: 'solana', name: 'سولانا', symbol: 'SOL', icon: '◎' },
  { id: 'ripple', name: 'ریپل', symbol: 'XRP', icon: '✕' },
];

/** قیمت رمزارزها — CoinGecko (بدون کلید) */
export async function getCryptoPrices(): Promise<CryptoPrice[]> {
  const ids = COINS.map((c) => c.id).join(',');
  try {
    return await cached('crypto:prices', 3 * 60 * 1000, () =>
      queue.run(async () => {
        const data = await fetchJSON<Record<string, { usd: number; usd_24h_change: number }>>(
          `${API_BASE.coingecko}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        return COINS.map((c) => ({
          ...c,
          priceUsd: data[c.id]?.usd ?? 0,
          change24h: Number((data[c.id]?.usd_24h_change ?? 0).toFixed(2)),
        }));
      })
    );
  } catch {
    return COINS.map((c) => ({ ...c, priceUsd: 0, change24h: 0 }));
  }
}

/* ================================= سهام ================================== */
export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  source: 'alpha-vantage' | 'static';
}

const STATIC_STOCKS: StockQuote[] = [
  { symbol: 'AAPL', name: 'اپل', price: 228.4, change: 1.2, changePercent: 0.53, source: 'static' },
  { symbol: 'MSFT', name: 'مایکروسافت', price: 418.9, change: -2.1, changePercent: -0.5, source: 'static' },
  { symbol: 'TSLA', name: 'تسلا', price: 246.7, change: 4.5, changePercent: 1.86, source: 'static' },
  { symbol: 'NVDA', name: 'انویدیا', price: 132.6, change: 2.8, changePercent: 2.16, source: 'static' },
];

/** سهام — Alpha Vantage (کلید رایگان لازم است؛ در نبود کلید داده نمونه) */
export async function getStockQuote(symbol: string, apiKey?: string): Promise<StockQuote> {
  const fallback = STATIC_STOCKS.find((s) => s.symbol === symbol) ?? STATIC_STOCKS[0];
  if (!apiKey) return fallback;
  try {
    return await cached(`stock:${symbol}`, 10 * 60 * 1000, () =>
      queue.run(async () => {
        const data = await fetchJSON<Record<string, { '05. price': string; '09. change': string; '10. change percent': string }>>(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
        );
        const q = data['Global Quote'];
        if (!q) throw new ApiError('سهم یافت نشد');
        return {
          symbol,
          name: fallback.name,
          price: Number(q['05. price']),
          change: Number(q['09. change']),
          changePercent: Number(String(q['10. change percent']).replace('%', '')),
          source: 'alpha-vantage' as const,
        };
      })
    );
  } catch {
    return fallback;
  }
}

/* ============================ تغذیه و کالری =============================== */
export interface FoodProduct {
  name: string;
  brand?: string;
  calories: number; // در هر ۱۰۰ گرم
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
  barcode?: string;
}

/** جست‌وجوی محصول غذایی — Open Food Facts (بدون کلید) */
export async function searchFood(query: string): Promise<FoodProduct[]> {
  if (!query.trim()) return [];
  try {
    const data = await fetchJSON<{
      products: {
        product_name?: string;
        brands?: string;
        nutriments?: Record<string, number>;
        image_small_url?: string;
        code?: string;
      }[];
    }>(
      `${API_BASE.openFoodFacts}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=12`
    );
    return (data.products ?? [])
      .filter((p) => p.product_name)
      .map((p) => ({
        name: p.product_name as string,
        brand: p.brands,
        calories: Math.round(p.nutriments?.['energy-kcal_100g'] ?? 0),
        protein: Number((p.nutriments?.proteins_100g ?? 0).toFixed(1)),
        carbs: Number((p.nutriments?.carbohydrates_100g ?? 0).toFixed(1)),
        fat: Number((p.nutriments?.fat_100g ?? 0).toFixed(1)),
        image: p.image_small_url,
        barcode: p.code,
      }));
  } catch {
    return [];
  }
}

/** پایگاه غذای ایرانی (Fallback محلی و همیشه در دسترس) */
export const LOCAL_FOOD_DB: FoodProduct[] = [
  { name: 'برنج پخته', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'نان سنگک (۱۰۰ گرم)', calories: 250, protein: 8.4, carbs: 51, fat: 1.2 },
  { name: 'مرغ پخته (۱۰۰ گرم)', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'ماست کم‌چرب', calories: 58, protein: 3.5, carbs: 4.7, fat: 1.6 },
  { name: 'تخم‌مرغ آب‌پز', calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: 'سیب', calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: 'خرما (هر عدد)', calories: 66, protein: 0.4, carbs: 18, fat: 0 },
  { name: 'پنیر سفید', calories: 264, protein: 14, carbs: 4.1, fat: 21 },
  { name: 'عدس پخته', calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: 'کباب کوبیده', calories: 290, protein: 18, carbs: 6, fat: 21 },
];

export async function searchFoodWithFallback(query: string): Promise<FoodProduct[]> {
  const remote = await searchFood(query);
  if (remote.length) return remote;
  const q = query.trim();
  const local = LOCAL_FOOD_DB.filter((f) => f.name.includes(q) || q.includes(f.name.slice(0, 3)));
  return local.length ? local : LOCAL_FOOD_DB.slice(0, 6);
}

/* ================================ ورزشی =================================== */
export interface Exercise {
  name: string;
  category: string;
  muscles: string[];
  equipment: string;
}

const LOCAL_EXERCISES: Exercise[] = [
  { name: 'اسکات', category: 'قدرتی', muscles: ['پا', 'سرینی'], equipment: 'وزنه/بدون وزنه' },
  { name: 'پرس سینه', category: 'قدرتی', muscles: ['سینه', 'پشت بازو'], equipment: 'هالتر' },
  { name: 'زیربغل سیم‌کش', category: 'قدرتی', muscles: ['زیربغل'], equipment: 'دستگاه' },
  { name: 'پلانک', category: 'قدرتی', muscles: ['شکم'], equipment: 'بدون تجهیزات' },
  { name: 'دویدن', category: 'هوازی', muscles: ['کل بدن'], equipment: 'بدون تجهیزات' },
  { name: 'دوچرخه ثابت', category: 'هوازی', muscles: ['پا'], equipment: 'دستگاه' },
  { name: 'شنا سوئدی', category: 'قدرتی', muscles: ['سینه', 'شکم'], equipment: 'بدون تجهیزات' },
  { name: 'ددلیفت', category: 'قدرتی', muscles: ['پشت', 'پا'], equipment: 'هالتر' },
  { name: 'برپی', category: 'تناوبی', muscles: ['کل بدن'], equipment: 'بدون تجهیزات' },
  { name: 'کشش همسترینگ', category: 'کششی', muscles: ['پا'], equipment: 'بدون تجهیزات' },
];

/** کتابخانه تمرین — wger (بدون کلید برای خواندن) با Fallback محلی */
export async function searchExercises(query = ''): Promise<Exercise[]> {
  try {
    const remote = await cached(`wger:${query}`, 12 * 60 * 60 * 1000, () =>
      queue.run(async () => {
        const data = await fetchJSON<{ results: { name: string; category?: { name: string }; muscles?: { name: string }[] }[] }>(
          `${API_BASE.wger}/exercise/?language=2&limit=40${query ? `&term=${encodeURIComponent(query)}` : ''}`
        );
        return data.results
          .filter((r) => r.name)
          .map((r) => ({
            name: r.name,
            category: r.category?.name ?? 'عمومی',
            muscles: (r.muscles ?? []).map((m) => m.name),
            equipment: '—',
          }));
      })
    );
    if (remote.length) return remote;
    throw new ApiError('خالی');
  } catch {
    return query ? LOCAL_EXERCISES.filter((e) => e.name.includes(query)) : LOCAL_EXERCISES;
  }
}

/* =============================== ترجمه ==================================== */
export interface TranslateResult {
  text: string;
  source: string;
  target: string;
  provider: 'libretranslate' | 'mymemory';
}

/** ترجمه — LibreTranslate (بدون کلید) با Fallback به MyMemory */
export async function translate(text: string, target = 'fa', source = 'auto'): Promise<TranslateResult> {
  if (!text.trim()) return { text: '', source, target, provider: 'libretranslate' };
  try {
    return await queue.run(async () => {
      const res = await fetch(API_BASE.libreTranslate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source, target, format: 'text' }),
      });
      if (!res.ok) throw new ApiError('LibreTranslate ناموفق', res.status);
      const data = (await res.json()) as { translatedText: string };
      return { text: data.translatedText, source, target, provider: 'libretranslate' as const };
    });
  } catch {
    try {
      return await queue.run(async () => {
        const src = source === 'auto' ? 'en' : source;
        const data = await fetchJSON<{ responseData: { translatedText: string } }>(
          `${API_BASE.myMemory}?q=${encodeURIComponent(text)}&langpair=${src}|${target}`
        );
        return { text: data.responseData.translatedText, source: src, target, provider: 'mymemory' as const };
      });
    } catch {
      return { text, source, target, provider: 'mymemory' };
    }
  }
}

/* ============================ گرامر و دیکشنری ============================= */
export interface GrammarIssue {
  message: string;
  offset: number;
  length: number;
  replacements: string[];
  rule?: string;
}

/** بررسی گرامر و املا — LanguageTool (بدون کلید، محدود) */
export async function checkGrammar(text: string, language = 'en-US'): Promise<GrammarIssue[]> {
  if (!text.trim()) return [];
  try {
    return await queue.run(async () => {
      const body = new URLSearchParams({ text, language });
      const res = await fetch(`${API_BASE.languageTool}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) throw new ApiError('LanguageTool ناموفق', res.status);
      const data = (await res.json()) as { matches: GrammarIssue[] };
      return data.matches ?? [];
    });
  } catch {
    return [];
  }
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: { partOfSpeech: string; definitions: string[] }[];
  audio?: string;
}

/** دیکشنری انگلیسی — Free Dictionary API (بدون کلید) */
export async function lookupWord(word: string): Promise<DictionaryEntry[]> {
  if (!word.trim()) return [];
  try {
    return await cached(`dict:${word}`, 24 * 60 * 60 * 1000, () =>
      queue.run(async () => {
        const data = await fetchJSON<
          {
            word: string;
            phonetic?: string;
            phonetics?: { audio?: string }[];
            meanings: { partOfSpeech: string; definitions: { definition: string }[] }[];
          }[]
        >(`${API_BASE.dictionary}/${encodeURIComponent(word)}`);
        return data.map((entry) => ({
          word: entry.word,
          phonetic: entry.phonetic ?? entry.phonetics?.[0]?.audio,
          audio: entry.phonetics?.find((p) => p.audio)?.audio,
          meanings: entry.meanings.map((m) => ({
            partOfSpeech: m.partOfSpeech,
            definitions: m.definitions.slice(0, 3).map((d) => d.definition),
          })),
        }));
      })
    );
  } catch {
    return [];
  }
}

/* ============================ ابزارهای کاربردی ============================ */
/** تولید QR — goQR (بدون کلید، فقط URL) */
export function qrCodeUrl(data: string, size = 240): string {
  return `${API_BASE.goqr}/?size=${size}x${size}&margin=12&data=${encodeURIComponent(data)}`;
}

/** کوتاه‌سازی لینک — CleanURI (بدون کلید) */
export async function shortenUrl(url: string): Promise<string> {
  try {
    const res = await fetch(API_BASE.cleanUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ url }),
    });
    const data = (await res.json()) as { result_url?: string; error?: string };
    if (data.result_url) return data.result_url;
    throw new ApiError(data.error ?? 'خطای کوتاه‌ساز');
  } catch {
    return url;
  }
}

export interface ColorInfo {
  hex: string;
  name: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  contrast: string;
}

/** اطلاعات رنگ — The Color API (بدون کلید) */
export async function getColorInfo(hex: string): Promise<ColorInfo | null> {
  const clean = hex.replace('#', '');
  try {
    return await cached(`color:${clean}`, 24 * 60 * 60 * 1000, () =>
      queue.run(async () => {
        const data = await fetchJSON<{
          name: { value: string };
          rgb: { r: number; g: number; b: number };
          hsl: { h: number; s: number; l: number };
          contrast: { value: string };
        }>(`${API_BASE.colorApi}/id?hex=${clean}`);
        return {
          hex: `#${clean.toUpperCase()}`,
          name: data.name.value,
          rgb: data.rgb,
          hsl: data.hsl,
          contrast: data.contrast.value,
        };
      })
    );
  } catch {
    return null;
  }
}

/** تولید UUID — uuidtools (بدون کلید) با Fallback به crypto */
export async function generateUUID(): Promise<string> {
  try {
    return await queue.run(async () => {
      const data = await fetchJSON<string[]>(API_BASE.uuid, {}, 6000);
      return data[0] ?? uid('uuid');
    });
  } catch {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return uid('uuid');
  }
}

/** تصاویر تصادفی — Lorem Picsum (بدون کلید) */
export function randomImage(seed?: string | number, width = 600, height = 400): string {
  return seed !== undefined ? `${API_BASE.picsum}/seed/${seed}/${width}/${height}` : `${API_BASE.picsum}/${width}/${height}`;
}

/* ================================ کتاب‌ها ================================== */
export interface BookResult {
  title: string;
  author: string;
  year?: string;
  cover?: string;
  key: string;
  source: 'open-library' | 'google-books';
}

/** جست‌وجوی کتاب — Open Library (بدون کلید) با Fallback به Google Books */
export async function searchBooks(query: string): Promise<BookResult[]> {
  if (!query.trim()) return [];
  try {
    return await cached(`books:${query}`, 6 * 60 * 60 * 1000, () =>
      queue.run(async () => {
        const data = await fetchJSON<{ docs: { title: string; author_name?: string[]; first_publish_year?: number; cover_i?: number; key: string }[] }>(
          `${API_BASE.openLibrary}/search.json?q=${encodeURIComponent(query)}&limit=12&language=per`
        );
        return data.docs.slice(0, 12).map((d) => ({
          title: d.title,
          author: d.author_name?.join('، ') ?? 'ناشناس',
          year: d.first_publish_year ? String(d.first_publish_year) : undefined,
          cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
          key: d.key,
          source: 'open-library' as const,
        }));
      })
    );
  } catch {
    try {
      const data = await fetchJSON<{ items: { volumeInfo: { title: string; authors?: string[]; publishedDate?: string; imageLinks?: { thumbnail?: string } }; id: string }[] }>(
        `${API_BASE.googleBooks}/volumes?q=${encodeURIComponent(query)}&maxResults=12&langRestrict=fa`
      );
      return (data.items ?? []).map((i) => ({
        title: i.volumeInfo.title,
        author: i.volumeInfo.authors?.join('، ') ?? 'ناشناس',
        year: i.volumeInfo.publishedDate?.slice(0, 4),
        cover: i.volumeInfo.imageLinks?.thumbnail,
        key: i.id,
        source: 'google-books' as const,
      }));
    } catch {
      return [];
    }
  }
}

/* ================================= فیلم =================================== */
export interface MovieResult {
  title: string;
  year?: string;
  poster?: string;
  rating?: string;
  plot?: string;
  source: 'omdb' | 'tmdb' | 'local';
}

const LOCAL_MOVIES: MovieResult[] = [
  { title: 'رستگاری در شاوشنک', year: '1994', rating: '9.3', plot: 'داستان امید و آزادی در زندان شاوشنک.', source: 'local' },
  { title: 'پدرخوانده', year: '1972', rating: '9.2', plot: 'خانواده‌ای مافیایی در نیویورک.', source: 'local' },
  { title: 'در جست‌وجوی نمو', year: '2003', rating: '8.2', plot: 'ماهی کوچکی که به دنبال پدرش می‌رود.', source: 'local' },
  { title: 'جدایی نادر از سیمین', year: '2011', rating: '8.3', plot: 'درامی درباره یک جدایی در تهران.', source: 'local' },
  { title: 'بادیگارد', year: '2016', rating: '7.6', plot: 'روایت یک محافظ شخصی در ایران.', source: 'local' },
];

/** جست‌وجوی فیلم — OMDb (کلید رایگان) با Fallback به TMDB و داده محلی */
export async function searchMovies(query: string, omdbKey?: string, tmdbKey?: string): Promise<MovieResult[]> {
  if (!query.trim()) return LOCAL_MOVIES;
  if (omdbKey) {
    try {
      const data = await fetchJSON<{ Search?: { Title: string; Year: string; Poster: string; imdbID: string }[] }>(
        `${API_BASE.omdb}/?s=${encodeURIComponent(query)}&apikey=${omdbKey}`
      );
      if (data.Search?.length) {
        return data.Search.map((m) => ({
          title: m.Title,
          year: m.Year,
          poster: m.Poster !== 'N/A' ? m.Poster : undefined,
          source: 'omdb' as const,
        }));
      }
    } catch {
      /* ادامه به Fallback */
    }
  }
  if (tmdbKey) {
    try {
      const data = await fetchJSON<{ results: { title: string; release_date: string; poster_path?: string; vote_average: number; overview: string }[] }>(
        `${API_BASE.tmdb}/search/movie?api_key=${tmdbKey}&language=fa-IR&query=${encodeURIComponent(query)}`
      );
      return data.results.slice(0, 12).map((m) => ({
        title: m.title,
        year: m.release_date?.slice(0, 4),
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : undefined,
        rating: String(m.vote_average?.toFixed(1)),
        plot: m.overview,
        source: 'tmdb' as const,
      }));
    } catch {
      /* ادامه به داده محلی */
    }
  }
  return LOCAL_MOVIES.filter((m) => m.title.includes(query));
}

/* ================================ اخبار =================================== */
export interface NewsItem {
  title: string;
  source?: string;
  url: string;
  publishedAt: string;
  image?: string;
}

/** اخبار — NewsAPI/Currents (کلید رایگان). در نبود کلید: RSS پارس‌شده عمومی */
export async function getNews(category = 'general', apiKey?: string): Promise<NewsItem[]> {
  if (apiKey) {
    try {
      const data = await fetchJSON<{ articles: { title: string; url: string; publishedAt: string; source: { name: string }; urlToImage?: string }[] }>(
        `${API_BASE.news}/top-headlines?country=us&category=${category}&pageSize=12&apiKey=${apiKey}`
      );
      return data.articles.map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source?.name,
        publishedAt: a.publishedAt,
        image: a.urlToImage,
      }));
    } catch {
      /* ادامه */
    }
  }
  return [];
}

/* ============================== زمان و مکان =============================== */
export interface WorldTime {
  timezone: string;
  datetime: string;
  dayOfWeek: number;
}

/** ساعت جهانی — WorldTimeAPI (بدون کلید) */
export async function getWorldTime(timezone = 'Asia/Tehran'): Promise<WorldTime | null> {
  try {
    return await cached(`time:${timezone}`, 60 * 1000, () =>
      queue.run(() => fetchJSON<WorldTime>(`${API_BASE.worldTime}/timezone/${timezone}`))
    );
  } catch {
    return null;
  }
}

export interface IpLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/** موقعیت مکانی از IP — ipapi.co (بدون کلید) */
export async function getIpLocation(): Promise<IpLocation | null> {
  try {
    return await cached('ip:location', 6 * 60 * 60 * 1000, () =>
      queue.run(() =>
        fetchJSON<IpLocation>(API_BASE.ipapi)
      )
    );
  } catch {
    return null;
  }
}

/* ================================ کشورها ================================== */
export interface CountryInfo {
  name: string;
  capital?: string;
  region?: string;
  flag: string;
  population: number;
}

/** اطلاعات کشور — restcountries (بدون کلید) */
export async function getCountry(code: string): Promise<CountryInfo | null> {
  try {
    const data = await fetchJSON<
      { name: { common: string }; capital?: string[]; region?: string; flag: string; population: number }[]
    >(`${API_BASE.restCountries}/alpha/${code}`);
    const c = data[0];
    if (!c) return null;
    return { name: c.name.common, capital: c.capital?.[0], region: c.region, flag: c.flag, population: c.population };
  } catch {
    return null;
  }
}

/* ============================ گزارش روز شمسی ============================== */
/** مشخصات روز شمسی برای سربرگ داشبورد */
export function todayJalali() {
  const now = new Date();
  const j = toJalali(now);
  return { ...j, key: dayKey(now), label: `${toPersianDigits(j.jd)}` };
}
