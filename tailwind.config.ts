import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0e14",
        panel: "#151a23",
        panel2: "#1b222d",
        line: "#2b3442",
        muted: "#9ca3af",
        gold: "#e8bd62",
        gold2: "#f0cf7d",
        ink: "#f4f4f5",
      },
    },
  },
  plugins: [],
};
export default config;
