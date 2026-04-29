import {getExercisesAndCategories} from "@lib/exerciseService";
import {getUserFromPlan} from "@lib/planService";
import {getUserData} from "@lib/userService";
import {PlanTable} from "../PlanTable";
import {WorkoutEditorProvider} from "@/context/WorkoutEditorContext";
import React from "react";
import {notFound} from "next/navigation";
import getLoggedInUser from "@lib/getLoggedInUser";

const PlanPage = async ({params}: { params: Promise<{ planId: string }> }) => {
  const planId = (await params).planId
  const userDetails = await getUserFromPlan(planId)
  const loggedInUserId = (await getLoggedInUser()).id

  if (userDetails?.id !== loggedInUserId && userDetails?.coachId !== loggedInUserId) {
    return notFound()
  }
  const userData = await getUserData(userDetails.id)
  if (!userData) {
    return notFound()
  }
  const {allExercises} = await getExercisesAndCategories()

  return (
      <WorkoutEditorProvider userData={userData} allExercises={allExercises}>
      <PlanTable
        planId={planId}
        backHref={userDetails.id === loggedInUserId ? '/user/plan' : `/user/coach/clients/${userDetails.id}/plans`}
      />
    </WorkoutEditorProvider>
  )
};

export default PlanPage;
