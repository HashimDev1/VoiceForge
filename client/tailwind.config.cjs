/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../shared/src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          950: 'var(--bg-studio-950, #090a0f)',
          900: 'var(--bg-studio-900, #0f111a)',
          850: 'var(--bg-studio-850, #151824)',
          800: 'var(--bg-studio-800, #1c2030)',
          700: 'var(--bg-studio-700, #2a3047)',
          600: 'var(--bg-studio-600, #3e4666)',
          border: 'var(--border-studio, #23293c)',
          accent: '#6366f1',
          accentHover: '#4f46e5',
          cyan: '#06b6d4',
          emerald: '#10b981',
          rose: '#f43f5e'
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['Space Mono', 'JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
};
