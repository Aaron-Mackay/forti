import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import CoachLinkConfirmation from './CoachLinkConfirmation';

export default async function CoachLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getLoggedInUser();
  const userId = user.id;

  const coach = await prisma.user.findUnique({
    where: { coachCode: code },
    select: { id: true, name: true },
  });

  if (!coach) {
    return (
      <CoachLinkConfirmation
        coach={null}
        code={code}
        isOwnCode={false}
        currentCoach={null}
        pendingRequestToThisCoach={false}
        pendingRequestToOtherCoach={null}
        alreadyLinked={false}
      />
    );
  }

  const isOwnCode = coach.id === userId;

  const requester = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      coachId: true,
      coach: { select: { id: true, name: true } },
      sentCoachRequest: {
        select: {
          status: true,
          coachId: true,
          coach: { select: { name: true } },
        },
      },
    },
  });

  const alreadyLinked = requester?.coachId === coach.id;
  const currentCoach = alreadyLinked ? null : (requester?.coach ?? null);

  const pendingRequest = requester?.sentCoachRequest;
  const pendingRequestToThisCoach =
    pendingRequest?.status === 'Pending' && pendingRequest.coachId === coach.id;
  const pendingRequestToOtherCoach =
    pendingRequest?.status === 'Pending' && pendingRequest.coachId !== coach.id
      ? { coachName: pendingRequest.coach.name ?? 'your current coach' }
      : null;

  return (
    <CoachLinkConfirmation
      coach={coach}
      code={code}
      isOwnCode={isOwnCode}
      currentCoach={currentCoach}
      pendingRequestToThisCoach={pendingRequestToThisCoach}
      pendingRequestToOtherCoach={pendingRequestToOtherCoach}
      alreadyLinked={alreadyLinked}
    />
  );
}
