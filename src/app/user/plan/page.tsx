import {getAllLinkedPlans} from "@lib/api";
import React from "react";
import getLoggedInUser from "@lib/getLoggedInUser";
import {
  Box,
  Button,
  Card,
  CardHeader,
  Link,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import AppBarTitle from "@/components/AppBarTitle";

const PlanPage = async () => {
  const user = await getLoggedInUser()
  const plans = await getAllLinkedPlans(user.id)

  return (
    <>
      <AppBarTitle title="Plans" />
      <Card sx={{display: "flex", flexDirection: "column"}}>
        <CardHeader title={`${user.name}'s Plans`}/>
        {plans.userPlans.length === 0 ? (
          <Box sx={{ px: 2, pb: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No plans yet. Create one to get started.
            </Typography>
            <Button variant="contained" component={Link} href="/user/plan/create">
              Create your first plan
            </Button>
          </Box>
        ) : plans.userPlans.map((plan) => (
          <ListItem key={plan.id}>
            <ListItemButton component={Link} href={`/user/plan/${plan.id}`}>
              <ListItemText primary={plan.name}/>
            </ListItemButton>
          </ListItem>
        ))}
      </Card>
    </>
  )
};

export default PlanPage;
