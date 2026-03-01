/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SFDP Brand Colors - Dark Navy Blue with metallic orange accent
        primary: {
          50: '#eef0f5',
          100: '#c4ccdf',
          200: '#8896bb',
          300: '#5a6a99',
          400: '#3d4a7a',
          500: '#2c3764',
          600: '#252e54',
          700: '#1e2544',
          800: '#171c2e',
          900: '#0f1219',
        },
        // Metallic Orange/Gold accent
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Accent colors for platforms
        twitter: '#1DA1F2',
        youtube: '#FF0000',
        instagram: '#E4405F',
        facebook: '#1877F2',
      },
    },
  },
  plugins: [],
};
