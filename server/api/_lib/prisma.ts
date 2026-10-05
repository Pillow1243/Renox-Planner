/**
 * Prisma Client — نمونه تک‌شون (Singleton)
 * در محیط توسعه از hot-reload جلوگیری می‌کند تا اتصال‌ها زیاد نشوند.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
