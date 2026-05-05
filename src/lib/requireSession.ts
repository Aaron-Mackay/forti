import { getServerSession } from "next-auth/next";
import { decode } from "next-auth/jwt";
import { headers } from "next/headers";
import type { Session } from "next-auth";
import { authOptions } from "./auth";
import { unauthenticatedResponse } from "@lib/apiResponses";

export class AuthenticationError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthenticationError";
  }
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function authenticationErrorResponse() {
  return unauthenticatedResponse();
}

// Bearer-token fallback for non-browser clients (e.g. React Native) that
// can't use NextAuth's HTTP-only session cookie. Tokens are NextAuth JWEs
// signed with NEXTAUTH_SECRET — same shape the cookie carries.
async function tryBearerSession(): Promise<Session | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const authHeader = (await headers()).get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) return null;

  try {
    const decoded = await decode({ token: rawToken, secret });
    if (!decoded?.id) return null;
    return {
      user: {
        id: decoded.id,
        email: (decoded.email as string | null | undefined) ?? null,
        name: (decoded.name as string | null | undefined) ?? null,
        image: (decoded.picture as string | null | undefined) ?? null,
      },
      expires: typeof decoded.exp === "number"
        ? new Date(decoded.exp * 1000).toISOString()
        : "",
    } satisfies Session;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const cookieSession = await getServerSession(authOptions);
  if (cookieSession) return cookieSession;

  const bearerSession = await tryBearerSession();
  if (bearerSession) return bearerSession;

  throw new AuthenticationError();
}
