/**
 * ثابت‌های برنامه: ناوبری، دسته‌بندی‌ها، برچسب‌های فارسی و رنگ‌ها
 */
import type { Priority, GoalHorizon, TransactionType, HealthLog } from './types';

export const APP_NAME = 'Renox Planner';
export const APP_DESCRIPTION = 'برنامه‌ریز جامع زندگی — تسک، عادت، تقویم شمسی، مالی، سلامت و ژورنال در یک مکان';
export const APP_VERSION = '1.0.0';

/* --------------------------------- ناوبری --------------------------------- */
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  group: 'اصلی' | 'زندگی' | 'تحلیل' | 'سیستم';
  mobile?: boolean;
  badge?: 'tasks' | 'habits';
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'داشبورد', icon: 'LayoutDashboard', group: 'اصلی', mobile: true },
  { href: '/tasks', label: 'تسک‌ها', icon: 'CheckSquare', group: 'اصلی', mobile: true, badge: 'tasks' },
  { href: '/calendar', label: 'تقویم', icon: 'CalendarDays', group: 'اصلی', mobile: true },
  { href: '/habits', label: 'عادت‌ها', icon: 'Flame', group: 'زندگی', mobile: true, badge: 'habits' },
  { href: '/projects', label: 'پروژه‌ها', icon: 'FolderKanban', group: 'اصلی' },
  { href: '/goals', label: 'اهداف و OKR', icon: 'Target', group: 'زندگی' },
  { href: '/focus', label: 'تمرکز و پومودورو', icon: 'Timer', group: 'اصلی' },
  { href: '/notes', label: 'یادداشت‌ها', icon: 'StickyNote', group: 'زندگی', mobile: true },
  { href: '/journal', label: 'ژورنال', icon: 'BookHeart', group: 'زندگی' },
  { href: '/finance', label: 'مالی', icon: 'Wallet', group: 'زندگی' },
  { href: '/health', label: 'سلامت', icon: 'HeartPulse', group: 'زندگی' },
  { href: '/reports', label: 'گزارش‌ها', icon: 'BarChart3', group: 'تحلیل' },
  { href: '/search', label: 'جست‌وجو', icon: 'Search', group: 'تحلیل' },
  { href: '/settings', label: 'تنظیمات', icon: 'Settings', group: 'سیستم' },
];

export const NAV_GROUPS: NavItem['group'][] = ['اصلی', 'زندگی', 'تحلیل', 'سیستم'];

/** تب‌های نوار پایین موبایل */
export const MOBILE_TABS = ['/', '/tasks', '/calendar', '/habits'] as const;

/* --------------------------------- رنگ‌ها --------------------------------- */
export const ACCENT_COLORS = [
  { name: 'مریم', value: '#57886A' },
  { name: 'خاک رس', value: '#BE7857' },
  { name: 'شنی', value: '#AD9268' },
  { name: 'نیلی ملایم', value: '#6C7FA8' },
  { name: 'بنفش تیره', value: '#8C6FA8' },
  { name: 'اقیانوس', value: '#4F8A96' },
  { name: 'تمشک', value: '#B06A79' },
  { name: 'زیتونی', value: '#7E8A4F' },
];

export const CHART_COLORS = ['#57886A', '#BE7857', '#AD9268', '#6C7FA8', '#8C6FA8', '#4F8A96', '#B06A79', '#7E8A4F'];

/* -------------------------------- برچسب‌ها -------------------------------- */
export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: 'فوری',
  high: 'بالا',
  medium: 'متوسط',
  low: 'پایین',
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  urgent: '#C0554A',
  high: '#BE7857',
  medium: '#AD9268',
  low: '#57886A',
};

export const STATUS_LABEL: Record<string, string> = {
  todo: 'انجام نشده',
  in_progress: 'در حال انجام',
  review: 'بازبینی',
  done: 'انجام شده',
};

export const STATUS_COLOR: Record<string, string> = {
  todo: '#7E7E88',
  in_progress: '#6C7FA8',
  review: '#AD9268',
  done: '#57886A',
};

