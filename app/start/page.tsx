import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Box } from "@mui/material";
import { Activate } from "./activate";

export default async function StartPage() {
  const { orgId } = await auth();
  if (orgId) redirect("/");

  return (
    <Box sx={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Activate />
    </Box>
  );
}
