import NextAuth, {AuthOptions} from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { recordSignInAuditEvent } from '@lib/recordSignInAuditEvent';
import {
  DEFAULT_DEMO_COACH_EMAIL,
  DEFAULT_DEMO_EMAIL,
  defaultSettingsForDemoUser,
  findDemoUserOption,
  resolveDemoUserEmail,
} from '@lib/demoUsers';

async function findUserByEmail(email: string) {
  // The generated Prisma client has intermittently thrown opaque "Invalid
  // findUnique invocation" errors in the NextAuth credentials callback path
  // under local E2E runtime. `email` is still unique at the schema level, so
  // `findFirst` preserves behavior while avoiding the failing selector path.
  return prisma.user.findFirst({ where: { email } });
}

function isAllowedDevTunnelHost(hostname: string) {
  if (process.env.NODE_ENV === 'production') return false;
  return hostname.endsWith('.trycloudflare.com');
}

function isProductionAuthEnvironment(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production';
}

function shouldEnableLocalUserLogin(env: NodeJS.ProcessEnv = process.env) {
  return env.LOCAL_USER_LOGIN === "true" && !isProductionAuthEnvironment(env);
}

function shouldEnableGoogleProvider(env: NodeJS.ProcessEnv = process.env) {
  return env.DISABLE_GOOGLE_AUTH !== "true";
}

function shouldEnableTestUserProvider(env: NodeJS.ProcessEnv = process.env) {
  if (env.ENABLE_TEST_AUTH === 'true') return true;
  return !isProductionAuthEnvironment(env);
}

function parseAllowedLocalUserEmails(env: NodeJS.ProcessEnv = process.env) {
  const rawEmails = env.LOCAL_USER_EMAILS || env.LOCAL_USER_EMAIL || "";

  return new Set(
    rawEmails
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function authorizeLocalUser(credentials: Record<string, unknown> | undefined, env: NodeJS.ProcessEnv = process.env) {
  const email = typeof credentials?.email === 'string'
    ? credentials.email.trim().toLowerCase()
    : "";

  if (!email) return null;

  const allowedEmails = parseAllowedLocalUserEmails(env);
  if (allowedEmails.size === 0) {
    console.error("Local user login is enabled, but no LOCAL_USER_EMAIL or LOCAL_USER_EMAILS allowlist was configured");
    return null;
  }

  if (!allowedEmails.has(email)) {
    console.error(`Local user login denied for disallowed email: ${email}`);
    return null;
  }

  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`Local user not found: ${email}`);
    return null;
  }

  return user;
}

function createLocalUserProvider(env: NodeJS.ProcessEnv = process.env) {
  if (!shouldEnableLocalUserLogin(env)) return null;

  return CredentialsProvider({
    id: "local-user",
    name: "Local User",
    credentials: {
      email: { label: 'Email', type: 'text' },
    },
    async authorize(credentials) {
      return authorizeLocalUser(credentials, env);
    },
  });
}

function selectedDemoEmail(credentials: Record<string, unknown> | undefined, fallbackEmail: string, env: NodeJS.ProcessEnv = process.env) {
  if (isProductionAuthEnvironment(env)) return fallbackEmail;
  const requestedEmail = typeof credentials?.email === 'string' ? credentials.email : null;
  return resolveDemoUserEmail(requestedEmail, fallbackEmail);
}

async function findOrCreateDemoUser(email: string) {
  const option = findDemoUserOption(email);
  const fallbackName = option?.role === 'coach' ? 'Todd Coach' : 'Jeff Demo';
  let user = await findUserByEmail(email);

  if (!user) {
    console.error(`Demo user not found: ${email}`);
    user = await prisma.user.create({
      data: {
        name: option?.name ?? fallbackName,
        email,
        settings: defaultSettingsForDemoUser(email),
      },
    });
  }

  return user;
}

export function getAuthProviders(env: NodeJS.ProcessEnv = process.env) {
  const localUserProvider = createLocalUserProvider(env);

  return [
    ...(shouldEnableGoogleProvider(env) ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ] : []),

    // Demo login — public "Try Demo" button, logs in as Jeff Demo in production.
    // Outside production, the login page can pass a whitelisted scenario email.
    CredentialsProvider({
      id: "demo",
      name: "Demo",
      credentials: {
        email: { label: 'Demo user email', type: 'text' },
      },
      async authorize(credentials) {
        const demoEmail = selectedDemoEmail(credentials, DEFAULT_DEMO_EMAIL, env);
        return findOrCreateDemoUser(demoEmail);
      },
    }),

    // Demo Coach login — public "Try Demo (Coach)" button, logs in as Todd in production.
    // Outside production, the login page can pass a whitelisted scenario email.
    CredentialsProvider({
      id: "demo-coach",
      name: "Demo Coach",
      credentials: {
        email: { label: 'Demo coach email', type: 'text' },
      },
      async authorize(credentials) {
        const coachEmail = selectedDemoEmail(credentials, DEFAULT_DEMO_COACH_EMAIL, env);
        return findOrCreateDemoUser(coachEmail);
      },
    }),

    ...(localUserProvider ? [localUserProvider] : []),

    ...(shouldEnableTestUserProvider(env) ? [
      // TestUser login — used exclusively by E2E tests via direct API call
      CredentialsProvider({
        id: "testuser",
        name: "TestUser",
        credentials: {},
        async authorize() {
          const testEmail = "testuser@example.com";

          let user = await findUserByEmail(testEmail);

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
  ];
}

export const authOptions: AuthOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  providers: getAuthProviders(),

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

      await recordSignInAuditEvent({
        userId: user.id,
        provider,
      });
    },
  },
};

const handler = NextAuth(authOptions);
export {handler as GET, handler as POST};
