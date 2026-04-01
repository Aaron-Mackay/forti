import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

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
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new AuthenticationError();
  }
  return session;
}
