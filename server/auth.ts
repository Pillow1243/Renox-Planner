/**
 * NextAuth — پیکربندی احراز هویت (حالت Full-Stack)
 * ----------------------------------------------------------------------------
 * Providerها:
 *   ۱) Credentials (ایمیل + رمز با bcrypt) — همیشه فعال
 *   ۲) Google — فقط اگر GOOGLE_CLIENT_ID/SECRET در .env باشد (رایگان، OAuth)
 *
 * نکته: نشست JWT است تا روی سرورهای بدون حالت (serverless) هم کار کند و
 * برای استفاده از این فایل باید `npm run server:enable` اجرا شده باشد.
 */
import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import { prisma } from '@/app/api/_lib/prisma';

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: 'ایمیل و رمز عبور',
    credentials: {
      email: { label: 'ایمیل', type: 'email', placeholder: 'you@example.com' },
      password: { label: 'رمز عبور', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase().trim() },
      });
      if (!user?.passwordHash) return null;

      const ok = await compare(credentials.password, user.passwordHash);
      if (!ok) return null;

      return { id: user.id, name: user.name ?? user.email, email: user.email, image: user.image };
    },
  }),
];

// ورود گوگل فقط در صورت تنظیم متغیرهای محیطی (هزینه‌ای ندارد)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.id as string;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
