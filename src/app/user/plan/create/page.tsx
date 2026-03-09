import {getExercises, getUserData} from "@lib/api";
import {notFound} from "next/navigation";
import PlanBuilderWithContext from "@/app/user/plan/create/PlanBuilderWithContext";
import {Exercise} from "@prisma/client";
import getLoggedInUser from "@lib/getLoggedInUser";

const PlanCreatePage = async () => {
  const userId = (await getLoggedInUser()).id
  const userData = await getUserData(userId)
  const allExercises: Exercise[] = await getExercises()
  if (!userData) {
    return notFound()
  }
  return <PlanBuilderWithContext userData={userData} allExercises={allExercises}/>
};

export default PlanCreatePage;
