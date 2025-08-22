"use client";

import { Button, Box } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import PersonIcon from "@mui/icons-material/Person";
import { signIn } from "next-auth/react";

export default function LoginButtons() {
  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Button
        fullWidth
        variant="outlined"
        startIcon={<GoogleIcon />}
        sx={{
          py: 1.2,
          textTransform: "none",
          fontSize: "1rem",
          borderRadius: 2,
        }}
        onClick={() => signIn("google", { callbackUrl: "/user" })}
      >
        Continue with Google
      </Button>

      <Button
        fullWidth
        variant="contained"
        startIcon={<PersonIcon />}
        sx={{
          py: 1.2,
          textTransform: "none",
          fontSize: "1rem",
          borderRadius: 2,
        }}
        onClick={() => signIn("demo", { callbackUrl: "/user" })}
      >
        Try Demo
      </Button>
    </Box>
  );
}
