import Link from "next/link";
import { Box } from "@mui/material";
import { SignIn } from "@clerk/nextjs";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { ThemeControl } from "@/components/theme-control";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export default async function SignInPage() {
  const cookieStore = await cookies();
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <Box className="flex min-h-screen flex-col bg-[var(--canvas)] text-[var(--fg)]">
      {/* Top Header */}
      <header className="flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--surface)]/80 px-4 backdrop-blur-md sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[12px] font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 14 }} />
          <span>Back to Beacon</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeControl initial={theme} height={30} />
        </div>
      </header>

      {/* Centered Sign In Card */}
      <Box className="flex flex-1 items-center justify-center p-4">
        <SignIn />
      </Box>
    </Box>
  );
}
