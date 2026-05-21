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
        brand: '#2563eb',
        sidebar: '#1e293b',
        sidebarHover: '#334155',
      }
    },
  },
  plugins: [],
}