export const HORIZON_LABEL: Record<GoalHorizon, string> = {
  short: 'کوتاه‌مدت',
  mid: 'میان‌مدت',
  long: 'بلندمدت',
};

export const TRANSACTION_LABEL: Record<TransactionType, string> = {
  income: 'درآمد',
  expense: 'هزینه',
  transfer: 'انتقال',
};

export const FREQUENCY_LABEL: Record<string, string> = {
  daily: 'روزانه',
  weekly: 'هفتگی',
  monthly: 'ماهانه',
  none: 'بدون تکرار',
  weekdays: 'روزهای کاری',
  yearly: 'سالانه',
};

export const MOOD_LABEL: Record<number, string> = {
  1: 'خیلی بد',
  2: 'بد',
  3: 'معمولی',
  4: 'خوب',
  5: 'عالی',
};

export const MOOD_EMOJI: Record<number, string> = {
  1: '😞',
  2: '🙁',
  3: '😐',
  4: '🙂',
  5: '😄',
};

export const MEAL_LABEL: Record<string, string> = {
  breakfast: 'صبحانه',
  lunch: 'ناهار',
  dinner: 'شام',
  snack: 'میان‌وعده',
};

export const EVENT_TYPE_LABEL: Record<string, string> = {
  event: 'رویداد',
  reminder: 'یادآور',
  meeting: 'جلسه',
  birthday: 'تولد',
  exam: 'آزمون',
};

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  cash: 'نقدی',
  bank: 'بانکی',
  card: 'کارت',
  crypto: 'رمزارز',
  other: 'سایر',
};

export const GOAL_CATEGORIES = [
  'شخصی',
  'شغلی',
  'مالی',
  'سلامت',
  'یادگیری',
  'خانواده',
  'معنوی',
  'خلاقیت',
];

export const WORKOUT_TYPES = ['هوازی', 'قدرتی', 'کششی', 'پیاده‌روی', 'دوچرخه', 'شنا', 'یوگا', 'تناوبی'];

/* ---------------------------- دسته‌بندی پیش‌فرض مالی ----------------------- */
export const DEFAULT_CATEGORIES: { name: string; icon: string; color: string; type: TransactionType }[] = [
  { name: 'حقوق', icon: 'Banknote', color: '#57886A', type: 'income' },
  { name: 'فریلنس', icon: 'Laptop', color: '#4F8A96', type: 'income' },
  { name: 'سرمایه‌گذاری', icon: 'TrendingUp', color: '#7E8A4F', type: 'income' },
  { name: 'خوراک', icon: 'UtensilsCrossed', color: '#BE7857', type: 'expense' },
  { name: 'اجاره', icon: 'Home', color: '#AD9268', type: 'expense' },
  { name: 'حمل‌ونقل', icon: 'Bus', color: '#6C7FA8', type: 'expense' },
  { name: 'خرید', icon: 'ShoppingBag', color: '#8C6FA8', type: 'expense' },
  { name: 'سلامت', icon: 'HeartPulse', color: '#B06A79', type: 'expense' },
  { name: 'آموزش', icon: 'GraduationCap', color: '#57886A', type: 'expense' },
  { name: 'تفریح', icon: 'Gamepad2', color: '#AD9268', type: 'expense' },
  { name: 'قبوض', icon: 'Receipt', color: '#7E7E88', type: 'expense' },
  { name: 'هدیه', icon: 'Gift', color: '#C0554A', type: 'expense' },
];

