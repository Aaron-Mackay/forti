import {getExercisesAndCategories} from "@lib/exerciseService";
import {getUserFromPlan} from "@lib/planService";
import {getUserData} from "@lib/userService";
import {PlanTable} from "../PlanTable";
import {WorkoutEditorProvider} from "@/context/WorkoutEditorContext";
import {notFound} from "next/navigation";
import getLoggedInUser from "@lib/getLoggedInUser";
import { SignalSurface } from "@/components/signal/SignalSurface";
import { loadSignalFlag } from "@lib/signal/loadSignalFlag";

const PlanPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
}) => {
  const planId = (await params).planId
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const userDetails = await getUserFromPlan(planId)
  const loggedInUserId = (await getLoggedInUser()).id
  const returnTo = resolvedSearchParams?.returnTo;
  const clientBackHref = returnTo === '/user/check-in' ? '/user/check-in' : '/user/plan';

  if (userDetails?.id !== loggedInUserId && userDetails?.coachId !== loggedInUserId) {
    return notFound()
  }
  const userData = await getUserData(userDetails.id)
  if (!userData) {
    return notFound()
  }
  const {allExercises} = await getExercisesAndCategories()
  const signalEnabled = await loadSignalFlag()

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      <WorkoutEditorProvider userData={userData} allExercises={allExercises}>
        <PlanTable
          planId={planId}
          backHref={userDetails.id === loggedInUserId ? clientBackHref : `/user/coach/clients/${userDetails.id}/plans`}
        />
      </WorkoutEditorProvider>
    </SignalSurface>
  )
};

export default PlanPage;
