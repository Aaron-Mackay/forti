import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import AppBarTitle from '@/components/AppBarTitle';
import {
  Box,
  Button,
  Card,
  CardHeader,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function ClientPlansPage({ params }: Props) {
  const { clientId } = await params;
  const user = await getLoggedInUser();

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, coachId: true },
  });

  if (!client || client.coachId !== user.id) {
    notFound();
  }

  const plans = await prisma.plan.findMany({
    where: { userId: clientId },
    select: { id: true, name: true },
    orderBy: { order: 'asc' },
  });

  return (
    <>
      <AppBarTitle title="Plans" />
      <Card sx={{ display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title={`${client.name ?? 'Client'}'s Plans`}
          action={
            <IconButton
              href={`/user/plan/create?forUserId=${clientId}`}
              aria-label="Add plan"
              size="small"
            >
              <AddIcon />
            </IconButton>
          }
        />
        {plans.length === 0 ? (
          <Box sx={{ px: 2, pb: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No plans yet.
            </Typography>
            <Button
              variant="contained"
              href={`/user/plan/create?forUserId=${clientId}`}
            >
              Create first plan
            </Button>
          </Box>
        ) : (
          plans.map((plan) => (
            <ListItem key={plan.id} disablePadding>
              <ListItemButton href={`/user/plan/${plan.id}`}>
                <ListItemText primary={plan.name} />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </Card>
    </>
  );
}
