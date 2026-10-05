import type { Config } from 'tailwindcss';

/**
 * سیستم طراحی Renox Planner
 * پالت گرم (کرم/بژ/قهوه‌ای روشن) + لهجه ملایم سبز-آبی + حالت تاریک عمیق
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './stores/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn Variable', 'Vazirmatn', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FAF7F2',
          200: '#F4EEE4',
          300: '#EBE2D4',
          400: '#DCCFBB',
        },
        sand: {
          50: '#FBF8F3',
          100: '#F6F0E6',
          200: '#EADFCD',
          300: '#D9C7A8',
          400: '#C4AC85',
          500: '#AD9268',
          600: '#8E7550',
          700: '#6F5B3E',
          800: '#4E3F2C',
          900: '#332A1D',
        },
        sage: {
          50: '#F3F7F4',
          100: '#E4EDE7',
          200: '#C8DBCF',
          300: '#A2C2AE',
          400: '#78A489',
          500: '#57886A',
          600: '#436C53',
          700: '#365643',
          800: '#2C4536',
          900: '#25392D',
        },
        clay: {
          50: '#FCF6F3',
          100: '#F8EBE5',
          200: '#F0D7CB',
          300: '#E3B9A5',
          400: '#D1957A',
          500: '#BE7857',
          600: '#A15F42',
          700: '#824C36',
          800: '#6A402F',
          900: '#583729',
        },
        ink: {
          50: '#F6F6F7',
          100: '#E7E7E9',
          200: '#CFCFD3',
          300: '#ABABB2',
          400: '#7E7E88',
          500: '#5C5C66',
          600: '#45454D',
          700: '#33333A',
          800: '#1E1E23',
          900: '#131316',
          950: '#0A0A0B',
        },
      },
      borderRadius: {
        card: '20px',
        xl2: '24px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(51,42,29,0.04), 0 8px 24px -12px rgba(51,42,29,0.12)',
        lifted: '0 2px 4px rgba(51,42,29,0.05), 0 18px 40px -20px rgba(51,42,29,0.22)',
        glow: '0 0 0 1px rgba(255,255,255,0.04), 0 20px 60px -30px rgba(87,136,106,0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(-100%)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(.9)', opacity: '0.6' },
          '70%': { transform: 'scale(1.25)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        progress: {
          from: { strokeDashoffset: 'var(--dash-start)' },
          to: { strokeDashoffset: 'var(--dash-end)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s infinite',
        'fade-up': 'fade-up .28s cubic-bezier(.22,1,.36,1) both',
        'scale-in': 'scale-in .22s cubic-bezier(.22,1,.36,1) both',
        floaty: 'floaty 5s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(.22,1,.36,1) infinite',
      },
      transitionTimingFunction: {
        natural: 'cubic-bezier(.22,1,.36,1)',
      },
    },
  },
  plugins: [],
};

export default config;
