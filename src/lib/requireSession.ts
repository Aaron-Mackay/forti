import { getServerSession } from "next-auth/next";
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

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new AuthenticationError();
  }
  return session;
}
