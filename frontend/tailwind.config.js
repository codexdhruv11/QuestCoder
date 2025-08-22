/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Platform-specific colors
        leetcode: {
          50: '#fff7ed',
          500: '#f97316',
          600: '#ea580c'
        },
        codeforces: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb'
        },
        hackerrank: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a'
        },
        geeksforgeeks: {
          50: '#fefce8',
          500: '#eab308',
          600: '#ca8a04'
        },
        // Enhanced difficulty colors
        'difficulty-easy': {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a'
        },
        'difficulty-medium': {
          50: '#fefce8',
          500: '#eab308',
          600: '#ca8a04'
        },
        'difficulty-hard': {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626'
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "0.75rem",
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      boxShadow: {
        'problem-card': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'problem-card-hover': '0 4px 16px rgba(0, 0, 0, 0.15)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "check": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
        "progress": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "check": "check 0.3s ease-in-out",
        "progress": "progress 0.5s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
