/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4f46e5',
          hover: '#4338ca',
          light: '#6366f1',
          violet: '#7c3aed',
        },
        sidebar: '#0f172a',
        sidebarHover: '#1e293b',
      }
    },
  },
  plugins: [],
}