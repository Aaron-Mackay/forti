import NextAuth, {AuthOptions} from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Demo login — public "Try Demo" button, logs in as Jeff Demo
    CredentialsProvider({
      id: "demo",
      name: "Demo",
      credentials: {},
      async authorize() {
        const demoEmail = "jeff@example.com";

        let user = await prisma.user.findUnique({where: {email: demoEmail}});

        if (!user) {
          console.error('Demo user not found')
          user = await prisma.user.create({
            data: {
              name: "Jeff Demo",
              email: demoEmail,
            },
          });
        }
        return user;
      },
    }),

    // Demo Coach login — public "Try Demo (Coach)" button, logs in as Todd
    CredentialsProvider({
      id: "demo-coach",
      name: "Demo Coach",
      credentials: {},
      async authorize() {
        const coachEmail = "todd@example.com";

        let user = await prisma.user.findUnique({where: {email: coachEmail}});

        if (!user) {
          console.error('Demo coach user not found')
          user = await prisma.user.create({
            data: {
              name: "Todd",
              email: coachEmail,
            },
          });
        }
        return user;
      },
    }),

    // TestUser login — used exclusively by E2E tests via direct API call
    CredentialsProvider({
      id: "testuser",
      name: "TestUser",
      credentials: {},
      async authorize() {
        const testEmail = "testuser@example.com";

        let user = await prisma.user.findUnique({where: {email: testEmail}});

        if (!user) {
          console.error('TestUser not found')
          user = await prisma.user.create({
            data: {
              name: "TestUser",
              email: testEmail,
            },
          });
        }
        return user;
      },
    }),
  ],

  session: {
    strategy: "jwt", // easier for stateless APIs
  },

  // Redirect unauthenticated users to the custom login page (not NextAuth's built-in page)
  pages: {
    signIn: '/login',
  },

  // Share the session cookie across subdomains only on production deployments.
  // On Vercel preview deployments (VERCEL_ENV === 'preview') the app runs on *.vercel.app,
  // which doesn't match .forti-training.co.uk, so the browser silently rejects a
  // domain-locked cookie and login loops back to /login.
  // VERCEL_ENV is set automatically by Vercel; it is undefined in local dev (where
  // AUTH_COOKIE_DOMAIN is not set anyway).
  ...(() => {
    const cookieDomain = process.env.AUTH_COOKIE_DOMAIN;
    const applyDomain = !!cookieDomain && process.env.VERCEL_ENV === 'production';
    return applyDomain ? {
      cookies: {
        sessionToken: {
          name: '__Secure-next-auth.session-token',
          options: {
            httpOnly: true,
            sameSite: 'lax' as const,
            path: '/',
            secure: true,
            domain: cookieDomain,
          },
        },
      },
    } : {};
  })(),

  callbacks: {
    async redirect({ url, baseUrl }) {
      // On Vercel preview deployments, NEXTAUTH_URL is typically set to the main
      // preview domain (e.g. preview.forti-training.co.uk). Feature-branch
      // deployments run on their own *.vercel.app URL, so the default redirect
      // (based on NEXTAUTH_URL) sends the user to the wrong host after login —
      // their session cookie isn't valid there and the proxy bounces them to /login.
      // Fix: resolve relative callbackUrls against the actual deployment URL.
      const effectiveBase =
        process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : baseUrl;

      if (url.startsWith('/')) return `${effectiveBase}${url}`;
      try {
        const urlOrigin = new URL(url).origin;
        const effectiveOrigin = new URL(effectiveBase).origin;
        const baseOrigin = new URL(baseUrl).origin;
        if (urlOrigin === effectiveOrigin || urlOrigin === baseOrigin) return url;
      } catch {
        // not a valid absolute URL — fall through to default
      }
      return effectiveBase;
    },

    async jwt({token, user}) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({session, token}) {
      session.user.id = token.id;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export {handler as GET, handler as POST};
