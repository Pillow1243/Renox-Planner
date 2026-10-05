/**
 * راه‌اندازی محیط تست — شبیه‌ساز سبک localStorage برای اجرای منطق فروشگاه در Node
 * اجرا به‌صورت خودکار توسط اسکریپت `npm run test` پیش از همه تست‌ها.
 */
const memory = new Map();

globalThis.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => void memory.set(k, String(v)),
  removeItem: (k) => void memory.delete(k),
  clear: () => memory.clear(),
  key: (i) => Array.from(memory.keys())[i] ?? null,
  get length() {
    return memory.size;
  },
};

globalThis.sessionStorage = globalThis.localStorage;
if (!globalThis.window) globalThis.window = globalThis;
