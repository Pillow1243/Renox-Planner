#!/usr/bin/env node
/**
 * فعال‌ساز حالت سروری (Full-Stack)
 * ----------------------------------------------------------------------------
 * این اسکریپت فایل‌های آماده در پوشه `server/` را به مسیرهای واقعی برنامه
 * کپی می‌کند تا احراز هویت (NextAuth)، API Routes و Prisma فعال شوند:
 *
 *   server/api/**            →  app/api/**
 *   server/auth.ts           →  lib/auth.ts
 *   server/prisma/**         →  prisma/**
 *   server/middleware.ts     →  middleware.ts
 *
 * ⚠️ پیش از اجرا، از داده‌های خود پشتیبان بگیرید (تنظیمات → داده‌ها).
 * استفاده:  npm run server:enable
 */
import { cp, mkdir, access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = async (p) => {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const COPY_MAP = [
  ['server/api', 'app/api'],
  ['server/prisma', 'prisma'],
];

const FILE_MAP = [
  ['server/auth.ts', 'lib/auth.ts'],
  ['server/middleware.ts', 'middleware.ts'],
];

const EXTRA_DEPS = {
  '@prisma/client': '^5.18.0',
  prisma: '^5.18.0',
  next-auth: '^4.24.7',
  '@auth/prisma-adapter': '^2.4.2',
  bcryptjs: '^2.4.3',
  zod: '^3.23.8',
};

async function main() {
  console.log('\n🚀 Renox Planner — فعال‌سازی حالت Full-Stack\n');

  for (const [from, to] of COPY_MAP) {
    const src = path.join(root, from);
    if (!(await exists(src))) {
      console.log(`⏭️  پوشه ${from} پیدا نشد؛ رد شد.`);
      continue;
    }
    await mkdir(path.join(root, to), { recursive: true });
    await cp(src, path.join(root, to), { recursive: true, force: true });
    console.log(`✅ ${from}  →  ${to}`);
  }

  for (const [from, to] of FILE_MAP) {
    const src = path.join(root, from);
    if (!(await exists(src))) {
      console.log(`⏭️  فایل ${from} پیدا نشد؛ رد شد.`);
      continue;
    }
    await cp(src, path.join(root, to), { force: true });
    console.log(`✅ ${from}  →  ${to}`);
  }

  // افزودن وابستگی‌های سروری به package.json (بدون نصب خودکار)
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  pkg.dependencies = { ...pkg.dependencies, ...EXTRA_DEPS };
  const prisma = { ...(pkg.prisma ?? {}), seed: 'node --import tsx server/prisma/seed.ts' };
  pkg.scripts = {
    ...pkg.scripts,
    'postinstall': 'prisma generate --schema prisma/schema.prisma',
    'db:migrate': 'prisma migrate dev --schema prisma/schema.prisma',
    'db:studio': 'prisma studio --schema prisma/schema.prisma',
  };
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log('✅ وابستگی‌های سروری به package.json اضافه شد.');

  console.log(`\n📦 مرحله بعد:
   1) npm install
   2) cp .env.example .env  و مقدار DATABASE_URL و NEXTAUTH_SECRET را پر کنید
   3) npx prisma migrate dev --schema prisma/schema.prisma
   4) npm run db:seed
   5) npm run dev
\n`);
}

main().catch((e) => {
  console.error('❌ خطا در فعال‌سازی:', e);
  process.exit(1);
});
