/** @type {import('tailwindcss').Config} */
// Tokens mirror the "TechStock Emerald" design system (Stitch design.md).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F8FA',
        surface: '#FFFFFF',
        hairline: '#ECEFF3',
        ink: { 800: '#1E293B', 900: '#0F172A' },
        primary: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          DEFAULT: '#10B981',
        },
        accent: { pink: '#EC4899', teal: '#14B8A6', amber: '#F59E0B' },
        content: {
          DEFAULT: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
        'card-hover': '0 4px 12px rgba(16,24,40,0.08)',
      },
    },
  },
  plugins: [],
};
