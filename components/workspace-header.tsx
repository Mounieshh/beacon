"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <header className="flex h-9 shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
      <Link
        href="/dashboard/organizations"
        className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-tight hover:opacity-80"
      >
        <span>beacon</span>
      </Link>

      {!isOrganizationsPage && (
        <>
          <span className="text-line">/</span>
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/"
            afterCreateOrganizationUrl="/"
            afterLeaveOrganizationUrl="/start"
          />
        </>
      )}

      <div className="ml-auto flex items-center gap-3">
        <ThemeControl initial={theme} />
        <UserButton />
      </div>
    </header>
  );
}
