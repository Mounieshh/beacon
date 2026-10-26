import { Box } from "@mui/material";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <Box className="flex flex-1 items-center justify-center">
      <SignIn />
    </Box>
  );
}
