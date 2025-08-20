module.exports = {
  content: ["./**/*.{html,js,ts,tsx,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        'segoue': "Segoe UI"
      },
      colors:{
        soft: "#212121"
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false // Disable default styles to avoid conflicts
  }
}