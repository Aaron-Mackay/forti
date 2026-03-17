"use client";

import { useState, Suspense } from "react";
import { Button, Box, CircularProgress } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import PersonIcon from "@mui/icons-material/Person";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginButtonsInner() {
  const [loading, setLoading] = useState<"google" | "demo" | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/user";

  const handleSignIn = async (provider: "google" | "demo") => {
    setLoading(provider);
    await signIn(provider, { callbackUrl });
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Button
        fullWidth
        variant="outlined"
        startIcon={loading === "google" ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />}
        disabled={loading !== null}
        sx={{
          py: 1.2,
          textTransform: "none",
          fontSize: "1rem",
          borderRadius: 2,
        }}
        onClick={() => handleSignIn("google")}
      >
        Continue with Google
      </Button>

      <Button
        fullWidth
        variant="contained"
        startIcon={loading === "demo" ? <CircularProgress size={18} color="inherit" /> : <PersonIcon />}
        disabled={loading !== null}
        sx={{
          py: 1.2,
          textTransform: "none",
          fontSize: "1rem",
          borderRadius: 2,
        }}
        onClick={() => handleSignIn("demo")}
      >
        Try Demo
      </Button>
    </Box>
  );
}

export default function LoginButtons() {
  return (
    <Suspense fallback={null}>
      <LoginButtonsInner />
    </Suspense>
  );
}
