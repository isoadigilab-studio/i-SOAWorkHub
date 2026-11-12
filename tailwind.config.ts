import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#14243B",
        accent: "#FF6B35",
        bg: "#F7F9FC",
        ink: "#172033",
        muted: "#64748B",
        line: "#E2E8F0",
      },
    },
  },
  plugins: [],
};
export default config;
