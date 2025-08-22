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

    // Demo login
    CredentialsProvider({
      id: "demo",
      name: "Demo",
      credentials: {},
      async authorize() {
        // Look up or create a fixed demo user in your DB
        const demoEmail = "bob@example.com";

        let user = await prisma.user.findUnique({where: {email: demoEmail}});

        if (!user) {
          console.error('Demo user not found')
          user = await prisma.user.create({
            data: {
              name: "Demo User",
              email: demoEmail,
              // you could add default plan/weeks/etc here
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
