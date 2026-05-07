import { getServerSession } from "next-auth/next";
import { headers } from "next/headers";
import type { Session } from "next-auth";
import { decodeJwt } from "jose";
import prisma from "@/lib/prisma";
import { authOptions } from "./auth";
import { unauthenticatedResponse } from "@lib/apiResponses";
import { verifyMobileAccessToken } from "./mobileAuth";

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

function buildSession(user: {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}, expires: string): Session {
  return {
    user,
    expires,
  } satisfies Session;
}

async function tryBearerSession(): Promise<Session | null> {
  const authHeader = (await headers()).get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) throw new AuthenticationError();

  try {
    const payload = await verifyMobileAccessToken(rawToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });
    if (!user) throw new AuthenticationError();

    const { exp } = decodeJwt(rawToken);
    const expires = typeof exp === "number"
      ? new Date(exp * 1000).toISOString()
      : new Date().toISOString();

    return buildSession(user, expires);
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    throw new AuthenticationError();
  }
}

export async function requireSession(): Promise<Session> {
  const bearerSession = await tryBearerSession();
  if (bearerSession) return bearerSession;

  const cookieSession = await getServerSession(authOptions);
  if (cookieSession?.user) return cookieSession;

  throw new AuthenticationError();
}
