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
  // VERCEL_ENV === 'production' guards against applying a .forti-training.co.uk
  // domain-locked cookie on *.vercel.app preview URLs, where the browser would
  // silently reject it and login would loop back to /login.
  ...(process.env.AUTH_COOKIE_DOMAIN && process.env.VERCEL_ENV === 'production' ? {
    cookies: {
      sessionToken: {
        name: '__Secure-next-auth.session-token',
        options: {
          httpOnly: true,
          sameSite: 'lax' as const,
          path: '/',
          secure: true,
          domain: process.env.AUTH_COOKIE_DOMAIN,
        },
      },
    },
  } : {}),

  callbacks: {
    async redirect({ url, baseUrl }) {
      const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.replace(/^\./, '');
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        const urlOrigin = target.origin;
        const baseOrigin = new URL(baseUrl).origin;
        const isCookieDomainUrl = cookieDomain
          ? target.hostname === cookieDomain || target.hostname.endsWith(`.${cookieDomain}`)
          : false;
        if (urlOrigin === baseOrigin || isCookieDomainUrl) return url;
      } catch {
        // not a valid absolute URL — fall through to default
      }
      return baseUrl;
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
