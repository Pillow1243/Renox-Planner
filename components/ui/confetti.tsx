'use client';

/** افکت کاغذرنگی برای جشن گرفتن تکمیل عادت، هدف و پومودورو */

const COLORS = ['#57886A', '#BE7857', '#AD9268', '#6C7FA8', '#8C6FA8', '#4F8A96', '#B06A79'];

export function fireConfetti(count = 42): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const left = Math.random() * 100;
    const colors = COLORS[Math.floor(Math.random() * COLORS.length)];
    piece.style.left = `${left}vw`;
    piece.style.backgroundColor = colors;
    piece.style.setProperty('--dx', `${(Math.random() - 0.5) * 260}px`);
    piece.style.setProperty('--rot', `${360 + Math.random() * 900}deg`);
    piece.style.setProperty('--dur', `${2 + Math.random() * 1.6}s`);
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    if (Math.random() > 0.6) piece.style.borderRadius = '50%';
    fragment.appendChild(piece);
    window.setTimeout(() => piece.remove(), 4200);
  }
  document.body.appendChild(fragment);
}

/** صدای ملایم با Web Audio (بدون فایل صوتی خارجی) */
export function playChime(kind: 'start' | 'success' | 'tick' = 'success'): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = kind === 'success' ? [523.25, 659.25, 783.99] : kind === 'start' ? [440, 587.33] : [880];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.16, now + i * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.55);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.6);
    });
    window.setTimeout(() => void ctx.close(), 1600);
  } catch {
    /* بی‌صدا ادامه می‌دهیم */
  }
}
