import {getAllLinkedPlans, getCoachClients} from "@lib/api";
import React from "react";
import getLoggedInUser from "@lib/getLoggedInUser";
import {
  Box,
  Card,
  CardHeader,
  IconButton,
  Link,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import CustomAppBar from "@/components/CustomAppBar";
import AddIcon from "@mui/icons-material/Add";

const PlanPage = async () => {
  const user = await getLoggedInUser()
  const [plans, clients] = await Promise.all([
    getAllLinkedPlans(user.id),
    getCoachClients(user.id),
  ])

  // Group client plans by client id
  const plansByClient = new Map<string, typeof plans.clientPlans>()
  for (const client of clients) {
    plansByClient.set(client.id, [])
  }
  for (const plan of plans.clientPlans) {
    const existing = plansByClient.get(plan.user.id) ?? []
    plansByClient.set(plan.user.id, [...existing, plan])
  }

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
      {clients.length > 0 && (
        <Card sx={{display: "flex", flexDirection: "column"}}>
          <CardHeader title="Client Plans"/>
          {clients.map((client) => {
            const clientPlans = plansByClient.get(client.id) ?? []
            return (
              <Box key={client.id}>
                <ListItem
                  secondaryAction={
                    <IconButton
                      component={Link}
                      href={`/user/plan/create?forUserId=${client.id}`}
                      aria-label={`Add plan for ${client.name}`}
                      size="small"
                    >
                      <AddIcon fontSize="small"/>
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" color="text.secondary">
                        {client.name}
                      </Typography>
                    }
                  />
                </ListItem>
                {clientPlans.map((plan) => (
                  <ListItem key={plan.id} sx={{pl: 4}}>
                    <ListItemButton component={Link} href={`/user/plan/${plan.id}`}>
                      <ListItemText primary={plan.name}/>
                    </ListItemButton>
                  </ListItem>
                ))}
              </Box>
            )
          })}
        </Card>
      )}
    </>
  )
};

export default PlanPage;
