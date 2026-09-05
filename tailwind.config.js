/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#090D16',
          canvas: '#090D16',
          surface: '#111726',
          elevated: '#182238',
          border: 'rgba(255, 255, 255, 0.08)',
          highlight: 'rgba(255, 255, 255, 0.14)',
          muted: '#94A3B8',
          text: '#F8FAFC',
        },
        brand: {
          indigo: '#6366F1',
          violet: '#8B5CF6',
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
