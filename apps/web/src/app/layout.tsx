import type {Metadata, Viewport} from "next";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "./globals.css";
import {Box, GlobalStyles, ThemeProvider} from "@mui/material";
import {AppRouterCacheProvider} from "@mui/material-nextjs/v14-appRouter";
import theme, {PRIMARY_COLOUR} from "@/lib/theme";
import AuthProvider from "@lib/providers/AuthProvider";
import NextTopLoader from "nextjs-toploader";
import { DeferredTelemetry } from "@/components/shell/DeferredTelemetry";

export const metadata: Metadata = {
  title: "Forti",
};

export const viewport: Viewport = {
  themeColor: PRIMARY_COLOUR,
}

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  const telemetryEnabled = process.env.NODE_ENV === "production";
  return (
    <html lang="en">
    <body>
    <AppRouterCacheProvider>
      <NextTopLoader color={PRIMARY_COLOUR} showSpinner={false} />
      <ThemeProvider theme={theme}>
        <GlobalStyles
          styles={{
            html: { margin: 0, padding: 0 },
            body: { margin: 0, padding: 0 },
            "@keyframes mui-auto-fill": {from: {display: "block"}},
            "@keyframes mui-auto-fill-cancel": {from: {display: "block"}},
          }}
        />
        <AuthProvider>
          <Box sx={{backgroundColor: 'background.default', minHeight: '100dvh'}}>
            {children}
          </Box>
        </AuthProvider>
        {telemetryEnabled ? <DeferredTelemetry /> : null}
      </ThemeProvider>
    </AppRouterCacheProvider>
    </body>
    </html>
  );
}
