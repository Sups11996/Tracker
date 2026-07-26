/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4: scan all component files
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.{js,ts}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand palette — swap freely
        primary: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        // Semantic surface tokens
        surface: '#FFFFFF',
        background: '#F8FAFC',
        border: '#E2E8F0',
        // Health feature accent colours (reserved for future features)
        steps:    '#10B981', // emerald
        water:    '#06B6D4', // cyan
        sleep:    '#8B5CF6', // violet
        calories: '#F59E0B', // amber
        screen:   '#EF4444', // red
      },
      fontFamily: {
        sans: ['System'], // replaced per platform by RN
      },
    },
  },
  plugins: [],
};
