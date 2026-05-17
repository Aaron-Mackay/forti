'use client';

import Image from "next/image";
import { ThemeProvider } from "@mui/material/styles";
import { FortiWordmark } from "@/components/signal/FortiWordmark";
import { signalTokens } from "@lib/signal/tokens";
import { signalThemes } from "@lib/signal/theme";
import LoginButtons from "./LoginButtons";

const gym = signalTokens.surface.gym;
const planning = signalTokens.surface.planning;
const desktopBp = signalTokens.space.desktopBreakpointPx;

function isProductionAuthEnvironment() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function BetaPill({ variant }: { variant: 'gym' | 'planning' }) {
  const color = variant === 'gym' ? signalTokens.signal.base : signalTokens.signal.deep;
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: signalTokens.fontVar.mono,
        fontSize: 10,
        lineHeight: 1,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: '3px 8px',
      }}
    >
      Beta
    </span>
  );
}

export default function LoginPage() {
  const enableDemoUserPicker = !isProductionAuthEnvironment();

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: gym.bg,
        color: gym.ink,
        fontFamily: signalTokens.fontVar.body,
      }}
    >
      <style>{`
        .signal-login-mobile { display: flex; }
        .signal-login-desktop { display: none; }
        @media (min-width: ${desktopBp}px) {
          .signal-login-mobile { display: none; }
          .signal-login-desktop { display: grid; }
        }
      `}</style>

      {/* Mobile: full gym surface, single viewport */}
      <ThemeProvider theme={signalThemes.gym}>
        <div
          className="signal-login-mobile"
          style={{
            position: 'relative',
            flexDirection: 'column',
            height: '100dvh',
            padding: '20px 20px 24px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ position: 'absolute', top: 16, right: 20 }}>
            <BetaPill variant="gym" />
          </div>

          <div style={{ flex: 1, minHeight: 16 }} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Image
              src="/forti-icon.svg"
              alt=""
              width={168}
              height={168}
              priority
              style={{ filter: 'brightness(0) invert(0.94)' }}
            />
            <FortiWordmark size={56} color={gym.ink} glyphColor={gym.ink} />
          </div>

          <div style={{ flex: 1, minHeight: 16 }} />

          <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>
            <LoginButtons enableDemoUserPicker={enableDemoUserPicker} surface="gym" />
          </div>
        </div>
      </ThemeProvider>

      {/* Desktop: gym hero + planning form split */}
      <div
        className="signal-login-desktop"
        style={{
          gridTemplateColumns: '1fr 1fr',
          minHeight: '100dvh',
        }}
      >
        <aside
          style={{
            background: gym.bg,
            color: gym.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 48,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <Image
              src="/forti-icon.svg"
              alt=""
              width={168}
              height={168}
              priority
              style={{ filter: 'brightness(0) invert(0.94)' }}
            />
            <FortiWordmark size={56} color={gym.ink} glyphColor={signalTokens.signal.base} />
            <BetaPill variant="gym" />
          </div>
        </aside>

        <ThemeProvider theme={signalThemes.planning}>
          <main
            style={{
              background: planning.bg,
              color: planning.ink,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <section
              style={{
                width: '100%',
                maxWidth: 400,
                background: planning.surface,
                border: `1px solid ${planning.border}`,
                borderRadius: signalTokens.radii.cardLarge,
                padding: '24px 20px 20px',
              }}
            >
              <h1
                style={{
                  fontFamily: signalTokens.fontVar.cond,
                  fontSize: 30,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.015em',
                  color: planning.ink,
                  margin: 0,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                Sign in
              </h1>

              <LoginButtons enableDemoUserPicker={enableDemoUserPicker} surface="planning" />
            </section>
          </main>
        </ThemeProvider>
      </div>
    </div>
  );
}
