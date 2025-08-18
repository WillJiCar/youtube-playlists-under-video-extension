module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {},
  },
  plugins: [],
  corePlugins: {
    preflight: false // Disable default styles to avoid conflicts
  }
}