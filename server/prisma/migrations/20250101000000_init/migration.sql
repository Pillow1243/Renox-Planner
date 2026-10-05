-- ═══════════════════════════════════════════════════════════════════════════
--  Renox Planner — Migration اولیه (init)
--  پایگاه‌داده: PostgreSQL
--  اجرا:  npx prisma migrate deploy   |   یا   npx prisma migrate dev
--  توجه: این فایل دستی و معادل schema.prisma تولید شده است. اگر آن را تغییر
--  دادید، با `npx prisma migrate dev --name <name>` فایل جدید بسازید.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────── کاربر و احراز هویت ─────────────────────────
CREATE TABLE "users" (
  "id"            TEXT PRIMARY KEY,
  "name"          TEXT,
  "email"         TEXT UNIQUE,
  "emailVerified" TIMESTAMP(3),
  "image"         TEXT,
  "passwordHash"  TEXT,
  "bio"           TEXT,
  "birthDate"     TIMESTAMP(3),
  "currency"      TEXT NOT NULL DEFAULT 'IRR',
  "timezone"      TEXT NOT NULL DEFAULT 'Asia/Tehran',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL
);

CREATE TABLE "accounts" (
  "id"                TEXT PRIMARY KEY,
  "userId"            TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type"              TEXT NOT NULL,
  "provider"          TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token"     TEXT,
  "access_token"      TEXT,
  "expires_at"        INTEGER,
  "token_type"        TEXT,
  "scope"             TEXT,
  "id_token"          TEXT,
  "session_state"     TEXT,
  UNIQUE ("provider", "providerAccountId")
);

CREATE TABLE "sessions" (
  "id"           TEXT PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId"       TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires"      TIMESTAMP(3) NOT NULL
);

CREATE TABLE "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token"      TEXT NOT NULL UNIQUE,
  "expires"    TIMESTAMP(3) NOT NULL,
  UNIQUE ("identifier", "token")
);

-- ───────────────────────────────── تنظیمات ────────────────────────────────
CREATE TABLE "settings" (
  "id"              TEXT PRIMARY KEY,
  "userId"          TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "theme"           TEXT NOT NULL DEFAULT 'system',
  "accent"          TEXT NOT NULL DEFAULT '#57886A',
  "language"        TEXT NOT NULL DEFAULT 'fa',
  "weekStart"       INTEGER NOT NULL DEFAULT 0,
  "waterGoal"       INTEGER NOT NULL DEFAULT 8,
  "sleepGoal"       DOUBLE PRECISION NOT NULL DEFAULT 8,
  "dayStart"        TEXT NOT NULL DEFAULT '08:00',
  "sounds"          BOOLEAN NOT NULL DEFAULT true,
  "dashboardLayout" TEXT[] NOT NULL DEFAULT ARRAY['today','stats','week-chart','habits','goals','quote','weather','upcoming'],
  "notifyPush"      BOOLEAN NOT NULL DEFAULT true,
  "notifyTelegram"  BOOLEAN NOT NULL DEFAULT false,
  "notifyEmail"     BOOLEAN NOT NULL DEFAULT false,
  "telegramChatId"  TEXT,
  "cityName"        TEXT NOT NULL DEFAULT 'تهران',
  "cityLatitude"    DOUBLE PRECISION NOT NULL DEFAULT 35.6892,
  "cityLongitude"   DOUBLE PRECISION NOT NULL DEFAULT 51.389,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL
);

-- ───────────────────────────── تسک و پروژه و هدف ─────────────────────────
CREATE TABLE "projects" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "color"       TEXT NOT NULL DEFAULT '#57886A',
  "icon"        TEXT NOT NULL DEFAULT 'Folder',
  "archived"    BOOLEAN NOT NULL DEFAULT false,
  "dueDate"     TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX "projects_userId_archived_idx" ON "projects" ("userId", "archived");

CREATE TABLE "goals" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "horizon"     TEXT NOT NULL DEFAULT 'short',
  "category"    TEXT NOT NULL DEFAULT 'شخصی',
  "color"       TEXT NOT NULL DEFAULT '#57886A',
  "targetDate"  TIMESTAMP(3),
  "progress"    INTEGER NOT NULL DEFAULT 0,
  "completed"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE TABLE "key_results" (
  "id"      TEXT PRIMARY KEY,
  "goalId"  TEXT NOT NULL REFERENCES "goals"("id") ON DELETE CASCADE,
  "title"   TEXT NOT NULL,
  "target"  DOUBLE PRECISION NOT NULL,
  "current" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unit"    TEXT
);

