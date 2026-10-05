/**
 * تنظیمات Next.js برای Renox Planner
 * -------------------------------------------------
 * پروژه به صورت «Local-First» و Static Export ساخته می‌شود تا بتوان آن را
 * به راحتی روی GitHub Pages (بدون سرور و بدون هزینه) منتشر کرد.
 * در صورت نیاز به حالت Full-Stack، فایل‌های پوشه `server/` را فعال کنید
 * (راهنما در README و API_INTEGRATIONS.md).
 */
const isGithubPages = process.env.GITHUB_PAGES === 'true';
const repoName = process.env.REPO_NAME || 'Renox-Planner';
const basePath = isGithubPages ? `/${repoName}` : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // خروجی استاتیک → قابل اجرا روی GitHub Pages
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
