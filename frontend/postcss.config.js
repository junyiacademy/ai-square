module.exports = {
  plugins: {
    '@tailwindcss/postcss': {
      base: '/Users/young/project/ai-square/frontend',
      content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
      ],
    },
  },
}