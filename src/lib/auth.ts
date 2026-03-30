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
