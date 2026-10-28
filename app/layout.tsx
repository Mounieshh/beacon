import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import "./globals.css";
import { MuiThemeProvider } from "@/components/mui-theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Beacon | AI-Powered Codebase Dependency Mapper",
  description:
    "Turn TypeScript & JavaScript repositories into deterministic dependency graphs with blast radius analysis and automated security audits.",
};

// Clerk appearance configuration. If theme is "dark", baseTheme: dark is applied.
// In addition, globals.css overrides Clerk classes using CSS variables (--surface, --fg, etc.)
// so that when theme is "system" with OS dark mode, it automatically adapts cleanly.
function getClerkAppearance(theme: "light" | "dark" | "system") {
  const isDark = theme === "dark";
  return {
    baseTheme: isDark ? dark : undefined,
    variables: {
      colorPrimary: isDark ? "#3b82f6" : "#2563eb",
      colorPrimaryForeground: "#ffffff",
      fontFamily: "var(--font-geist-sans)",
      fontSize: "0.8125rem",
      borderRadius: "0.5rem",
    },
    elements: {
      card: "shadow-lg border border-[var(--line)] bg-[var(--surface)] rounded-xl",
      formButtonPrimary:
        "bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs h-9 transition-colors shadow-sm rounded-md",
      socialButtonsBlockButton:
        "border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-[var(--fg)] text-xs font-medium h-9 rounded-md transition-colors",
      socialButtonsBlockButtonText: "text-[var(--fg)] font-medium text-xs",
      formFieldLabel: "text-[var(--fg)] font-medium text-xs",
      formFieldInput:
        "border border-[var(--line)] bg-[var(--canvas)] text-[var(--fg)] text-xs h-9 rounded-md focus:border-[#2563eb]",
      footer: "bg-[var(--surface)] border-t border-[var(--line)]",
      footerAction: "bg-[var(--surface)]",
      footerActionText: "text-[var(--fg-muted)] text-xs",
      footerActionLink: "text-[#2563eb] dark:text-[#3b82f6] font-medium hover:underline",
      dividerLine: "bg-[var(--line)]",
      dividerText: "text-[var(--fg-muted)] text-[11px]",
      headerTitle: "text-[var(--fg)] font-semibold text-lg",
      headerSubtitle: "text-[var(--fg-muted)] text-xs",
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col">
        <ClerkProvider appearance={getClerkAppearance(theme)}>
          <MuiThemeProvider>{children}</MuiThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
