import { Box } from "@mui/material";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { WorkspaceHeader } from "@/components/workspace-header";

// Everything inside the app renders within this shell, always under an
// active organization. No organization yet means first sign-in: /start
// resolves one before the workspace is shown.
export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  const { orgId } = await auth();
  if (!orgId) redirect("/start");

  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <Box className="flex min-h-0 flex-1 flex-col">
      <WorkspaceHeader theme={theme} />
      <Box component="main" className="min-h-0 flex-1 overflow-auto">{children}</Box>
    </Box>
  );
}
