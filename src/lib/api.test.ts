import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as api from './api';
import prisma from '@/lib/prisma';
import * as fetchWrapper from './fetchWrapper';

vi.mock('@/lib/prisma', () => ({
  default: {
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    exercise: { findMany: vi.fn() },
    workoutExercise: { findUnique: vi.fn() },
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

      const userData = { id: 1, name: 'Test User' };
      const result = await api.saveUserWorkoutData(userData as any);
      expect(fetchWrapper.fetchJson).toHaveBeenCalledWith('/api/saveUserWorkoutData', {
        method: 'POST',
        body: JSON.stringify(userData),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('throws error if save fails', async () => {
      (fetchWrapper.fetchJson as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed to fetch /api/saveUserWorkoutData'));

      await expect(api.saveUserWorkoutData({} as any)).rejects.toThrow('Failed to fetch /api/saveUserWorkoutData');
    });
  });
});
