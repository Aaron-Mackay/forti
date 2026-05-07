import { NextRequest, NextResponse } from 'next/server';
import { authenticationErrorResponse, isAuthenticationError, requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';
import {
  UserProfileSchema,
  UserProfileUpdateRequestSchema,
} from '@forti/shared';

export async function GET() {
  try {
    const session = await requireSession();
    const profile = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, image: true },
    });

    if (!profile || !profile.email) {
      return errorResponse('Profile not found', 404);
    }

    return NextResponse.json(UserProfileSchema.parse(profile));
  } catch (err: unknown) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    console.error(err);
    return errorResponse('Failed to load profile', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const json = await req.json();
    const parsed = UserProfileUpdateRequestSchema.safeParse(json);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
      select: { id: true, email: true, name: true, image: true },
    });

    return NextResponse.json(UserProfileSchema.parse(updated));
  } catch (err: unknown) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    console.error(err);
    return errorResponse('Failed to update profile', 500);
  }
}