/* ------------------------------- نقل‌قول‌های پشتیبان ---------------------- */
export const FALLBACK_QUOTES = [
  { content: 'کاری که امروز انجام می‌دهی، فردای تو را می‌سازد.', author: 'ناپلئون هیل' },
  { content: 'موفقیت مجموع تلاش‌های کوچک روزانه است که هر روز تکرار می‌شوند.', author: 'رابرت کولیر' },
  { content: 'انضباط، پلی بین اهداف و دستاوردهاست.', author: 'جیم ران' },
  { content: 'اگر می‌خواهی یک سال خوب داشته باشی، بذر بکار؛ اگر می‌خواهی ده سال، درخت بکار.', author: 'ضرب‌المثل چینی' },
  { content: 'زمان شما محدود است، آن را با زندگی کردن در زندگی دیگران هدر ندهید.', author: 'استیو جابز' },
  { content: 'بهترین زمان برای کاشتن درخت، بیست سال پیش بود. دومین زمان، امروز است.', author: 'ضرب‌المثل' },
  { content: 'کیفیت زندگی شما، کیفیت عادت‌های شماست.', author: 'جیمز کلیر' },
  { content: 'کوچک شروع کن، اما از همین حالا شروع کن.', author: 'زیگ زیگلار' },
];

export const STORAGE_KEY = 'renox-planner::state::v1';
export const THEME_KEY = 'renox-planner::theme';

/* ------------------------- پیکربندی APIهای خارجی -------------------------- */
export const API_BASE = {
  openMeteo: 'https://api.open-meteo.com/v1',
  geocoding: 'https://geocoding-api.open-meteo.com/v1',
  quotes: 'https://api.quotable.io',
  holidays: 'https://date.nager.at/api/v3',
  rates: 'https://open.er-api.com/v6',
  frankfurter: 'https://api.frankfurter.app',
  coingecko: 'https://api.coingecko.com/api/v3',
  openFoodFacts: 'https://world.openfoodfacts.org',
  wger: 'https://wger.de/api/v2',
  libreTranslate: 'https://translate.terraprint.co/translate',
  myMemory: 'https://api.mymemory.translated.net/get',
  languageTool: 'https://api.languagetool.org/v2',
  dictionary: 'https://api.dictionaryapi.dev/api/v2/entries',
  picsum: 'https://picsum.photos',
  tmdb: 'https://api.themoviedb.org/3',
  omdb: 'https://www.omdbapi.com',
  openLibrary: 'https://openlibrary.org',
  googleBooks: 'https://www.googleapis.com/books/v1',
  cleanUri: 'https://cleanuri.com/api/v1/shorten',
  colorApi: 'https://www.thecolorapi.com',
  goqr: 'https://api.qrserver.com/v1/create-qr-code',
  uuid: 'https://www.uuidtools.com/api/generate/v4',
  worldTime: 'https://worldtimeapi.org/api',
  ipapi: 'https://ipapi.co/json',
  restCountries: 'https://restcountries.com/v3.1',
  news: 'https://newsapi.org/v2',
  currents: 'https://api.currentsapi.services/v1',
  frankfurterV2: 'https://api.frankfurter.dev/v1',
} as const;

/** شهرهای پیش‌فرض برای انتخاب سریع در تنظیمات/داشبورد */
export const DEFAULT_CITIES = [
  { name: 'تهران', latitude: 35.6892, longitude: 51.389 },
  { name: 'مشهد', latitude: 36.2605, longitude: 59.6168 },
  { name: 'اصفهان', latitude: 32.6546, longitude: 51.668 },
  { name: 'شیراز', latitude: 29.5918, longitude: 52.5837 },
  { name: 'تبریز', latitude: 38.0962, longitude: 46.2738 },
  { name: 'آمستردام', latitude: 52.3676, longitude: 4.9041 },
  { name: 'دبی', latitude: 25.2048, longitude: 55.2708 },
  { name: 'استانبول', latitude: 41.0082, longitude: 28.9784 },
];

export const BMI_ZONES: { max: number; label: string; color: string }[] = [
  { max: 18.5, label: 'کم‌وزن', color: '#6C7FA8' },
  { max: 25, label: 'وزن نرمال', color: '#57886A' },
  { max: 30, label: 'اضافه‌وزن', color: '#AD9268' },
  { max: 100, label: 'چاقی', color: '#C0554A' },
];

export const EMPTY_HEALTH: Omit<HealthLog, 'id' | 'date' | 'createdAt'> = {
  water: 0,
  steps: 0,
  calories: 0,
};
