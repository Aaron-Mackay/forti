"use client";

import { useState, Suspense } from "react";
import { Button, Box, CircularProgress } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import PersonIcon from "@mui/icons-material/Person";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginButtonsInner() {
  const [loading, setLoading] = useState<"google" | "demo" | "demo-coach" | null>(null);
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");

  const callbackUrl = (() => {
    const fallbackPath = "/user";

    const normalizePath = (path: string) => (
      path.startsWith("/login") || path.startsWith("/api/auth")
        ? fallbackPath
        : path
    );

    const toAbsoluteUrl = (path: string) => {
      if (typeof window === "undefined") return path;
      return new URL(path, window.location.origin).toString();
    };

    if (!rawCallbackUrl) return toAbsoluteUrl(fallbackPath);

    // Avoid bouncing back to login/auth endpoints when callbackUrl is stale or malformed.
    if (rawCallbackUrl.startsWith("/")) {
      return toAbsoluteUrl(normalizePath(rawCallbackUrl));
    }

    if (typeof window === "undefined") return fallbackPath;

    try {
      const parsed = new URL(rawCallbackUrl);
      if (parsed.origin !== window.location.origin) return toAbsoluteUrl(fallbackPath);
      const normalizedPath = normalizePath(`${parsed.pathname}${parsed.search}${parsed.hash}` || fallbackPath);
      return toAbsoluteUrl(normalizedPath);
    } catch {
      return toAbsoluteUrl(fallbackPath);
    }
  })();

  const handleSignIn = async (provider: "google" | "demo" | "demo-coach") => {
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

      <Button
        fullWidth
        variant="outlined"
        startIcon={loading === "demo-coach" ? <CircularProgress size={18} color="inherit" /> : <PersonIcon />}
        disabled={loading !== null}
        sx={{
          py: 1.2,
          textTransform: "none",
          fontSize: "1rem",
          borderRadius: 2,
        }}
        onClick={() => handleSignIn("demo-coach")}
      >
        Try Demo (Coach)
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
