"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box } from "@mui/material";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { ThemeControl } from "@/components/theme-control";
import type { Theme } from "@/lib/theme";

interface Props {
  theme: Theme;
}

export function WorkspaceHeader({ theme }: Props) {
  const pathname = usePathname();
  const isOrganizationsPage = pathname === "/dashboard/organizations";

  return (
    <Box component="header" className="flex h-9 shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
      <Link
        href="/dashboard/organizations"
        className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-tight hover:opacity-80"
      >
        <Box component="span">beacon</Box>
      </Link>

      {!isOrganizationsPage && (
        <>
          <Box component="span" className="text-line">/</Box>
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/"
            afterCreateOrganizationUrl="/"
            afterLeaveOrganizationUrl="/start"
          />
        </>
      )}

      <Box className="ml-auto flex items-center gap-3">
        <ThemeControl initial={theme} />
        <UserButton />
      </Box>
    </Box>
  );
}
