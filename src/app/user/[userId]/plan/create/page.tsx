import {getExercises, getUserData} from "@lib/api";
import CustomAppBar from "@/components/CustomAppBar";
import {UserPrisma} from "@/types/dataTypes";
import {notFound} from "next/navigation";
import PlanBuilderWithContext from "@/app/user/[userId]/plan/create/PlanBuilderWithContext";
import {Exercise} from "@prisma/client";

const PlanCreatePage = async ({params}: { params: Promise<{ userId: string }> }) => {
  const userData: UserPrisma | null = await getUserData((await params).userId)
  const allExercises: Exercise[] = await getExercises()
  if (!userData) {
    return notFound()
  }
  return (<>
      <CustomAppBar title={`Create Plan`}/>
      <PlanBuilderWithContext userData={userData} allExercises={allExercises}/>
    </>
  )
};

export default PlanCreatePage;
