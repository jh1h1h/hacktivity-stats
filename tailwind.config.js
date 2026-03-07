/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base:    '#080b12',
        surface: '#0e1420',
        panel:   '#131926',
        border:  '#1e2a3a',
        muted:   '#2a3a52',
        dim:     '#4a6080',
        text:    '#c8d8ed',
        bright:  '#e8f4ff',
        accent:  '#00c8ff',
        accentDim: '#0099cc',
        green:   '#00e5a0',
        amber:   '#ffb800',
        red:     '#ff4d6a',
      },
      fontFamily: {
        sans:  ['Syne', 'sans-serif'],
        mono:  ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.5s ease forwards',
        'count-up':   'countUp 0.6s ease forwards',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
