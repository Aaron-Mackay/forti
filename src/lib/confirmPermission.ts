import {getServerSession} from "next-auth/next";
import {authOptions} from "@lib/auth";
import {NextResponse} from "next/server";
import {getCoachFromUser} from "@lib/api";

/**
 * Throws a NextResponse (401/403) if the current session does not match userId
 * or is not the user's assigned coach. Callers should re-throw NextResponse
 * instances from their catch blocks.
 */
const confirmPermission = async (userId: string): Promise<void> => {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw NextResponse.json({error: "Not authenticated"}, {status: 401});
  }
  if (
    session.user.id !== userId &&
    session.user.id !== (await getCoachFromUser(userId))?.coachId
  ) {
    throw NextResponse.json({error: "Not authorized"}, {status: 403});
  }
};

export default confirmPermission;