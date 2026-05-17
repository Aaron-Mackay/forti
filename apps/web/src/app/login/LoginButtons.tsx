"use client";

import { useId, useMemo, useState, Suspense, type CSSProperties } from "react";
import {
  Box,
  CircularProgress,
  FormControl,
  MenuItem,
  TextField,
  Select,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { SignalButton } from "@/components/signal/SignalButton";
import { signalTokens, type SignalSurfaceMode } from "@lib/signal/tokens";
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
  surface?: SignalSurfaceMode;
};

function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 013.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function Spinner() {
  return <CircularProgress size={14} style={{ color: 'currentColor' }} />;
}

function OrTryADemo({ surface }: { surface: SignalSurfaceMode }) {
  const palette = signalTokens.surface[surface];
  return (
    <div
      role="separator"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '4px 0',
      }}
    >
      <span style={{ flex: 1, height: 1, background: palette.border }} />
      <span
        style={{
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: palette.inkLight,
        }}
      >
        Or try a demo
      </span>
      <span style={{ flex: 1, height: 1, background: palette.border }} />
    </div>
  );
}

function DemoOptionLabel({
  name,
  description,
  surface,
  compact,
}: {
  name: string;
  description: string;
  surface: SignalSurfaceMode;
  compact?: boolean;
}) {
  const palette = signalTokens.surface[surface];
  return (
    <span style={{ display: 'block', minWidth: 0 }}>
      <span
        style={{
          display: 'block',
          fontWeight: 600,
          fontSize: 13,
          color: palette.ink,
          lineHeight: 1.2,
          whiteSpace: compact ? 'nowrap' : 'normal',
          overflow: compact ? 'hidden' : undefined,
          textOverflow: compact ? 'ellipsis' : undefined,
        }}
      >
        {name}
      </span>
      <span
        style={{
          display: 'block',
          fontSize: 11,
          color: palette.inkMid,
          lineHeight: 1.3,
          marginTop: 2,
          whiteSpace: compact ? 'nowrap' : 'normal',
          overflow: compact ? 'hidden' : undefined,
          textOverflow: compact ? 'ellipsis' : undefined,
        }}
      >
        {description}
      </span>
    </span>
  );
}

function LoginButtonsInner({ enableDemoUserPicker = false, surface = 'planning' }: LoginButtonsProps) {
  const [loading, setLoading] = useState<LoadingProvider>(null);
  const [selectedDemoEmail, setSelectedDemoEmail] = useState(DEFAULT_DEMO_EMAIL);
  const [localUserEmail, setLocalUserEmail] = useState(process.env.NEXT_PUBLIC_LOCAL_USER_EMAIL ?? "");
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const errorCode = searchParams.get("error");
  const disableGoogleAuth = process.env.NEXT_PUBLIC_DISABLE_GOOGLE_AUTH === "true";
  const enableLocalUserLogin = process.env.NEXT_PUBLIC_ENABLE_LOCAL_USER_LOGIN === "true";
  const demoSelectId = useId();
  const palette = signalTokens.surface[surface];

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

  const errorBannerStyle: CSSProperties = {
    border: `1px solid ${signalTokens.status.urgent}`,
    borderRadius: signalTokens.radii.card,
    padding: '8px 10px',
    marginBottom: 12,
    background: 'transparent',
    color: signalTokens.status.urgent,
    fontFamily: signalTokens.fontVar.body,
    fontSize: 12,
    lineHeight: 1.4,
  };

  const errorCodeStyle: CSSProperties = {
    display: 'block',
    marginTop: 4,
    fontFamily: signalTokens.fontVar.mono,
    fontSize: 10,
    color: palette.inkLight,
    letterSpacing: '0.04em',
  };

  const showOrDivider = !disableGoogleAuth;

  return (
    <Box display="flex" flexDirection="column" gap={1.25}>
      {errorCode ? (
        <div role="alert" style={errorBannerStyle}>
          Sign-in failed. Please try again.
          <span style={errorCodeStyle}>{errorCode}</span>
        </div>
      ) : null}

      {!disableGoogleAuth ? (
        <SignalButton
          intent="outlined"
          surface={surface}
          fullWidth
          startIcon={loading === "google" ? <Spinner /> : <GoogleGlyph />}
          disabled={loading !== null}
          onClick={() => handleSignIn("google")}
          style={{ paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
        >
          Continue with Google
        </SignalButton>
      ) : null}

      {showOrDivider ? <OrTryADemo surface={surface} /> : null}

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
          <SignalButton
            intent="ghost"
            surface={surface}
            fullWidth
            startIcon={loading === "local-user" ? <Spinner /> : null}
            disabled={loading !== null}
            onClick={() => handleSignIn("local-user", localUserEmail)}
            style={{ paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
          >
            Continue as local user
          </SignalButton>
        </Box>
      ) : null}

      {enableDemoUserPicker ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <FormControl fullWidth size="small">
            <Select
              id={demoSelectId}
              value={selectedDemoEmail}
              onChange={handleDemoSelection}
              disabled={loading !== null}
              displayEmpty
              inputProps={{ 'aria-label': 'Demo scenario' }}
              renderValue={(value) => {
                const opt = findDemoUserOption(value as string);
                if (!opt) return null;
                return (
                  <DemoOptionLabel
                    name={opt.name}
                    description={opt.description}
                    surface={surface}
                    compact
                  />
                );
              }}
              MenuProps={{
                PaperProps: {
                  sx: { maxHeight: 360 },
                },
              }}
              sx={{
                '& .MuiSelect-select': {
                  paddingTop: '8px',
                  paddingBottom: '8px',
                },
              }}
            >
              {DEMO_USER_OPTIONS.map((option) => (
                <MenuItem key={option.email} value={option.email} sx={{ alignItems: 'flex-start', py: 1 }}>
                  <DemoOptionLabel
                    name={option.name}
                    description={option.description}
                    surface={surface}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <SignalButton
            intent="ghost"
            surface={surface}
            fullWidth
            startIcon={loading === selectedProvider ? <Spinner /> : null}
            disabled={loading !== null}
            onClick={() => handleSignIn(selectedProvider, selectedDemoEmail)}
            style={{ paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
          >
            Try selected demo
          </SignalButton>
        </Box>
      ) : (
        <>
          <SignalButton
            intent="ghost"
            surface={surface}
            fullWidth
            startIcon={loading === "demo" ? <Spinner /> : null}
            disabled={loading !== null}
            onClick={() => handleSignIn("demo", DEFAULT_DEMO_EMAIL)}
            style={{ paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
          >
            Try Demo
          </SignalButton>

          <SignalButton
            intent="ghost"
            surface={surface}
            fullWidth
            startIcon={loading === "demo-coach" ? <Spinner /> : null}
            disabled={loading !== null}
            onClick={() => handleSignIn("demo-coach", DEFAULT_DEMO_COACH_EMAIL)}
            style={{ paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
          >
            Try Demo (Coach)
          </SignalButton>
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
