import {getServerSession} from "next-auth/next";
import {authOptions} from "@lib/auth";
import {forbiddenResponse, unauthenticatedResponse} from '@lib/apiResponses';
import {getCoachFromUser} from "@lib/api";

/**
 * Throws a NextResponse (401/403) if the current session does not match userId
 * or is not the user's assigned coach. Callers should re-throw NextResponse
 * instances from their catch blocks.
 */
const confirmPermission = async (userId: string): Promise<void> => {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw unauthenticatedResponse();
  }
  if (
    session.user.id !== userId &&
    session.user.id !== (await getCoachFromUser(userId))?.coachId
  ) {
    throw forbiddenResponse();
  }
};

export default confirmPermission;