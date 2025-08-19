import type {Metadata} from "next";
import {Roboto} from "next/font/google";
import "./globals.css";
import {Box, GlobalStyles, ThemeProvider} from "@mui/material";
import {AppRouterCacheProvider} from "@mui/material-nextjs/v14-appRouter";
import theme from "@/lib/theme";
import {SpeedInsights} from "@vercel/speed-insights/next"
import {Analytics} from "@vercel/analytics/next"
import {DateLocalizationProvider} from "@lib/DateLocalization";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Forti",
};

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={roboto.className}>
    <body>
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <GlobalStyles
          styles={{
            "@keyframes mui-auto-fill": {from: {display: "block"}},
            "@keyframes mui-auto-fill-cancel": {from: {display: "block"}},
          }}
        />
        <DateLocalizationProvider>
          <Box sx={{ backgroundColor: 'background.default', minHeight: '100dvh' }}>
            {children}
          </Box>
        </DateLocalizationProvider>
        <SpeedInsights/>
        <Analytics/>
      </ThemeProvider>
    </AppRouterCacheProvider>
    </body>
    </html>
  );
}
