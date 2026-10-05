# 🖧 حالت سروری Renox Planner (اختیاری)

نسخه پیش‌فرض برنامه **Local-First** است؛ یعنی بدون سرور، بدون هزینه و قابل انتشار روی GitHub Pages.
اما اگر به این موارد نیاز داری، حالت سروری آماده است:

- ورود واقعی کاربران (Credentials + Google با NextAuth)
- ذخیره‌سازی چنددستگاهی روی پایگاه‌داده PostgreSQL
- API Routes با دسترسی چندمستأجری امن (`userId` در همه کوئری‌ها)
- اعلان تلگرام، Web Push و گزارش‌های تجمیعی سمت سرور

> ⚠️ این پوشه به‌طور عمدی داخل `server/` نگه داشته شده و در `tsconfig.json` نادیده گرفته می‌شود،
> تا بیلد استاتیک (GitHub Pages) بدون نصب `@prisma/client` و `next-auth` سالم بماند.

## فعال‌سازی (۴ دستور)

```bash
npm run server:enable      # کپی server/api → app/api، server/auth.ts → lib/auth.ts، server/prisma → prisma
npm install                # نصب prisma، next-auth، bcryptjs، zod
cp .env.example .env       # پرکردن DATABASE_URL و NEXTAUTH_SECRET
npx prisma migrate deploy  # اجرای مایگریشن‌های آماده (یا migrate dev)
npm run db:seed            # داده نمونه: demo@renox.app / renox1234
npm run dev
```

سپس در `.env` مقدار `NEXT_PUBLIC_SERVER_MODE=true` را بگذار تا UI هم پیام‌های سروری را نشان دهد.

## ساختار

| مسیر | توضیح |
| --- | --- |
| `prisma/schema.prisma` | ۲۸ مدل: User، Task، SubTask (خودارجاع)، Project، Goal، KeyResult، Habit، HabitLog، CalendarEvent، Note، Folder، JournalEntry، Transaction، Wallet، Category، Budget، HealthLog، WorkoutLog، Medication، FoodLog، FocusSession، Reminder، Notification، Tag، Attachment، Setting |
| `prisma/migrations/20250101000000_init/` | مایگریشن اولیه SQL (PostgreSQL) |
| `prisma/seed.ts` | داده نمونه فارسی و واقع‌نما |
| `api/_lib/crud.ts` | کارخانه ساخت CRUD با محدودسازی به کاربر جاری |
| `api/tasks`، `api/habits`، `api/transactions` … | CRUD همه موجودیت‌ها |
| `api/habits/log` | ثبت/لغو عادت + محاسبه زنجیره |
| `api/sync` | همگام‌سازی فایل پشتیبان JSON محلی با پایگاه‌داده |
| `api/notify/telegram` | ارسال پیام با ربات تلگرام (رایگان) |
| `api/notify/push` | اعلان وب با کلیدهای VAPID |
| `api/holidays` | پروکسی تعطیلات Nager.Date (رفع CORS) |
| `api/report` | گزارش تجمیعی روز/هفته/ماه/سال |
| `auth.ts` | پیکربندی NextAuth |
| `middleware.ts` | محافظت از مسیرها |

## نکات امنیتی

- رمزها با `bcryptjs` (۱۰ دور) هش می‌شوند.
- همه کوئری‌ها با `where: { userId }` محدود شده‌اند؛ دسترسی به داده دیگران ممکن نیست.
- برای تولید `NEXTAUTH_SECRET`: `openssl rand -base64 32`.
- کلیدهای API فقط در `.env` و هرگز در مخزن قرار نگیرند (`.env` در `.gitignore` است).
