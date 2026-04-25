import NextAuth, {AuthOptions} from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { AuditEventType } from '@/generated/prisma/browser';
import { recordAuditEvent } from '@lib/auditEvents';

function isAllowedDevTunnelHost(hostname: string) {
  if (process.env.NODE_ENV === 'production') return false;
  return hostname.endsWith('.trycloudflare.com');
}

function isProductionAuthEnvironment() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function shouldEnableTestUserProvider() {
  if (process.env.ENABLE_TEST_AUTH === 'true') return true;
  return !isProductionAuthEnvironment();
}

export const authOptions: AuthOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
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

    ...(shouldEnableTestUserProvider() ? [
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
    ] : []),
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
        const isAllowedDevTunnelUrl = isAllowedDevTunnelHost(target.hostname);
        if (urlOrigin === baseOrigin || isCookieDomainUrl || isAllowedDevTunnelUrl) return url;
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

  events: {
    async signIn({ user, account }) {
      if (!user.id) return;

      const provider = account?.provider;
      if (provider !== 'google' && provider !== 'demo' && provider !== 'demo-coach') {
        return;
      }

      const isGoogle = provider === 'google';
      await recordAuditEvent({
        actorUserId: user.id,
        eventType: AuditEventType.LoginSucceeded,
        analyticsEvent: isGoogle ? 'login_succeeded_google' : 'login_succeeded_demo',
        analyticsData: {
          provider: isGoogle ? 'google' : 'demo',
          isCoach: provider === 'demo-coach',
        },
        subjectType: 'user',
        subjectId: user.id,
        metadata: {
          provider: provider ?? 'unknown',
          isCoach: provider === 'demo-coach',
        },
      });
    },
  },
};

const handler = NextAuth(authOptions);
export {handler as GET, handler as POST};
