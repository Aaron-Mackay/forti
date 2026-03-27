import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import AppBarTitle from '@/components/AppBarTitle';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import ClientQuickLinks from './ClientQuickLinks';

interface Props {
  params: Promise<{ clientId: string }>;
}

const ClientOverviewPage = async ({ params }: Props) => {
  const { clientId } = await params;
  const user = await getLoggedInUser();

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      coachId: true,
      _count: { select: { plans: true } },
    },
  });

  if (!client || client.coachId !== user.id) {
    notFound();
  }

  const latestCheckIn = await prisma.weeklyCheckIn.findFirst({
    where: { userId: clientId },
    orderBy: { weekStartDate: 'desc' },
    select: {
      weekStartDate: true,
      adherenceRating: true,
      energyLevel: true,
      weekReview: true,
    },
  });

  return (
    <>
      <AppBarTitle title={client.name ?? 'Client'} />

      <ClientQuickLinks clientId={clientId} />

      {/* Summary cards */}
      <Stack spacing={2}>
        <Card>
          <CardHeader title="Plans" subheader={`${client._count.plans} plan${client._count.plans === 1 ? '' : 's'}`} />
          <CardContent>
            <Button component={Link} href={`/user/coach/clients/${clientId}/plans`} size="small">
              View plans
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Latest Check-in" />
          <CardContent>
            {latestCheckIn ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Week of {new Date(latestCheckIn.weekStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Typography>
                {latestCheckIn.adherenceRating != null && (
                  <Typography variant="body2">Adherence: {latestCheckIn.adherenceRating}/5</Typography>
                )}
                {latestCheckIn.energyLevel != null && (
                  <Typography variant="body2">Energy: {latestCheckIn.energyLevel}/5</Typography>
                )}
                {latestCheckIn.weekReview && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    &ldquo;{latestCheckIn.weekReview}&rdquo;
                  </Typography>
                )}
                <Button
                  component={Link}
                  href={`/user/coach/clients/${clientId}/check-ins`}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  All check-ins
                </Button>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No check-ins yet.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>
    </>
  );
};

export default ClientOverviewPage;
