import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as api from './api';
import * as clientApi from './clientApi';
import prisma from '@/lib/prisma';
import * as fetchWrapper from './fetchWrapper';
import {EventPrisma, UserPrisma} from "@/types/dataTypes";

vi.mock('@/lib/prisma', () => ({
  default: {
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    exercise: { findMany: vi.fn() },
    workoutExercise: { findUnique: vi.fn() },
    event: { findMany: vi.fn() },
    dayMetric: { findMany: vi.fn(), upsert: vi.fn() },
    plan: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock('./fetchWrapper', () => ({
  fetchJson: vi.fn(),
}));

describe('API functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUsers', () => {
    it('returns users with weeks', async () => {
      const mockUsers = [{ id: 1, weeks: [] }];
      (prisma.user.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsers);

      const result = await api.getUsers();
      expect(result).toEqual(mockUsers);
    });
  });

  describe('getExercises', () => {
    it('returns exercises', async () => {
      const mockExercises = [{ id: 1, name: 'Squat' }];
      (prisma.exercise.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockExercises);

      const result = await api.getExercises();
      expect(result).toEqual(mockExercises);
    });
  });

  describe('getExercisesAndCategories', () => {
    it('returns exercises and unique categories', async () => {
      const mockExercises = [
        { id: 1, name: 'Squat', category: 'Legs' },
        { id: 2, name: 'Bench Press', category: 'Chest' },
        { id: 3, name: 'Deadlift', category: 'Back' },
        { id: 4, name: 'Leg Curl', category: 'Legs' },
        { id: 5, name: 'No Category', category: null },
      ];
      (prisma.exercise.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockExercises);

      const { allExercises, categories } = await api.getExercisesAndCategories();

      expect(allExercises).toEqual(mockExercises);
      expect(categories).toEqual(['Legs', 'Chest', 'Back']);
    });
  });

  describe('getUserEvents', () => {
    it('returns all events a user has', async () => {
      const mockEvents: Partial<EventPrisma>[] = [{ id: 1, }, { id: 2, }];
      (prisma.event.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockEvents);

      const result = await api.getUserEvents('1');
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getUserData', () => {
    it('returns user data with nested includes', async () => {
      const mockUserData = { id: 1, weeks: [] };
      (prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockUserData);

      const result = await api.getUserData('1');
      expect(result).toEqual(mockUserData);
    });

    it('returns null for invalid userId', async () => {
      (prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await api.getUserData('abc');
      expect(result).toBeNull();
    });
  });

  describe('saveUserWorkoutData', () => {
    it('posts user workout data and returns response', async () => {
      const mockResponse = { success: true };
      (fetchWrapper.fetchJson as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const userData = { id: 1, name: 'Test User' } as unknown as UserPrisma;
      const result = await clientApi.saveUserWorkoutData(userData);
      expect(fetchWrapper.fetchJson).toHaveBeenCalledWith('/api/saveUserWorkoutData', {
        method: 'POST',
        body: JSON.stringify(userData),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('throws error if save fails', async () => {
      (fetchWrapper.fetchJson as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed to fetch /api/saveUserWorkoutData'));

      await expect(clientApi.saveUserWorkoutData({} as UserPrisma)).rejects.toThrow('Failed to fetch /api/saveUserWorkoutData');
    });
  });

  describe('getUserDayMetrics', () => {
    it('returns day metrics ordered by date ascending', async () => {
      const mockMetrics = [
        { id: 1, userId: 'u1', date: new Date('2024-01-01') },
        { id: 2, userId: 'u1', date: new Date('2024-01-02') },
      ];
      (prisma.dayMetric.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMetrics);

      const result = await api.getUserDayMetrics('u1');
      expect(result).toEqual(mockMetrics);
      expect(prisma.dayMetric.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { date: 'asc' },
      });
    });
  });

  describe('updateUserDayMetric', () => {
    it('upserts a day metric and returns the result', async () => {
      const metric = {
        userId: 'u1',
        date: new Date('2024-06-15'),
        weight: 80,
        steps: 8000,
        sleepMins: 420,
        calories: 2200,
        protein: 160,
        carbs: 250,
        fat: 60,
      };
      const upserted = { id: 7, ...metric };
      (prisma.dayMetric.upsert as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(upserted);

      const result = await api.updateUserDayMetric(metric);
      expect(result).toEqual(upserted);
      expect(prisma.dayMetric.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_date: { userId: 'u1', date: metric.date } },
          update: metric,
          create: metric,
        }),
      );
    });
  });

  describe('savePlan', () => {
    it('posts a plan and returns the upload response', async () => {
      const mockResponse = { planId: 99 };
      (fetchWrapper.fetchJson as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const plan = { id: 0, userId: 'u1', order: 1, name: 'My Plan', description: null, weeks: [] };
      const result = await clientApi.savePlan(plan as unknown as Parameters<typeof clientApi.savePlan>[0]);
      expect(fetchWrapper.fetchJson).toHaveBeenCalledWith('/api/plan', expect.objectContaining({ method: 'POST' }));
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAllLinkedPlans', () => {
    it('returns own plans and client plans', async () => {
      const userPlans = [{ id: 1, name: 'Plan A' }];
      const clientPlans = [{ id: 2, name: 'Plan B', user: { id: 'c1', name: 'Client' } }];
      (prisma.plan.findMany as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(userPlans)
        .mockResolvedValueOnce(clientPlans);

      const result = await api.getAllLinkedPlans('u1');
      expect(result.userPlans).toEqual(userPlans);
      expect(result.clientPlans).toEqual(clientPlans);
    });
  });

  describe('getUserFromPlan', () => {
    it('returns the user associated with a plan', async () => {
      const mockUser = { id: 'u1', coachId: null };
      (prisma.plan.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
      });

      const result = await api.getUserFromPlan('5');
      expect(result).toEqual(mockUser);
    });

    it('returns null when the plan does not exist', async () => {
      (prisma.plan.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await api.getUserFromPlan('999');
      expect(result).toBeNull();
    });
  });

  describe('getCoachFromUser', () => {
    it('returns the coachId for a user', async () => {
      (prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ coachId: 'coach-1' });

      const result = await api.getCoachFromUser('u1');
      expect(result).toEqual({ coachId: 'coach-1' });
    });

    it('returns null coachId when the user has no coach', async () => {
      (prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ coachId: null });

      const result = await api.getCoachFromUser('u1');
      expect(result?.coachId).toBeNull();
    });
  });
});
