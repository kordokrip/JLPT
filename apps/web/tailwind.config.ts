import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:    { DEFAULT: 'var(--color-primary)', hover: 'var(--color-primary-hover)', fg: 'var(--color-primary-fg)' },
        accent:     { DEFAULT: 'var(--accent)', foreground: 'var(--accent-foreground)' },
        'accent-soft': 'var(--accent-soft)',
        brand: {
          ink: 'var(--brand-ink)', indigo: 'var(--brand-indigo)', vermilion: 'var(--brand-vermilion)',
          jade: 'var(--brand-jade)', blossom: 'var(--brand-blossom)', porcelain: 'var(--brand-porcelain)',
        },
        foreground:  'var(--foreground)',
        background:  'var(--background)',
        surface:     'var(--surface)',
        card:        'var(--card)',
        border:      'var(--border)',
        muted:       { DEFAULT: 'var(--muted)', fg: 'var(--muted-foreground)' },
        success:     '#5C7F4F',
        warning:     '#C89B6E',
        info:        '#6B7F8C',
        level: {
          n5: 'var(--level-n5)',
          n4: 'var(--level-n4)',
          n3: 'var(--level-n3)',
          n2: 'var(--level-n2)',
          n1: 'var(--level-n1)',
        },
        srs: {
          new:       'var(--srs-new)',
          learning:  'var(--srs-learning)',
          review:    'var(--srs-review)',
          relearning:'var(--srs-relearning)',
        },
      },
      fontFamily: {
        sans:        ['-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Segoe UI', 'sans-serif'],
        'serif-jp':  ['Hiragino Mincho ProN', 'Yu Mincho', 'YuMincho', 'Apple Myungjo', 'serif'],
        'sans-jp':   ['Hiragino Kaku Gothic ProN', 'Yu Gothic', 'YuGothic', 'Apple SD Gothic Neo', 'sans-serif'],
        pretendard:  ['-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Segoe UI', 'sans-serif'],
        mono:        ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm:      'var(--radius-sm)',
        lg:      'var(--radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      spacing: {
        'nav': 'var(--nav-height)',
        'sidebar': 'var(--sidebar-width)',
      },
    },
  },
  plugins: [],
} satisfies Config;
