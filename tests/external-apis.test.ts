/**
 * تست لایه APIهای رایگان — با شبکه جعلی (fetch mock)
 * هدف: مطمئن شویم fallbackها و تبدیل داده‌ها حتی بدون اینترنت درست کار می‌کنند.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ApiError,
  LOCAL_FOOD_DB,
  clearApiCache,
  convertCurrency,
  fetchJSON,
  getCryptoPrices,
  getExchangeRates,
  getRandomQuote,
  getWeather,
  searchFoodWithFallback,
  wmoToPersian,
} from '../lib/external-apis';

/** شبکه جعلی: پاسخ‌های از پیش تعیین‌شده بر اساس بخشی از URL */
function mockFetch(rules: { match: string; ok?: boolean; status?: number; json?: unknown; reject?: boolean }[]) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : ((input as Request).url ?? '');
    const rule = rules.find((r) => url.includes(r.match));
    if (!rule || rule.reject) throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify(rule.json ?? {}), {
      status: rule.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

test('fetchJSON خطای HTTP را به ApiError تبدیل می‌کند', async () => {
  const restore = mockFetch([{ match: 'example.com', ok: false, status: 500 }]);
  await assert.rejects(() => fetchJSON('https://example.com/api'), (e) => e instanceof ApiError);
  restore();
});

test('آب‌وهوا: داده Open-Meteo درست نگاشت می‌شود', async () => {
  clearApiCache();
  const restore = mockFetch([
    {
      match: 'open-meteo.com',
      json: {
        current: { temperature_2m: 21.4, apparent_temperature: 20.1, relative_humidity_2m: 33, wind_speed_10m: 8, weather_code: 1, is_day: 1 },
      },
    },
  ]);
  const w = await getWeather(35.6892, 51.389, 'تهران');
  assert.equal(w.city, 'تهران');
  assert.equal(w.temperature, 21);
  assert.equal(w.source, 'open-meteo');
  assert.ok(w.description.length > 0, 'توضیح فارسی هوا تولید شد');
  restore();
});

test('آب‌وهوا: در قطعی شبکه، داده جایگزین محلی برگردانده می‌شود', async () => {
  clearApiCache();
  const restore = mockFetch([{ match: 'open-meteo.com', reject: true }]);
  const w = await getWeather(35.7, 51.4, 'تهران');
  assert.equal(w.source, 'fallback', 'منبع جایگزین استفاده شد');
  assert.ok(w.temperature > -50 && w.temperature < 60, 'عدد معقول برای نمایش در کارت');
  restore();
});

test('نرخ ارز: منبع اصلی و منبع جانشین', async () => {
  clearApiCache();
  const restore = mockFetch([
    { match: 'er-api.com', json: { result: 'success', rates: { IRT: 92000, EUR: 0.92, IRR: 920000 }, time_last_update_utc: 'Sun, 05 Oct 2026 00:00:00 +0000' } },
  ]);
  const rates = await getExchangeRates('USD');
  assert.equal(rates.source, 'er-api');
  assert.ok(rates.rates.EUR > 0);
  restore();

  // فرانکفورت به‌عنوان جانشین وقتی منبع اول از کار می‌افتد
  clearApiCache();
  globalThis.localStorage.removeItem('renox-api-cache-v1');
  const restore2 = mockFetch([
    { match: 'er-api.com', reject: true },
    { match: 'frankfurter', json: { base: 'USD', rates: { EUR: 0.91, IRR: 1 } } },
  ]);
  const rates2 = await getExchangeRates('USD');
  assert.equal(rates2.source, 'frankfurter');
  assert.equal(rates2.rates.EUR, 0.91);
  restore2();
});

test('تبدیل ارز با نرخ جعلی', async () => {
  clearApiCache();
  const restore = mockFetch([{ match: 'er-api.com', json: { result: 'success', rates: { EUR: 0.5 }, time_last_update_utc: '' } }]);
  const value = await convertCurrency(100, 'USD', 'EUR');
  assert.equal(value, 50);
  restore();
});

test('رمزارز: نگاشت CoinGecko', async () => {
  clearApiCache();
  const restore = mockFetch([
    {
      match: 'coingecko',
      json: {
        bitcoin: { usd: 62840.12, usd_24h_change: 1.8 },
        ethereum: { usd: 2450.5, usd_24h_change: -0.6 },
        tether: { usd: 1, usd_24h_change: 0.01 },
      },
    },
  ]);
  const prices = await getCryptoPrices();
  assert.ok(prices.length >= 3, 'فهرست ارزهای ثابت برنامه برگردانده می‌شود');
  const btc = prices.find((p) => p.symbol === 'BTC');
  assert.ok(btc && btc.priceUsd > 0, 'قیمت بیت‌کوین نگاشت شد');
  assert.equal(btc?.change24h, 1.8);
  assert.equal(prices.find((p) => p.symbol === 'SOL')?.priceUsd, 0, 'ارز بدون داده صفر می‌گیرد (بدون کرش)');
  restore();

  // قطعی شبکه → فهرست با قیمت صفر (UI اسکلتون نشان می‌دهد)
  clearApiCache();
  const restore2 = mockFetch([{ match: 'coingecko', reject: true }]);
  const offline = await getCryptoPrices();
  assert.ok(offline.length >= 3);
  assert.ok(offline.every((p) => p.priceUsd === 0));
  restore2();
});

test('نقل‌قول: در نبود شبکه، نقل‌قول پشتیبان فارسی برمی‌گردد', async () => {
  clearApiCache();
  const restore = mockFetch([{ match: 'quotable', reject: true }]);
  const quote = await getRandomQuote();
  assert.ok(quote.content.length > 0, 'نقل‌قول جایگزین موجود است');
  assert.equal(quote.source, 'local');
  restore();

  // وقتی شبکه هست، منبع بیرونی استفاده می‌شود
  clearApiCache();
  const restore2 = mockFetch([{ match: 'quotable', json: { content: 'زندگی زیباست', author: 'ناشناس' } }]);
  const online = await getRandomQuote();
  assert.equal(online.source, 'quotable');
  assert.equal(online.content, 'زندگی زیباست');
  restore2();
});

test('غذا: جست‌وجوی Open Food Facts و جایگزین داخلی', async () => {
  clearApiCache();
  const restore = mockFetch([
    {
      match: 'openfoodfacts',
      json: {
        products: [
          { product_name: 'Greek Yogurt', brands: 'Demo', nutriments: { 'energy-kcal_100g': 97, proteins_100g: 9, carbohydrates_100g: 3.6, fat_100g: 5 } },
        ],
      },
    },
  ]);
  const online = await searchFoodWithFallback('yogurt');
  assert.ok(online.length >= 1);
  assert.equal(online[0].calories, 97);
  restore();

  // بدون شبکه → بانک غذایی داخلی
  clearApiCache();
  const restore2 = mockFetch([{ match: 'openfoodfacts', reject: true }]);
  const offline = await searchFoodWithFallback('برنج');
  assert.ok(offline.length >= 1, 'جایگزین داخلی پاسخ می‌دهد');
  assert.ok(offline.every((f) => f.calories > 0));
  assert.ok(LOCAL_FOOD_DB.length >= 10, 'بانک داخلی حداقل ۱۰ قلم دارد');
  restore2();
});

test('نگاشت کد آب‌وهوا برای همه کدهای پرکاربرد تعریف شده است', () => {
  for (const code of [0, 1, 2, 3, 45, 51, 61, 71, 80, 95]) {
    const mapped = wmoToPersian(code);
    assert.ok(mapped.text.length > 0, `کد ${code} باید توضیح فارسی داشته باشد`);
    assert.ok(mapped.icon.length > 0);
  }
});
