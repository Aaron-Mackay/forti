import {getServerSession} from "next-auth/next";
import {authOptions} from "@lib/auth";
import {NextResponse} from "next/server";
import {getCoachFromUser} from "@lib/api";

// todo needs refactoring
const confirmPermission = async (userId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({error: "Not authenticated"}, {status: 401});
  }
  if (session.user.id !== userId && session.user.id !== (await getCoachFromUser(userId))?.coachId) {
    return NextResponse.json({error: "Not authorized"}, {status: 403});
  }
}

export default confirmPermission