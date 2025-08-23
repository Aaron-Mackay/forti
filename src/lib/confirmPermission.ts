import {getServerSession} from "next-auth/next";
import {authOptions} from "@lib/auth";
import {NextResponse} from "next/server";

const confirmPermission = async (userId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    console.log('no session', session)
    return NextResponse.json({error: "Not authenticated"}, {status: 401});
  }
  if (session.user.id !== userId) {
    return NextResponse.json({error: "Not authorized"}, {status: 403});
  }
}

export default confirmPermission