CREATE TABLE "tasks" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "status"      TEXT NOT NULL DEFAULT 'todo',
  "priority"    TEXT NOT NULL DEFAULT 'medium',
  "important"   BOOLEAN NOT NULL DEFAULT true,
  "urgent"      BOOLEAN NOT NULL DEFAULT false,
  "dueDate"     TIMESTAMP(3),
  "dueTime"     TEXT,
  "repeatRule"  TEXT NOT NULL DEFAULT 'none',
  "estimate"    INTEGER,
  "spent"       INTEGER NOT NULL DEFAULT 0,
  "reminderAt"  TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "order"       INTEGER NOT NULL DEFAULT 0,
  "projectId"   TEXT REFERENCES "projects"("id") ON DELETE SET NULL,
  "goalId"      TEXT REFERENCES "goals"("id") ON DELETE SET NULL,
  "parentId"    TEXT REFERENCES "tasks"("id") ON DELETE CASCADE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX "tasks_userId_status_idx" ON "tasks" ("userId", "status");
CREATE INDEX "tasks_userId_dueDate_idx" ON "tasks" ("userId", "dueDate");

-- ─────────────────────────────────── عادت‌ها ──────────────────────────────
CREATE TABLE "habits" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"         TEXT NOT NULL,
  "icon"         TEXT NOT NULL DEFAULT 'Check',
  "color"        TEXT NOT NULL DEFAULT '#57886A',
  "frequency"    TEXT NOT NULL DEFAULT 'daily',
  "weekdays"     INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  "target"       INTEGER NOT NULL DEFAULT 1,
  "unit"         TEXT,
  "kind"         TEXT NOT NULL DEFAULT 'good',
  "reminderTime" TEXT,
  "archived"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL
);
CREATE INDEX "habits_userId_archived_idx" ON "habits" ("userId", "archived");

CREATE TABLE "habit_logs" (
  "id"      TEXT PRIMARY KEY,
  "habitId" TEXT NOT NULL REFERENCES "habits"("id") ON DELETE CASCADE,
  "userId"  TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date"    TIMESTAMP(3) NOT NULL,
  "count"   INTEGER NOT NULL DEFAULT 1,
  "note"    TEXT,
  UNIQUE ("habitId", "date")
);
CREATE INDEX "habit_logs_userId_date_idx" ON "habit_logs" ("userId", "date");

-- ─────────────────────────────────── تقویم ────────────────────────────────
CREATE TABLE "events" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "type"        TEXT NOT NULL DEFAULT 'event',
  "start"       TIMESTAMP(3) NOT NULL,
  "end"         TIMESTAMP(3),
  "allDay"      BOOLEAN NOT NULL DEFAULT false,
  "location"    TEXT,
  "color"       TEXT NOT NULL DEFAULT '#57886A',
  "projectId"   TEXT REFERENCES "projects"("id") ON DELETE SET NULL,
  "googleId"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX "events_userId_start_idx" ON "events" ("userId", "start");

-- ───────────────────────────── یادداشت و ژورنال ───────────────────────────
CREATE TABLE "folders" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"      TEXT NOT NULL,
  "icon"      TEXT NOT NULL DEFAULT 'Folder',
  "color"     TEXT NOT NULL DEFAULT '#AD9268',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "notes" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"     TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "folderId"  TEXT REFERENCES "folders"("id") ON DELETE SET NULL,
  "pinned"    BOOLEAN NOT NULL DEFAULT false,
  "color"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "notes_userId_pinned_idx" ON "notes" ("userId", "pinned");

CREATE TABLE "journal_entries" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date"       TIMESTAMP(3) NOT NULL,
  "title"      TEXT NOT NULL DEFAULT '',
  "content"    TEXT NOT NULL,
  "mood"       INTEGER NOT NULL DEFAULT 3,
  "energy"     INTEGER NOT NULL DEFAULT 5,
  "gratitude"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "lessons"    TEXT,
  "highlights" TEXT,
  "photo"      TEXT,
  "weather"    TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  UNIQUE ("userId", "date")
);

-- ──────────────────────────────────── مالی ────────────────────────────────
CREATE TABLE "wallets" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"      TEXT NOT NULL,
  "type"      TEXT NOT NULL DEFAULT 'bank',
  "balance"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency"  TEXT NOT NULL DEFAULT 'IRR',
  "color"     TEXT NOT NULL DEFAULT '#57886A',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "categories" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"      TEXT NOT NULL,
  "icon"      TEXT NOT NULL DEFAULT 'Tag',
  "color"     TEXT NOT NULL DEFAULT '#AD9268',
  "type"      TEXT NOT NULL DEFAULT 'expense',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "transactions" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type"       TEXT NOT NULL,
  "amount"     DOUBLE PRECISION NOT NULL,
  "currency"   TEXT NOT NULL DEFAULT 'IRR',
  "amountBase" DOUBLE PRECISION NOT NULL,
  "title"      TEXT NOT NULL,
  "note"       TEXT,
  "date"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "categoryId" TEXT REFERENCES "categories"("id") ON DELETE SET NULL,
  "walletId"   TEXT REFERENCES "wallets"("id") ON DELETE SET NULL,
  "toWalletId" TEXT,
  "recurring"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL
);
CREATE INDEX "transactions_userId_date_idx" ON "transactions" ("userId", "date");

