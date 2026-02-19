/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './src/renderer/**/*.{js,ts,jsx,tsx,html}'
  ],
  theme: {
    extend: {
      colors: {
        sidebar: 'rgba(246, 246, 246, 0.95)',
        'sidebar-dark': 'rgba(40, 40, 40, 0.95)',
        accent: '#007AFF',
        'accent-hover': '#0056CC'
      },
      backdropBlur: {
        macos: '20px'
      },
      borderRadius: {
        macos: '10px'
      },
      boxShadow: {
        macos: '0 4px 12px rgba(0, 0, 0, 0.08)',
        'macos-lg': '0 8px 30px rgba(0, 0, 0, 0.12)'
      }
    }
  },
  plugins: []
}
