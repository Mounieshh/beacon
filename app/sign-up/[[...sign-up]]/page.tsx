import Link from "next/link";
import { Box } from "@mui/material";
import { SignUp } from "@clerk/nextjs";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function SignUpPage() {
  return (
    <Box className="flex min-h-screen flex-col items-center justify-center bg-[var(--canvas)] p-4">
      <Box className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        >
          <ArrowBackIcon sx={{ fontSize: 13 }} />
          Back to Beacon
        </Link>
      </Box>
      <SignUp />
    </Box>
  );
}
