import { ClerkProvider } from "@clerk/nextjs";
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
  title: "Beacon",
  description: "Dependency maps of public GitHub repositories",
};

// Clerk's components read concrete colors based on active theme so contrast
// calculations and primary buttons render cleanly in both light and dark modes.
function getClerkAppearance(theme: "light" | "dark" | "system") {
  const isDark = theme === "dark";
  return {
    variables: {
      colorPrimary: isDark ? "#3b82f6" : "#2563eb",
      colorPrimaryForeground: "#ffffff",
      colorBackground: isDark ? "#141416" : "#ffffff",
      colorInputBackground: isDark ? "#09090b" : "#ffffff",
      colorInputText: isDark ? "#f8fafc" : "#0f172a",
      colorText: isDark ? "#f8fafc" : "#0f172a",
      colorTextSecondary: isDark ? "#94a3b8" : "#475569",
      colorTextOnPrimaryBackground: "#ffffff",
      colorNeutral: isDark ? "#f8fafc" : "#0f172a",
      colorBorder: isDark ? "#333338" : "#cbd5e1",
      fontFamily: "var(--font-geist-sans)",
      fontSize: "0.8125rem",
      borderRadius: "0.375rem",
    },
    elements: {
      card: "shadow-md border border-[var(--line)] bg-[var(--surface)] rounded-lg",
      formButtonPrimary:
        "bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs h-9 transition-colors shadow-sm rounded-md",
      socialButtonsBlockButton:
        "border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-[var(--fg)] text-xs font-medium h-9 rounded-md transition-colors",
      socialButtonsBlockButtonText: "text-[var(--fg)] font-medium text-xs",
      formFieldLabel: "text-[var(--fg)] font-medium text-xs",
      formFieldInput:
        "border border-[var(--line)] bg-[var(--canvas)] text-[var(--fg)] text-xs h-9 rounded-md focus:border-[#2563eb]",
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
