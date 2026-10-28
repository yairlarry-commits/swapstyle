// Shared theme (used by tailwind.config.js and by the single-file preview)
export const theme = {
  extend: {
    fontFamily: {
      sans: ['Inter', 'Heebo', 'system-ui', 'sans-serif'],
      display: ['"Playfair Display"', '"Frank Ruhl Libre"', 'Georgia', 'serif'],
    },
    colors: {
      ink: { 50: '#f7f7f8', 100: '#eeeef0', 200: '#d9d9de', 300: '#b6b6bf', 400: '#8b8b97', 500: '#6b6b78', 600: '#52525c', 700: '#3f3f47', 800: '#27272d', 900: '#1a1a1f', 950: '#0f0f12' },
      sand: { 50: '#faf8f4', 100: '#f3eee3', 200: '#e6dcc7', 300: '#d4c39e', 400: '#c0a878', 500: '#ad9156', 600: '#93784a', 700: '#7a603d', 800: '#634e33', 900: '#514231' },
      sage: { 50: '#f3f5f2', 100: '#e3e8df', 200: '#c7d1c0', 300: '#a0b094', 400: '#7d9270', 500: '#5f7451', 600: '#4b5c40', 700: '#3d4b35', 800: '#323e2d', 900: '#2a3326' },
      accent: { 50: '#fff5f3', 100: '#ffe8e3', 200: '#ffd0c6', 300: '#ffab98', 400: '#ff7f63', 500: '#fb5a38', 600: '#ec3f1c', 700: '#c43014', 800: '#a22a15', 900: '#7d2516' },
      gold: { 200: '#fcf6ba', 300: '#f4e5a1', 400: '#d4af37', 500: '#bf953f', 600: '#b8941f', 700: '#aa771c' },
    },
    boxShadow: {
      card: '0 1px 2px rgba(15,15,18,.04), 0 4px 16px rgba(15,15,18,.06)',
      float: '0 8px 30px rgba(15,15,18,.12)',
    },
    keyframes: {
      fadeIn: { '0%': { opacity: '0' }, to: { opacity: '1' } },
      scaleIn: { '0%': { transform: 'scale(.96)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
      slideUp: { '0%': { transform: 'translateY(100%)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
    },
    animation: {
      'fade-in': 'fadeIn .3s ease-out',
      'scale-in': 'scaleIn .25s cubic-bezier(.16,1,.3,1)',
      'slide-up': 'slideUp .35s cubic-bezier(.16,1,.3,1)',
    },
  },
};
