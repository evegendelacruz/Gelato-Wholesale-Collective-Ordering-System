import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'cream-text': '#FCF0E3', // custom color
        primary: "#7A1F1F", // branding primary
        secondary: "#FF5226", // branding secondary
      },
      fontFamily: {
        header: ["'Egyptienne MN'", "serif"], // Header font
        body: ["var(--font-roboto-condensed)", "sans-serif"], // Body font
      },
    },
  },
  plugins: [],
} satisfies Config;
