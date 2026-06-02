import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:    { DEFAULT: '#B91C1C', hover: '#991B1B', fg: '#FFFFFF' },
        accent:     { DEFAULT: '#C8332B', foreground: '#FFFFFF' },
        'accent-soft': '#FBEAE8',
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
        sans:        ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'serif-jp':  ['Noto Serif JP', 'serif'],
        'sans-jp':   ['Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'sans-serif'],
        pretendard:  ['Pretendard', '-apple-system', 'sans-serif'],
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
