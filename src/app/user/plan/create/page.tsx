import {getExercises, getUserData} from "@lib/api";
import {notFound} from "next/navigation";
import PlanBuilderWithContext from "@/app/user/plan/create/PlanBuilderWithContext";
import {Exercise} from "@prisma/client";
import getLoggedInUser from "@lib/getLoggedInUser";
import prisma from "@lib/prisma";

const PlanCreatePage = async ({ searchParams }: { searchParams: Promise<{ forUserId?: string }> }) => {
  const loggedInUser = await getLoggedInUser()
  const { forUserId } = await searchParams

  let targetUserId = loggedInUser.id

  if (forUserId) {
    // Verify the logged-in user is the coach of the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: forUserId },
      select: { coachId: true },
    })
    if (!targetUser || targetUser.coachId !== loggedInUser.id) {
      return notFound()
    }
    targetUserId = forUserId
  }

  const userData = await getUserData(targetUserId)
  const allExercises: Exercise[] = await getExercises()
  if (!userData) {
    return notFound()
  }
  return <PlanBuilderWithContext userData={userData} allExercises={allExercises}/>
};

export default PlanCreatePage;
