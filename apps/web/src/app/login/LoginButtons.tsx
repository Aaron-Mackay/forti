"use client";

import { useMemo, useState, Suspense } from "react";
import {
  Button,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  TextField,
  Select,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import GoogleIcon from "@mui/icons-material/Google";
import PersonIcon from "@mui/icons-material/Person";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_DEMO_COACH_EMAIL,
  DEFAULT_DEMO_EMAIL,
  DEMO_USER_OPTIONS,
  findDemoUserOption,
} from "@lib/demoUsers";

type DemoProvider = "demo" | "demo-coach";
type LoadingProvider = "google" | DemoProvider | "local-user" | null;

type LoginButtonsProps = {
  enableDemoUserPicker?: boolean;
};

function LoginButtonsInner({ enableDemoUserPicker = false }: LoginButtonsProps) {
  const [loading, setLoading] = useState<LoadingProvider>(null);
  const [selectedDemoEmail, setSelectedDemoEmail] = useState(DEFAULT_DEMO_EMAIL);
  const [localUserEmail, setLocalUserEmail] = useState(process.env.NEXT_PUBLIC_LOCAL_USER_EMAIL ?? "");
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const disableGoogleAuth = process.env.NEXT_PUBLIC_DISABLE_GOOGLE_AUTH === "true";
  const enableLocalUserLogin = process.env.NEXT_PUBLIC_ENABLE_LOCAL_USER_LOGIN === "true";

  const selectedDemoUser = useMemo(() => findDemoUserOption(selectedDemoEmail), [selectedDemoEmail]);
  const selectedProvider: DemoProvider = selectedDemoUser?.role === "coach" ? "demo-coach" : "demo";

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

  const handleSignIn = async (provider: DemoProvider | "google" | "local-user", email?: string) => {
    setLoading(provider);
    await signIn(provider, email ? { callbackUrl, email } : { callbackUrl });
  };

  const handleDemoSelection = (event: SelectChangeEvent<string>) => {
    const nextEmail = event.target.value;
    setSelectedDemoEmail(nextEmail);
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {!disableGoogleAuth ? (
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
      ) : null}

      {enableLocalUserLogin ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Local user email"
            value={localUserEmail}
            disabled={loading !== null}
            onChange={(event) => setLocalUserEmail(event.target.value)}
          />
          <Button
            fullWidth
            variant="outlined"
            startIcon={loading === "local-user" ? <CircularProgress size={18} color="inherit" /> : <PersonIcon />}
            disabled={loading !== null}
            sx={{
              py: 1.2,
              textTransform: "none",
              fontSize: "1rem",
              borderRadius: 2,
            }}
            onClick={() => handleSignIn("local-user", localUserEmail)}
          >
            Continue as local user
          </Button>
        </Box>
      ) : null}

      {enableDemoUserPicker ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="demo-user-select-label">Demo scenario</InputLabel>
            <Select
              labelId="demo-user-select-label"
              value={selectedDemoEmail}
              label="Demo scenario"
              onChange={handleDemoSelection}
              disabled={loading !== null}
            >
              {DEMO_USER_OPTIONS.map((option) => (
                <MenuItem key={option.email} value={option.email}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedDemoUser ? (
            <Typography variant="caption" color="text.secondary" textAlign="left">
              {selectedDemoUser.description}
            </Typography>
          ) : null}
          <Button
            fullWidth
            variant="contained"
            startIcon={loading === selectedProvider ? <CircularProgress size={18} color="inherit" /> : <PersonIcon />}
            disabled={loading !== null}
            sx={{
              py: 1.2,
              textTransform: "none",
              fontSize: "1rem",
              borderRadius: 2,
            }}
            onClick={() => handleSignIn(selectedProvider, selectedDemoEmail)}
          >
            Try selected demo
          </Button>
        </Box>
      ) : (
        <>
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
            onClick={() => handleSignIn("demo", DEFAULT_DEMO_EMAIL)}
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
            onClick={() => handleSignIn("demo-coach", DEFAULT_DEMO_COACH_EMAIL)}
          >
            Try Demo (Coach)
          </Button>
        </>
      )}
    </Box>
  );
}

export default function LoginButtons(props: LoginButtonsProps) {
  return (
    <Suspense fallback={null}>
      <LoginButtonsInner {...props} />
    </Suspense>
  );
}
