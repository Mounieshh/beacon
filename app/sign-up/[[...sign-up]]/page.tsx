import { Box } from "@mui/material";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <Box className="flex flex-1 items-center justify-center">
      <SignUp />
    </Box>
  );
}
