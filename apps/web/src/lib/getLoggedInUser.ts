import {getServerSession} from "next-auth/next";
import {authOptions} from "@lib/auth";
import {redirect} from "next/navigation";

const getLoggedInUser = async () => {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  return session.user
}

export default getLoggedInUser