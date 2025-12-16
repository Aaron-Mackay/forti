import {getAllLinkedPlans} from "@lib/api";
import React from "react";
import getLoggedInUser from "@lib/getLoggedInUser";
import {Card, CardHeader, Link, ListItem, ListItemButton, ListItemText} from "@mui/material";
import CustomAppBar from "@/components/CustomAppBar";

const PlanPage = async () => {
  const user = await getLoggedInUser()
  const plans = await getAllLinkedPlans(user.id)

  return (
    <>
      <CustomAppBar title="Plans"/>
      <Card sx={{display: "flex", flexDirection: "column"}}>
        <CardHeader title={`${user.name}'s Plans`}/>
        {plans.userPlans.map((plan) => (
          <ListItem key={plan.id}>
            <ListItemButton component={Link} href={`/user/plan/${plan.id}`}>
              <ListItemText primary={plan.name}/>
            </ListItemButton>
          </ListItem>
        ))}
      </Card>
      <Card sx={{display: "flex", flexDirection: "column"}}>
        <CardHeader title="Client Plans"/>
        {plans.clientPlans.map((plan) => (
          <ListItem key={plan.id}>
            <ListItemButton component={Link} href={`/user/plan/${plan.id}`}>
              <ListItemText primary={plan.name} secondary={plan.user.name}/>
            </ListItemButton>
          </ListItem>
        ))}
      </Card>
    </>
  )
};

export default PlanPage;
