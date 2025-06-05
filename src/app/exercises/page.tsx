"use client";

import React from "react";
import {getExercises} from "@lib/api";

interface Exercise {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
}

export default async function ExercisesPage ()  {
  const exercises = await getExercises()

  return (
    <div className="container mt-4">
      <h1>All Exercises</h1>

      {(
        <table className="table table-striped mt-3">
          <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Description</th>
          </tr>
          </thead>
          <tbody>
          {exercises.map((exercise) => (
            <tr key={exercise.id}>
              <td>{exercise.name}</td>
              <td>{exercise.category || "-"}</td>
              <td>{exercise.description || "-"}</td>
            </tr>
          ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