CREATE TABLE "budgets" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "categoryId" TEXT NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
  "amount"     DOUBLE PRECISION NOT NULL,
  "month"      TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "categoryId", "month")
);

-- ─────────────────────────────────── سلامت ────────────────────────────────
CREATE TABLE "health_logs" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date"         TIMESTAMP(3) NOT NULL,
  "weight"       DOUBLE PRECISION,
  "height"       DOUBLE PRECISION,
  "sleepHours"   DOUBLE PRECISION,
  "sleepQuality" INTEGER,
  "steps"        INTEGER,
  "water"        INTEGER NOT NULL DEFAULT 0,
  "calories"     INTEGER,
  "mood"         INTEGER,
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "date")
);

CREATE TABLE "workout_logs" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date"      TIMESTAMP(3) NOT NULL,
  "title"     TEXT NOT NULL,
  "type"      TEXT NOT NULL DEFAULT 'هوازی',
  "duration"  INTEGER NOT NULL DEFAULT 30,
  "calories"  INTEGER,
  "intensity" INTEGER NOT NULL DEFAULT 2,
  "exercises" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "workout_logs_userId_date_idx" ON "workout_logs" ("userId", "date");

CREATE TABLE "medications" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"      TEXT NOT NULL,
  "dose"      TEXT NOT NULL DEFAULT '',
  "times"     TEXT[] NOT NULL DEFAULT ARRAY['09:00'],
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate"   TIMESTAMP(3),
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "food_logs" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date"      TIMESTAMP(3) NOT NULL,
  "meal"      TEXT NOT NULL DEFAULT 'lunch',
  "title"     TEXT NOT NULL,
  "calories"  INTEGER NOT NULL DEFAULT 0,
  "protein"   DOUBLE PRECISION,
  "carbs"     DOUBLE PRECISION,
  "fat"       DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "food_logs_userId_date_idx" ON "food_logs" ("userId", "date");

-- ───────────────────────── تمرکز و یادآور و اعلان ─────────────────────────
CREATE TABLE "focus_sessions" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "taskId"    TEXT REFERENCES "tasks"("id") ON DELETE SET NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "minutes"   INTEGER NOT NULL,
  "mode"      TEXT NOT NULL DEFAULT 'focus',
  "completed" BOOLEAN NOT NULL DEFAULT true,
  "label"     TEXT
);
CREATE INDEX "focus_sessions_userId_startedAt_idx" ON "focus_sessions" ("userId", "startedAt");

CREATE TABLE "reminders" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"       TEXT NOT NULL,
  "at"          TIMESTAMP(3) NOT NULL,
  "channel"     TEXT NOT NULL DEFAULT 'in-app',
  "repeatRule"  TEXT NOT NULL DEFAULT 'none',
  "relatedType" TEXT,
  "relatedId"   TEXT,
  "done"        BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "reminders_userId_at_idx" ON "reminders" ("userId", "at");

CREATE TABLE "notifications" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "type"      TEXT NOT NULL DEFAULT 'info',
  "read"      BOOLEAN NOT NULL DEFAULT false,
  "href"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "notifications_userId_read_idx" ON "notifications" ("userId", "read");

-- ─────────────────────────── برچسب و پیوست (مشترک) ─────────────────────────
CREATE TABLE "tags" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"      TEXT NOT NULL,
  "color"     TEXT NOT NULL DEFAULT '#AD9268',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "name")
);

CREATE TABLE "_TaskToTag" (
  "A" TEXT NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "B" TEXT NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  UNIQUE ("A", "B")
);

CREATE TABLE "_NoteToTag" (
  "A" TEXT NOT NULL REFERENCES "notes"("id") ON DELETE CASCADE,
  "B" TEXT NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  UNIQUE ("A", "B")
);

CREATE TABLE "_TagToTransaction" (
  "A" TEXT NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "B" TEXT NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
  UNIQUE ("A", "B")
);

CREATE TABLE "attachments" (
  "id"        TEXT PRIMARY KEY,
  "taskId"    TEXT REFERENCES "tasks"("id") ON DELETE CASCADE,
  "noteId"    TEXT REFERENCES "notes"("id") ON DELETE CASCADE,
  "name"      TEXT NOT NULL,
  "size"      INTEGER NOT NULL,
  "mimeType"  TEXT NOT NULL,
  "url"       TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
