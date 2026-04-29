import {getAllLinkedPlans} from "@lib/planService";
import React from "react";
import getLoggedInUser from "@lib/getLoggedInUser";
import AppBarTitle from "@/components/AppBarTitle";
import PlansListCard from "./PlansListCard";

const PlanPage = async () => {
  const user = await getLoggedInUser()
  const plans = await getAllLinkedPlans(user.id)

  return (
    <>
      <AppBarTitle title="Plans" />
      <PlansListCard
        title="Plans"
        emptyMessage="No plans yet. Create one to get started."
        createHref="/user/plan/create"
        planHrefBase="/user/plan"
        plans={plans.userPlans}
      />
    </>
  )
};

export default PlanPage;
