import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import {unauthenticatedResponse} from '@lib/apiResponses';

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw unauthenticatedResponse();
  }
  return session;
}