import {getExercises} from "@lib/exerciseService";
import {getUserData} from "@lib/userService";
import {notFound} from "next/navigation";
import PlanBuilderWithContext from "@/app/user/plan/create/PlanBuilderWithContext";
import {Exercise} from "@/generated/prisma/browser";
import getLoggedInUser from "@lib/getLoggedInUser";
import prisma from "@lib/prisma";
import { SignalSurface } from "@/components/signal/SignalSurface";
import { loadSignalFlag } from "@lib/signal/loadSignalFlag";

const PlanCreatePage = async ({ searchParams }: { searchParams: Promise<{ forUserId?: string }> }) => {
  const loggedInUser = await getLoggedInUser()
  const { forUserId } = await searchParams
  const signalEnabled = await loadSignalFlag();

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
  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      <PlanBuilderWithContext
        userData={userData}
        allExercises={allExercises}
        clientId={forUserId}
        signalEnabled={signalEnabled}
      />
    </SignalSurface>
  )
};

export default PlanCreatePage;
