import type {Metadata, Viewport} from "next";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "./globals.css";
import {Box, GlobalStyles, ThemeProvider} from "@mui/material";
import {AppRouterCacheProvider} from "@mui/material-nextjs/v14-appRouter";
import theme, {PRIMARY_COLOUR} from "@/lib/theme";
import {SpeedInsights} from "@vercel/speed-insights/next"
import {Analytics} from "@vercel/analytics/next"
import {DateLocalizationProvider} from "@lib/providers/DateLocalizationProvider";
import AuthProvider from "@lib/providers/AuthProvider";
import NextTopLoader from "nextjs-toploader";
import {getServerSession} from "next-auth/next";
import {authOptions} from "@lib/auth";

export const metadata: Metadata = {
  title: "Forti",
};

export const viewport: Viewport = {
  themeColor: PRIMARY_COLOUR,
}

export default async function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
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
        <DateLocalizationProvider>
          <AuthProvider session={session}>
            <Box sx={{backgroundColor: 'background.default', minHeight: '100dvh'}}>
              {children}
            </Box>
          </AuthProvider>
        </DateLocalizationProvider>
        <SpeedInsights/>
        <Analytics/>
      </ThemeProvider>
    </AppRouterCacheProvider>
    </body>
    </html>
  );
}
